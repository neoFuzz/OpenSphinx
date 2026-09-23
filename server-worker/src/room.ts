import type { GameConfig, GameState, Move } from '@laser/shared/types';
import { applyMove, createInitialState } from '@laser/shared/engine';
import { DatabaseManager } from './database';
import type { Env, PlayerInfo, PublicRoomState } from './types';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Serialised room metadata stored in DO KV under the key 'room_meta' */
interface RoomMeta {
  id: string;
  config: GameConfig;
  isPrivate: boolean;
  password?: string;
  finishedAt?: number;
  players: PlayerInfo[];
}

/** In-memory SSE connection entry */
interface Connection {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  userId?: string;
}

// ---------------------------------------------------------------------------
// TextEncoder singleton (re-used across all writes to avoid allocations)
// ---------------------------------------------------------------------------
const ENC = new TextEncoder();

// ---------------------------------------------------------------------------
// GameRoom Durable Object
// ---------------------------------------------------------------------------

/**
 * One instance of `GameRoom` exists per room, keyed by room ID.
 *
 * Storage split:
 * - KV (`this.ctx.storage.put/get`): `room_meta` (config, players, …) and `game_state`
 * - DO SQLite (`this.ctx.storage.sql`): `game_history` table (append-only move log)
 * - In-memory only: `connections` map (SSE writers can't be serialised)
 *
 * @see design.md — GameRoom Durable Object
 */
export class GameRoom implements DurableObject {
  // -------------------------------------------------------------------------
  // In-memory state (hydrated from KV + DO SQLite on wake)
  // -------------------------------------------------------------------------

  /** Unique room identifier — set on first POST /create */
  private _id: string = '';

  /** Up to 2 players in the room */
  private players: PlayerInfo[] = [];

  /** Set of clientIds currently spectating */
  private spectators: Set<string> = new Set();

  /** Current authoritative game state */
  private gameState: GameState = createInitialState();

  /** Full move history — one entry per applied move */
  private gameStates: GameState[] = [];

  /** Game config (rules + setup variant) */
  private config: GameConfig = { rules: 'CLASSIC', setup: 'CLASSIC' };

  /** Whether the room requires a password to join */
  private isPrivate: boolean = false;

  /** Room password (only checked when isPrivate is true) */
  private password?: string;

  /** Unix timestamp (ms) when the game finished, used for alarm cleanup */
  private finishedAt?: number;

  // -------------------------------------------------------------------------
  // SSE connections (in-memory only — rebuilt on each reconnect)
  // -------------------------------------------------------------------------

  /** clientId → SSE writer for each connected client */
  private connections: Map<string, Connection> = new Map();

  // -------------------------------------------------------------------------
  // Constructor — hydrates in-memory state from DO storage on wake
  // -------------------------------------------------------------------------

  /**
   * @param ctx  - Durable Object state; exposes `.storage` (KV + SQL) and lifecycle hooks
   * @param env  - Worker environment bindings (D1, secrets, …)
   */
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    // Block incoming requests until hydration completes so that the first
    // fetch() call never sees a partially-initialised state.
    this.ctx.blockConcurrencyWhile(async () => {
      await this._hydrate();
    });
  }

  // -------------------------------------------------------------------------
  // Hydration
  // -------------------------------------------------------------------------

  /**
   * Restores in-memory state from DO KV storage and the game_history table.
   * Called once inside `blockConcurrencyWhile` during construction.
   */
  private async _hydrate(): Promise<void> {
    // Ensure the game_history table exists (idempotent)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS game_history (
        seq        INTEGER PRIMARY KEY AUTOINCREMENT,
        game_state TEXT NOT NULL
      )
    `);

    // Restore room metadata
    const meta = await this.ctx.storage.get<RoomMeta>('room_meta');
    if (meta) {
      this._id = meta.id;
      this.config = meta.config;
      this.isPrivate = meta.isPrivate;
      this.password = meta.password;
      this.finishedAt = meta.finishedAt;
      this.players = meta.players ?? [];
    }

    // Restore current game state
    const gs = await this.ctx.storage.get<string>('game_state');
    if (gs) {
      this.gameState = JSON.parse(gs) as GameState;
    }

    // Restore full move history from DO SQLite
    const rows = this.ctx.storage.sql
      .exec('SELECT game_state FROM game_history ORDER BY seq ASC')
      .toArray();
    this.gameStates = rows.map((r) => {
      const raw = r['game_state'];
      if (typeof raw !== 'string') throw new Error('game_history: game_state column is not a string');
      return JSON.parse(raw) as GameState;
    });
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  /**
   * Persists a new game state after a move:
   * 1. Appends to `game_history` (DO SQLite)
   * 2. Overwrites `game_state` in KV
   *
   * 2 writes per move — stays well within CF free tier limits.
   *
   * @param newState - The validated game state produced by `applyMove`
   */
  private async _persistMove(newState: GameState): Promise<void> {
    // Append to history table (synchronous DO SQLite write)
    this.ctx.storage.sql.exec(
      'INSERT INTO game_history (game_state) VALUES (?)',
      JSON.stringify(newState),
    );
    // Overwrite current state in KV
    await this.ctx.storage.put('game_state', JSON.stringify(newState));
  }

  /**
   * Persists room metadata (players, config, flags) to KV storage.
   * Called after any change that modifies the room meta (create, join, leave).
   */
  private async _persistMeta(): Promise<void> {
    const meta: RoomMeta = {
      id: this._id,
      config: this.config,
      isPrivate: this.isPrivate,
      password: this.password,
      finishedAt: this.finishedAt,
      players: this.players,
    };
    await this.ctx.storage.put('room_meta', meta);
  }

  // ---------------------------------------------------------------------------
  // SSE fan-out helpers
  // ---------------------------------------------------------------------------

  /**
   * Broadcasts a named SSE event to every connected client.
   * Dead connections (closed SSE streams) are detected and removed.
   *
   * @param event - SSE event name (e.g. `'room:state'`, `'game:state'`)
   * @param data  - JSON-serialisable payload
   */
  private async _broadcast(event: string, data: unknown): Promise<void> {
    const payload = ENC.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const dead: string[] = [];

    for (const [clientId, conn] of this.connections) {
      try {
        await conn.writer.write(payload);
      } catch {
        // Write failed — connection is dead; schedule for removal
        dead.push(clientId);
      }
    }

    for (const id of dead) {
      this._removeClient(id);
    }
  }

  /**
   * Sends a named SSE event to a single connected client.
   * Silently discards the write if the client is not connected or the
   * stream is already closed.
   *
   * @param clientId - Target client identifier
   * @param event    - SSE event name
   * @param data     - JSON-serialisable payload
   */
  private async _sendTo(clientId: string, event: string, data: unknown): Promise<void> {
    const conn = this.connections.get(clientId);
    if (!conn) return;

    const payload = ENC.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      await conn.writer.write(payload);
    } catch {
      this._removeClient(clientId);
    }
  }

  // ---------------------------------------------------------------------------
  // Client lifecycle helpers
  // ---------------------------------------------------------------------------

  /**
   * Removes a client from the connections map, players list, and spectators set,
   * then broadcasts the updated room state to remaining clients.
   *
   * @param clientId - ID of the client to remove
   */
  private _removeClient(clientId: string): void {
    this.connections.delete(clientId);
    const wasPlayer = this.players.some((p) => p.clientId === clientId);
    this.players = this.players.filter((p) => p.clientId !== clientId);
    this.spectators.delete(clientId);

    if (wasPlayer) {
      // Persist updated players list asynchronously (fire-and-forget here;
      // errors are non-critical as the DO will re-derive from KV on next wake)
      void this._persistMeta();
      void this._broadcast('room:state', this._publicState());
    }
  }

  // ---------------------------------------------------------------------------
  // Public state helper
  // ---------------------------------------------------------------------------

  /**
   * Returns the public-facing room state broadcast to all clients.
   */
  private _publicState(): PublicRoomState {
    return {
      roomId: this._id,
      players: this.players.map((p) => ({ name: p.name, color: p.color })),
      spectatorCount: this.spectators.size,
      state: this.gameState,
      config: this.config,
      isPrivate: this.isPrivate,
    };
  }

  // ---------------------------------------------------------------------------
  // alarm() — Storage Alarm for room cleanup
  // ---------------------------------------------------------------------------

  /**
   * Called by the CF runtime after the alarm fires (30 s after game end).
   * Clears all DO storage so the runtime can evict the instance.
   */
  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  // ---------------------------------------------------------------------------
  // fetch() — DO HTTP interface
  // ---------------------------------------------------------------------------

  /**
   * Entry point for all requests forwarded from the Worker fetch handler.
   *
   * Routes:
   * - `POST /create`  — initialise the room (called once by the Worker)
   * - `GET  /events`  — open SSE stream
   * - `POST /join`    — add client as player or spectator
   * - `POST /move`    — validate + apply a game move
   * - `POST /save`    — save current state to D1
   * - `POST /leave`   — remove a client
   * - `GET  /state`   — return current room state (for reconnect / HTTP fallback)
   *
   * @param request - Incoming HTTP request forwarded from the Worker
   * @returns HTTP response
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/create':
        return this._handleCreate(request);
      case '/events':
        return this._handleEvents(request);
      case '/join':
        return this._handleJoin(request);
      case '/move':
        return this._handleMove(request);
      case '/save':
        return this._handleSave(request);
      case '/leave':
        return this._handleLeave(request);
      case '/state':
        return Response.json(this._publicState());
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  // ---------------------------------------------------------------------------
  // Route handlers
  // ---------------------------------------------------------------------------

  /**
   * `POST /create` — Initialises this room instance.
   *
   * Body: `{ roomId: string; config?: GameConfig; isPrivate?: boolean; password?: string }`
   */
  private async _handleCreate(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    interface CreateBody {
      roomId: string;
      config?: GameConfig;
      isPrivate?: boolean;
      password?: string;
    }

    const body = await request.json() as CreateBody;

    this._id = body.roomId;
    this.config = body.config ?? { rules: 'CLASSIC', setup: 'CLASSIC' };
    this.isPrivate = body.isPrivate ?? false;
    this.password = body.password;
    this.gameState = createInitialState(this.config);
    this.gameStates = [this.gameState];

    await this._persistMeta();
    await this._persistMove(this.gameState);

    return Response.json({ ok: true, roomId: this._id });
  }

  /**
   * `GET /events` — Opens an SSE stream for a client.
   *
   * The client's `clientId` is expected as a query param: `?clientId=<uuid>`.
   * Immediately pushes the full `room:state` event so the client is in sync
   * even after a DO eviction + reconnect.
   */
  private async _handleEvents(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId') ?? crypto.randomUUID();
    const userId = url.searchParams.get('userId') ?? undefined;

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    this.connections.set(clientId, { writer, userId });

    // Push current room state immediately (handles reconnect after DO eviction)
    await this._sendTo(clientId, 'room:state', this._publicState());

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Client-Id': clientId,
      },
    });
  }

  /**
   * `POST /join` — Adds a client as a player or spectator.
   *
   * Body: `{ clientId: string; name: string; password?: string; userId?: string; config?: GameConfig }`
   */
  private async _handleJoin(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    interface JoinBody {
      clientId: string;
      name: string;
      password?: string;
      userId?: string;
      config?: GameConfig;
    }

    const body = await request.json() as JoinBody;
    const { clientId, name, userId } = body;

    // Password check
    if (this.isPrivate && this.password !== body.password) {
      return Response.json({ error: 'Incorrect password' }, { status: 403 });
    }

    // Prevent the same authenticated user from playing against themselves
    if (userId) {
      const alreadyPlaying = this.players.find(
        (p) => p.userId === userId && p.clientId !== clientId,
      );
      if (alreadyPlaying) {
        return Response.json(
          { error: 'You are already playing in this room' },
          { status: 409 },
        );
      }
    }

    // Re-join: client already in players list (e.g. page refresh)
    const existing = this.players.find((p) => p.clientId === clientId);
    if (existing) {
      return Response.json({ ok: true, color: existing.color });
    }

    if (this.players.length < 2) {
      const color: 'RED' | 'SILVER' = this.players.length === 0 ? 'RED' : 'SILVER';
      this.players.push({ clientId, name, color, userId });
      await this._persistMeta();
      await this._broadcast('room:state', this._publicState());
      return Response.json({ ok: true, color });
    }

    // Spectator
    this.spectators.add(clientId);
    await this._sendTo(clientId, 'room:state', this._publicState());
    return Response.json({ ok: true, spectator: true });
  }

  /**
   * `POST /move` — Validates and applies a player move.
   *
   * Body: `{ clientId: string; move: Move; userId?: string }`
   *
   * On game end:
   * 1. Broadcasts `game:end`
   * 2. Updates player stats in D1
   * 3. Auto-saves game + replay to D1
   * 4. Schedules storage alarm for cleanup in 30 s
   */
  private async _handleMove(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    interface MoveBody {
      clientId: string;
      move: Move;
    }

    const body = await request.json() as MoveBody;
    const { clientId, move } = body;

    const player = this.players.find((p) => p.clientId === clientId);
    if (!player) {
      return Response.json({ error: 'Not a player in this room' }, { status: 403 });
    }

    if (this.gameState.turn !== player.color) {
      return Response.json({ error: 'Not your turn' }, { status: 409 });
    }

    const nextState = applyMove(this.gameState, move, this._id);
    this.gameState = nextState;
    this.gameStates.push(nextState);

    await this._persistMove(nextState);

    // Broadcast updated state to all connected clients
    await this._broadcast('game:state', { state: nextState, ack: move.clientMoveId });

    if (nextState.winner) {
      this.finishedAt = Date.now();

      // Notify all clients that the game has ended
      await this._broadcast('game:end', { winner: nextState.winner });

      // Persist finishedAt in metadata
      await this._persistMeta();

      // Update player stats in D1 (fire-and-forget; non-critical)
      const db = new DatabaseManager(this.env.DB);
      const gameName = `Game ${this._id} - ${nextState.winner} wins`;

      await Promise.allSettled([
        ...this.players
          .filter((p) => p.userId)
          .map((p) => db.updatePlayerStats(p.userId!, p.color === nextState.winner)),
        db.saveGame(this._id, gameName, nextState),
        db.saveReplay(this._id, gameName, this.gameStates),
      ]);

      // Schedule storage alarm: clean up 30 s after game end
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
    }

    return Response.json({ ok: true });
  }

  /**
   * `POST /save` — Saves the current game state to D1 on user request.
   *
   * Body: `{ clientId: string; name: string; userId?: string }`
   */
  private async _handleSave(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    interface SaveBody {
      clientId: string;
      name: string;
      userId?: string;
    }

    const body = await request.json() as SaveBody;
    const { clientId, name, userId } = body;

    const player = this.players.find((p) => p.clientId === clientId);
    if (!player) {
      return Response.json({ error: 'Not a player in this room' }, { status: 403 });
    }

    try {
      const db = new DatabaseManager(this.env.DB);
      await db.saveGame(this._id, name, this.gameState, userId);

      // Notify only the requesting client
      await this._sendTo(clientId, 'game:saved', { success: true });

      return Response.json({ ok: true });
    } catch (err) {
      console.error('Save game failed', { roomId: this._id, error: err });
      await this._sendTo(clientId, 'game:saved', { success: false, error: 'Failed to save game' });
      return Response.json({ error: 'Failed to save game' }, { status: 500 });
    }
  }

  /**
   * `POST /leave` — Removes a client from the room.
   *
   * Body: `{ clientId: string }`
   */
  private async _handleLeave(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    interface LeaveBody {
      clientId: string;
    }

    const body = await request.json() as LeaveBody;
    this._removeClient(body.clientId);

    return Response.json({ ok: true });
  }
}


/** Player colors in the game */
export type Player = 'RED' | 'SILVER';
/** Directions for piece orientation and laser movement */
export type Dir = 'N' | 'E' | 'S' | 'W' | 'O';

/** Position on the game board */
export interface Pos { r: number; c: number; }

/** Types of game pieces */
export type PieceKind = 'PHARAOH' | 'PYRAMID' | 'DJED' | 'OBELISK' | 'ANUBIS' | 'LASER' | 'SPHINX';

/** Mirror orientations for Djed pieces */
export type MirrorShape = '/' | '\\';
/** Represents a game piece with its properties */
export interface Piece {
  id: string;
  owner: Player;
  kind: PieceKind;
  facing?: Dir;         // for LASER emitters
  mirror?: MirrorShape; // for mirror-bearing pieces
  orientation?: Dir;    // for pyramids - which direction the corner faces
  debug?(): string;
}

/**
 * Creates a piece with debug functionality
 * @param piece - Piece properties without debug method
 * @returns Complete piece with debug method
 */
export function createPiece(piece: Omit<Piece, 'debug'>): Piece {
  return {
    ...piece,
    debug() {
      let result = `${this.owner} ${this.kind}`;
      if (this.facing) result += ` facing ${this.facing}`;
      if (this.mirror) result += ` mirror ${this.mirror}`;
      if (this.orientation) result += ` oriented ${this.orientation}`;
      return result;
    }
  };
}

/** Board cell containing pieces or empty */
export type Cell = Piece[] | null;

/**
 * Returns debug string representation of a cell
 * @param cell - Cell to debug
 * @returns String description of cell contents
 */
export function debugCell(cell: Cell): string {
  if (!cell || cell.length === 0) return 'empty';
  if (cell.length === 1) return cell[0].debug?.() || `${cell[0].owner} ${cell[0].kind}`;
  return `stack(${cell.length}): ${cell.map(p => p.kind).join(',')}`;
}

/** Game rule variants */
export type RuleVariant = 'CLASSIC' | 'KHET_2_0';
/** Board setup variants */
export type SetupVariant = 'CLASSIC' | 'IMHOTEP' | 'DYNASTY';

/** Game configuration specifying rules and setup */
export interface GameConfig {
  rules: RuleVariant;
  setup: SetupVariant;
}

/** Complete game state */
export interface GameState {
  board: Cell[][];
  turn: Player;
  lastLaserPath?: Pos[];
  winner?: Player;
  config?: GameConfig;
}

/** Player move action */
export interface Move {
  type: 'MOVE' | 'ROTATE';
  from: Pos;
  to?: Pos;              // only for MOVE
  rotation?: 90 | -90;   // only for ROTATE
  moveStack?: boolean;   // for obelisk stacks - true to move entire stack, false to move top only
  clientMoveId?: string; // for optimistic UI ack
}


export type Player = 'RED' | 'SILVER';
export type Dir = 'N' | 'E' | 'S' | 'W'| 'O';

export interface Pos { r: number; c: number; }

export type PieceKind = 'PHARAOH' | 'PYRAMID' | 'DJED' | 'OBELISK' | 'ANUBIS' | 'LASER';

export type MirrorShape = '/' | '\\';
export interface Piece {
  id: string;
  owner: Player;
  kind: PieceKind;
  facing?: Dir;         // for LASER emitters
  mirror?: MirrorShape; // for mirror-bearing pieces
  orientation?: Dir;    // for pyramids - which direction the corner faces
  debug?(): string;
}

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

export type Cell = Piece | null;

export function debugCell(cell: Cell): string {
  return cell ? (cell.debug?.() || `${cell.owner} ${cell.kind}`) : 'empty';
}

export interface GameState {
  board: Cell[][];
  turn: Player;
  lastLaserPath?: Pos[];
  winner?: Player;
}

export interface Move {
  type: 'MOVE' | 'ROTATE';
  from: Pos;
  to?: Pos;              // only for MOVE
  rotation?: 90 | -90;   // only for ROTATE
  clientMoveId?: string; // for optimistic UI ack
}

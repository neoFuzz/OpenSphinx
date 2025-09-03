
export type Player = 'RED' | 'SILVER';
export type Dir = 'N' | 'E' | 'S' | 'W';

export interface Pos { r: number; c: number; }

export type PieceKind = 'PHARAOH' | 'PYRAMID' | 'DJED' | 'OBELISK' | 'LASER';

export type MirrorShape = '/' | '\\';
export type Orientation = 0 | 90 | 180 | 270;

export interface Piece {
  id: string;
  owner: Player;
  kind: PieceKind;
  facing?: Dir;         // for LASER emitters
  mirror?: MirrorShape; // for mirror-bearing pieces
  orientation?: Dir;    // for pyramids - which direction the hypotenuse faces
}

export type Cell = Piece | null;

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

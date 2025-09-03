
import { Cell, GameState } from '../types';
import { COLS, ROWS } from '../constants';

export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Emitters
  board[7][0] = { id: 'L_RED', owner: 'RED', kind: 'LASER', facing: 'E' };
  board[0][9] = { id: 'L_SIL', owner: 'SILVER', kind: 'LASER', facing: 'W' };

  // Pharaohs
  board[7][4] = { id: 'P_RED', owner: 'RED', kind: 'PHARAOH' };
  board[0][5] = { id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH' };

  // Mirrors and obelisks
  board[6][2] = { id: 'R1', owner: 'RED', kind: 'PYRAMID', orientation: 'N' };
  board[6][7] = { id: 'R2', owner: 'RED', kind: 'DJED', mirror: '\\' };
  board[1][2] = { id: 'S1', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' };
  board[1][7] = { id: 'S2', owner: 'SILVER', kind: 'DJED', mirror: '/' };
  board[5][5] = { id: 'B1', owner: 'RED', kind: 'OBELISK' };
  board[2][4] = { id: 'B2', owner: 'SILVER', kind: 'OBELISK' };

  return { board, turn: 'RED' };
}

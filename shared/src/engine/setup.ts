
import { Cell, GameState, createPiece } from '../types';
import { COLS, ROWS } from '../constants';

export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Lasers
  board[7][0] = createPiece({ id: 'L_RED', owner: 'RED', kind: 'LASER', facing: 'E' });
  board[0][9] = createPiece({ id: 'L_SIL', owner: 'SILVER', kind: 'LASER', facing: 'W' });

  // Pharaohs (kings)
  board[7][5] = createPiece({ id: 'P_RED', owner: 'RED', kind: 'PHARAOH' });
  board[0][4] = createPiece({ id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH' });

  // RED pieces (bottom rows)
  board[7][1] = createPiece({ id: 'R_PYR1', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[7][2] = createPiece({ id: 'R_PYR2', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[7][3] = createPiece({ id: 'R_DJED1', owner: 'RED', kind: 'DJED', mirror: '\\' });
  board[7][4] = createPiece({ id: 'R_PYR3', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[7][6] = createPiece({ id: 'R_PYR4', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[7][7] = createPiece({ id: 'R_DJED2', owner: 'RED', kind: 'DJED', mirror: '/' });
  board[7][8] = createPiece({ id: 'R_PYR5', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[7][9] = createPiece({ id: 'R_PYR6', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  
  board[6][0] = createPiece({ id: 'R_PYR7', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[6][4] = createPiece({ id: 'R_OBE1', owner: 'RED', kind: 'OBELISK' });
  board[6][6] = createPiece({ id: 'R_OBE2', owner: 'RED', kind: 'OBELISK' });

  // SILVER pieces (top rows)
  board[0][0] = createPiece({ id: 'S_PYR1', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[0][1] = createPiece({ id: 'S_PYR2', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[0][2] = createPiece({ id: 'S_DJED1', owner: 'SILVER', kind: 'DJED', mirror: '\\' });
  board[0][3] = createPiece({ id: 'S_PYR3', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[0][5] = createPiece({ id: 'S_PYR4', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[0][6] = createPiece({ id: 'S_DJED2', owner: 'SILVER', kind: 'DJED', mirror: '/' });
  board[0][7] = createPiece({ id: 'S_PYR5', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[0][8] = createPiece({ id: 'S_PYR6', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  
  board[1][3] = createPiece({ id: 'S_OBE1', owner: 'SILVER', kind: 'OBELISK' });
  board[1][5] = createPiece({ id: 'S_OBE2', owner: 'SILVER', kind: 'OBELISK' });
  board[1][9] = createPiece({ id: 'S_PYR7', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });

  return { board, turn: 'RED' };
}

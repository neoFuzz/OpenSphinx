
import { Cell, GameState, createPiece } from '../types';
import { COLS, ROWS } from '../constants';

/**
 * Board is using a Y-X coordinate system
 * @returns
 */
export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Lasers
  board[0][0] = createPiece({ id: 'L_RED', owner: 'RED', kind: 'LASER', facing: 'S' });
  board[7][9] = createPiece({ id: 'L_SIL', owner: 'SILVER', kind: 'LASER', facing: 'N' });

  // Pharaohs (kings)
  board[0][5] = createPiece({ id: 'P_RED', owner: 'RED', kind: 'PHARAOH' });
  board[7][4] = createPiece({ id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH', orientation: 'N' });

  // RED pieces
  board[0][7] = createPiece({ id: 'R_PYR1', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[1][2] = createPiece({ id: 'R_PYR2', owner: 'RED', kind: 'PYRAMID', orientation: 'S' });
  board[3][0] = createPiece({ id: 'R_PYR3', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[3][7] = createPiece({ id: 'R_PYR4', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[4][0] = createPiece({ id: 'R_PYR5', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[4][7] = createPiece({ id: 'R_PYR6', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[5][6] = createPiece({ id: 'R_PYR7', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });

  board[3][4] = createPiece({ id: 'R_DJED1', owner: 'RED', kind: 'DJED', mirror: '\\' });
  board[3][5] = createPiece({ id: 'R_DJED2', owner: 'RED', kind: 'DJED', mirror: '/' });
  
  board[0][4] = createPiece({ id: 'R_OBE1', owner: 'RED', kind: 'OBELISK', orientation: 'S' });
  board[0][6] = createPiece({ id: 'R_OBE2', owner: 'RED', kind: 'OBELISK', orientation: 'S' });

  // SILVER pieces
  board[2][3] = createPiece({ id: 'S_PYR1', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[3][2] = createPiece({ id: 'S_PYR2', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[3][9] = createPiece({ id: 'S_PYR3', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[4][2] = createPiece({ id: 'S_PYR4', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[4][9] = createPiece({ id: 'S_PYR5', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[6][7] = createPiece({ id: 'S_PYR6', owner: 'SILVER', kind: 'PYRAMID', orientation: 'N' });
  board[7][2] = createPiece({ id: 'S_PYR7', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });

  board[4][4] = createPiece({ id: 'S_DJED2', owner: 'SILVER', kind: 'DJED', mirror: '/' });
  board[4][5] = createPiece({ id: 'S_DJED1', owner: 'SILVER', kind: 'DJED', mirror: '\\' });
  
  board[7][3] = createPiece({ id: 'S_OBE1', owner: 'SILVER', kind: 'OBELISK', orientation: 'N' });
  board[7][5] = createPiece({ id: 'S_OBE2', owner: 'SILVER', kind: 'OBELISK', orientation: 'N' });

  return { board, turn: 'RED' };
}

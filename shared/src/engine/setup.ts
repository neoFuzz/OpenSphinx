
import { Cell, GameState, createPiece, GameConfig, RuleVariant, SetupVariant } from '../types';
import { COLS, ROWS } from '../constants';

/**
 * Board is using a Y-X coordinate system
 */
export function createInitialState(config?: GameConfig): GameState {
  const gameConfig: GameConfig = config || { rules: 'CLASSIC', setup: 'CLASSIC' };
  
  switch (gameConfig.setup) {
    case 'IMHOTEP':
      return createImhotepSetup(gameConfig);
    case 'DYNASTY':
      return createDynastySetup(gameConfig);
    case 'CLASSIC':
    default:
      return createClassicSetup(gameConfig);
  }
}

function createClassicSetup(config: GameConfig): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  const isClassic = config.rules === 'CLASSIC';
  
  // Lasers (Classic: off-board, Khet 2.0: movable SPHINX)
  if (!isClassic) {
    board[0][0] = createPiece({ id: 'L_RED', owner: 'RED', kind: 'SPHINX', facing: 'S' });
    board[7][9] = createPiece({ id: 'L_SIL', owner: 'SILVER', kind: 'SPHINX', facing: 'N' });
  }

  // Pharaohs
  board[0][5] = createPiece({ id: 'P_RED', owner: 'RED', kind: 'PHARAOH', orientation: 'N' });
  board[7][4] = createPiece({ id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH', orientation: 'S' });

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
  
  // Classic: OBELISK, Khet 2.0: ANUBIS
  if (isClassic) {
    board[0][4] = createPiece({ id: 'R_OBE1', owner: 'RED', kind: 'OBELISK' });
    board[0][6] = createPiece({ id: 'R_OBE2', owner: 'RED', kind: 'OBELISK' });
  } else {
    board[0][4] = createPiece({ id: 'R_ANB1', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
    board[0][6] = createPiece({ id: 'R_ANB2', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
  }

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
  
  // Classic: OBELISK, Khet 2.0: ANUBIS
  if (isClassic) {
    board[7][3] = createPiece({ id: 'S_OBE1', owner: 'SILVER', kind: 'OBELISK' });
    board[7][5] = createPiece({ id: 'S_OBE2', owner: 'SILVER', kind: 'OBELISK' });
  } else {
    board[7][3] = createPiece({ id: 'S_ANB1', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
    board[7][5] = createPiece({ id: 'S_ANB2', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
  }

  return { board, turn: 'RED', config };
}

function createImhotepSetup(config: GameConfig): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  const isClassic = config.rules === 'CLASSIC';
  
  // Lasers
  if (!isClassic) {
    board[0][0] = createPiece({ id: 'L_RED', owner: 'RED', kind: 'SPHINX', facing: 'S' });
    board[7][9] = createPiece({ id: 'L_SIL', owner: 'SILVER', kind: 'SPHINX', facing: 'N' });
  }

  // Pharaohs
  board[0][4] = createPiece({ id: 'P_RED', owner: 'RED', kind: 'PHARAOH', orientation: 'N' });
  board[7][5] = createPiece({ id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH', orientation: 'S' });

  // RED pieces - Imhotep setup
  board[0][6] = createPiece({ id: 'R_PYR1', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[1][4] = createPiece({ id: 'R_PYR2', owner: 'RED', kind: 'PYRAMID', orientation: 'S' });
  board[2][1] = createPiece({ id: 'R_PYR3', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[2][8] = createPiece({ id: 'R_PYR4', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[5][1] = createPiece({ id: 'R_PYR5', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[5][8] = createPiece({ id: 'R_PYR6', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[6][5] = createPiece({ id: 'R_PYR7', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });

  board[3][3] = createPiece({ id: 'R_DJED1', owner: 'RED', kind: 'DJED', mirror: '\\' });
  board[4][6] = createPiece({ id: 'R_DJED2', owner: 'RED', kind: 'DJED', mirror: '/' });
  
  if (isClassic) {
    board[0][3] = createPiece({ id: 'R_OBE1', owner: 'RED', kind: 'OBELISK' });
    board[0][5] = createPiece({ id: 'R_OBE2', owner: 'RED', kind: 'OBELISK' });
  } else {
    board[0][3] = createPiece({ id: 'R_ANB1', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
    board[0][5] = createPiece({ id: 'R_ANB2', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
  }

  // SILVER pieces - Imhotep setup
  board[1][5] = createPiece({ id: 'S_PYR1', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[2][3] = createPiece({ id: 'S_PYR2', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[2][6] = createPiece({ id: 'S_PYR3', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[5][3] = createPiece({ id: 'S_PYR4', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[5][6] = createPiece({ id: 'S_PYR5', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[6][4] = createPiece({ id: 'S_PYR6', owner: 'SILVER', kind: 'PYRAMID', orientation: 'N' });
  board[7][3] = createPiece({ id: 'S_PYR7', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });

  board[3][6] = createPiece({ id: 'S_DJED1', owner: 'SILVER', kind: 'DJED', mirror: '/' });
  board[4][3] = createPiece({ id: 'S_DJED2', owner: 'SILVER', kind: 'DJED', mirror: '\\' });
  
  if (isClassic) {
    board[7][4] = createPiece({ id: 'S_OBE1', owner: 'SILVER', kind: 'OBELISK' });
    board[7][6] = createPiece({ id: 'S_OBE2', owner: 'SILVER', kind: 'OBELISK' });
  } else {
    board[7][4] = createPiece({ id: 'S_ANB1', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
    board[7][6] = createPiece({ id: 'S_ANB2', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
  }

  return { board, turn: 'RED', config };
}

function createDynastySetup(config: GameConfig): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  const isClassic = config.rules === 'CLASSIC';
  
  // Lasers
  if (!isClassic) {
    board[0][0] = createPiece({ id: 'L_RED', owner: 'RED', kind: 'SPHINX', facing: 'S' });
    board[7][9] = createPiece({ id: 'L_SIL', owner: 'SILVER', kind: 'SPHINX', facing: 'N' });
  }

  // Pharaohs
  board[0][5] = createPiece({ id: 'P_RED', owner: 'RED', kind: 'PHARAOH', orientation: 'N' });
  board[7][4] = createPiece({ id: 'P_SIL', owner: 'SILVER', kind: 'PHARAOH', orientation: 'S' });

  // RED pieces - Dynasty setup
  board[0][7] = createPiece({ id: 'R_PYR1', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[1][6] = createPiece({ id: 'R_PYR2', owner: 'RED', kind: 'PYRAMID', orientation: 'S' });
  board[2][0] = createPiece({ id: 'R_PYR3', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[2][9] = createPiece({ id: 'R_PYR4', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[5][0] = createPiece({ id: 'R_PYR5', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });
  board[5][9] = createPiece({ id: 'R_PYR6', owner: 'RED', kind: 'PYRAMID', orientation: 'N' });
  board[6][3] = createPiece({ id: 'R_PYR7', owner: 'RED', kind: 'PYRAMID', orientation: 'E' });

  board[3][5] = createPiece({ id: 'R_DJED1', owner: 'RED', kind: 'DJED', mirror: '\\' });
  board[4][4] = createPiece({ id: 'R_DJED2', owner: 'RED', kind: 'DJED', mirror: '/' });
  
  if (isClassic) {
    board[0][4] = createPiece({ id: 'R_OBE1', owner: 'RED', kind: 'OBELISK' });
    board[0][6] = createPiece({ id: 'R_OBE2', owner: 'RED', kind: 'OBELISK' });
  } else {
    board[0][4] = createPiece({ id: 'R_ANB1', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
    board[0][6] = createPiece({ id: 'R_ANB2', owner: 'RED', kind: 'ANUBIS', orientation: 'S' });
  }

  // SILVER pieces - Dynasty setup
  board[1][3] = createPiece({ id: 'S_PYR1', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[2][1] = createPiece({ id: 'S_PYR2', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[2][8] = createPiece({ id: 'S_PYR3', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[5][1] = createPiece({ id: 'S_PYR4', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });
  board[5][8] = createPiece({ id: 'S_PYR5', owner: 'SILVER', kind: 'PYRAMID', orientation: 'S' });
  board[6][6] = createPiece({ id: 'S_PYR6', owner: 'SILVER', kind: 'PYRAMID', orientation: 'N' });
  board[7][2] = createPiece({ id: 'S_PYR7', owner: 'SILVER', kind: 'PYRAMID', orientation: 'W' });

  board[3][4] = createPiece({ id: 'S_DJED1', owner: 'SILVER', kind: 'DJED', mirror: '/' });
  board[4][5] = createPiece({ id: 'S_DJED2', owner: 'SILVER', kind: 'DJED', mirror: '\\' });
  
  if (isClassic) {
    board[7][3] = createPiece({ id: 'S_OBE1', owner: 'SILVER', kind: 'OBELISK' });
    board[7][5] = createPiece({ id: 'S_OBE2', owner: 'SILVER', kind: 'OBELISK' });
  } else {
    board[7][3] = createPiece({ id: 'S_ANB1', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
    board[7][5] = createPiece({ id: 'S_ANB2', owner: 'SILVER', kind: 'ANUBIS', orientation: 'N' });
  }

  return { board, turn: 'RED', config };
}

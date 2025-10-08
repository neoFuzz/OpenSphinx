import { Cell, Dir, GameState, Pos, Piece } from '../types';
import { inBounds } from '../constants';
import { logger } from '../logger';

const dirStep: Record<Dir, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
  O: [0, 0] // flag to destroy piece
};

const reflectSlash: Record<Dir, Dir> = {
  N: 'E', E: 'N', S: 'W', W: 'S', O: 'O'
};
const reflectBackslash: Record<Dir, Dir> = {
  N: 'W', W: 'N', S: 'E', E: 'S', O: 'O'
};

function reflect(dir: Dir, mirror: '/' | '\\'): Dir {
  return mirror === '/' ? reflectSlash[dir] : reflectBackslash[dir];
}

function canReflectFromPyramid(laserDir: Dir, pyramidOrientation: Dir): boolean {
  // Pyramid reflection rules:
  // N: north ↔ east reflection
  // E: east ↔ south reflection  
  // S: west ↔ south reflection
  // W: west ↔ north reflection
  const reflectMap: Record<Dir, Dir[]> = {
    N: ['S', 'W'], // N orientation: reflects S->E, W->N
    E: ['N', 'W'], // E orientation: reflects N->E, W->S
    S: ['E', 'N'], // S orientation: reflects E->S, N->W
    W: ['S', 'E'], // W orientation: reflects S->W, E->N
    O: [] // flag to destroy piece
  };
  return reflectMap[pyramidOrientation].includes(laserDir);
}

function reflectFromPyramid(laserDir: Dir, pyramidOrientation: Dir): Dir {
  // Pyramid reflection based on orientation rules
  const reflections: Record<Dir, Record<Dir, Dir>> = {
    N: {
      S: 'E', W: 'N',
      N: 'O',
      E: 'O',
      O: 'O'
    }, // N orientation: S->E, W->N
    E: {
      N: 'E', W: 'S',
      E: 'O',
      S: 'O',
      O: 'O'
    }, // E orientation: N->E, W->S
    S: {
      E: 'S', N: 'W',
      S: 'O',
      W: 'O',
      O: 'O'
    }, // S orientation: E->S, N->W
    W: {
      S: 'W', E: 'N',
      N: 'O',
      W: 'O',
      O: 'O'
    } // W orientation: S->W, E->N
    ,
    O: {
      S: 'O', E: 'O',
      N: 'O',
      W: 'O',
      O: 'O'
    }
  };
  return reflections[pyramidOrientation][laserDir];
}

export interface LaserResult {
  path: Pos[];
  destroyed?: { pos: Pos; piece: Piece; remainingStack?: Piece[] };
  winner?: 'RED' | 'SILVER';
}

/**
 * Fire current player's laser, compute reflections and destruction.
 */
export function fireLaser(state: GameState, gameId?: string): LaserResult {
  const start = findLaserEmitter(state.board, state.turn);
  if (!start) return { path: [] };

  return traceLaserPath(state.board, start, gameId);
}

function findLaserEmitter(board: Cell[][], turn: 'RED' | 'SILVER'): { pos: Pos; dir: Dir } | null {
  // Check for SPHINX pieces on board
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (cell && cell.length > 0) {
        const p = cell[cell.length - 1]; // Get top piece
        if (p.kind === 'SPHINX' && p.owner === turn && p.facing) {
          return { pos: { r, c }, dir: p.facing };
        }
      }
    }
  }

  // Classic rules: off-board lasers fire down specific columns
  if (turn === 'RED') {
    return { pos: { r: -1, c: 0 }, dir: 'S' };
  } else {
    return { pos: { r: 8, c: 9 }, dir: 'N' };
  }
}

function traceLaserPath(board: Cell[][], start: { pos: Pos; dir: Dir }, gameId?: string): LaserResult {
  let { r, c } = start.pos;
  let dir: Dir = start.dir;
  const path: Pos[] = [];

  let [dr, dc] = dirStep[dir];
  r += dr; c += dc;

  // Handle off-board starting positions
  if (!inBounds(r, c) && (start.pos.r === -1 || start.pos.r === 8)) {
    r = start.pos.r === -1 ? 0 : 7;
    c = start.pos.c;
  }

  while (inBounds(r, c)) {
    path.push({ r, c });
    const cell = board[r][c];

    if (!cell || cell.length === 0) {
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
      continue;
    }

    const topPiece = cell[cell.length - 1]; // Get top piece
    const interaction = handleCellInteraction(topPiece, dir, { r, c }, gameId, cell);
    if (interaction.stop) {
      return { path, ...(interaction.result || {}) };
    }
    if (interaction.newDir) {
      dir = interaction.newDir;
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
    }
  }

  return { path };
}

function handleCellInteraction(piece: Piece, dir: Dir, pos: Pos, gameId?: string, cell?: Piece[]) {
  const { r, c } = pos;

  if (piece.kind === 'OBELISK') {
    if (cell && cell.length > 1) {
      // Destroy only top obelisk, leave rest of stack
      logger.info(`DESTROYED: Top ${piece.owner} OBELISK at ${r},${c} by laser traveling ${dir}, ${cell.length - 1} remaining`, { gameId });
      return { stop: true, result: { destroyed: { pos, piece, remainingStack: cell.slice(0, -1) } }, newDir: undefined };
    } else {
      logger.info(`DESTROYED: ${piece.owner} OBELISK at ${r},${c} by laser traveling ${dir}`, { gameId });
      return { stop: true, result: { destroyed: { pos, piece } }, newDir: undefined };
    }
  }

  if (piece.kind === 'ANUBIS') {
    return handleAnubisInteraction(piece, dir, pos, gameId);
  }

  if (piece.kind === 'PHARAOH') {
    logger.info(`DESTROYED: ${piece.owner} PHARAOH at ${r},${c} by laser from ${dir} - GAME OVER`, { gameId });
    return {
      stop: true,
      result: {
        destroyed: { pos, piece },
        winner: piece.owner === 'RED' ? 'SILVER' : 'RED' as 'RED' | 'SILVER'
      },
      newDir: undefined
    };
  }

  if (piece.kind === 'PYRAMID') {
    return handlePyramidInteraction(piece, dir, pos, gameId);
  }

  if (piece.kind === 'DJED') {
    return handleDjedInteraction(piece, dir, pos);
  }

  if (piece.kind === 'LASER' || piece.kind === 'SPHINX') {
    return { stop: true, result: {}, newDir: undefined };
  }

  return { stop: false, newDir: undefined };
}

function handleAnubisInteraction(piece: Piece, dir: Dir, pos: Pos, gameId?: string) {
  const { r, c } = pos;
  const blockMap = { N: 'S', E: 'W', S: 'N', W: 'E', O: 'O' };

  if (piece.orientation && piece.orientation === blockMap[dir]) {
    logger.info(`BLOCKED: ${piece.owner} ANUBIS at ${r},${c} blocks laser from front (${dir})`, { gameId });
    return { stop: true, result: {}, newDir: undefined };
  }

  logger.info(`DESTROYED: ${piece.owner} ANUBIS at ${r},${c} by laser traveling ${dir}`, { gameId });
  return { stop: true, result: { destroyed: { pos, piece } }, newDir: undefined };
}

function handlePyramidInteraction(piece: Piece, dir: Dir, pos: Pos, gameId?: string) {
  const { r, c } = pos;

  if (!piece.orientation) {
    logger.info('WARNING: Pyramid missing orientation in laser logic, using default N', { gameId });
    piece.orientation = 'N';
  }

  if (!canReflectFromPyramid(dir, piece.orientation)) {
    logger.info(`DESTROYED: ${piece.owner} PYRAMID at ${r},${c} (orientation: ${piece.orientation}) by laser traveling ${dir}`, { gameId });
    return { stop: true, result: { destroyed: { pos, piece } }, newDir: undefined };
  }

  const newDir = reflectFromPyramid(dir, piece.orientation);
  logger.debug(`REFLECTED: ${piece.owner} PYRAMID at ${r},${c} (orientation: ${piece.orientation}) reflects laser traveling ${dir} -> ${newDir}`, { gameId });
  return { stop: false, newDir };
}

function handleDjedInteraction(piece: Piece, dir: Dir, pos: Pos) {
  if (!piece.mirror) {
    return { stop: true, result: { destroyed: { pos, piece } }, newDir: undefined };
  }

  const newDir = reflect(dir, piece.mirror);
  return { stop: false, newDir };
}

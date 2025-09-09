import { Cell, Dir, GameState, Pos } from '../types';
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
  destroyed?: { pos: Pos; piece: NonNullable<Cell> };
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
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const p = board[r][c];
      if (p && p.kind === 'LASER' && p.owner === turn && p.facing) {
        return { pos: { r, c }, dir: p.facing };
      }
    }
  }
  return null;
}

function traceLaserPath(board: Cell[][], start: { pos: Pos; dir: Dir }, gameId?: string): LaserResult {
  let { r, c } = start.pos;
  let dir: Dir = start.dir;
  const path: Pos[] = [];

  let [dr, dc] = dirStep[dir];
  r += dr; c += dc;

  while (inBounds(r, c)) {
    path.push({ r, c });
    const cell = board[r][c];

    if (!cell) {
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
      continue;
    }

    const interaction = handleCellInteraction(cell, dir, { r, c }, gameId);
    if (interaction.stop) {
      return { path, ...interaction.result };
    }
    if (interaction.newDir) {
      dir = interaction.newDir;
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
    }
  }

  return { path };
}

function handleCellInteraction(cell: NonNullable<Cell>, dir: Dir, pos: Pos, gameId?: string) {
  const { r, c } = pos;

  if (cell.kind === 'OBELISK') {
    logger.info(`DESTROYED: ${cell.owner} OBELISK at ${r},${c} by laser traveling ${dir}`, { gameId });
    return { stop: true, result: { destroyed: { pos, piece: cell } }, newDir: undefined };
  }

  if (cell.kind === 'ANUBIS') {
    return handleAnubisInteraction(cell, dir, pos, gameId);
  }

  if (cell.kind === 'PHARAOH') {
    logger.info(`DESTROYED: ${cell.owner} PHARAOH at ${r},${c} by laser from ${dir} - GAME OVER`, { gameId });
    return {
      stop: true,
      result: {
        destroyed: { pos, piece: cell },
        winner: cell.owner === 'RED' ? 'SILVER' : 'RED' as 'RED' | 'SILVER'
      },
      newDir: undefined
    };
  }

  if (cell.kind === 'PYRAMID') {
    return handlePyramidInteraction(cell, dir, pos, gameId);
  }

  if (cell.kind === 'DJED') {
    return handleDjedInteraction(cell, dir, pos);
  }

  if (cell.kind === 'LASER') {
    return { stop: true, result: {}, newDir: undefined };
  }

  return { stop: false, newDir: undefined };
}

function handleAnubisInteraction(cell: NonNullable<Cell>, dir: Dir, pos: Pos, gameId?: string) {
  const { r, c } = pos;
  const blockMap = { N: 'S', E: 'W', S: 'N', W: 'E', O: 'O' };
  
  if (cell.orientation && cell.orientation === blockMap[dir]) {
    logger.info(`BLOCKED: ${cell.owner} ANUBIS at ${r},${c} blocks laser from front (${dir})`, { gameId });
    return { stop: true, result: {}, newDir: undefined };
  }
  
  logger.info(`DESTROYED: ${cell.owner} ANUBIS at ${r},${c} by laser traveling ${dir}`, { gameId });
  return { stop: true, result: { destroyed: { pos, piece: cell } }, newDir: undefined };
}

function handlePyramidInteraction(cell: NonNullable<Cell>, dir: Dir, pos: Pos, gameId?: string) {
  const { r, c } = pos;
  
  if (!cell.orientation) {
    logger.info('WARNING: Pyramid missing orientation in laser logic, using default N', { gameId });
    cell.orientation = 'N';
  }
  
  if (!canReflectFromPyramid(dir, cell.orientation)) {
    logger.info(`DESTROYED: ${cell.owner} PYRAMID at ${r},${c} (orientation: ${cell.orientation}) by laser traveling ${dir}`, { gameId });
    return { stop: true, result: { destroyed: { pos, piece: cell } }, newDir: undefined };
  }
  
  const newDir = reflectFromPyramid(dir, cell.orientation);
  logger.debug(`REFLECTED: ${cell.owner} PYRAMID at ${r},${c} (orientation: ${cell.orientation}) reflects laser traveling ${dir} -> ${newDir}`, { gameId });
  return { stop: false, newDir, result: undefined };
}

function handleDjedInteraction(cell: NonNullable<Cell>, dir: Dir, pos: Pos) {
  if (!cell.mirror) {
    return { stop: true, result: { destroyed: { pos, piece: cell } }, newDir: undefined };
  }
  
  const newDir = reflect(dir, cell.mirror);
  return { stop: false, newDir, result: undefined };
}

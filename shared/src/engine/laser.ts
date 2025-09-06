
import { Cell, Dir, GameState, Pos } from '../types';
import { inBounds } from '../constants';

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
export function fireLaser(state: GameState): LaserResult {
  const { board, turn } = state;

  // locate emitter
  let start: { pos: Pos; dir: Dir } | null = null;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const p = board[r][c];
      if (p && p.kind === 'LASER' && p.owner === turn && p.facing) {
        start = { pos: { r, c }, dir: p.facing };
        break;
      }
    }
    if (start) break;
  }
  if (!start) return { path: [] };

  let { r, c } = start.pos;
  let dir: Dir = start.dir;
  const path: Pos[] = [];

  // step into the board from the emitter
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

    if (cell.kind === 'OBELISK') {
      console.log(`DESTROYED: ${cell.owner} OBELISK at ${r},${c} by laser from ${dir}`);
      return { path, destroyed: { pos: { r, c }, piece: cell } };
    }

    if (cell.kind === 'PHARAOH') {
      console.log(`DESTROYED: ${cell.owner} PHARAOH at ${r},${c} by laser from ${dir} - GAME OVER`);
      return {
        path,
        destroyed: { pos: { r, c }, piece: cell },
        winner: cell.owner === 'RED' ? 'SILVER' : 'RED',
      };
    }

    if (cell.kind === 'PYRAMID') {
      // Fix missing orientation
      if (!cell.orientation) {
        console.log('WARNING: Pyramid missing orientation in laser logic, using default N');
        cell.orientation = 'N';
      }
      if (!canReflectFromPyramid(dir, cell.orientation)) {
        console.log(`DESTROYED: ${cell.owner} PYRAMID at ${r},${c} (orientation: ${cell.orientation}) by laser traveling ${dir}`);
        return { path, destroyed: { pos: { r, c }, piece: cell } };
      }
      console.log(`REFLECTED: ${cell.owner} PYRAMID at ${r},${c} (orientation: ${cell.orientation}) reflects laser traveling ${dir} -> ${reflectFromPyramid(dir, cell.orientation)}`);
      // Reflect from mirror
      dir = reflectFromPyramid(dir, cell.orientation);
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
      continue;
    }

    if (cell.kind === 'DJED') {
      if (!cell.mirror) {
        return { path, destroyed: { pos: { r, c }, piece: cell } };
      }
      // Reflect according to mirror
      dir = reflect(dir, cell.mirror);
      [dr, dc] = dirStep[dir];
      r += dr; c += dc;
      continue;
    }

    if (cell.kind === 'LASER') {
      // absorb on emitter; no destruction
      return { path };
    }
  }

  return { path };
}


import { Cell, Dir, GameState, Pos } from '../types';
import { inBounds } from '../constants';

const dirStep: Record<Dir, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

const reflectSlash: Record<Dir, Dir> = { N: 'E', E: 'N', S: 'W', W: 'S' };
const reflectBackslash: Record<Dir, Dir> = { N: 'W', W: 'N', S: 'E', E: 'S' };

function reflect(dir: Dir, mirror: '/' | '\\'): Dir {
  return mirror === '/' ? reflectSlash[dir] : reflectBackslash[dir];
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
      return { path, destroyed: { pos: { r, c }, piece: cell } };
    }

    if (cell.kind === 'PHARAOH') {
      return {
        path,
        destroyed: { pos: { r, c }, piece: cell },
        winner: cell.owner === 'RED' ? 'SILVER' : 'RED',
      };
    }

    if (cell.kind === 'PYRAMID' || cell.kind === 'DJED') {
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

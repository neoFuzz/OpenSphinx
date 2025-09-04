
import { GameState, Move } from '../types';
import { inBounds } from '../constants';
import { fireLaser } from './laser';

export function applyMove(state: GameState, move: Move): GameState {
  // simple deep clone for safety
  const s: GameState = JSON.parse(JSON.stringify(state));
  // Clean up pyramids to ensure they only have orientation
  s.board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell?.kind === 'PYRAMID') {
        //console.log(`After JSON clone - Pyramid at ${r},${c}: orientation=${cell.orientation}, mirror=${cell.mirror}`);
        // Remove any incorrect mirror property
        if ((cell as any).mirror) {
          console.log(`WARNING: Pyramid at ${r},${c} has mirror property, removing it`);
          delete (cell as any).mirror;
        }
        // Fix missing orientation after cloning
        if (!cell.orientation) {
          console.log(`WARNING: Pyramid at ${r},${c} missing orientation after clone, setting default`);
          cell.orientation = r < 4 ? 'S' : 'N'; // Silver pyramids face S, Red pyramids face N
        }
      }
    });
  });
  if (s.winner) return s;

  const { board, turn } = s;
  const from = move.from;
  if (!inBounds(from.r, from.c)) return s;
  const piece = board[from.r][from.c];
  if (!piece || piece.owner !== turn) return s;

  if (move.type === 'MOVE') {
    if (!move.to || !inBounds(move.to.r, move.to.c)) return s;
    const dr = Math.abs(move.to.r - from.r);
    const dc = Math.abs(move.to.c - from.c);
    if ((dr + dc) !== 1) return s; // orthogonal 1 step
    if (board[move.to.r][move.to.c]) return s; // occupied

    board[move.to.r][move.to.c] = piece;
    board[from.r][from.c] = null;

  } else if (move.type === 'ROTATE') {
    if (!move.rotation || (move.rotation !== 90 && move.rotation !== -90)) return s;

    console.log(`Before rotation - Piece:`, JSON.stringify(piece, null, 2));
    
    if (piece.kind === 'PYRAMID') {
      // Ensure pyramids always have orientation, never mirror
      if (!piece.orientation) {
        console.log('WARNING: Pyramid missing orientation, setting default N');
        piece.orientation = 'N';
      }
      const newOrientation = rotateDir(piece.orientation, move.rotation);
      piece.orientation = newOrientation;
      board[from.r][from.c] = piece; // Ensure board reference is updated
      delete (piece as any).mirror;
      console.log(`After rotation - Pyramid orientation: ${piece.orientation}`);
    } else if (piece.mirror) {
      piece.mirror = piece.mirror === '/' ? '\\' : '/';
    }
    if (piece.facing) {
      piece.facing = rotateDir(piece.facing, move.rotation);
    }
  }

  // Fire laser
  const result = fireLaser(s);
  s.lastLaserPath = result.path;

  if (result.destroyed) {
    const { r, c } = result.destroyed.pos;
    s.board[r][c] = null;
  }
  if (result.winner) {
    s.winner = result.winner;
  } else {
    s.turn = s.turn === 'RED' ? 'SILVER' : 'RED';
  }
  return s;
}

function rotateDir(d: 'N'|'E'|'S'|'W'|'O', rot: 90 | -90): 'N'|'E'|'S'|'W'|'O' {
  if (d === 'O') return 'O';
  const order: ('N'|'E'|'S'|'W')[] = ['N', 'E', 'S', 'W'];
  let i = order.indexOf(d);
  i = (i + (rot === 90 ? 1 : 3)) % 4;
  return order[i];
}

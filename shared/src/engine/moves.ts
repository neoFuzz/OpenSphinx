
import { Dir, GameState, Move } from '../types';
import { inBounds } from '../constants';
import { fireLaser } from './laser';
import { logger } from '../logger';

export function applyMove(state: GameState, move: Move, gameId?: string): GameState {
  const s = cloneAndFixPyramids(state, gameId);
  if (s.winner) return s;

  const piece = validateMove(s, move);
  if (!piece) return s;

  if (move.type === 'MOVE') {
    if (!processMove(s, move, piece)) return s;
  } else if (move.type === 'ROTATE') {
    if (!processRotation(s, move, piece, gameId)) return s;
  }

  return finalizeTurn(s, gameId);
}

function cloneAndFixPyramids(state: GameState, gameId?: string): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell?.kind === 'PYRAMID') {
        logger.debug(`After JSON clone - Pyramid at ${r},${c}: orientation=${cell.orientation}, mirror=${cell.mirror}`, { gameId });
        if ((cell as any).mirror) {
          logger.warn(`Pyramid at ${r},${c} has mirror property, removing it`, { gameId });
          delete (cell as any).mirror;
        }
        if (!cell.orientation) {
          logger.warn(`Pyramid at ${r},${c} missing orientation after clone, setting default`, { gameId });
          cell.orientation = r < 4 ? 'S' : 'N';
        }
      }
    });
  });
  return s;
}

function validateMove(state: GameState, move: Move) {
  const { board, turn } = state;
  const from = move.from;
  if (!inBounds(from.r, from.c)) return null;
  const piece = board[from.r][from.c];
  if (!piece || piece.owner !== turn) return null;
  if (move.type === 'MOVE' && piece.kind === 'LASER') return null;
  return piece;
}

function processMove(state: GameState, move: Move, piece: any): boolean {
  if (!move.to || !inBounds(move.to.r, move.to.c)) return false;
  const dr = Math.abs(move.to.r - move.from.r);
  const dc = Math.abs(move.to.c - move.from.c);
  if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;

  if (!isValidZoneMove(piece, move.to)) return false;

  const targetPiece = state.board[move.to.r][move.to.c];
  if (targetPiece) {
    return performSwap(state, move, piece, targetPiece);
  } else {
    state.board[move.to.r][move.to.c] = piece;
    state.board[move.from.r][move.from.c] = null;
    return true;
  }
}

function isValidZoneMove(piece: any, to: { r: number; c: number }): boolean {
  const isRedZone = to.c === 0 || (to.c === 8 && (to.r === 0 || to.r === 7));
  const isSilverZone = to.c === 9 || (to.c === 1 && (to.r === 0 || to.r === 7));
  return !((piece.owner === 'RED' && isSilverZone) || (piece.owner === 'SILVER' && isRedZone));
}

function performSwap(state: GameState, move: Move, piece: any, targetPiece: any): boolean {
  if (piece.kind !== 'DJED') return false;
  if (targetPiece.owner === piece.owner || targetPiece.kind === 'PHARAOH' || targetPiece.kind === 'LASER') return false;
  
  state.board[move.to!.r][move.to!.c] = piece;
  state.board[move.from.r][move.from.c] = targetPiece;
  return true;
}

function processRotation(state: GameState, move: Move, piece: any, gameId?: string): boolean {
  if (!move.rotation || (move.rotation !== 90 && move.rotation !== -90)) return false;

  logger.debug(`Before rotation - Piece:`, JSON.stringify(piece, null, 2), { gameId });

  rotatePieceOrientation(piece, move.rotation, gameId);
  rotatePieceFacing(piece, move.from, move.rotation);
  
  state.board[move.from.r][move.from.c] = piece;
  return true;
}

function rotatePieceOrientation(piece: any, rotation: 90 | -90, gameId?: string) {
  if (piece.kind === 'PYRAMID') {
    if (!piece.orientation) {
      logger.warn('Pyramid missing orientation, setting default N', { gameId });
      piece.orientation = 'N';
    }
    piece.orientation = rotateDir(piece.orientation, rotation);
    delete (piece as any).mirror;
    logger.debug(`After rotation - Pyramid orientation: ${piece.orientation}`, { gameId });
  } else if (piece.kind === 'ANUBIS') {
    if (!piece.orientation) piece.orientation = 'N';
    piece.orientation = rotateDir(piece.orientation, rotation);
  } else if (piece.mirror) {
    piece.mirror = piece.mirror === '/' ? '\\' : '/';
  }
}

function rotatePieceFacing(piece: any, from: { r: number; c: number }, rotation: 90 | -90) {
  if (piece.facing) {
    const newFacing = rotateDir(piece.facing, rotation);
    if (piece.kind === 'LASER') {
      if (isValidLaserFacing(from, newFacing)) {
        piece.facing = newFacing;
      }
    } else {
      piece.facing = newFacing;
    }
  }
}

function finalizeTurn(state: GameState, gameId?: string): GameState {
  const result = fireLaser(state, gameId);
  state.lastLaserPath = result.path;

  if (result.destroyed) {
    const { r, c } = result.destroyed.pos;
    state.board[r][c] = null;
  }
  if (result.winner) {
    state.winner = result.winner;
  } else {
    state.turn = state.turn === 'RED' ? 'SILVER' : 'RED';
  }
  return state;
}

function rotateDir(d: Dir, rot: 90 | -90): Dir {
  if (d === 'O') return 'O';
  const order: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
  let i = order.indexOf(d);
  i = (i + (rot === 90 ? 1 : 3)) % 4;
  return order[i];
}

function isValidLaserFacing(pos: { r: number; c: number }, facing: 'N' | 'E' | 'S' | 'W' | 'O'): boolean {
  // RED laser at (0,0) can only face S or E (into the board)
  if (pos.r === 0 && pos.c === 0) {
    return facing === 'S' || facing === 'E';
  }
  // SILVER laser at (7,9) can only face N or W (into the board)
  if (pos.r === 7 && pos.c === 9) {
    return facing === 'N' || facing === 'W';
  }
  // For any other position (shouldn't happen in normal game), allow all directions
  return true;
}

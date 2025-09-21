
import { Dir, GameState, Move } from '../types';
import { inBounds } from '../constants';
import { fireLaser } from './laser';
import { isValidSphinxFacing } from './sphinx-utils';
import { logger } from '../logger';

export function applyMove(state: GameState, move: Move, gameId?: string): GameState {
  const s = cloneAndFixPyramids(state, gameId);
  if (s.winner) return s;

  const piece = validateMove(s, move);
  if (!piece) return s;

  if (move.type === 'MOVE') {
    if (!processMove(s, move, piece, gameId)) return s;
  } else if (move.type === 'ROTATE') {
    if (!processRotation(s, move, piece, gameId)) return s;
  }

  return finalizeTurn(s, gameId);
}

function cloneAndFixPyramids(state: GameState, gameId?: string): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && cell.length > 0) {
        cell.forEach(piece => {
          if (piece.kind === 'PYRAMID') {
            processPyramidPiece(piece, r, c, gameId);
          }
        });
      }
    });
  });
  return s;
}

function processPyramidPiece(piece: any, r: number, c: number, gameId?: string) {
  logger.debug(`After JSON clone - Pyramid at ${r},${c}: orientation=${piece.orientation}, mirror=${(piece as any).mirror}`, { gameId });
  if ((piece as any).mirror) {
    logger.warn(`Pyramid at ${r},${c} has mirror property, removing it`, { gameId });
    delete (piece as any).mirror;
  }
  if (!piece.orientation) {
    logger.warn(`Pyramid at ${r},${c} missing orientation after clone, setting default`, { gameId });
    piece.orientation = r < 4 ? 'S' : 'N';
  }
}

function validateMove(state: GameState, move: Move) {
  const { board, turn } = state;
  const from = move.from;
  if (!inBounds(from.r, from.c)) return null;
  const cell = board[from.r][from.c];
  if (!cell || cell.length === 0) return null;
  const piece = cell[cell.length - 1]; // Get top piece
  if (piece.owner !== turn) return null;
  if (move.type === 'MOVE' && (piece.kind === 'LASER' || piece.kind === 'SPHINX')) return null;
  return piece;
}

function processMove(state: GameState, move: Move, piece: any, gameId?: string): boolean {
  if (!move.to || !inBounds(move.to.r, move.to.c)) return false;
  const dr = Math.abs(move.to.r - move.from.r);
  const dc = Math.abs(move.to.c - move.from.c);
  if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;

  if (!isValidZoneMove(piece, move.to)) return false;

  const fromCell = state.board[move.from.r][move.from.c];
  if (!fromCell || fromCell.length === 0) return false;
  
  const targetCell = state.board[move.to.r][move.to.c];

  if (targetCell && targetCell.length > 0) {
    const targetPiece = targetCell[targetCell.length - 1];
    if (piece.kind === 'OBELISK' && targetPiece.kind === 'OBELISK' && 
        piece.owner === targetPiece.owner && state.config?.rules === 'CLASSIC') {
      return handleObeliskStacking(state, move, fromCell, targetCell, gameId);
    }
    return performSwap(state, move, piece, targetPiece);
  } else {
    return handleObeliskMovement(state, move, piece, fromCell);
  }
}

function handleObeliskStacking(state: GameState, move: Move, fromCell: any[], targetCell: any[], gameId?: string): boolean {
  if (!move.to) return false;
  
  const wouldExceedLimit = move.moveStack === false ? 
    targetCell.length >= 2 : 
    targetCell.length + fromCell.length > 2;
  
  if (wouldExceedLimit) {
    logger.warn('Obelisk stacking failed - would exceed limit', { 
      gameId, 
      targetLength: targetCell.length, 
      fromLength: fromCell.length, 
      moveStack: move.moveStack 
    });
    return false;
  }
  
  logger.info('Obelisk stacking', { 
    gameId, 
    from: `${move.from.r},${move.from.c}`, 
    to: `${move.to.r},${move.to.c}`, 
    moveStack: move.moveStack 
  });
  
  if (move.moveStack === false) {
    if (fromCell.length === 0) return false;
    const topPiece = fromCell.pop();
    if (!topPiece) return false;
    targetCell.push(topPiece);
    if (fromCell.length === 0) {
      state.board[move.from.r][move.from.c] = null;
    }
  } else {
    // Move entire stack - direct assignment since fromCell will be nullified
    while (fromCell.length > 0) {
      const piece = fromCell.pop();
      if (piece) targetCell.push(piece);
    }
    state.board[move.from.r][move.from.c] = null;
  }
  return true;
}

function handleObeliskMovement(state: GameState, move: Move, piece: any, fromCell: any[]): boolean {
  if (piece.kind === 'OBELISK' && fromCell.length > 1 && state.config?.rules === 'CLASSIC') {
    if (move.moveStack === false) {
      if (fromCell.length === 0) return false;
      const topPiece = fromCell.pop();
      if (!topPiece) return false;
      state.board[move.to!.r][move.to!.c] = [topPiece];
    } else {
      state.board[move.to!.r][move.to!.c] = [...fromCell];
      state.board[move.from.r][move.from.c] = null;
    }
  } else {
    if (fromCell.length === 0) return false;
    const movingPiece = fromCell.pop();
    if (!movingPiece) return false;
    state.board[move.to!.r][move.to!.c] = [movingPiece];
    if (fromCell.length === 0) {
      state.board[move.from.r][move.from.c] = null;
    }
  }
  return true;
}

function isValidZoneMove(piece: any, to: { r: number; c: number }): boolean {
  const isRedZone = to.c === 0 || (to.c === 8 && (to.r === 0 || to.r === 7));
  const isSilverZone = to.c === 9 || (to.c === 1 && (to.r === 0 || to.r === 7));
  return !((piece.owner === 'RED' && isSilverZone) || (piece.owner === 'SILVER' && isRedZone));
}

function performSwap(state: GameState, move: Move, piece: any, targetPiece: any): boolean {
  if (piece.kind !== 'DJED') return false;
  if (targetPiece.kind === 'PHARAOH' || targetPiece.kind === 'LASER' || targetPiece.kind === 'SPHINX') return false;
  if (targetPiece.kind !== 'PYRAMID' && targetPiece.kind !== 'OBELISK' && targetPiece.kind !== 'ANUBIS') return false;

  const fromCell = state.board[move.from.r][move.from.c];
  const toCell = state.board[move.to!.r][move.to!.c];
  
  if (!fromCell || fromCell.length === 0 || !toCell || toCell.length === 0) return false;

  const movingPiece = fromCell.pop();
  const swappedPiece = toCell.pop();
  
  if (!movingPiece || !swappedPiece) return false;

  toCell.push(movingPiece);
  fromCell.push(swappedPiece);

  return true;
}

function processRotation(state: GameState, move: Move, piece: any, gameId?: string): boolean {
  if (!move.rotation || (move.rotation !== 90 && move.rotation !== -90)) return false;

  logger.debug(`Before rotation - Piece:`, JSON.stringify(piece, null, 2), { gameId });

  rotatePieceOrientation(piece, move.rotation, gameId);
  rotatePieceFacing(piece, move.from, move.rotation);

  // Piece is modified by reference in the board array - no reassignment needed
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
    } else if (piece.kind === 'SPHINX') {
      if (isValidSphinxFacing(from, newFacing)) {
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
    handleDestroyedPiece(state, result.destroyed);
  }
  
  if (result.winner) {
    state.winner = result.winner;
  } else {
    state.turn = state.turn === 'RED' ? 'SILVER' : 'RED';
  }
  return state;
}

function handleDestroyedPiece(state: GameState, destroyed: any) {
  const { r, c } = destroyed.pos;
  if (!destroyed.remainingStack || destroyed.remainingStack.length === 0) {
    state.board[r][c] = null;
  } else {
    state.board[r][c] = destroyed.remainingStack;
  }
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

// Removed - now using shared utility function

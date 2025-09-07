
import React, { useMemo, useState } from 'react';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Pos } from '../../../shared/src/types';
import './board.css';

export function Board() {
  const state = useGame(s => s.state);
  const color = useGame(s => s.color);
  const sendMove = useGame(s => s.sendMove);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);

  const myTurn = state && color && state.turn === color;

  const getValidMoves = (pos: Pos) => {
    if (!state) return [];
    const piece = state.board[pos.r][pos.c];
    if (!piece || piece.kind === 'LASER') return [];

    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newR = pos.r + dr;
        const newC = pos.c + dc;
        if (newR >= 0 && newR < ROWS && newC >= 0 && newC < COLS) {
          const targetPiece = state.board[newR][newC];
          if (!targetPiece) {
            moves.push({ r: newR, c: newC, type: 'move' });
          } else if (piece.kind === 'DJED' && (
            targetPiece.kind === 'PYRAMID' ||
            targetPiece.kind === 'OBELISK' ||
            targetPiece.kind === 'ANUBIS')) {
            moves.push({ r: newR, c: newC, type: 'swap' });
          }
        }
      }
    }
    return moves;
  };

  const onCellClick = (pos: Pos) => {
    if (!myTurn || !state) return;

    const piece = state.board[pos.r][pos.c];

    if (piece && piece.owner === color) {
      // Select own piece
      setSelectedPos(pos);
    } else if (selectedPos) {
      // Move to empty cell or swap (for Djed)
      const dr = Math.abs(pos.r - selectedPos.r);
      const dc = Math.abs(pos.c - selectedPos.c);
      const selectedPiece = state.board[selectedPos.r][selectedPos.c];

      if (dr <= 1 && dc <= 1 && (dr > 0 || dc > 0)) {
        if (!piece || (selectedPiece?.kind === 'DJED' &&
          (piece.kind === 'PYRAMID' || piece.kind === 'OBELISK' || piece.kind === 'ANUBIS'))) {
          sendMove({ type: 'MOVE', from: selectedPos, to: pos });
        }
      }
      setSelectedPos(null);
    } else {
      setSelectedPos(null);
    }
  };

  if (!state) return <div>Waiting for state…</div>;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <b>Turn:</b> {state.turn} {myTurn ? '(your move)' : ''}
      </div>
      <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, 48px)` }}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const validMoves = selectedPos && myTurn ? getValidMoves(selectedPos) : [];
          return <Cell key={`${r}-${c}`} r={r} c={c} onCellClick={onCellClick} selectedPos={selectedPos} validMoves={validMoves} />;
        })}
      </div>
    </div>
  );
}

function Cell({ r, c, onCellClick, selectedPos, validMoves }: Pos & { onCellClick: (pos: Pos) => void; selectedPos: Pos | null; validMoves: Array<{ r: number, c: number, type: string }> }) {
  const state = useGame(s => s.state)!;
  const piece = state.board[r][c];
  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
  const moveHighlight = validMoves.find(m => m.r === r && m.c === c);

  let bgColor = undefined;
  if (isSelected) bgColor = '#ffeb3b';
  else if (moveHighlight?.type === 'move') bgColor = '#4caf50';
  else if (moveHighlight?.type === 'swap') bgColor = '#ffc107';

  return (
    <div className="cell" onClick={() => onCellClick({ r, c })} style={{ cursor: 'pointer', background: bgColor }}>
      {piece && <PieceView r={r} c={c} isSelected={isSelected} />}
      {state.lastLaserPath?.some(p => p.r === r && p.c === c) && (
        <div className="laser" />
      )}
    </div>
  );
}

function PieceSVG({ piece }: { piece: NonNullable<typeof state.board[0][0]> }) {
  const color = piece.owner === 'RED' ? '#cc4444' : '#4444cc';
  const rotation = piece.orientation ? ['N', 'E', 'S', 'W'].indexOf(piece.orientation) * 90 :
    piece.facing ? ['N', 'E', 'S', 'W'].indexOf(piece.facing) * 90 : 0;

  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <g transform={`rotate(${rotation} 20 20)`}>
        {piece.kind === 'PHARAOH' && (
          <rect x="15" y="15" width="10" height="10" fill={color} stroke="#000" strokeWidth="1" />
        )}
        {piece.kind === 'PYRAMID' && (
          <polygon points="10,10 10,30 30,30" fill={color} stroke="#000" strokeWidth="1" />
        )}
        {piece.kind === 'DJED' && (
          <>
            <rect x="10" y="10" width="20" height="20" fill={color} stroke="#000" strokeWidth="1" />
            <line x1={piece.mirror === '/' ? "25" : "15"} y1="15" x2={piece.mirror === '/' ? "15" : "25"} y2="25" stroke="#fff" strokeWidth="2" />
          </>
        )}
        {piece.kind === 'OBELISK' && (
          <rect x="17" y="12" width="6" height="16" fill={color} stroke="#000" strokeWidth="1" />
        )}
        {piece.kind === 'ANUBIS' && (
          <>
            <rect x="15" y="15" width="10" height="10" fill={color} stroke="#000" strokeWidth="1" />
            <rect x="17" y="10" width="2" height="8" fill={color} />
            <rect x="21" y="10" width="2" height="8" fill={color} />
          </>
        )}
        {piece.kind === 'LASER' && (
          <>
            <circle cx="20" cy="20" r="8" fill={color} stroke="#000" strokeWidth="1" />
            <polygon points="20,12 25,20 20,20 15,20" fill="#fff" />
          </>
        )}
      </g>
    </svg>
  );
}

function PieceView({ r, c, isSelected }: Pos & { isSelected: boolean }) {
  const state = useGame(s => s.state)!;
  const color = useGame(s => s.color)!;
  const sendMove = useGame(s => s.sendMove);
  const piece = state.board[r][c]!;
  const isMyTurn = state.turn === color && piece.owner === color;

  const onRotate = (delta: 90 | -90) => {
    if (!isMyTurn) return;
    sendMove({ type: 'ROTATE', from: { r, c }, rotation: delta });
  };

  return (
    <div className="piece" style={{ position: 'relative' }}>
      <PieceSVG piece={piece} />
      {isSelected && isMyTurn && (
        <div className="radial-menu">
          <button
            className="radial-btn radial-btn-left"
            onClick={(e) => { e.stopPropagation(); onRotate(-90); }} >⟲</button>
          <button
            className="radial-btn radial-btn-right"
            onClick={(e) => { e.stopPropagation(); onRotate(90); }} >⟳</button>
        </div>
      )}
    </div>
  );
}

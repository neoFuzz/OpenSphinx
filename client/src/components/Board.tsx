import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Pos } from '../../../shared/src/types';
import { PieceSVG } from './BoardComponents';
import './board.css';

export function Board() {
  const state = useGame(s => s.state);
  const color = useGame(s => s.color);
  const sendMove = useGame(s => s.sendMove);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [animatingPieces, setAnimatingPieces] = useState<Map<string, {x: number, y: number, rotation: number}>>(new Map());
  const animationRefs = useRef<Map<string, number>>(new Map());
  const prevStateRef = useRef(state);
  
  // Detect piece movements and trigger animations
  useEffect(() => {
    if (!state || !prevStateRef.current) {
      prevStateRef.current = state;
      return;
    }
    
    const prevState = prevStateRef.current;
    
    // Find pieces that moved
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const currentPiece = state.board[r][c];
        if (!currentPiece) continue;
        
        // Find where this piece was in the previous state
        for (let pr = 0; pr < ROWS; pr++) {
          for (let pc = 0; pc < COLS; pc++) {
            const prevPiece = prevState.board[pr][pc];
            if (prevPiece?.id === currentPiece.id && (pr !== r || pc !== c)) {
              // Piece moved from (pr, pc) to (r, c)
              const deltaX = (pc - c) * 50;
              const deltaY = (pr - r) * 50;
              animateMove(currentPiece.id, deltaX, deltaY);
              break;
            }
          }
        }
      }
    }
    
    prevStateRef.current = state;
  }, [state]);

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
          // Check zone restrictions
          const isRedZone = newC === 0 || (newC === 8 && (newR === 0 || newR === 7));
          const isSilverZone = newC === 9 || (newC === 1 && (newR === 0 || newR === 7));

          if ((piece.owner === 'RED' && isSilverZone) || (piece.owner === 'SILVER' && isRedZone)) {
            continue; // Can't move into opponent's zone
          }

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

    if (selectedPos) {
      // Handle move or swap
      const dr = Math.abs(pos.r - selectedPos.r);
      const dc = Math.abs(pos.c - selectedPos.c);
      const selectedPiece = state.board[selectedPos.r][selectedPos.c];

      if (dr <= 1 && dc <= 1 && (dr > 0 || dc > 0)) {
        if (!piece) {
          // Move to empty space
          sendMove({ type: 'MOVE', from: selectedPos, to: pos });
          setSelectedPos(null);
          return;
        } else if (selectedPiece?.kind === 'DJED' && 
          (piece.kind === 'PYRAMID' || piece.kind === 'OBELISK' || piece.kind === 'ANUBIS')) {
          // Djed swap with any pyramid/obelisk/anubis (friendly or enemy)
          sendMove({ type: 'MOVE', from: selectedPos, to: pos });
          setSelectedPos(null);
          return;
        }
      }
      
      // If we get here, either invalid move or selecting new piece
      if (piece && piece.owner === color) {
        setSelectedPos(pos);
      } else {
        setSelectedPos(null);
      }
    } else if (piece && piece.owner === color) {
      // Select own piece
      setSelectedPos(pos);
    } else {
      setSelectedPos(null);
    }
  };

  const animateMove = useCallback((pieceId: string, deltaX: number, deltaY: number) => {
    const startTime = Date.now();
    const duration = 300;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      setAnimatingPieces(prev => new Map(prev).set(pieceId, {
        x: -deltaX * (1 - eased),
        y: -deltaY * (1 - eased),
        rotation: 0
      }));
      
      if (progress < 1) {
        animationRefs.current.set(pieceId, requestAnimationFrame(animate));
      } else {
        setAnimatingPieces(prev => {
          const next = new Map(prev);
          next.delete(pieceId);
          return next;
        });
        animationRefs.current.delete(pieceId);
      }
    };
    
    animate();
  }, []);
  
  const animateRotation = useCallback((pieceId: string, direction: 'cw' | 'ccw') => {
    const startTime = Date.now();
    const duration = 250;
    const targetRotation = direction === 'cw' ? 90 : -90;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatingPieces(prev => new Map(prev).set(pieceId, {
        x: 0,
        y: 0,
        rotation: targetRotation * eased
      }));
      
      if (progress < 1) {
        animationRefs.current.set(pieceId, requestAnimationFrame(animate));
      } else {
        setAnimatingPieces(prev => {
          const next = new Map(prev);
          next.delete(pieceId);
          return next;
        });
        animationRefs.current.delete(pieceId);
      }
    };
    
    animate();
  }, []);

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
          return <Cell key={`${r}-${c}`} r={r} c={c} onCellClick={onCellClick} selectedPos={selectedPos} validMoves={validMoves} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} />;
        })}
      </div>
    </div>
  );
}

function Cell({ r, c, onCellClick, selectedPos, validMoves, animatingPieces, setSelectedPos, animateRotation }: Pos & { onCellClick: (pos: Pos) => void; selectedPos: Pos | null; validMoves: Array<{ r: number, c: number, type: string }>; animatingPieces: Map<string, {x: number, y: number, rotation: number}>; setSelectedPos: React.Dispatch<React.SetStateAction<Pos | null>>; animateRotation: (pieceId: string, direction: 'cw' | 'ccw') => void }) {
  const state = useGame(s => s.state)!;
  const piece = state.board[r][c];
  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
  const moveHighlight = validMoves.find(m => m.r === r && m.c === c);

  let bgColor = undefined;

  // Color tiles based on player zones
  if (c === 0 || (c === 8 && (r === 0 || r === 7))) {
    bgColor = '#ffcccc'; // RED zone
  } else if (c === 9 || (c === 1 && (r === 0 || r === 7))) {
    bgColor = '#ccccff'; // SILVER zone
  }

  if (isSelected) bgColor = '#ffeb3b';
  else if (moveHighlight?.type === 'move') bgColor = '#4caf50';
  else if (moveHighlight?.type === 'swap') bgColor = '#ffc107';

  return (
    <div className="cell" onClick={() => onCellClick({ r, c })} style={{ cursor: 'pointer', background: bgColor }}>
      {piece && <PieceView r={r} c={c} isSelected={isSelected} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} />}
      {state.lastLaserPath?.some(p => p.r === r && p.c === c) && (
        <div className="laser" />
      )}
    </div>
  );
}

function PieceView({ r, c, isSelected, animatingPieces, setSelectedPos, animateRotation }: Pos & { isSelected: boolean; animatingPieces: Map<string, {x: number, y: number, rotation: number}>; setSelectedPos: React.Dispatch<React.SetStateAction<Pos | null>>; animateRotation: (pieceId: string, direction: 'cw' | 'ccw') => void }) {
  const state = useGame(s => s.state)!;
  const color = useGame(s => s.color)!;
  const sendMove = useGame(s => s.sendMove);
  const piece = state.board[r][c]!;
  const isMyTurn = state.turn === color && piece.owner === color;

  const onRotate = (delta: 90 | -90) => {
    if (!isMyTurn) return;
    
    const direction = delta === 90 ? 'cw' : 'ccw';
    animateRotation(piece.id, direction);
    
    sendMove({ type: 'ROTATE', from: { r, c }, rotation: delta });
    setSelectedPos(null);
  };

  const animationState = animatingPieces.get(piece.id);
  
  let transform = '';
  let zIndex = 1;
  
  if (animationState) {
    transform = `translate(${animationState.x}px, ${animationState.y}px) rotate(${animationState.rotation}deg)`;
    zIndex = 100;
  }

  return (
    <div className="piece" style={{ position: 'relative', transform, zIndex }}>
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
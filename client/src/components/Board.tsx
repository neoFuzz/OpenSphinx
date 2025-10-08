import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Pos } from '../../../shared/src/types';
import { getNextValidSphinxDirection, getSphinxRotationDelta } from '../../../shared/src/engine/sphinx-utils';
import { PieceSVG } from './BoardComponents';
import { showExplosionEffect, playExplosionSound } from '../utils/explosionEffect';
import './board.css';

export function Board() {
  const state = useGame(s => s.state);
  const color = useGame(s => s.color);
  const sendMove = useGame(s => s.sendMove);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [unstackMode, setUnstackMode] = useState(false);
  const [lockedStacks, setLockedStacks] = useState<Set<string>>(new Set());
  const [animatingPieces, setAnimatingPieces] = useState<Map<string, { x: number, y: number, rotation: number }>>(new Map());
  const animationRefs = useRef<Map<string, number>>(new Map());
  const prevStateRef = useRef(state);
  const boardRef = useRef<HTMLDivElement>(null);

  // Detect piece movements and destroyed pieces
  useEffect(() => {
    if (!state || !prevStateRef.current) {
      prevStateRef.current = state;
      return;
    }

    const prevState = prevStateRef.current;

    // Find destroyed pieces (only check if laser was fired)
    if (state.lastLaserPath && state.lastLaserPath.length > 0) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const prevCell = prevState.board[r][c];
          const currentCell = state.board[r][c];

          // Check if piece was destroyed (not moved) by seeing if it exists elsewhere
          if (prevCell && prevCell.length > 0 && (!currentCell || currentCell.length === 0)) {
            const prevPiece = prevCell[prevCell.length - 1];
            let pieceMovedElsewhere = false;

            // Check if this piece moved to another location
            for (let nr = 0; nr < ROWS && !pieceMovedElsewhere; nr++) {
              for (let nc = 0; nc < COLS && !pieceMovedElsewhere; nc++) {
                const newCell = state.board[nr][nc];
                if (newCell && newCell.some(p => p.id === prevPiece.id)) {
                  pieceMovedElsewhere = true;
                }
              }
            }

            // Only show explosion if piece was actually destroyed (not moved)
            if (!pieceMovedElsewhere && boardRef.current) {
              const x = c * 50 + 25;
              const y = r * 50 + 25;
              showExplosionEffect(x, y, boardRef.current);
              playExplosionSound();
            }
          }
        }
      }
    }

    // Find pieces that moved
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const currentCell = state.board[r][c];
        if (!currentCell || currentCell.length === 0) continue;
        const currentPiece = currentCell[currentCell.length - 1];

        // Find where this piece was in the previous state
        for (let pr = 0; pr < ROWS; pr++) {
          for (let pc = 0; pc < COLS; pc++) {
            const prevCell = prevState.board[pr][pc];
            const prevPiece = prevCell && prevCell.length > 0 ? prevCell[prevCell.length - 1] : null;
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

  const myTurn = state && color && state.turn === color && !state.winner;

  const getValidMoves = (pos: Pos) => {
    if (!state) return [];
    const cell = state.board[pos.r][pos.c];
    if (!cell || cell.length === 0) return [];
    const piece = cell[cell.length - 1];
    if (piece.kind === 'LASER' || piece.kind === 'SPHINX') return [];

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

          const targetCell = state.board[newR][newC];
          if (!targetCell || targetCell.length === 0) {
            moves.push({ r: newR, c: newC, type: 'move' });
          } else {
            const targetPiece = targetCell[targetCell.length - 1];
            if (piece.kind === 'DJED' && (
              targetPiece.kind === 'PYRAMID' ||
              targetPiece.kind === 'OBELISK' ||
              targetPiece.kind === 'ANUBIS')) {
              moves.push({ r: newR, c: newC, type: 'swap' });
            } else if (piece.kind === 'OBELISK' && targetPiece.kind === 'OBELISK' &&
              piece.owner === targetPiece.owner && state.config?.rules === 'CLASSIC' &&
              targetCell.length < 2) {
              moves.push({ r: newR, c: newC, type: 'stack' });
            }
          }
        }
      }
    }
    return moves;
  };

  const onCellClick = (pos: Pos) => {
    if (!myTurn || !state) return;

    const cell = state.board[pos.r][pos.c];
    const piece = cell && cell.length > 0 ? cell[cell.length - 1] : null;

    if (selectedPos) {
      // Handle move or swap
      const dr = Math.abs(pos.r - selectedPos.r);
      const dc = Math.abs(pos.c - selectedPos.c);
      const selectedCell = state.board[selectedPos.r][selectedPos.c];
      const selectedPiece = selectedCell && selectedCell.length > 0 ? selectedCell[selectedCell.length - 1] : null;

      if (dr <= 1 && dc <= 1 && (dr > 0 || dc > 0)) {
        if (!piece) {
          // Move to empty space
          const selectedCell = state.board[selectedPos.r][selectedPos.c];
          const move: any = { type: 'MOVE', from: selectedPos, to: pos };

          // Handle obelisk stack movement
          if (selectedPiece?.kind === 'OBELISK' && selectedCell && selectedCell.length > 1) {
            // Check if trying to unstack a locked obelisk
            if (unstackMode && lockedStacks.has(`${selectedPos.r}-${selectedPos.c}`)) {
              setSelectedPos(null);
              return;
            }
            move.moveStack = !unstackMode;
          }

          sendMove(move);
          setSelectedPos(null);
          return;
        } else if (selectedPiece?.kind === 'DJED' &&
          (piece.kind === 'PYRAMID' || piece.kind === 'OBELISK' || piece.kind === 'ANUBIS')) {
          // Djed swap with any pyramid/obelisk/anubis (friendly or enemy)
          sendMove({ type: 'MOVE', from: selectedPos, to: pos });
          setSelectedPos(null);
          return;
        } else if (selectedPiece?.kind === 'OBELISK' && piece.kind === 'OBELISK' &&
          selectedPiece.owner === piece.owner && state.config?.rules === 'CLASSIC') {
          // Obelisk stacking - check stack limit
          const targetCell = state.board[pos.r][pos.c];
          if (targetCell && targetCell.length >= 2) {
            // Can't stack more than 2
            setSelectedPos(null);
            return;
          }

          const selectedCell = state.board[selectedPos.r][selectedPos.c];
          const move: any = { type: 'MOVE', from: selectedPos, to: pos };
          if (selectedCell && selectedCell.length > 1) {
            // Check if trying to unstack a locked obelisk
            if (unstackMode && lockedStacks.has(`${selectedPos.r}-${selectedPos.c}`)) {
              setSelectedPos(null);
              return;
            }
            move.moveStack = !unstackMode; // Move stack unless in unstack mode
          }
          sendMove(move);
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
    <div className='d-flex flex-column align-items-center justify-content-center' style={{ minHeight: '10vh' }}>
      <div style={{ marginBottom: 8 }}>
        <b>Turn:</b> {state.turn} {myTurn ? '(your move)' : ''}
      </div>
      <div style={{ position: 'relative' }} ref={boardRef}>
        <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, 48px)` }}>
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const validMoves = selectedPos && myTurn ? getValidMoves(selectedPos) : [];
            return <Cell key={`${r}-${c}`} r={r} c={c} onCellClick={onCellClick} selectedPos={selectedPos} validMoves={validMoves} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} unstackMode={unstackMode} setUnstackMode={setUnstackMode} lockedStacks={lockedStacks} setLockedStacks={setLockedStacks} />;
          })}
        </div>
        {/* Off-board laser indicators for Classic rules */}
        {state.config?.rules === 'CLASSIC' && (
          <>
            {/* RED laser indicator (top-left, pointing south) */}
            <div style={{ position: 'absolute', top: -30, left: '1.0em', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src="/laser-beam-warning.png" width="32" height="32" alt="laser warning" />
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginTop: -4 }}>
                <polygon points="10,18 6,10 14,10" fill="#cc4444" stroke="#000" strokeWidth="1" />
              </svg>
            </div>
            {/* SILVER laser indicator (bottom-right, pointing north) */}
            <div style={{ position: 'absolute', bottom: -30, right: '1.0em', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <polygon points="10,2 6,10 14,10" fill="#4444cc" stroke="#000" strokeWidth="1" />
              </svg>
              <img src="/laser-beam-warning.png" width="32" height="32" alt="laser warning" style={{ marginTop: -4 }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Cell({ r, c, onCellClick, selectedPos, validMoves, animatingPieces, setSelectedPos, animateRotation, unstackMode, setUnstackMode, lockedStacks, setLockedStacks }: Pos & { onCellClick: (pos: Pos) => void; selectedPos: Pos | null; validMoves: Array<{ r: number, c: number, type: string }>; animatingPieces: Map<string, { x: number, y: number, rotation: number }>; setSelectedPos: React.Dispatch<React.SetStateAction<Pos | null>>; animateRotation: (pieceId: string, direction: 'cw' | 'ccw') => void; unstackMode: boolean; setUnstackMode: React.Dispatch<React.SetStateAction<boolean>>; lockedStacks: Set<string>; setLockedStacks: React.Dispatch<React.SetStateAction<Set<string>>> }) {
  const state = useGame(s => s.state)!;
  const sendMove = useGame(s => s.sendMove);
  const cell = state.board[r][c];
  const piece = cell && cell.length > 0 ? cell[cell.length - 1] : null;
  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
  const moveHighlight = validMoves.find(m => m.r === r && m.c === c);

  // Check if selected piece is in unstack mode
  const selectedCell = selectedPos ? state.board[selectedPos.r][selectedPos.c] : null;
  const selectedPiece = selectedCell && selectedCell.length > 0 ? selectedCell[selectedCell.length - 1] : null;
  const isUnstackTarget = unstackMode && selectedPiece?.kind === 'OBELISK' && selectedCell && selectedCell.length > 1 && !isSelected;

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
  else if (moveHighlight?.type === 'stack') bgColor = '#ffeb3b';

  const handleCellClick = () => {
    // Handle unstack mode clicks
    if (isUnstackTarget && selectedPos) {
      const dr = Math.abs(r - selectedPos.r);
      const dc = Math.abs(c - selectedPos.c);
      if (dr <= 1 && dc <= 1 && (dr > 0 || dc > 0)) {
        sendMove({ type: 'MOVE', from: selectedPos, to: { r, c }, moveStack: false });
        setSelectedPos(null);
        setUnstackMode(false);
        return;
      }
    }
    onCellClick({ r, c });
  };

  return (
    <div className="cell" onClick={handleCellClick} style={{ cursor: 'pointer', background: bgColor }}>
      {piece && <PieceView r={r} c={c} isSelected={isSelected} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} unstackMode={unstackMode} setUnstackMode={setUnstackMode} lockedStacks={lockedStacks} setLockedStacks={setLockedStacks} />}
      {state.lastLaserPath?.some(p => p.r === r && p.c === c) && (
        <div className="laser" />
      )}
    </div>
  );
}

function PieceView({ r, c, isSelected, animatingPieces, setSelectedPos, animateRotation, unstackMode, setUnstackMode, lockedStacks, setLockedStacks }: Pos & { isSelected: boolean; animatingPieces: Map<string, { x: number, y: number, rotation: number }>; setSelectedPos: React.Dispatch<React.SetStateAction<Pos | null>>; animateRotation: (pieceId: string, direction: 'cw' | 'ccw') => void; unstackMode: boolean; setUnstackMode: React.Dispatch<React.SetStateAction<boolean>>; lockedStacks: Set<string>; setLockedStacks: React.Dispatch<React.SetStateAction<Set<string>>> }) {
  const state = useGame(s => s.state)!;
  const color = useGame(s => s.color)!;
  const sendMove = useGame(s => s.sendMove);
  const cell = state.board[r][c]!;
  const piece = cell[cell.length - 1];
  const isMyTurn = state.turn === color && piece.owner === color;

  const onRotate = (delta: 90 | -90) => {
    if (!isMyTurn) return;

    const direction = delta === 90 ? 'cw' : 'ccw';
    animateRotation(piece.id, direction);

    sendMove({ type: 'ROTATE', from: { r, c }, rotation: delta });
    setSelectedPos(null);
  };

  const onUnstack = () => {
    if (!isMyTurn || piece.kind !== 'OBELISK' || cell.length <= 1) return;
    if (lockedStacks.has(`${r}-${c}`)) return;
    setUnstackMode(!unstackMode);
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
      <PieceSVG piece={piece} cell={cell} />
      {isSelected && isMyTurn && (
        <div className="radial-menu">
          {piece.kind === 'SPHINX' ? (
            // For SPHINX, show only next valid direction
            (() => {
              const nextDir = getNextValidSphinxDirection({ r, c }, piece.facing || 'N');
              const rotationDelta = getSphinxRotationDelta({ r, c }, piece.facing || 'N');
              return nextDir && rotationDelta ? (
                <button
                  className="radial-btn radial-btn-right"
                  onClick={(e) => { e.stopPropagation(); onRotate(rotationDelta); }}
                  title={`Rotate to ${nextDir}`}
                >⟳</button>
              ) : null;
            })()
          ) : (
            // For other pieces, show both rotation buttons
            <>
              <button
                className="radial-btn radial-btn-left"
                onClick={(e) => { e.stopPropagation(); onRotate(-90); }} >⟲</button>
              <button
                className="radial-btn radial-btn-right"
                onClick={(e) => { e.stopPropagation(); onRotate(90); }} >⟳</button>
            </>
          )}
          {piece.kind === 'OBELISK' && cell.length > 1 && (
            <button
              className={`radial-btn radial-btn-top ${unstackMode ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onUnstack(); }}
              title="Unstack obelisk"
              disabled={lockedStacks.has(`${r}-${c}`) && !unstackMode}
            >{unstackMode ? '🔓' : '🔒'}</button>
          )}
        </div>
      )}
    </div>
  );
}
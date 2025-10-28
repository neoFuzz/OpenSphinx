import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Pos } from '../../../shared/src/types';
import { getNextValidSphinxDirection, getSphinxRotationDelta } from '../../../shared/src/engine/sphinx-utils';
import { PieceSVG } from './BoardComponents';
import { showExplosionEffect, playExplosionSound } from '../utils/explosionEffect';
import './board.css';

/**
 * Main game board component that renders the Khet board and handles game logic.
 * 
 * Manages:
 * - Rendering the 10x8 game board grid
 * - Piece selection and movement
 * - Valid move highlighting
 * - Piece animations (movement and rotation)
 * - Piece destruction effects
 * - Turn management
 * - Obelisk stacking/unstacking
 * - Player zones (red/silver)
 * - Laser indicators for Classic rules
 * 
 * Uses game state from useGame hook to:
 * - Track current game state
 * - Get player color
 * - Send moves to game server
 * 
 * State includes:
 * - selectedPos: Currently selected piece position
 * - unstackMode: Whether obelisk unstacking is active
 * - lockedStacks: Set of locked obelisk stack positions
 * - animatingPieces: Map of pieces currently being animated
 * 
 * @returns React component that renders the game board
 */
export function Board() {
  const { t } = useTranslation();
  const state = useGame(s => s.state);
  const color = useGame(s => s.color);
  const sendMove = useGame(s => s.sendMove);
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [unstackMode, setUnstackMode] = useState(false);
  const [lockedStacks, setLockedStacks] = useState<Set<string>>(new Set());
  const [animatingPieces, setAnimatingPieces] = useState<Map<string, { x: number, y: number, rotation: number }>>(new Map());
  const [laserBeams, setLaserBeams] = useState<Array<{ from: Pos, to: Pos, progress: number }>>([]);
  const animationRefs = useRef<Map<string, number>>(new Map());
  const prevStateRef = useRef(state);
  const boardRef = useRef<HTMLDivElement>(null);

  /* Animate laser beam tracing */
  useEffect(() => {
    if (!state?.lastLaserPath || state.lastLaserPath.length < 2) {
      setLaserBeams([]);
      return;
    }

    const path = state.lastLaserPath;
    const beams: Array<{ from: Pos, to: Pos, progress: number }> = [];

    for (let i = 0; i < path.length - 1; i++) {
      beams.push({ from: path[i], to: path[i + 1], progress: 0 });
    }

    setLaserBeams(beams);
    const startTime = Date.now();
    const segmentDuration = 50;
    const totalDuration = beams.length * segmentDuration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalDuration) {
        setLaserBeams(beams.map(beam => ({ ...beam, progress: 1 })));
        return;
      }

      setLaserBeams(beams.map((beam, i) => {
        const segmentStart = i * segmentDuration;
        const segmentElapsed = elapsed - segmentStart;
        const progress = Math.min(Math.max(segmentElapsed / segmentDuration, 0), 1);
        return { ...beam, progress };
      }));

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [state?.lastLaserPath]);

  /* Detect piece movements and destroyed pieces */
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

  /**
   * Gets valid moves for a piece at the given position.
   * 
   * Checks:
   * - Basic movement to adjacent empty cells
   * - Zone restrictions (can't move into opponent's zone)
   * - Special moves:
   *   - Djed swapping with pyramids/obelisks/anubis
   *   - Obelisk stacking in Classic rules
   * - Excludes moves for laser and sphinx pieces
   *
   * @param pos - Position to check moves from
   * @returns Array of valid move positions and types ('move', 'swap', 'stack')
   */
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

  /**
   * Handles clicks on board cells for piece selection and movement.
   * 
   * Manages:
   * - Selecting own pieces when clicked
   * - Moving selected pieces to valid target cells
   * - Special moves:
   *   - Djed swapping with pyramids/obelisks/anubis
   *   - Obelisk stacking/unstacking in Classic rules
   * - Enforces:
   *   - Turn order
   *   - Valid move restrictions
   *   - Stack locking for obelisks
   *
   * @param pos - Position {r,c} of clicked cell
   * @returns void
   */
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

  /**
   * Animates piece movement across the board.
   * 
   * Handles smooth animation of pieces moving between cells using:
   * - CSS transforms for translation
   * - Cubic easing for natural movement
   * - Cleanup of animation frames
   * 
   * @param pieceId - ID of the piece to animate
   * @param deltaX - X distance to move in pixels 
   * @param deltaY - Y distance to move in pixels
   */
  const animateMove = useCallback((pieceId: string, deltaX: number, deltaY: number) => {
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setAnimatingPieces(prev => new Map(prev).set(pieceId, {
        x: deltaX * (1 - eased),
        y: deltaY * (1 - eased),
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

  /**
  * Animates piece rotation on the board.
  * 
  * Handles smooth rotation animation of pieces using:
  * - CSS transforms for rotation
  * - Cubic easing for natural movement
  * - Cleanup of animation frames
  * - Support for both clockwise and counter-clockwise rotation
  *
  * @param pieceId - ID of the piece to animate
  * @param direction - Direction to rotate ('cw' for clockwise, 'ccw' for counter-clockwise)
  */
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

  if (!state) return <div>{t('waiting_for_state')}</div>;

  const roomId = useGame(s => s.roomId);

  return (
    <div className='board-container'>
      <div className='turn-info d-flex justify-content-around' style={{ minWidth: '40vw' }}>
        {roomId && <div className='p-1' style={{ marginRight: '1rem' }}><b>{t('game_id')}:</b> {roomId}</div>}
        <div className='p-1'><b>{t('turn')}:</b> {state.turn} {myTurn ? `(${t('your_move')})` : ''}</div>
      </div>
      <div className='board-wrapper' ref={boardRef}>
        <div className="board">
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const validMoves = selectedPos && myTurn ? getValidMoves(selectedPos) : [];
            return <Cell key={`${r}-${c}`} r={r} c={c} onCellClick={onCellClick} selectedPos={selectedPos} validMoves={validMoves} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} unstackMode={unstackMode} setUnstackMode={setUnstackMode} lockedStacks={lockedStacks} setLockedStacks={setLockedStacks} />;
          })}
        </div>
        <div className="laser-overlay">
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const hasLaser = state.lastLaserPath?.some(p => p.r === r && p.c === c);
            const isRedLaser = r === 0 && c === 0 && state.config?.rules === 'CLASSIC';
            const isSilverLaser = r === 7 && c === 9 && state.config?.rules === 'CLASSIC';

            const beamsFromCell = laserBeams.filter(beam => beam.from.r === r && beam.from.c === c);

            return (
              <div key={`laser-${r}-${c}`} className="laser-cell">
                {hasLaser && <div className="laser" />}
                {beamsFromCell.map((beam, idx) => (
                  <LaserBeam key={idx} from={beam.from} to={beam.to} progress={beam.progress} />
                ))}
                {isRedLaser && (
                  <div className='laser-indicator' style={{ transform: 'translate(-50%, -150%)' }}>
                    <img src="/laser-beam-warning.png" className="laser-indicator-img" alt="laser warning" />
                    <svg viewBox="0 0 20 20" className="laser-indicator-arrow">
                      <polygon points="10,18 6,10 14,10" fill="#cc4444" stroke="#000" strokeWidth="1" />
                    </svg>
                  </div>
                )}
                {isSilverLaser && (
                  <div className='laser-indicator' style={{ transform: 'translate(-50%, 50%)' }}>
                    <svg viewBox="0 0 20 20" className="laser-indicator-arrow">
                      <polygon points="10,2 6,10 14,10" fill="#4444cc" stroke="#000" strokeWidth="1" />
                    </svg>
                    <img src="/laser-beam-warning.png" className="laser-indicator-img" alt="laser warning" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a laser beam animation between two cells.
 *
 * @param from - Starting position of the laser beam
 * @param to - Ending position of the laser beam
 * @param progress - Progress of the animation (0 to 1)
 * @returns React component that renders the laser beam
 */
function LaserBeam({ from, to, progress }: { from: Pos, to: Pos, progress: number }) {
  const dx = to.c - from.c;
  const dy = to.r - from.r;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return (
    <div
      className="laser-beam"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${distance * 100 * progress}%`,
        height: '4px',
        transform: `translateY(-50%) rotate(${angle}deg)`,
        transformOrigin: '0 50%',
      }}
    />
  );
}

/**
 * Renders an individual cell on the game board.
 * 
 * Handles:
 * - Displaying pieces in the cell
 * - Cell highlighting for selection and valid moves
 * - Player zone coloring (red/silver zones)
 * - Laser path visualization
 * - Click handling for piece selection and movement
 * - Unstack mode interactions for obelisk pieces
 *
 * @param r - Row index of the cell
 * @param c - Column index of the cell 
 * @param onCellClick - Callback function when cell is clicked
 * @param selectedPos - Currently selected piece position
 * @param validMoves - Array of valid moves for selected piece
 * @param animatingPieces - Map of pieces currently being animated
 * @param setSelectedPos - Function to update selected position
 * @param animateRotation - Function to animate piece rotation
 * @param unstackMode - Whether obelisk unstacking mode is active
 * @param setUnstackMode - Function to toggle unstack mode
 * @param lockedStacks - Set of locked obelisk stack positions
 * @param setLockedStacks - Function to update locked stacks
 * @returns React component that renders a single board cell
 */
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
    <div className="cell" onClick={handleCellClick} style={{ background: bgColor }}>
      {piece && <PieceView r={r} c={c} isSelected={isSelected} animatingPieces={animatingPieces} setSelectedPos={setSelectedPos} animateRotation={animateRotation} unstackMode={unstackMode} setUnstackMode={setUnstackMode} lockedStacks={lockedStacks} setLockedStacks={setLockedStacks} />}
    </div>
  );
}

/**
 * Renders an individual game piece with rotation controls and stacking functionality.
 * 
 * Handles:
 * - Displaying the piece SVG
 * - Rotation controls for pieces
 * - Special rotation handling for Sphinx pieces
 * - Obelisk stacking/unstacking controls
 * - Piece movement animations
 * - Z-index management during animations
 *
 * @param r - Row index of the piece
 * @param c - Column index of the piece
 * @param isSelected - Whether this piece is currently selected
 * @param animatingPieces - Map of pieces currently being animated
 * @param setSelectedPos - Function to update selected position
 * @param animateRotation - Function to animate piece rotation
 * @param unstackMode - Whether obelisk unstacking mode is active
 * @param setUnstackMode - Function to toggle unstack mode
 * @param lockedStacks - Set of locked obelisk stack positions
 * @param setLockedStacks - Function to update locked stacks
 * @returns React component that renders a game piece with controls
 */
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
    <div className="piece" style={{ transform, zIndex }}>
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
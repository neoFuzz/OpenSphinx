
import React, { useMemo, useState } from 'react';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Pos } from '../../../shared/src/types';
import './board.css';

export function Board() {
  const state = useGame(s => s.state);
  const color = useGame(s => s.color);

  const myTurn = state && color && state.turn === color;

  if (!state) return <div>Waiting for state…</div>;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <b>Turn:</b> {state.turn} {myTurn ? '(your move)' : ''}
      </div>
      <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, 48px)` }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => (
            <Cell key={`${r}-${c}`} r={r} c={c} />
          ))
        )}
      </div>
    </div>
  );
}

function Cell({ r, c }: Pos) {
  const state = useGame(s => s.state)!;
  const piece = state.board[r][c];

  return (
    <div className="cell">
      {piece && <PieceView r={r} c={c} />}
      {state.lastLaserPath?.some(p => p.r === r && p.c === c) && (
        <div className="laser" />
      )}
    </div>
  );
}

function PieceView({ r, c }: Pos) {
  const state = useGame(s => s.state)!;
  const color = useGame(s => s.color)!;
  const sendMove = useGame(s => s.sendMove);
  const piece = state.board[r][c]!;
  const isMyTurn = state.turn === color && piece.owner === color;

  const label = useMemo(() => {
    return `${piece.owner[0]}-${piece.kind[0]}${piece.mirror ?? ''}${piece.facing ?? ''}`;
  }, [piece]);

  const [selected, setSelected] = useState(false);

  const onRotate = (delta: 90 | -90) => {
    if (!isMyTurn) return;
    sendMove({ type: 'ROTATE', from: { r, c }, rotation: delta });
  };

  // Simple click-to-move: select a piece then click an orthogonal neighbor to move.
  const onClick = () => {
    setSelected(s => !s);
  };

  return (
    <div className="piece" onClick={onClick}>
      <div>{label}</div>
      <div className="actions">
        <button onClick={(e) => { e.stopPropagation(); onRotate(-90); }}>⟲</button>
        <button onClick={(e) => { e.stopPropagation(); onRotate(90); }}>⟳</button>
      </div>
    </div>
  );
}

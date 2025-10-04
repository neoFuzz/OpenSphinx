import React, { useState, useEffect } from 'react';
import { GameState } from '../../../shared/src/types';
import { COLS, ROWS } from '../../../shared/src/constants';
import { PieceSVG } from './BoardComponents';
import './board.css';

interface ReplayData {
  id: string;
  name: string;
  gameStates: GameState[];
}

interface ReplayProps {
  replayId: string;
  onClose: () => void;
}

export function Replay({ replayId, onClose }: ReplayProps) {
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [currentState, setCurrentState] = useState<GameState | null>(null);

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/api/replays/${replayId}`);
        const data = await response.json();
        setReplay(data);
        setCurrentState(data.gameStates[0]);
      } catch (error) {
        console.error('Failed to load replay:', error);
      }
    };
    fetchReplay();
  }, [replayId]);

  useEffect(() => {
    if (!replay) return;
    setCurrentState(replay.gameStates[currentMove] || replay.gameStates[0]);
  }, [currentMove, replay]);

  if (!replay || !currentState) return <div>Loading replay...</div>;

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Replay: {replay.name}</h3>
        <button type="button" className="btn btn-secondary" onClick={onClose}>← Back</button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => setCurrentMove(0)}
            disabled={currentMove === 0}
          >
            ⏮️ Start
          </button>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => setCurrentMove(Math.max(0, currentMove - 1))}
            disabled={currentMove === 0}
          >
            ⏪ Prev
          </button>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => setCurrentMove(Math.min(replay.gameStates.length - 1, currentMove + 1))}
            disabled={currentMove === replay.gameStates.length - 1}
          >
            ⏩ Next
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentMove(replay.gameStates.length - 1)}
            disabled={currentMove === replay.gameStates.length - 1}
          >
            ⏭️ End
          </button>
        </div>
        <span>Move {currentMove} / {replay.gameStates.length - 1}</span>
      </div>

      <div className="text-center">
        <div>
          <div style={{ marginBottom: 8 }}>
            <b>Turn:</b> {currentState.turn}
          </div>
          <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, 48px)` }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS);
              const c = i % COLS;
              const piece = currentState.board[r][c];

              let bgColor = undefined;
              if (c === 0 || (c === 8 && (r === 0 || r === 7))) {
                bgColor = '#ffcccc';
              } else if (c === 9 || (c === 1 && (r === 0 || r === 7))) {
                bgColor = '#ccccff';
              }

              return (
                <div key={`${r}-${c}`} className="cell" style={{ background: bgColor }}>
                  {piece && <PieceSVG piece={piece} />}
                  {currentState.lastLaserPath?.some(p => p.r === r && p.c === c) && (
                    <div className="laser" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {currentState.winner && (
        <div className="alert alert-success mt-3 text-center">
          Winner: {currentState.winner}
        </div>
      )}
    </div>
  );
}


import React from 'react';
import { GameState } from '../../../shared/src/types';

export function PieceSVG({ piece, cell }: { piece: NonNullable<GameState['board'][0][0]>; cell?: NonNullable<GameState['board'][0][0]>[] }) {
  const color = piece.owner === 'RED' ? '#cc4444' : '#4444cc';
  const rotation = piece.orientation ? ['N', 'E', 'S', 'W'].indexOf(piece.orientation) * 90 :
    piece.facing ? ['N', 'E', 'S', 'W'].indexOf(piece.facing) * 90 : 0;

  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <g transform={`rotate(${rotation} 20 20)`}>
        {piece.kind === 'PHARAOH' && (
          <>
            <rect x="10" y="10" width="20" height="20" fill={color} stroke="#000" strokeWidth="1" />
            <text x="20" y="25" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="bold">P</text>
          </>
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
          <>
            {/* Base obelisk - box with diagonal cross */}
            <rect x="12" y="12" width="16" height="16" fill={color} stroke="#000" strokeWidth="1" />
            <line x1="16" y1="16" x2="24" y2="24" stroke="#fff" strokeWidth="2" />
            <line x1="24" y1="16" x2="16" y2="24" stroke="#fff" strokeWidth="2" />
            
            {/* Second obelisk if stacked - positioned north */}
            {cell && cell.length > 1 && (
              <>
                <rect x="12" y="8" width="16" height="16" fill={color} stroke="#000" strokeWidth="1" />
                <line x1="16" y1="12" x2="24" y2="20" stroke="#fff" strokeWidth="2" />
                <line x1="24" y1="12" x2="16" y2="20" stroke="#fff" strokeWidth="2" />
              </>
            )}
          </>
        )}
        {piece.kind === 'ANUBIS' && (
          <>
            <path d="M20 32 L28 28 L28 18 L24 12 L16 12 L12 18 L12 28 Z" fill={color} stroke="#000" strokeWidth="1" />
            <polygon points="20,16 16,24 24,24" fill="#fff" />
          </>
        )}
        {piece.kind === 'LASER' && (
          <>
            <circle cx="20" cy="20" r="8" fill={color} stroke="#000" strokeWidth="1" />
            <polygon points="20,12 25,20 20,20 15,20" fill="#fff" />
          </>
        )}
        {piece.kind === 'SPHINX' && (
          <>
            <circle cx="20" cy="20" r="8" fill={color} stroke="#000" strokeWidth="1" />
            <polygon points="20,12 25,20 20,20 15,20" fill="#fff" />
          </>
        )}
      </g>
    </svg>
  );
}
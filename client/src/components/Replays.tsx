import React, { useEffect } from 'react';
import { useGame } from '../state/game';

/**
 * Replays page component for viewing and managing game replays
 * 
 * @param props - Component props
 * @param props.onReplaySelect - Callback when a replay is selected to watch
 * @returns JSX element representing the replays page
 */
export function Replays({ onReplaySelect }: { onReplaySelect: (id: string) => void }) {
    const { replays, fetchReplays } = useGame();

    useEffect(() => {
        fetchReplays();
    }, [fetchReplays]);

    return (
        <div className="container">
            <h2 className="mb-4">Game Replays</h2>
            {replays.length === 0 ? (
                <div className="alert alert-info">
                    <p>No replays found. Finished games will appear here for you to watch.</p>
                </div>
            ) : (
                <div className="list-group">
                    {replays.map((replay) => (
                        <div key={replay.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-1">{replay.name}</h5>
                                <small className="text-muted">
                                    Created: {new Date(replay.createdAt).toLocaleString()}
                                </small>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => onReplaySelect(replay.id)}
                            >
                                Watch Replay
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

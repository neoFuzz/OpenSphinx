import React, { useState } from 'react';
import { useGame } from '../state/game';
import { Replay } from './Replay';

/**
 * Saved game data structure
 */
interface SavedGame {
    /** Unique game identifier */
    id: string;
    /** Display name of the saved game */
    name: string;
    /** Timestamp when the game was created */
    createdAt: string;
    /** Timestamp when the game was last updated */
    updatedAt: string;
    /** Winner of the game, if finished */
    winner?: string;
}

/**
 * Game save/load management component
 * 
 * Provides buttons and modals for:
 * - Saving current game with custom name
 * - Loading unfinished saved games
 * - Viewing and watching game replays
 * - Deleting saved games
 * 
 * Shows different buttons based on game state:
 * - Save button when in an active game
 * - Load and Replay buttons when not in a game
 * 
 * @param props - Component props
 * @param props.onReplaySelect - Optional callback for replay selection (if not provided, opens replay viewer directly)
 * @returns JSX element representing the save/load controls
 */
export function SavedGames({ onReplaySelect }: { onReplaySelect?: (id: string) => void }) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showReplayDialog, setShowReplayDialog] = useState(false);
    const [replayId, setReplayId] = useState('');

    const { savedGames, replays, saveGame, loadGame, deleteSavedGame, fetchReplays, state } = useGame();

    const handleSave = () => {
        if (saveName.trim()) {
            saveGame(saveName.trim());
            setSaveName('');
            setShowSaveDialog(false);
        }
    };

    const handleLoad = (gameId: string) => {
        loadGame(gameId);
        setShowLoadDialog(false);
    };

    return (
        <div className="d-flex gap-2">
            {state && (
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowSaveDialog(true)}
                >
                    Save Game
                </button>
            )}

            {!state && (
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowLoadDialog(true)}
                >
                    Load Game
                </button>
            )}

            {!state && (
                <button
                    className="btn btn-outline-info btn-sm"
                    onClick={() => { setShowReplayDialog(true); fetchReplays(); }}
                >
                    View Replays
                </button>
            )}

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Save Game</h5>
                                <button type="button" className="btn-close" onClick={() => setShowSaveDialog(false)}></button>
                            </div>
                            <div className="modal-body">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter game name"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSaveDialog(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Dialog */}
            {showLoadDialog && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Load Game</h5>
                                <button type="button" className="btn-close" onClick={() => setShowLoadDialog(false)}></button>
                            </div>
                            <div className="modal-body">
                                {(savedGames || []).filter(game => !game.winner).length === 0 ? (
                                    <p>No unfinished saved games found.</p>
                                ) : (
                                    <div className="list-group">
                                        {(savedGames || []).filter(game => !game.winner).map((game) => (
                                            <div key={game.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-1">{game.name}</h6>
                                                    <small className="text-muted">
                                                        Updated: {new Date(game.updatedAt).toLocaleString()}
                                                    </small>
                                                </div>
                                                <div>
                                                    <button
                                                        className="btn btn-primary btn-sm me-2"
                                                        onClick={() => handleLoad(game.id)}
                                                    >
                                                        Load
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => deleteSavedGame(game.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowLoadDialog(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Replay Dialog */}
            {showReplayDialog && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Game Replays</h5>
                                <button type="button" className="btn-close" onClick={() => setShowReplayDialog(false)}></button>
                            </div>
                            <div className="modal-body">
                                {replays.length === 0 ? (
                                    <p>No replays found.</p>
                                ) : (
                                    <div className="list-group">
                                        {replays.map((replay) => (
                                            <div key={replay.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-1">{replay.name}</h6>
                                                    <small className="text-muted">
                                                        Created: {new Date(replay.createdAt).toLocaleString()}
                                                    </small>
                                                </div>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => {
                                                        if (onReplaySelect) {
                                                            onReplaySelect(replay.id);
                                                        } else {
                                                            setReplayId(replay.id);
                                                        }
                                                        setShowReplayDialog(false);
                                                    }}
                                                >
                                                    Watch
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowReplayDialog(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {replayId && !onReplaySelect && (
                <Replay
                    replayId={replayId}
                    onClose={() => setReplayId('')}
                />
            )}
        </div>
    );
}
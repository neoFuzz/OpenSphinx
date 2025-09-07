import React, { useState } from 'react';
import { useGame } from '../state/game';

export function SavedGames() {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    
    const { savedGames, saveGame, loadGame, deleteSavedGame, state } = useGame();

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
            
            <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowLoadDialog(true)}
            >
                Load Game
            </button>

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
                                {savedGames.length === 0 ? (
                                    <p>No saved games found.</p>
                                ) : (
                                    <div className="list-group">
                                        {savedGames.map((game) => (
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
        </div>
    );
}
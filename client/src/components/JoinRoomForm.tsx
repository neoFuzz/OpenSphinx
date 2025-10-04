import React, { useState } from 'react';

interface JoinRoomFormProps {
    onSubmit: (roomId: string, name: string, password?: string) => void;
    onCancel: () => void;
    initialName?: string;
}

export function JoinRoomForm({ onSubmit, onCancel, initialName }: JoinRoomFormProps) {
    const [roomId, setRoomId] = useState('');
    const [name, setName] = useState(initialName || 'Player');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(roomId, name, password || undefined);
    };

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Join Room</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label htmlFor="roomId" className="form-label">Room ID</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="roomId"
                                    value={roomId}
                                    onChange={e => setRoomId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="playerName" className="form-label">Your Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="playerName"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="roomPassword" className="form-label">Password (if required)</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="roomPassword"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Join Room</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
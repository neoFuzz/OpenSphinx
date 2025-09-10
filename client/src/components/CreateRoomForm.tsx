import React, { useState } from 'react';

interface CreateRoomFormProps {
    onSubmit: (options: { isPrivate: boolean; password?: string }) => void;
    onCancel: () => void;
}

export function CreateRoomForm({ onSubmit, onCancel }: CreateRoomFormProps) {
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ isPrivate, password: isPrivate ? password : undefined });
    };

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Create Room</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-check mb-3">
                                <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    id="isPrivate"
                                    checked={isPrivate}
                                    onChange={e => setIsPrivate(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="isPrivate">
                                    Private Room
                                </label>
                            </div>
                            {isPrivate && (
                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">Password</label>
                                    <input 
                                        type="password"
                                        className="form-control"
                                        id="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="btn btn-success">Create Room</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
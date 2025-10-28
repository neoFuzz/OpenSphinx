import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Props for the JoinRoomForm component
 */
interface JoinRoomFormProps {
    /** Callback when form is submitted with room details */
    onSubmit: (roomId: string, name: string, password?: string) => void;
    /** Callback when form is cancelled */
    onCancel: () => void;
    /** Initial player name to populate the form */
    initialName?: string;
}

/**
 * Modal form for joining an existing game room
 * 
 * Displays a modal with input fields for:
 * - Room ID (required)
 * - Player name (required, pre-filled with initialName if provided)
 * - Password (optional)
 * 
 * @param props - JoinRoomForm component props
 * @returns JSX element representing the join room modal
 */
export function JoinRoomForm({ onSubmit, onCancel, initialName }: JoinRoomFormProps) {
    const { t } = useTranslation();
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
                        <h5 className="modal-title">{t('join_room')}</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label htmlFor="roomId" className="form-label">{t('room_id')}</label>
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
                                <label htmlFor="playerName" className="form-label">{t('your_name')}</label>
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
                                <label htmlFor="roomPassword" className="form-label">{t('password_optional')}</label>
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
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('cancel')}</button>
                            <button type="submit" className="btn btn-primary">{t('join_room')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
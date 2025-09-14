import React, { useState } from 'react';

type RuleVariant = 'CLASSIC' | 'KHET_2_0';
type SetupVariant = 'CLASSIC' | 'IMHOTEP' | 'DYNASTY';

interface CreateRoomFormProps {
    onSubmit: (options: { isPrivate: boolean; password?: string; config?: { rules: RuleVariant; setup: SetupVariant } }) => void;
    onCancel: () => void;
}

export function CreateRoomForm({ onSubmit, onCancel }: CreateRoomFormProps) {
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const [rules, setRules] = useState<RuleVariant>('CLASSIC');
    const [setup, setSetup] = useState<SetupVariant>('CLASSIC');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ 
            isPrivate, 
            password: isPrivate ? password : undefined,
            config: { rules, setup }
        });
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
                            <div className="mb-3">
                                <label htmlFor="rules" className="form-label">Rules</label>
                                <select 
                                    className="form-select"
                                    id="rules"
                                    value={rules}
                                    onChange={e => setRules(e.target.value as RuleVariant)}
                                >
                                    <option value="CLASSIC">Classic</option>
                                    <option value="KHET_2_0">Khet 2.0</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="setup" className="form-label">Setup</label>
                                <select 
                                    className="form-select"
                                    id="setup"
                                    value={setup}
                                    onChange={e => setSetup(e.target.value as SetupVariant)}
                                >
                                    <option value="CLASSIC">Classic</option>
                                    <option value="IMHOTEP">Imhotep</option>
                                    <option value="DYNASTY">Dynasty</option>
                                </select>
                            </div>
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
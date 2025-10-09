import React, { useState } from 'react';

/**
 * Represents the available rule variants for the game.
 * - CLASSIC: The original rule set
 * - KHET_2_0: Updated rules from Khet 2.0 version
 */
type RuleVariant = 'CLASSIC' | 'KHET_2_0';

/**
 * Represents the available board setup variants for the game.
 * - CLASSIC: The traditional board layout
 * - IMHOTEP: Alternative setup named after the ancient Egyptian architect
 * - DYNASTY: Setup variant representing different Egyptian dynasty layouts
 */
type SetupVariant = 'CLASSIC' | 'IMHOTEP' | 'DYNASTY';

/**
 * Props interface for the CreateRoomForm component
 * @interface CreateRoomFormProps
 * @property {function} onSubmit - Callback function called when form is submitted. Takes an options object with room configuration
 * @property {function} onCancel - Callback function called when form is cancelled
 * @property {object} options.isPrivate - Boolean indicating if room is private
 * @property {string} options.password - Optional password for private rooms
 * @property {object} options.config - Optional configuration object
 * @property {RuleVariant} options.config.rules - Game rules variant (CLASSIC or KHET_2_0)
 * @property {SetupVariant} options.config.setup - Board setup variant (CLASSIC, IMHOTEP, or DYNASTY)
 */
interface CreateRoomFormProps {
    onSubmit: (options: { isPrivate: boolean; password?: string; config?: { rules: RuleVariant; setup: SetupVariant } }) => void;
    onCancel: () => void;
}

/**
 * A form component for creating a new game room with customizable settings.
 * Renders a modal dialog with options for game rules, board setup, and privacy settings.
 * 
 * @component
 * @param {CreateRoomFormProps} props - The component props
 * @param {function} props.onSubmit - Callback function called when form is submitted with room configuration
 * @param {function} props.onCancel - Callback function called when form is cancelled
 * 
 * @returns {JSX.Element} A modal dialog containing the room creation form
 * 
 * @example
 * <CreateRoomForm 
 *   onSubmit={(options) => handleRoomCreation(options)}
 *   onCancel={() => setShowModal(false)}
 * />
 */
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
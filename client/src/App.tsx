
import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { SERVER_URL } from './config/server';
import { useGame } from './state/game';
import { useAuth } from './state/auth';
import { SavedGames } from './components/SavedGames';
import { RoomList } from './components/RoomList';
import { CreateRoomForm } from './components/CreateRoomForm';
import { JoinRoomForm } from './components/JoinRoomForm';
import { Replay } from './components/Replay';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Stats } from './components/Stats';
import { Rules } from './components/Rules';
import { TermsOfService } from './components/TermsOfService';
import { About } from './components/About';
import { AdSense } from './components/AdSense';

/** Lazy-loaded 2D board component */
const Board2D = React.lazy(() => import('./components/Board').then(m => ({ default: m.Board })));
/** Lazy-loaded 3D board component */
const Board3D = React.lazy(() => import('./components/Board3D').then(m => ({ default: m.Board3D })));

/**
 * Main application component for OpenSphinx laser chess game
 * 
 * Manages the overall application state including:
 * - Page navigation (home, stats, rules, terms, about)
 * - Game room creation and joining
 * - 2D/3D view mode switching with localStorage persistence
 * - Environment and graphics quality settings
 * - User authentication and game save/load functionality
 * 
 * @returns JSX element representing the complete application
 */
export default function App() {
    const { checkAuth } = useAuth();
    const connectRoom = useGame(s => s.connectRoom);
    const [currentPage, setCurrentPage] = useState<'home' | 'stats' | 'rules' | 'terms' | 'about'>('home');

    React.useEffect(() => {
        checkAuth().catch(console.error);
    }, [checkAuth]);
    const createRoom = useGame(s => (s as any).createRoom ?? (() => { }));
    const saveGame = useGame(s => s.saveGame);
    const state = useGame(s => s.state);
    const [roomId, setRoomId] = useState(''); // maybe ROOM1
    const [name, setName] = useState('Player');
    const [useThree, setUseThree] = useState(() => {
        const saved = localStorage.getItem('opensphinx-use3d');
        return saved ? JSON.parse(saved) : true;
    });
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [environmentPreset, setEnvironmentPreset] = useState(() => {
        return localStorage.getItem('opensphinx-environment') || 'basic';
    });
    const [cubeMapQuality, setCubeMapQuality] = useState<'off' | 'low' | 'medium' | 'high' | 'ultra'>(() => {
        return (localStorage.getItem('opensphinx-cubemap-quality') as 'off' | 'low' | 'medium' | 'high' | 'ultra') || 'low';
    });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [replayId, setReplayId] = useState('');

    const { user } = useAuth();
    const handleSaveGame = () => setShowSaveDialog(true);

    // Use Discord username when logged in
    const playerName = user?.username || name;
    const handleLoadGame = () => setShowLoadDialog(true);
    const handleNewGame = () => setShowCreateForm(true);
    const handleLeaveGame = () => useGame.setState({ roomId: undefined, state: undefined });

    return (
        <div className="d-flex flex-column min-vh-100">
            <Header
                inGame={!!state}
                onSaveGame={handleSaveGame}
                onLoadGame={handleLoadGame}
                onNewGame={handleNewGame}
                onLeaveGame={handleLeaveGame}
                useThree={useThree}
                onToggleThree={(checked) => {
                    if (isTransitioning) return;
                    setIsTransitioning(true);
                    setUseThree(checked);
                    localStorage.setItem('opensphinx-use3d', JSON.stringify(checked));
                    setTimeout(() => setIsTransitioning(false), 1000);
                }}
                isTransitioning={isTransitioning}
                environmentPreset={environmentPreset}
                onEnvironmentChange={(preset) => {
                    setEnvironmentPreset(preset);
                    localStorage.setItem('opensphinx-environment', preset);
                }}
                cubeMapQuality={cubeMapQuality}
                onCubeMapQualityChange={(quality) => {
                    setCubeMapQuality(quality);
                    localStorage.setItem('opensphinx-cubemap-quality', quality);
                }}
                currentPage={currentPage}
                onNavigate={setCurrentPage}
            />
            <div className="container-fluid p-3 flex-grow-1">
                {currentPage === 'stats' ? (
                    <Stats />
                ) : currentPage === 'rules' ? (
                    <Rules />
                ) : currentPage === 'terms' ? (
                    <TermsOfService />
                ) : currentPage === 'about' ? (
                    <About />
                ) : (
                    <>
                        <div className="d-flex gap-2 align-items-center mb-3 justify-content-start flex-wrap">
                            <input className="form-control" id="txtRoomId" placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} style={{ width: '150px' }} />
                            {!user && <input className="form-control" id="txtPlayerName" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '150px' }} />}
                            <button className="btn btn-primary" disabled={!roomId.trim() || !playerName.trim()} onClick={() => roomId ? connectRoom(roomId, playerName) : setShowJoinForm(true)}>Join</button>
                            <button className="btn btn-success" onClick={() => setShowCreateForm(true)}>Create</button>
                            <SavedGames onReplaySelect={setReplayId} />
                            {state && !replayId && <RoomList onJoinRoom={(roomId) => { setRoomId(roomId); connectRoom(roomId, playerName); }} />}
                        </div>

                        <React.Suspense fallback={<div className="text-center">Loading…</div>}>
                            <GameArea useThree={useThree} replayId={replayId} setReplayId={setReplayId} isTransitioning={isTransitioning} environmentPreset={environmentPreset} cubeMapQuality={cubeMapQuality} />
                        </React.Suspense>

                        {!state && <div className="my-3"><AdSense slot={import.meta.env.VITE_ADSENSE_SLOT_LOBBY || '1234567890'} /></div>}

                        <GameModal />
                        {showCreateForm && (
                            <CreateRoomForm
                                onSubmit={(options) => {
                                    createRoom(options, (id: string) => {
                                        setRoomId(id);
                                        connectRoom(id, playerName, options.password);
                                    });
                                    setShowCreateForm(false);
                                }}
                                onCancel={() => setShowCreateForm(false)}
                            />
                        )}
                        {showJoinForm && (
                            <JoinRoomForm
                                initialName={name}
                                onSubmit={(roomId, inputName, password) => {
                                    const finalName = user?.username || inputName;
                                    connectRoom(roomId, finalName, password);
                                    setRoomId(roomId);
                                    if (!user) setName(inputName);
                                    setShowJoinForm(false);
                                }}
                                onCancel={() => setShowJoinForm(false)}
                            />
                        )}
                        <SaveGameDialog
                            show={showSaveDialog}
                            saveName={saveName}
                            setSaveName={setSaveName}
                            onSave={() => {
                                if (saveName.trim()) {
                                    saveGame(saveName.trim(), user?.id);
                                    setSaveName('');
                                    setShowSaveDialog(false);
                                }
                            }}
                            onCancel={() => setShowSaveDialog(false)}
                        />
                        <LoadGameDialog
                            show={showLoadDialog}
                            onCancel={() => setShowLoadDialog(false)}
                        />
                    </>
                )}
            </div>
            <Footer onNavigate={setCurrentPage} />
        </div>
    );
}

/**
 * Game area component that renders the appropriate game view
 * 
 * Handles switching between 2D/3D modes, replay viewing, and WebGL context cleanup.
 * Shows room list when not in a game, and manages view mode transitions.
 * 
 * @param props - GameArea component props
 * @param props.useThree - Whether to use 3D rendering
 * @param props.replayId - ID of replay to show, empty string if not viewing replay
 * @param props.setReplayId - Function to set replay ID
 * @param props.isTransitioning - Whether currently transitioning between 2D/3D modes
 * @param props.environmentPreset - 3D environment preset name
 * @param props.cubeMapQuality - Quality setting for cube map reflections
 * @returns JSX element representing the game area
 */
function GameArea({ useThree, replayId, setReplayId, isTransitioning, environmentPreset, cubeMapQuality }: { useThree: boolean; replayId: string; setReplayId: (id: string) => void; isTransitioning: boolean; environmentPreset: string; cubeMapQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra' }) {
    const state = useGame(s => s.state);
    const [webglKey, setWebglKey] = React.useState(0);

    React.useEffect(() => {
        if (isTransitioning) {
            // Force remount of 3D component to clean up WebGL context
            setWebglKey(prev => prev + 1);
        }
    }, [isTransitioning]);

    if (replayId) {
        return <Replay replayId={replayId} onClose={() => setReplayId('')} />;
    }

    if (!state) return (
        <div>
            <div className="alert alert-info">Join a room to start.</div>
            <RoomListDisplay />
            <div className="my-3"><AdSense slot={import.meta.env.VITE_ADSENSE_SLOT_LOBBY || '1234567890'} /></div>
        </div>
    );
    return (
        <div>
            {state.winner && (
                <>
                    <div className="mb-3">
                        <button
                            className="btn btn-secondary"
                            onClick={() => useGame.setState({ roomId: undefined, state: undefined })}
                        >
                            Exit to Home
                        </button>
                    </div>
                    <div className="my-3"><AdSense slot={import.meta.env.VITE_ADSENSE_SLOT_POSTGAME || '9876543210'} /></div>
                </>
            )}
            {isTransitioning ? (
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Switching...</span>
                    </div>
                    <p className="mt-2">Switching view mode...</p>
                </div>
            ) : useThree ? (
                <Board3D key={webglKey} environmentPreset={environmentPreset} cubeMapQuality={cubeMapQuality} />
            ) : (
                <Board2D />
            )}
        </div>
    );
}

/**
 * Component displaying available game rooms with auto-refresh
 * 
 * Fetches and displays active rooms every 5 seconds, showing:
 * - Room ID and player counts
 * - Game configuration (rules and setup)
 * - Game status (turn or finished)
 * - Join buttons for each room
 * 
 * @returns JSX element representing the room list
 */
function RoomListDisplay() {
    const [rooms, setRooms] = useState<{ id: string; playerCount: number; spectatorCount: number; hasWinner: boolean; turn: 'RED' | 'SILVER'; config?: { rules: string; setup: string } }[]>([]);
    const connectRoom = useGame(s => s.connectRoom);
    const { user } = useAuth();
    const [name] = useState('Player');
    const playerName = user?.username || name;

    const formatRules = (rules: string) => {
        return rules === 'KHET_2_0' ? 'Khet 2.0' : rules === 'CLASSIC' ? 'Classic' : rules;
    };

    const formatSetup = (setup: string) => {
        const sanitized = DOMPurify.sanitize(setup, { ALLOWED_TAGS: [] });
        if (sanitized === 'CLASSIC') return 'Classic';

        const lowercase = sanitized.toLowerCase().replace(/_/g, ' ');
        return lowercase.replace(/\b\w/g, c => c.toUpperCase());
    }

    const fetchRooms = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/rooms`);
            const roomData = await response.json();
            setRooms(roomData);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            setRooms([]);
        }
    };

    React.useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-3">
            <h5>Available Rooms</h5>
            {rooms.length === 0 ? (
                <p className="text-muted">No active rooms found.</p>
            ) : (
                <div className="list-group">
                    {rooms.map((room) => (
                        <div key={room.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                                <div className="row">
                                    <div className="col">
                                        <h6 className="mb-1">Room {room.id}</h6>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-4">
                                        <small className="text-muted">
                                            {room.config && `${formatRules(room.config.rules)} - ${formatSetup(room.config.setup)} `}
                                        </small>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted">Players: {room.playerCount}/2 ({room.spectatorCount}&nbsp;watching)</small>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted">
                                            {room.hasWinner ? 'Game Finished' : ` Turn: ${room.turn}`}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button className="btn btn-primary" onClick={() => connectRoom(room.id, playerName)}>
                                    Join
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Modal dialog for displaying game notifications and messages
 * 
 * Shows system messages like game over notifications, save confirmations,
 * and error messages. Provides special handling for game over modals
 * with an "Exit to Home" option.
 * 
 * @returns JSX element representing the modal dialog or null if no modal
 */
function GameModal() {
    const modal = useGame(s => s.modal);
    const hideModal = useGame(s => s.hideModal);

    if (!modal) return null;

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{modal.title}</h5>
                        <button type="button" className="btn-close" onClick={hideModal}></button>
                    </div>
                    <div className="modal-body">
                        <p>{modal.message}</p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={hideModal}>OK</button>
                        {modal.title === 'Game Over' && (
                            <button type="button" className="btn btn-secondary" onClick={() => {
                                hideModal();
                                useGame.setState({ roomId: undefined, state: undefined });
                            }}>Exit to Home</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal dialog for saving the current game
 * 
 * Provides an input field for entering a custom game name
 * and handles save/cancel actions.
 * 
 * @param props - SaveGameDialog component props
 * @param props.show - Whether to display the dialog
 * @param props.saveName - Current save name input value
 * @param props.setSaveName - Function to update save name
 * @param props.onSave - Callback when save is confirmed
 * @param props.onCancel - Callback when dialog is cancelled
 * @returns JSX element representing the save dialog or null if hidden
 */
function SaveGameDialog({ show, saveName, setSaveName, onSave, onCancel }: {
    show: boolean;
    saveName: string;
    setSaveName: (name: string) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Save Game</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter game name"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && onSave()}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={onSave}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal dialog for loading saved games
 * 
 * Displays a list of unfinished saved games with load and delete options.
 * Filters out completed games to show only resumable games.
 * 
 * @param props - LoadGameDialog component props
 * @param props.show - Whether to display the dialog
 * @param props.onCancel - Callback when dialog is cancelled
 * @returns JSX element representing the load dialog or null if hidden
 */
function LoadGameDialog({ show, onCancel }: {
    show: boolean;
    onCancel: () => void;
}) {
    const { savedGames, loadGame, deleteSavedGame } = useGame();

    if (!show) return null;

    const handleLoad = (gameId: string) => {
        loadGame(gameId);
        onCancel();
    };

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Load Game</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body">
                        {savedGames.filter(game => !game.winner).length === 0 ? (
                            <p>No unfinished saved games found.</p>
                        ) : (
                            <div className="list-group">
                                {savedGames.filter(game => !game.winner).map((game) => (
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
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
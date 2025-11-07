
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { SERVER_URL } from './config/server';
import { useGame } from './state/game';
import { useAuth } from './state/auth';
import { RoomList } from './components/RoomList';
import { Replays } from './components/Replays';
import { CreateRoomForm } from './components/CreateRoomForm';
import { JoinRoomForm } from './components/JoinRoomForm';
import { Replay } from './components/Replay';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Stats } from './components/Stats';
import { Rules } from './components/Rules';
import { TermsOfService } from './components/TermsOfService';
import { Privacy } from './components/Privacy';
import { About } from './components/About';
import { AdSense } from './components/AdSense';
import { AdMobWrapper, showInterstitialAd } from './components/AdMob';
import { CanonicalTag } from './components/CanonicalTag';

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
    const { t } = useTranslation();
    const { checkAuth } = useAuth();
    const connectRoom = useGame(s => s.connectRoom);
    const [currentPage, setCurrentPage] = useState<'home' | 'stats' | 'rules' | 'terms' | 'privacy' | 'about' | 'replays'>('home');

    React.useEffect(() => {
        checkAuth().catch(console.error);
    }, [checkAuth]);
    const createRoom = useGame(s => (s as any).createRoom ?? (() => { }));
    const saveGame = useGame(s => s.saveGame);
    const state = useGame(s => s.state);
    const [roomId, setRoomId] = useState(''); // maybe ROOM1
    const [name, setName] = useState(() => {
        return localStorage.getItem('opensphinx-player-name') || 'Player';
    });
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
    const [showParticles, setShowParticles] = useState(() => {
        const saved = localStorage.getItem('opensphinx-show-particles');
        return saved ? JSON.parse(saved) : false;
    });
    const [trueReflections, setTrueReflections] = useState(() => {
        const saved = localStorage.getItem('opensphinx-true-reflections');
        return saved ? JSON.parse(saved) : false;
    });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [replayId, setReplayId] = useState('');

    const { user } = useAuth();

    // Use Discord username when logged in
    const playerName = user?.username || name;
    const handleLoadGame = () => setShowLoadDialog(true);
    const handleNewGame = () => setShowCreateForm(true);
    const handleLeaveGame = async () => {
        const adUnitId = import.meta.env.VITE_ADMOB_INTERSTITIAL;
        if (adUnitId) await showInterstitialAd(adUnitId);
        useGame.setState({ roomId: undefined, state: undefined });
    };
    const handleJoinRoom = () => setShowJoinForm(true);
    const [showBrowseRooms, setShowBrowseRooms] = useState(false);
    const [headerMinimized, setHeaderMinimized] = useState(false);

    React.useEffect(() => {
        if (state && !useThree) {
            setHeaderMinimized(true);
        } else {
            setHeaderMinimized(false);
        }
    }, [state, useThree]);

    const getCanonicalPath = () => {
        switch (currentPage) {
            case 'stats': return '/stats';
            case 'rules': return '/rules';
            case 'terms': return '/terms';
            case 'privacy': return '/privacy';
            case 'about': return '/about';
            case 'replays': return '/replays';
            default: return '/';
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100">
            <CanonicalTag path={getCanonicalPath()} />
            <Header
                inGame={!!state}
                onLoadGame={handleLoadGame}
                onNewGame={handleNewGame}
                onLeaveGame={handleLeaveGame}
                onJoinRoom={handleJoinRoom}
                onBrowseRooms={() => setShowBrowseRooms(true)}
                playerName={name}
                onPlayerNameChange={(newName) => {
                    setName(newName);
                    localStorage.setItem('opensphinx-player-name', newName);
                }}
                isLoggedIn={!!user}
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
                showParticles={showParticles}
                onToggleParticles={(checked) => {
                    setShowParticles(checked);
                    localStorage.setItem('opensphinx-show-particles', JSON.stringify(checked));
                }}
                trueReflections={trueReflections}
                onToggleTrueReflections={(checked) => {
                    setTrueReflections(checked);
                    localStorage.setItem('opensphinx-true-reflections', JSON.stringify(checked));
                }}
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                minimized={headerMinimized}
                onToggleMinimized={() => setHeaderMinimized(!headerMinimized)}
            />
            <div className="container-fluid p-3 flex-grow-1">
                {currentPage === 'stats' ? (
                    <Stats />
                ) : currentPage === 'rules' ? (
                    <Rules />
                ) : currentPage === 'terms' ? (
                    <TermsOfService />
                ) : currentPage === 'privacy' ? (
                    <Privacy />
                ) : currentPage === 'about' ? (
                    <About />
                ) : currentPage === 'replays' ? (
                    <Replays onReplaySelect={(id) => { setReplayId(id); setCurrentPage('home'); }} />
                ) : (
                    <>
                        {!state && (
                            <>
                                <div className="row mb-4">
                                    <div className="col-md-8">
                                        <h4>{t('welcome_title')}</h4>
                                        <p>{t('welcome_description')}</p>
                                        <h5>{t('how_to_play')}</h5>
                                        <p>{t('how_to_play_description')}</p>
                                        <p>{t('change_name_hint')}</p>
                                        <p>{t('more_info')} <a href="#" onClick={() => setCurrentPage('rules')}>{t('rules')}</a> {t('page')}.</p>
                                    </div>
                                    <div className="col-md-4">
                                        <AdMobWrapper
                                            adUnitId={import.meta.env.VITE_ADMOB_BANNER_LOBBY || 'ca-app-pub-3940256099942544/6300978111'}
                                            adSenseSlot={import.meta.env.VITE_ADSENSE_SLOT_LOBBY || '1234567890'}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {!state && (
                            <div className="d-flex gap-2 align-items-center mb-3 justify-content-start flex-wrap">
                                <button className="btn btn-success" onClick={() => setShowCreateForm(true)}>{t('create')}</button>
                                <button className="btn btn-primary" onClick={() => setShowJoinForm(true)}>{t('join')}</button>
                                <button className="btn btn-secondary" onClick={handleLoadGame}>{t('load_game')}</button>
                                <button className="btn btn-outline-info" onClick={() => setCurrentPage('replays')}>{t('view_replays')}</button>
                            </div>
                        )}

                        <React.Suspense fallback={<div className="text-center">{t('loading')}</div>}>
                            <GameArea useThree={useThree} replayId={replayId} setReplayId={setReplayId} isTransitioning={isTransitioning} environmentPreset={environmentPreset} cubeMapQuality={cubeMapQuality} showParticles={showParticles} trueReflections={trueReflections} />
                        </React.Suspense>

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
                                    if (!user) {
                                        setName(inputName);
                                        localStorage.setItem('opensphinx-player-name', inputName);
                                    }
                                    setShowJoinForm(false);
                                }}
                                onCancel={() => setShowJoinForm(false)}
                            />
                        )}
                        {showBrowseRooms && (
                            <BrowseRoomsModal
                                onJoinRoom={(roomId) => {
                                    setRoomId(roomId);
                                    connectRoom(roomId, playerName);
                                    setShowBrowseRooms(false);
                                }}
                                onClose={() => setShowBrowseRooms(false)}
                            />
                        )}
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
function GameArea({ useThree, replayId, setReplayId, isTransitioning, environmentPreset, cubeMapQuality, showParticles, trueReflections }: { useThree: boolean; replayId: string; setReplayId: (id: string) => void; isTransitioning: boolean; environmentPreset: string; cubeMapQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra'; showParticles: boolean; trueReflections: boolean }) {
    const { t } = useTranslation();
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
            <div className="alert alert-info">
                <b>{t('getting_started')}</b>
                <p>{t('getting_started_description')}</p>
            </div>
            <RoomListDisplay />
        </div>
    );
    return (
        <div>
            {state.winner && (
                <div className="mb-3">
                    <button
                        className="btn btn-secondary"
                        onClick={async () => {
                            const adUnitId = import.meta.env.VITE_ADMOB_INTERSTITIAL;
                            if (adUnitId) await showInterstitialAd(adUnitId);
                            useGame.setState({ roomId: undefined, state: undefined });
                        }}
                    >
                        {t('exit_to_home')}
                    </button>
                </div>
            )}
            {isTransitioning ? (
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">{t('switching')}</span>
                    </div>
                    <p className="mt-2">{t('switching_view_mode')}</p>
                </div>
            ) : useThree ? (
                <Board3D key={webglKey} environmentPreset={environmentPreset} cubeMapQuality={cubeMapQuality} showParticles={showParticles} trueReflections={trueReflections} />
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
    const { t } = useTranslation();
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
            console.error(`App > Failed to fetch rooms from ${SERVER_URL}:`, error);
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
            <h5>{t('available_rooms')}</h5>
            {rooms.length === 0 ? (
                <p className="text-muted">{t('no_rooms')}</p>
            ) : (
                <div className="list-group">
                    {rooms.map((room) => (
                        <div key={room.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                                <div className="row">
                                    <div className="col">
                                        <h6 className="mb-1">{t('room')} {room.id}</h6>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-4">
                                        <small className="text-muted">
                                            {room.config && `${formatRules(room.config.rules)} - ${formatSetup(room.config.setup)} `}
                                        </small>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted">{t('players')}: {room.playerCount}/2 ({room.spectatorCount}&nbsp;{t('watching')})</small>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted">
                                            {room.hasWinner ? t('game_finished') : ` ${t('turn')}: ${room.turn}`}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button className="btn btn-primary" onClick={() => connectRoom(room.id, playerName)}>
                                    {t('join')}
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
    const { t } = useTranslation();
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
                        {modal.title === 'Game Over' && (
                            <div className="mt-3">
                                <AdMobWrapper
                                    adUnitId={import.meta.env.VITE_ADMOB_BANNER_POSTGAME || 'ca-app-pub-3940256099942544/6300978111'}
                                    adSenseSlot={import.meta.env.VITE_ADSENSE_SLOT_POSTGAME || '9876543210'}
                                />
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={async () => {
                            hideModal();
                            if (modal.title === 'Game Over') {
                                const adUnitId = import.meta.env.VITE_ADMOB_INTERSTITIAL;
                                if (adUnitId) await showInterstitialAd(adUnitId);
                            }
                        }}>OK</button>
                        {modal.title === 'Game Over' && (
                            <button type="button" className="btn btn-secondary" onClick={async () => {
                                hideModal();
                                const adUnitId = import.meta.env.VITE_ADMOB_INTERSTITIAL;
                                if (adUnitId) await showInterstitialAd(adUnitId);
                                useGame.setState({ roomId: undefined, state: undefined });
                            }}>{t('exit_to_home')}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal dialog for browsing available rooms
 */
function BrowseRoomsModal({ onJoinRoom, onClose }: { onJoinRoom: (roomId: string) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<{ id: string; playerCount: number; spectatorCount: number; hasWinner: boolean; turn: 'RED' | 'SILVER'; config?: { rules: string; setup: string } }[]>([]);

    const formatRules = (rules: string) => rules === 'KHET_2_0' ? 'Khet 2.0' : rules === 'CLASSIC' ? 'Classic' : rules;
    const formatSetup = (setup: string) => {
        const sanitized = DOMPurify.sanitize(setup, { ALLOWED_TAGS: [] });
        return sanitized.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/rooms`);
            setRooms(await response.json());
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        }
    };

    React.useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{t('browse_rooms')}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {rooms.length === 0 ? (
                            <p>{t('no_rooms')}</p>
                        ) : (
                            <div className="list-group">
                                {rooms.map((room) => (
                                    <div key={room.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div className="flex-grow-1">
                                            <strong>{t('room')} {room.id}</strong>
                                            <div><small className="text-muted">
                                                {room.config && `${formatRules(room.config.rules)} - ${formatSetup(room.config.setup)}`}
                                            </small></div>
                                            <div><small className="text-muted">{t('players')}: {room.playerCount}/2 ({room.spectatorCount} {t('watching')}) - {room.hasWinner ? t('finished') : `${t('turn')}: ${room.turn}`}</small></div>
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={() => onJoinRoom(room.id)}>{t('join')}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('close')}</button>
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
    const { t } = useTranslation();
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
                        <h5 className="modal-title">{t('load_game')}</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body">
                        {savedGames.filter(game => !game.winner).length === 0 ? (
                            <p>{t('no_saved_games')}</p>
                        ) : (
                            <div className="list-group">
                                {savedGames.filter(game => !game.winner).map((game) => (
                                    <div key={game.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-1">{game.name}</h6>
                                            <small className="text-muted">
                                                {t('updated')}: {new Date(game.updatedAt).toLocaleString()}
                                            </small>
                                        </div>
                                        <div>
                                            <button
                                                className="btn btn-primary btn-sm me-2"
                                                onClick={() => handleLoad(game.id)}
                                            >
                                                {t('load')}
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => deleteSavedGame(game.id)}
                                            >
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('close')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
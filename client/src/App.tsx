
import React, { useState } from 'react';
import { useGame } from './state/game';
import { SavedGames } from './components/SavedGames';
import { RoomList } from './components/RoomList';
import { CreateRoomForm } from './components/CreateRoomForm';
import { JoinRoomForm } from './components/JoinRoomForm';
import { Replay } from './components/Replay';

const Board2D = React.lazy(() => import('./components/Board').then(m => ({ default: m.Board })));
const Board3D = React.lazy(() => import('./components/Board3D').then(m => ({ default: m.Board3D })));

export default function App() {
    const connectRoom = useGame(s => s.connectRoom);
    const createRoom = useGame(s => (s as any).createRoom ?? (() => { }));
    const state = useGame(s => s.state);
    const [roomId, setRoomId] = useState(''); // maybe ROOM1
    const [name, setName] = useState('Player');
    const [useThree, setUseThree] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [replayId, setReplayId] = useState('');



    return (
        <div className="container-fluid p-3">
            <h1 className="mb-3">OpenSphinx - Laser Chess</h1>
            <div className="d-flex gap-2 align-items-center mb-3">
                <input className="form-control" placeholder="Room ID" value={roomId} disabled style={{ width: '150px' }} />
                <input className="form-control" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '150px' }} />
                <button className="btn btn-primary" onClick={() => setShowJoinForm(true)}>Join</button>
                <button className="btn btn-success" onClick={() => setShowCreateForm(true)}>Create</button>
                <SavedGames onReplaySelect={setReplayId} />
                {state && !replayId && <RoomList onJoinRoom={(roomId) => { setRoomId(roomId); connectRoom(roomId, name); }} />}
                <div className="form-check ms-auto">
                    <input className="form-check-input" type="checkbox" checked={useThree} onChange={e => setUseThree(e.target.checked)} id="use3d" />
                    <label className="form-check-label" htmlFor="use3d">Use 3D</label>
                </div>
            </div>

            <React.Suspense fallback={<div className="text-center">Loading…</div>}>
                <GameArea useThree={useThree} replayId={replayId} setReplayId={setReplayId} />
            </React.Suspense>
            
            <GameModal />
            {showCreateForm && (
                <CreateRoomForm 
                    onSubmit={(options) => {
                        createRoom(options, (id: string) => {
                            setRoomId(id);
                            connectRoom(id, name, options.password);
                        });
                        setShowCreateForm(false);
                    }}
                    onCancel={() => setShowCreateForm(false)}
                />
            )}
            {showJoinForm && (
                <JoinRoomForm 
                    initialName={name}
                    onSubmit={(roomId, name, password) => {
                        connectRoom(roomId, name, password);
                        setRoomId(roomId);
                        setName(name);
                        setShowJoinForm(false);
                    }}
                    onCancel={() => setShowJoinForm(false)}
                />
            )}
        </div>
    );
}

function GameArea({ useThree, replayId, setReplayId }: { useThree: boolean; replayId: string; setReplayId: (id: string) => void }) {
    const state = useGame(s => s.state);
    
    if (replayId) {
        return <Replay replayId={replayId} onClose={() => setReplayId('')} />;
    }
    
    if (!state) return (
        <div>
            <div className="alert alert-info">Join a room to start.</div>
            <RoomListDisplay />
        </div>
    );
    return (
        <div>
            {state.winner && (
                <div className="mb-3">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => useGame.setState({ roomId: undefined, state: undefined })}
                    >
                        Exit to Home
                    </button>
                </div>
            )}
            {useThree ? <Board3D /> : <Board2D />}
        </div>
    );
}

function RoomListDisplay() {
    const [rooms, setRooms] = useState<{ id: string; playerCount: number; spectatorCount: number; hasWinner: boolean; turn: 'RED' | 'SILVER' }[]>([]);
    const connectRoom = useGame(s => s.connectRoom);
    const [name] = useState('Player');

    const fetchRooms = async () => {
        try {
            const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
            const response = await fetch(`${serverUrl}/api/rooms`);
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
                            <div>
                                <h6 className="mb-1">Room {room.id}</h6>
                                <small className="text-muted">
                                    Players: {room.playerCount}/2 | Spectators: {room.spectatorCount}
                                    {room.hasWinner ? ' | Finished' : ` | Turn: ${room.turn}`}
                                </small>
                            </div>
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => connectRoom(room.id, name)}
                            >
                                Join
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
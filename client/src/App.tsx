
import React, { useState } from 'react';
import { useGame } from './state/game';

const Board2D = React.lazy(() => import('./components/Board').then(m => ({ default: m.Board })));
const Board3D = React.lazy(() => import('./components/Board3D').then(m => ({ default: m.Board3D })));

export default function App() {
    const connectRoom = useGame(s => s.connectRoom);
    const createRoom = useGame(s => (s as any).createRoom ?? (() => { })); // if you added createRoom earlier
    const [roomId, setRoomId] = useState(''); // maybe ROOM1
    const [name, setName] = useState('Player');
    const [useThree, setUseThree] = useState(true);



    return (
        <div className="container-fluid p-3">
            <h1 className="mb-3">Laser Chess (Online)</h1>
            <div className="d-flex gap-2 align-items-center mb-3">
                <input className="form-control" placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} style={{ width: '150px' }} />
                <input className="form-control" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '150px' }} />
                <button className="btn btn-primary" onClick={() => connectRoom(roomId, name)}>Join</button>
                {'createRoom' in (useGame.getState() as any) && (
                    <button className="btn btn-success" onClick={() => createRoom((id: string) => setRoomId(id))}>Create</button>
                )}
                <div className="form-check ms-auto">
                    <input className="form-check-input" type="checkbox" checked={useThree} onChange={e => setUseThree(e.target.checked)} id="use3d" />
                    <label className="form-check-label" htmlFor="use3d">Use 3D</label>
                </div>
            </div>

            <React.Suspense fallback={<div className="text-center">Loading…</div>}>
                <GameArea useThree={useThree} />
            </React.Suspense>
            
            <GameModal />
        </div>
    );
}

function GameArea({ useThree }: { useThree: boolean }) {
    const state = useGame(s => s.state);
    if (!state) return <div className="alert alert-info">Join a room to start.</div>;
    return useThree ? <Board3D /> : <Board2D />;
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
                    </div>
                </div>
            </div>
        </div>
    );
}

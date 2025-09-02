
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
        <div style={{ padding: 16 }}>
            <h1>Laser Chess (Online)</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} />
                <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                <button onClick={() => connectRoom(roomId, name)}>Join</button>
                {'createRoom' in (useGame.getState() as any) && (
                    <button onClick={() => createRoom((id: string) => setRoomId(id))}>Create</button>
                )}
                <label style={{ marginLeft: 'auto' }}>
                    <input type="checkbox" checked={useThree} onChange={e => setUseThree(e.target.checked)} /> Use 3D
                </label>
            </div>

            <React.Suspense fallback={<div>Loading…</div>}>
                <GameArea useThree={useThree} />
            </React.Suspense>
        </div>
    );
}

function GameArea({ useThree }: { useThree: boolean }) {
    const state = useGame(s => s.state);
    if (!state) return <div>Join a room to start.</div>;
    return useThree ? <Board3D /> : <Board2D />;
}


import React, { useState } from 'react';
import { useGame } from './state/game';

const BoardLazy = React.lazy(() => import('./components/Board').then(m => ({ default: m.Board })));

export default function App() {
  const connectRoom = useGame(s => s.connectRoom);
  const createRoom = useGame(s => s.createRoom);
  const [roomId, setRoomId] = useState('ROOM1');
  const [name, setName] = useState('Player');

  return (
    <div style={{ padding: 16 }}>
      <h1>Laser Chess (Online)</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Room ID" value={roomId} onChange={e=>setRoomId(e.target.value)} />
        <input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={()=>connectRoom(roomId, name)}>Join</button>
		<button onClick={() => createRoom((id) => setRoomId(id))}>Create</button>
      </div>
      <hr />
      <React.Suspense fallback={<div>Loading…</div>}>
        <GameArea />
      </React.Suspense>
    </div>
  );
}

function GameArea() {
  const state = useGame(s => s.state);
  return state ? <BoardLazy /> : <div>Join a room to start.</div>;
}

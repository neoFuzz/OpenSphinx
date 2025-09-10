import React, { useState, useEffect } from 'react';

interface Room {
  id: string;
  playerCount: number;
  spectatorCount: number;
  hasWinner: boolean;
  turn: 'RED' | 'SILVER';
}

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
}

export function RoomList({ onJoinRoom }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);

  const fetchRooms = async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/rooms`);
      const roomData = await response.json();
      setRooms(roomData);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  useEffect(() => {
    if (showRoomList) {
      fetchRooms();
      const interval = setInterval(fetchRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [showRoomList]);

  return (
    <>
      <button 
        className="btn btn-outline-info btn-sm" 
        onClick={() => setShowRoomList(true)}
      >
        Browse Rooms
      </button>

      {showRoomList && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Available Rooms</h5>
                <button type="button" className="btn-close" onClick={() => setShowRoomList(false)}></button>
              </div>
              <div className="modal-body">
                {rooms.length === 0 ? (
                  <p>No active rooms found.</p>
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
                          onClick={() => {
                            onJoinRoom(room.id);
                            setShowRoomList(false);
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoomList(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
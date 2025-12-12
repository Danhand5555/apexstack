import React, { useState } from 'react';
import { useGame } from './core/GameContext';
import { createRoom, joinRoom } from './core/gameHelpers';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import BankerView from './views/BankerView';
import PlayerView from './views/PlayerView';
import ObserverView from './views/ObserverView';
import SlaveGameView from './views/SlaveGameView';

function App() {
  const { gameState, setRoomCode, setPlayerId, setPlayerRole, playerRole } = useGame();
  const [view, setView] = useState('landing'); // landing, lobby, game

  const handleCreateRoom = async (gameType) => {
    try {
      const myId = "banker_" + Date.now(); // Generate ID first
      const code = await createRoom(gameType, myId); // Pass ID to createRoom

      // If Slave game, the Host is also a Player
      if (gameType === 'slave') {
        // Import here or standard
        const { joinAsRole } = await import('./core/gameHelpers');
        await joinAsRole(code, myId, 'player', 'HOST');
      }

      // creator is automatically Banker/Host
      setRoomCode(code);
      setPlayerId(myId);
      setPlayerRole('banker'); // Keep as banker to trigger Host view in Lobby
      setView('lobby');
    } catch (e) {
      console.error("Error creating room:", e);
      alert("Failed to create room: " + e.message);
    }
  };

  const handleJoinRoom = async (code) => {
    try {
      await joinRoom(code); // Verify existence
      setRoomCode(code);
      const myId = "player_" + Date.now();
      setPlayerId(myId);
      // Role not set yet, go to lobby to choose
      setView('lobby');
    } catch (e) {
      console.error("Error joining room:", e);
      alert("Failed to join room: " + e.message);
    }
  };

  const renderGameView = () => {
    if (gameState?.gameType === 'slave') {
      return <SlaveGameView />;
    }

    switch (playerRole) {
      case 'banker': return <BankerView />;
      case 'player': return <PlayerView />;
      case 'observer': return <ObserverView />;
      default: return <div>Unknown Role</div>;
    }
  };

  return (
    <div className="app-container">
      {view === 'landing' && (
        <Landing onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      )}

      {view === 'lobby' && (
        <Lobby onGameStart={() => setView('game')} />
      )}

      {view === 'game' && renderGameView()}
    </div>
  );
}

export default App;

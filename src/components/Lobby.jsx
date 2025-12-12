import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import { joinAsRole, confirmPlayer, setRoomGoal } from '../core/gameHelpers';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../core/firebase';

const Lobby = ({ onGameStart }) => {
    const { gameState, roomCode, playerId, playerRole, setPlayerRole } = useGame();
    const [players, setPlayers] = useState([]);
    const [myStatus, setMyStatus] = useState(playerRole === 'banker' ? 'active' : 'selecting');
    const [goalInput, setGoalInput] = useState('2000');

    // Subscribe to players
    useEffect(() => {
        if (!roomCode) return;
        const q = query(collection(db, "rooms", roomCode, "players"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => {
                pList.push(doc.data());
                if (doc.id === playerId) {
                    const newStatus = doc.data().status;
                    if (newStatus === 'active' && myStatus !== 'active') {
                        setMyStatus(newStatus);
                        setTimeout(() => onGameStart(), 1000);
                    }
                }
            });
            setPlayers(pList);
        });
        return () => unsubscribe();
    }, [roomCode, playerId, myStatus, onGameStart]);

    const handleRoleSelect = async (role) => {
        const nameInput = document.getElementById('player-name-input');
        const playerName = nameInput ? nameInput.value : '';
        try {
            await joinAsRole(roomCode, playerId, role, playerName);
            setPlayerRole(role);
            setMyStatus(role === 'observer' ? 'active' : 'waiting');
        } catch (e) { console.error(e); }
    };

    const handleConfirm = async (pid) => {
        try { await confirmPlayer(roomCode, pid); } catch (e) { console.error(e); }
    };

    const handleSetGoal = async () => {
        try { await setRoomGoal(roomCode, goalInput); } catch (e) { console.error(e); }
    };

    const handleStartGame = async () => {
        try {
            if (gameState?.gameType === 'slave') {
                // Import dynamically or assuming it's imported at top
                // Since this file is big, adding import at top is safer.
                // But for tool efficiency, I will replace here.
                const { startSlaveGame } = await import('../core/slaveHelpers');
                await startSlaveGame(roomCode);
            } else {
                await dealInitialHands(roomCode);
            }
            onGameStart();
        } catch (e) {
            console.error("Failed to start game:", e);
            alert("Error: " + e.message);
        }
    };

    // --- RENDER BANKER LOBBY ---
    if (playerRole === 'banker') {
        const waitingPlayers = players.filter(p => p.status === 'waiting' && p.role === 'player');
        const activePlayers = players.filter(p => p.status === 'active' && p.role === 'player');
        const observers = players.filter(p => p.role === 'observer'); // Show all observers

        return (
            <div className="game-table" style={{ padding: '40px', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-gold)', fontSize: '3.5rem', margin: 0 }}>LOBBY</h1>
                <h2 style={{ color: 'white', letterSpacing: '2px', marginTop: '10px' }}>CODE: <span style={{ fontFamily: 'monospace', fontSize: '1.2em' }}>{roomCode}</span></h2>

                <div style={{ margin: '30px 0', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '12px' }}>
                    <label style={{ color: 'white', fontWeight: 'bold' }}>GAME GOAL ($):</label>
                    <input
                        type="number"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #666', fontSize: '1.2rem', background: '#333', color: 'white', width: '100px' }}
                    />
                    <button onClick={handleSetGoal} className="btn-action" style={{ padding: '10px 20px', fontSize: '1rem', background: 'var(--color-gold)', color: 'black' }}>
                        SET GOAL
                    </button>
                    {gameState?.winningGoal && <span style={{ color: '#4caf50', marginLeft: '10px' }}>✓ Target: ${gameState.winningGoal}</span>}
                </div>

                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* CONFIRMATION QUEUE */}
                    {waitingPlayers.length > 0 && (
                        <div style={{ background: '#2c2c2c', padding: '20px', borderRadius: '12px', border: '1px solid #444' }}>
                            <h3 style={{ color: 'var(--color-crimson)', margin: '0 0 15px 0' }}>WAITING TO JOIN ({waitingPlayers.length})</h3>
                            {waitingPlayers.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', marginBottom: '5px', borderRadius: '6px' }}>
                                    <span style={{ color: 'white', fontSize: '1.2rem' }}>{p.name}</span>
                                    <button onClick={() => handleConfirm(p.id)} style={{ padding: '8px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        CONFIRM
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ACTIVE ROSTER */}
                    <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', minHeight: '150px' }}>
                        <h3 style={{ color: 'var(--color-text-secondary)', margin: '0 0 15px 0' }}>ACTIVE PLAYERS ({activePlayers.length})</h3>
                        {activePlayers.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No players confirmed yet.</p>}
                        {activePlayers.map(p => (
                            <div key={p.id} style={{ padding: '10px', borderBottom: '1px solid #333', color: 'white' }}>
                                <span>{p.name}</span>
                                <span style={{ float: 'right', color: 'var(--color-gold)' }}>${p.chips}</span>
                            </div>
                        ))}
                    </div>

                    {/* OBSERVERS LIST */}
                    {observers.length > 0 && (
                        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', minHeight: '100px', marginTop: '20px' }}>
                            <h3 style={{ color: '#aaa', margin: '0 0 15px 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>OBSERVERS ({observers.length})</h3>
                            {observers.map(p => (
                                <div key={p.id} style={{ padding: '8px', borderBottom: '1px solid #333', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{p.name}</span>
                                    <span>{p.status}</span>
                                    {p.status === 'waiting' && (
                                        <button onClick={() => handleConfirm(p.id)} style={{ padding: '4px 10px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            ALLOW
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleStartGame}
                        className="btn-action btn-primary"
                        disabled={activePlayers.length === 0}
                        style={{ marginTop: '20px', width: '100%' }}
                    >
                        START GAME
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDER PLAYER/OBSERVER JOIN SCREEN ---
    return (
        <div className="game-table" style={{ alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <h1 style={{ color: 'var(--color-gold)', fontSize: '4rem', margin: 0 }}>APEX</h1>
            <h2 style={{ color: 'white', letterSpacing: '4px', marginBottom: '40px' }}>STACK</h2>

            {myStatus === 'selecting' && (
                <div style={{ width: '100%', maxWidth: '350px', background: '#222', p: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '30px' }}>
                    <h3 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>ENTER THE ARENA</h3>
                    <input
                        type="text"
                        placeholder="YOUR NAME"
                        id="player-name-input"
                        style={{
                            width: '100%', padding: '15px', marginBottom: '20px',
                            borderRadius: '8px', border: '2px solid #444',
                            background: '#111', color: 'white', fontSize: '1.2rem', textAlign: 'center'
                        }}
                    />
                    <div style={{ display: 'grid', gap: '15px' }}>
                        <button onClick={() => handleRoleSelect('player')} className="btn-action btn-primary" style={{ fontSize: '1rem', width: '100%' }}>
                            JOIN AS PLAYER
                        </button>
                        <button onClick={() => handleRoleSelect('observer')} className="btn-action btn-secondary" style={{ fontSize: '1rem', width: '100%', background: 'transparent', border: '1px solid #444' }}>
                            WATCH AS OBSERVER
                        </button>
                    </div>
                </div>
            )}

            {myStatus === 'waiting' && (
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <div className="loader" style={{ margin: '0 auto 20px auto' }}></div>
                    <h2>Waiting for Banker...</h2>
                    <p style={{ color: '#888' }}>Sit tight.</p>
                </div>
            )}

            {myStatus === 'active' && (
                <div style={{ textAlign: 'center', color: 'var(--color-gold)' }}>
                    <h1>YOU ARE IN</h1>
                    <p>Prepare yourself.</p>
                </div>
            )}
        </div>
    );
};

export default Lobby;

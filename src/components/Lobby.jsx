import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import { joinAsRole, confirmPlayer, setRoomGoal } from '../core/gameHelpers';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../core/firebase';

const Lobby = ({ onGameStart }) => {
    const { gameState, roomCode, playerId, playerRole, setPlayerRole } = useGame();
    const [players, setPlayers] = useState([]);
    const [myStatus, setMyStatus] = useState(playerRole === 'banker' ? 'active' : 'selecting');
    const [goalInput, setGoalInput] = useState('3');
    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        if (!roomCode) return;
        const q = query(collection(db, "rooms", roomCode, "players"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => {
                pList.push({ ...doc.data(), id: doc.id });
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
        try {
            await joinAsRole(roomCode, playerId, role, playerName || 'Player');
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
                const { startSlaveGame } = await import('../core/slaveHelpers');
                await startSlaveGame(roomCode);
            } else {
                const { dealInitialHands } = await import('../core/gameHelpers');
                await dealInitialHands(roomCode);
            }
            onGameStart();
        } catch (e) {
            console.error("Failed to start game:", e);
            alert("Error: " + e.message);
        }
    };

    const isSlave = gameState?.gameType === 'slave';

    // Shared styles
    const containerStyle = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        position: 'relative'
    };

    // --- HOST LOBBY ---
    if (playerRole === 'banker') {
        const waitingPlayers = players.filter(p => p.status === 'waiting' && p.role === 'player');
        const activePlayers = players.filter(p => p.status === 'active' && p.role === 'player');
        const observers = players.filter(p => p.role === 'observer');

        return (
            <div style={containerStyle}>
                {/* Back Button */}
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        padding: '10px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#9ca3af',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    ← Home
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '15px',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '15px 30px',
                        borderRadius: '50px',
                        marginBottom: '20px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{isSlave ? '👑' : '🃏'}</span>
                        <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '500' }}>
                            {isSlave ? 'PRESIDENT' : 'BLACKJACK'}
                        </span>
                    </div>

                    <h1 style={{
                        color: '#fbbf24',
                        fontSize: '3rem',
                        margin: '0 0 10px 0',
                        letterSpacing: '3px'
                    }}>
                        LOBBY
                    </h1>

                    <div style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))',
                        padding: '15px 40px',
                        borderRadius: '12px',
                        border: '2px solid rgba(251,191,36,0.3)'
                    }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Room Code</span>
                        <div style={{
                            color: '#fbbf24',
                            fontSize: '2.5rem',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            letterSpacing: '8px'
                        }}>
                            {roomCode}
                        </div>
                    </div>
                </div>

                {/* Settings Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    padding: '25px',
                    width: '100%',
                    maxWidth: '500px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <span style={{ color: '#9ca3af', fontWeight: '500' }}>
                            {isSlave ? '🎯 Rounds:' : '💰 Goal:'}
                        </span>
                        <input
                            type="number"
                            value={goalInput}
                            onChange={(e) => setGoalInput(e.target.value)}
                            style={{
                                width: '80px',
                                padding: '12px 15px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1.2rem',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}
                        />
                        <button
                            onClick={handleSetGoal}
                            style={{
                                padding: '12px 25px',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            SET
                        </button>
                        {gameState?.winningGoal && (
                            <span style={{ color: '#22c55e' }}>
                                ✓ {isSlave ? `${gameState.winningGoal} rounds` : `$${gameState.winningGoal}`}
                            </span>
                        )}
                    </div>
                </div>

                {/* Players Section */}
                <div style={{ width: '100%', maxWidth: '500px' }}>

                    {/* Waiting Queue */}
                    {waitingPlayers.length > 0 && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '15px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <h3 style={{
                                color: '#ef4444',
                                margin: '0 0 15px 0',
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                ⏳ Waiting ({waitingPlayers.length})
                            </h3>
                            {waitingPlayers.map(p => (
                                <div key={p.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 15px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '10px',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{ color: 'white', fontWeight: '500' }}>{p.name}</span>
                                    <button
                                        onClick={() => handleConfirm(p.id)}
                                        style={{
                                            padding: '8px 20px',
                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        ✓ ACCEPT
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Players */}
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '15px',
                        border: '1px solid rgba(34, 197, 94, 0.1)',
                        minHeight: '120px'
                    }}>
                        <h3 style={{
                            color: '#22c55e',
                            margin: '0 0 15px 0',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            ✓ Players Ready ({activePlayers.length})
                        </h3>
                        {activePlayers.length === 0 ? (
                            <p style={{ color: '#4b5563', textAlign: 'center', margin: '20px 0' }}>
                                Waiting for players to join...
                            </p>
                        ) : (
                            activePlayers.map((p, idx) => (
                                <div key={p.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 15px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '10px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            width: '28px',
                                            height: '28px',
                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <span style={{ color: 'white', fontWeight: '500' }}>{p.name}</span>
                                    </div>
                                    <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>Ready</span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Observers */}
                    {observers.length > 0 && (
                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            padding: '15px',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{ color: '#6b7280', margin: '0 0 10px 0', fontSize: '0.8rem' }}>
                                👁 OBSERVERS ({observers.length})
                            </h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {observers.map(p => (
                                    <span key={p.id} style={{
                                        padding: '6px 12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '20px',
                                        color: '#9ca3af',
                                        fontSize: '0.85rem'
                                    }}>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Start Button */}
                    <button
                        onClick={handleStartGame}
                        disabled={activePlayers.length === 0}
                        style={{
                            width: '100%',
                            padding: '18px',
                            background: activePlayers.length > 0
                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '14px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            cursor: activePlayers.length > 0 ? 'pointer' : 'not-allowed',
                            opacity: activePlayers.length > 0 ? 1 : 0.5,
                            boxShadow: activePlayers.length > 0
                                ? '0 10px 40px rgba(34, 197, 94, 0.3)'
                                : 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        🚀 START GAME
                    </button>
                </div>
            </div>
        );
    }

    // --- PLAYER JOIN SCREEN ---
    return (
        <div style={containerStyle}>
            {/* Back Button */}
            <button
                onClick={() => window.location.reload()}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#9ca3af',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                ← Home
            </button>

            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: '900',
                    margin: 0,
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    APEX
                </h1>
                <h2 style={{
                    fontSize: '1.3rem',
                    margin: 0,
                    color: '#fbbf24',
                    letterSpacing: '8px'
                }}>
                    STACK
                </h2>
            </div>

            {myStatus === 'selecting' && (
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '24px',
                    padding: '35px',
                    width: '100%',
                    maxWidth: '380px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h3 style={{
                        color: 'white',
                        textAlign: 'center',
                        marginBottom: '25px',
                        fontSize: '1.3rem',
                        fontWeight: '500'
                    }}>
                        Join Room <span style={{ color: '#fbbf24' }}>{roomCode}</span>
                    </h3>

                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            marginBottom: '20px',
                            borderRadius: '12px',
                            border: '2px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'white',
                            fontSize: '1.1rem',
                            textAlign: 'center',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />

                    <button
                        onClick={() => handleRoleSelect('player')}
                        disabled={!playerName.trim()}
                        style={{
                            width: '100%',
                            padding: '16px',
                            marginBottom: '12px',
                            background: playerName.trim()
                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: playerName.trim() ? 'pointer' : 'not-allowed',
                            opacity: playerName.trim() ? 1 : 0.5,
                            transition: 'all 0.3s ease'
                        }}
                    >
                        🎮 Join as Player
                    </button>

                    <button
                        onClick={() => handleRoleSelect('observer')}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'transparent',
                            color: '#9ca3af',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        👁 Watch as Observer
                    </button>
                </div>
            )}

            {myStatus === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid rgba(251,191,36,0.2)',
                        borderTopColor: '#fbbf24',
                        borderRadius: '50%',
                        margin: '0 auto 25px',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <h2 style={{ color: 'white', marginBottom: '10px' }}>Waiting for Host</h2>
                    <p style={{ color: '#6b7280' }}>The host will accept you shortly...</p>

                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {myStatus === 'active' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '20px'
                    }}>✅</div>
                    <h2 style={{ color: '#22c55e', marginBottom: '10px' }}>You're In!</h2>
                    <p style={{ color: '#6b7280' }}>Waiting for the game to start...</p>
                </div>
            )}
        </div>
    );
};

export default Lobby;

import React, { useState } from 'react';

const Landing = ({ onCreateRoom, onJoinRoom }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [gameType, setGameType] = useState('slave');
    const [showJoin, setShowJoin] = useState(false);

    const handleCreateClick = async () => {
        setIsLoading(true);
        try {
            await onCreateRoom(gameType);
        } catch (e) {
            console.error("Create failed:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinClick = async () => {
        if (joinCode.length < 4) return;
        setIsLoading(true);
        try {
            await onJoinRoom(joinCode);
        } catch (e) {
            console.error("Join failed:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle at 30% 30%, rgba(220, 38, 38, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(251, 191, 36, 0.08) 0%, transparent 50%)',
                pointerEvents: 'none'
            }} />

            {/* Animated card icons */}
            <div style={{
                position: 'absolute',
                fontSize: '8rem',
                opacity: 0.03,
                top: '10%',
                left: '10%',
                transform: 'rotate(-15deg)'
            }}>♠</div>
            <div style={{
                position: 'absolute',
                fontSize: '6rem',
                opacity: 0.03,
                bottom: '15%',
                right: '15%',
                transform: 'rotate(20deg)'
            }}>♥</div>
            <div style={{
                position: 'absolute',
                fontSize: '5rem',
                opacity: 0.03,
                top: '60%',
                left: '5%'
            }}>♦</div>
            <div style={{
                position: 'absolute',
                fontSize: '7rem',
                opacity: 0.03,
                top: '20%',
                right: '10%',
                transform: 'rotate(10deg)'
            }}>♣</div>

            {/* Main content */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '50px' }}>
                    <h1 style={{
                        fontSize: '5rem',
                        fontWeight: '900',
                        margin: 0,
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-3px',
                        textShadow: '0 0 60px rgba(220, 38, 38, 0.3)'
                    }}>
                        APEX
                    </h1>
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '400',
                        margin: 0,
                        color: '#fbbf24',
                        letterSpacing: '12px',
                        textTransform: 'uppercase'
                    }}>
                        STACK
                    </h2>
                    <p style={{
                        color: '#6b7280',
                        marginTop: '15px',
                        fontSize: '0.9rem'
                    }}>
                        Premium Card Games
                    </p>
                </div>

                {!showJoin ? (
                    <>
                        {/* Game Type Selection */}
                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <button
                                onClick={() => setGameType('slave')}
                                style={{
                                    flex: 1,
                                    padding: '20px 15px',
                                    background: gameType === 'slave'
                                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                        : 'rgba(255,255,255,0.05)',
                                    color: gameType === 'slave' ? '#000' : '#9ca3af',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: gameType === 'slave'
                                        ? '0 10px 40px rgba(251, 191, 36, 0.3)'
                                        : 'none'
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👑</div>
                                PRESIDENT
                                <div style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 'normal',
                                    marginTop: '5px',
                                    opacity: 0.8
                                }}>
                                    2-4 Players
                                </div>
                            </button>
                            <button
                                onClick={() => setGameType('blackjack')}
                                style={{
                                    flex: 1,
                                    padding: '20px 15px',
                                    background: gameType === 'blackjack'
                                        ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                                        : 'rgba(255,255,255,0.05)',
                                    color: gameType === 'blackjack' ? '#fff' : '#9ca3af',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: gameType === 'blackjack'
                                        ? '0 10px 40px rgba(220, 38, 38, 0.3)'
                                        : 'none'
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🃏</div>
                                BLACKJACK
                                <div style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 'normal',
                                    marginTop: '5px',
                                    opacity: 0.8
                                }}>
                                    2+ Players
                                </div>
                            </button>
                        </div>

                        {/* Create Room Button */}
                        <button
                            onClick={handleCreateClick}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '18px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'wait' : 'pointer',
                                opacity: isLoading ? 0.7 : 1,
                                boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)',
                                transition: 'all 0.3s ease',
                                marginBottom: '15px'
                            }}
                        >
                            {isLoading ? '⏳ Creating...' : '🎮 Create Room'}
                        </button>

                        {/* Join Room Link */}
                        <button
                            onClick={() => setShowJoin(true)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'transparent',
                                color: '#9ca3af',
                                border: '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '14px',
                                fontSize: '1rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Have a code? <span style={{ color: '#60a5fa' }}>Join Room</span>
                        </button>
                    </>
                ) : (
                    <>
                        {/* Join Room Form */}
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '20px',
                            padding: '30px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                color: 'white',
                                marginBottom: '20px',
                                fontSize: '1.2rem'
                            }}>
                                Enter Room Code
                            </h3>
                            <input
                                type="text"
                                placeholder="XXXX"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={4}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '20px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '2rem',
                                    textAlign: 'center',
                                    letterSpacing: '10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 'bold',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />

                            <button
                                onClick={handleJoinClick}
                                disabled={joinCode.length < 4 || isLoading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    marginTop: '20px',
                                    background: joinCode.length >= 4
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: joinCode.length >= 4 ? 'pointer' : 'not-allowed',
                                    opacity: joinCode.length < 4 ? 0.5 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {isLoading ? '⏳ Joining...' : '🚀 Join Game'}
                            </button>
                        </div>

                        <button
                            onClick={() => setShowJoin(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            ← Back to Create
                        </button>
                    </>
                )}
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                color: '#4b5563',
                fontSize: '0.8rem'
            }}>
                © 2024 APEX STACK
            </div>
        </div>
    );
};

export default Landing;

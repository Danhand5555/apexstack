import React, { useState } from 'react';
import { useGame } from '../core/GameContext';

const Landing = ({ onCreateRoom, onJoinRoom }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [gameType, setGameType] = useState('blackjack');

    const handleCreateClick = async () => {
        console.log("Create button clicked", gameType);
        setIsLoading(true);
        try {
            await onCreateRoom(gameType);
        } catch (e) {
            console.error("Create failed in Landing:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="landing-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 'var(--spacing-xl)',
            gap: 'var(--spacing-xl)'
        }}>
            <div className="brand" style={{ textAlign: 'center' }}>
                <h1 style={{
                    color: 'var(--color-crimson)',
                    fontSize: '4rem',
                    margin: 0,
                    fontWeight: '900',
                    letterSpacing: '-2px'
                }}>APEX</h1>
                <h2 style={{
                    color: 'var(--color-gold-dim)',
                    fontSize: '1.5rem',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '4px'
                }}>STACK</h2>
            </div>

            <div className="actions" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)',
                width: '100%',
                maxWidth: '300px'
            }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button
                        onClick={() => setGameType('blackjack')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: gameType === 'blackjack' ? 'var(--color-crimson)' : '#333',
                            color: 'white',
                            border: `2px solid ${gameType === 'blackjack' ? 'var(--color-crimson)' : '#555'}`,
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            opacity: gameType === 'blackjack' ? 1 : 0.7
                        }}
                    >
                        BLACKJACK
                    </button>
                    <button
                        onClick={() => setGameType('slave')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: gameType === 'slave' ? 'var(--color-crimson)' : '#333',
                            color: 'white',
                            border: `2px solid ${gameType === 'slave' ? 'var(--color-crimson)' : '#555'}`,
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            opacity: gameType === 'slave' ? 1 : 0.7
                        }}
                    >
                        SLAVE
                    </button>
                </div>

                <button
                    onClick={handleCreateClick}
                    disabled={isLoading}
                    style={{
                        background: 'var(--color-crimson)',
                        color: 'white',
                        border: 'none',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        boxShadow: 'var(--shadow-md)',
                        transition: 'transform 0.1s',
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'wait' : 'pointer'
                    }}
                >
                    {isLoading ? 'Creating Room...' : `Create ${gameType === 'slave' ? 'Slave' : 'Blackjack'} Room`}
                </button>

                <div className="separator" style={{
                    textAlign: 'center',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.9rem'
                }}>
                    — OR —
                </div>

                <div className="join-group" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input
                        type="text"
                        placeholder="Room Code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={4}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '1.2rem',
                            textAlign: 'center',
                            letterSpacing: '2px',
                            fontFamily: 'monospace'
                        }}
                    />
                    <button
                        onClick={() => onJoinRoom(joinCode)}
                        disabled={joinCode.length < 4}
                        style={{
                            background: 'var(--color-text-main)',
                            color: 'white',
                            border: 'none',
                            padding: '0 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            opacity: joinCode.length < 4 ? 0.5 : 1
                        }}
                    >
                        JOIN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Landing;

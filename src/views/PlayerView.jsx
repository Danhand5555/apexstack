import React, { useEffect, useState } from 'react';
import { useGame } from '../core/GameContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import { playerHit, playerStand } from '../core/gameHelpers';
import Card from '../components/Card';
import { calculateHandValue } from '../core/deck';

const PlayerView = () => {
    const { gameState, playerId, roomCode } = useGame();
    const [players, setPlayers] = useState([]);

    // Subscribe to all players to see friends
    useEffect(() => {
        if (!roomCode) return;
        const q = query(collection(db, "rooms", roomCode, "players"));
        const unsub = onSnapshot(q, (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => pList.push(doc.data()));
            setPlayers(pList);
        });
        return () => unsub();
    }, [roomCode]);

    const playerData = players.find(p => p.id === playerId);
    const handValue = playerData?.hand ? calculateHandValue(playerData.hand) : 0;
    const otherPlayers = players.filter(p => p.id !== playerId);

    return (
        <div className="player-table" style={{ padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* DEALER AREA */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '10px' }}>
                    DEALER {gameState?.dealerHand && <span>({calculateHandValue(gameState.dealerHand)})</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                    {gameState?.dealerHand?.map((card, i) => (
                        <div key={i} style={{ transform: 'scale(0.6)' }}>
                            <Card {...card} />
                        </div>
                    ))}
                    {!gameState?.dealerHand && <div style={{ opacity: 0.5 }}>Waiting for deal...</div>}
                </div>
            </div>

            {/* MY HAND AREA */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Your Hand</h1>
                <div className="chip-badge" style={{ background: 'rgba(0,0,0,0.3)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                    ${playerData?.chips || 0}
                </div>
            </header>

            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '200px' }}>
                <div className="my-cards" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {playerData?.hand?.map((card, i) => (
                        <Card key={i} {...card} />
                    ))}
                    {!playerData?.hand && <p style={{ opacity: 0.6 }}>Waiting for deal...</p>}
                </div>
                {playerData?.hand && (
                    <div className="total" style={{ marginTop: '20px', fontSize: '2.5rem', fontWeight: 'bold' }}>
                        {handValue}
                    </div>
                )}
            </section>

            {/* ACTION BUTTONS */}
            <section style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                paddingBottom: '30px',
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <button
                    onClick={() => playerHit(roomCode, playerId)}
                    disabled={playerData?.status !== 'playing'}
                    className="btn-action btn-secondary"
                    style={{ background: 'white', color: 'black' }}
                >
                    HIT
                </button>
                <button
                    onClick={() => playerStand(roomCode, playerId)}
                    disabled={playerData?.status !== 'playing'}
                    className="btn-action btn-secondary"
                    style={{ background: 'black', color: 'white', border: '1px solid #333' }}
                >
                    STAND
                </button>
            </section>

            {/* FRIENDS / OTHER PLAYERS */}
            {otherPlayers.length > 0 && (
                <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '15px' }}>FRIENDS AT TABLE</h3>
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {otherPlayers.map(p => (
                            <div key={p.id} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '10px',
                                borderRadius: '8px',
                                minWidth: '120px',
                                border: p.status === 'playing' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'
                            }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{p.name}</span>
                                    {p.hand && <span style={{ color: 'var(--color-gold)' }}>{calculateHandValue(p.hand)}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginBottom: '5px' }}>
                                    {p.hand?.map((c, i) => (
                                        <div key={i} style={{ transform: 'scale(0.4)', width: '20px', height: '30px', transformOrigin: 'top left', marginRight: '-25px' }}>
                                            <Card {...c} />
                                        </div>
                                    ))}
                                    {(!p.hand || p.hand.length === 0) && <div style={{ height: '30px', fontSize: '0.7rem', opacity: 0.5 }}>No cards</div>}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '5px' }}>
                                    {p.status === 'playing' ? 'Playing...' : (p.status === 'stood' || p.status === 'stand' ? 'STAND' : p.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerView;

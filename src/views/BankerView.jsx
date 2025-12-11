import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import Card from '../components/Card';
import { dealInitialHands, playDealerTurn } from '../core/gameHelpers';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import { calculateHandValue } from '../core/deck';

const BankerView = () => {
    const { gameState, roomCode } = useGame();
    const [players, setPlayers] = useState([]);

    // Subscribe to players to show stats
    useEffect(() => {
        if (!roomCode) return;
        const q = query(collection(db, "rooms", roomCode, "players"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => pList.push(doc.data()));
            setPlayers(pList);
        });
        return () => unsubscribe();
    }, [roomCode]);

    const handleDeal = async () => {
        try {
            await dealInitialHands(roomCode);
        } catch (e) {
            alert(e.message);
        }
    };

    const handlePlayDealer = async () => {
        try {
            await playDealerTurn(roomCode);
        } catch (e) {
            console.error(e);
        }
    };

    const activePlayersCount = players.filter(p => p.status === 'playing' || p.status === 'active' || p.status === 'stood').length;
    const totalPot = players.reduce((acc, p) => acc + (p.status === 'playing' ? 100 : 0), 0); // Est pot

    return (
        <div className="game-table" style={{ padding: '0', height: '100vh' }}>
            {/* HUD / TOP BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', background: '#1E293B', borderBottom: '1px solid #334155', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--color-gold)', letterSpacing: '1px' }}>BANKER</h2>
                    <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>ROOM: <strong style={{ color: 'white' }}>{roomCode}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '30px', color: '#CBD5E1', fontSize: '0.9rem' }}>
                    <div>PLAYERS: <strong style={{ color: 'white', fontSize: '1.1rem' }}>{activePlayersCount}</strong></div>
                    <div>STATUS: <strong style={{ color: gameState?.status === 'playing' ? 'var(--color-success)' : 'var(--color-gold)', fontSize: '1.1rem' }}>{gameState?.status?.toUpperCase()}</strong></div>
                </div>
            </div>

            {/* MAIN TABLE AREA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#475569', fontWeight: 'bold', letterSpacing: '2px' }}>DEALER AREA</div>
                    {gameState?.dealerHand && gameState.dealerHand.length > 0 && (
                        <div style={{
                            marginTop: '5px',
                            color: gameState?.status === 'payout' ? 'var(--color-gold)' : '#fff',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            SCORE: {calculateHandValue(gameState.dealerHand)}
                        </div>
                    )}
                </div>

                <div className="cards" style={{ display: 'flex', gap: '10px', justifyContent: 'center', minHeight: '320px', alignItems: 'center', perspective: '1000px' }}>
                    {gameState?.dealerHand?.map((card, i) => (
                        <div key={i} style={{ transform: `rotate(${i * 5 - 5}deg) translateY(${Math.abs(i - 0.5) * -10}px)`, transition: 'all 0.3s' }}>
                            <Card {...card} />
                        </div>
                    ))}
                    {!gameState?.dealerHand && (
                        <div style={{ border: '2px dashed #334155', borderRadius: '16px', width: '200px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            EMPTY HAND
                        </div>
                    )}
                </div>
            </div>

            {/* COMMAND CENTER / CONTROL PANEL */}
            <div style={{ background: '#1E293B', padding: '30px', borderTop: '4px solid var(--color-gold)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center' }}>

                {/* Left Panel: Info or Chat placeholder */}
                <div style={{ color: '#64748B', fontSize: '0.8rem', textAlign: 'center' }}>
                    Apex Stack GameOS v1.0<br />
                    Secure Connection
                </div>

                {/* Center Controls */}
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button
                        onClick={handleDeal}
                        disabled={gameState?.status === 'playing'}
                        className="btn-action"
                        style={{
                            background: gameState?.status === 'playing' ? '#334155' : 'var(--color-crimson)',
                            color: 'white',
                            minWidth: '180px',
                            opacity: gameState?.status === 'playing' ? 0.3 : 1
                        }}
                    >
                        DEAL HAND
                    </button>
                    <button
                        onClick={handlePlayDealer}
                        disabled={gameState?.status !== 'playing'}
                        className="btn-action"
                        style={{
                            background: gameState?.status !== 'playing' ? '#334155' : 'var(--color-gold)',
                            color: gameState?.status !== 'playing' ? '#64748B' : 'black',
                            minWidth: '220px',
                            opacity: gameState?.status !== 'playing' ? 0.3 : 1
                        }}
                    >
                        REVEAL & PAYOUT
                    </button>
                </div>

                {/* Right Panel: Winning Goal */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginBottom: '5px' }}>TARGET GOAL</div>
                    <div style={{ color: 'var(--color-success)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        ${gameState?.winningGoal || '---'}
                    </div>
                </div>

            </div>

            {/* ROUND RESULTS - Simplified Ticker */}
            <div style={{ background: '#0F172A', padding: '20px', borderTop: '1px solid #334155' }}>
                <h3 style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Round Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {players.filter(p => p.role === 'player' && (p.status === 'round_end' || p.status === 'playing' || p.status === 'stood')).map(p => (
                        <div key={p.id} style={{
                            background: p.lastResult === 'win' ? 'rgba(16, 185, 129, 0.2)' : p.lastResult === 'loss' ? 'rgba(239, 68, 68, 0.2)' : '#1E293B',
                            border: `1px solid ${p.lastResult === 'win' ? '#10B981' : p.lastResult === 'loss' ? '#EF4444' : '#334155'}`,
                            padding: '10px', borderRadius: '6px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 'bold' }}>
                                <span>{p.name}</span>
                                <span>{p.lastValue ? p.lastValue : '--'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.8rem' }}>
                                <span style={{ color: p.lastResult === 'win' ? '#34D399' : p.lastResult === 'loss' ? '#F87171' : '#94A3B8' }}>
                                    {p.lastResult ? p.lastResult.toUpperCase() : (p.status === 'stood' ? 'STAND' : 'PLAYING')}
                                </span>
                                <span style={{ color: 'var(--color-gold)' }}>${p.chips}</span>
                            </div>

                            {/* PLAYER HAND */}
                            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2px', margin: '10px 0', minHeight: '60px' }}>
                                {p.hand?.map((card, i) => (
                                    <div key={i} style={{ transform: 'scale(0.5)', width: '30px', height: '45px', transformOrigin: 'top left', marginRight: '-20px' }}>
                                        <Card {...card} />
                                    </div>
                                ))}
                                {(!p.hand || p.hand.length === 0) && <div style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic' }}>No cards</div>}
                            </div>

                            {/* HISTORY BADGES */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {p.history?.slice(-5).map((h, i) => ( // Show last 5
                                    <div key={i} style={{
                                        width: '20px', height: '20px', borderRadius: '50%',
                                        background: h.result === 'win' ? '#10B981' : h.result === 'loss' ? '#EF4444' : '#64748B',
                                        color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }} title={`Score: ${h.value}`}>
                                        {h.result === 'win' ? 'W' : h.result === 'loss' ? 'L' : 'P'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BankerView;

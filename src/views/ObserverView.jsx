import React, { useEffect, useState } from 'react';
import { useGame } from '../core/GameContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../core/firebase';
import Card from '../components/Card';

const ObserverView = () => {
    const { gameState, roomCode } = useGame();
    const [players, setPlayers] = useState([]);

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

    return (
        <div className="game-table" style={{ padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ color: 'var(--color-text-main)', margin: 0 }}>Spectator Mode</h1>
                <div style={{ background: '#333', padding: '10px 20px', borderRadius: '20px', color: 'white' }}>
                    Room: <strong>{roomCode}</strong>
                </div>
            </header>

            <div className="stats" style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', textAlign: 'center', fontSize: '1.2rem' }}>
                STATUS: <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{gameState?.status?.toUpperCase()}</span>
            </div>

            <section style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h2 className="section-title">Dealer's Hand</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', minHeight: '200px' }}>
                    {gameState?.dealerHand?.map((card, i) => (
                        <Card key={i} {...card} />
                    ))}
                    {!gameState?.dealerHand && "Waiting..."}
                </div>
            </section>

            <section>
                <h2 className="section-title" style={{ textAlign: 'center' }}>Players Table</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    padding: '20px'
                }}>
                    {players.filter(p => p.role === 'player').map(p => (
                        <div key={p.id} style={{
                            padding: '20px',
                            background: '#1a1a1a',
                            border: `2px solid ${p.status === 'playing' ? 'var(--color-gold)' : '#333'}`,
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'white' }}>
                                <strong style={{ fontSize: '1.2rem' }}>{p.name || p.id}</strong>
                                <span style={{ color: 'var(--color-gold)' }}>${p.chips}</span>
                            </div>
                            <div style={{ textAlign: 'center', color: '#888', marginBottom: '10px' }}>
                                {p.status.toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '-20px' }}>
                                {p.hand?.map((card, i) => (
                                    <div key={i} style={{ transform: 'scale(0.6)', margin: '-10px' }}>
                                        <Card {...card} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default ObserverView;

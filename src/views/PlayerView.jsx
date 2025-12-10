import React, { useEffect, useState } from 'react';
import { useGame } from '../core/GameContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';
import { playerHit, playerStand } from '../core/gameHelpers';
import Card from '../components/Card';
import { calculateHandValue } from '../core/deck';

const PlayerView = () => {
    const { gameState, playerId, roomCode } = useGame();
    const [playerData, setPlayerData] = useState(null);

    useEffect(() => {
        if (!roomCode || !playerId) return;
        const unsub = onSnapshot(doc(db, "rooms", roomCode, "players", playerId), (doc) => {
            setPlayerData(doc.data());
        });
        return () => unsub();
    }, [roomCode, playerId]);

    const handValue = playerData?.hand ? calculateHandValue(playerData.hand) : 0;

    return (
        <div className="player-table" style={{ padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h1>Your Hand</h1>
                <div className="chip-badge" style={{ background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '4px' }}>
                    ${playerData?.chips || 0}
                </div>
            </header>

            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="my-cards" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {playerData?.hand?.map((card, i) => (
                        <Card key={i} {...card} />
                    ))}
                    {!playerData?.hand && <p>Waiting for deal...</p>}
                </div>
                {playerData?.hand && (
                    <div className="total" style={{ marginTop: '20px', fontSize: '3rem', fontWeight: 'bold' }}>
                        {handValue}
                    </div>
                )}
            </section>

            <section style={{
                marginTop: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                paddingBottom: '20px',
                width: '100%',
                maxWidth: '600px',
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
                    style={{ background: 'black', color: 'white' }}
                >
                    STAND
                </button>
                <button disabled className="btn-action btn-outline" style={{ color: 'white', borderColor: 'white', opacity: 0.5 }}>DOUBLE</button>
                <button disabled className="btn-action btn-outline" style={{ color: 'white', borderColor: 'white', opacity: 0.5 }}>SPLIT</button>
            </section>
        </div>
    );
};

export default PlayerView;

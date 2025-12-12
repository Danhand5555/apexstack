import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../core/firebase';
import Card from '../components/Card';
import { playSlaveTurn, passTurn, startSlaveGame, getCardRank, sortHand, isValidPlay } from '../core/slaveHelpers';

const SlaveGameView = () => {
    const { roomCode, playerId, gameState } = useGame();
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!roomCode) return;

        // Listen to players
        const unsubPlayers = onSnapshot(collection(db, "rooms", roomCode, "players"), (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => pList.push(doc.data()));
            setPlayers(pList);

            const me = pList.find(p => p.id === playerId);
            if (me) {
                setMyHand(me.hand || []);
            }
        });

        return () => unsubPlayers();
    }, [roomCode, playerId]);

    const handleCardClick = (card) => {
        const isSelected = selectedCards.some(c => c.suit === card.suit && c.value === card.value);
        if (isSelected) {
            setSelectedCards(selectedCards.filter(c => c.suit !== card.suit || c.value !== card.value));
        } else {
            // Smart select: If single, replace? Or allow multi-select for pairs
            // If we have 2, and click 3rd, warn or replace?
            // Let's just toggle.
            if (selectedCards.length >= 2) {
                // If trying to select a 3rd, clear others? Or just reject?
                // For pairs, max is 2.
                // Let's clear and start new selection for better UX?
                // Or just ignore.
                // "Only two set sizes are permitted... Single... Pair".
                // So max selection is 2.
                setSelectedCards([card]); // Replace selection
            } else {
                setSelectedCards([...selectedCards, card]);
            }
        }
    };

    const handlePlay = async () => {
        setErrorMsg('');
        try {
            await playSlaveTurn(roomCode, playerId, selectedCards);
            setSelectedCards([]);
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
        }
    };

    const handlePass = async () => {
        setErrorMsg('');
        try {
            await passTurn(roomCode, playerId);
            setSelectedCards([]);
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
        }
    };

    // Sort players for consistent view?

    // Determine if it's my turn
    const isMyTurn = gameState?.turn === playerId;

    // Can Play check
    const canPlay = isMyTurn && isValidPlay(selectedCards, gameState?.currentTrickCards);

    return (
        <div style={{ height: '100vh', background: '#1F2937', color: 'white', display: 'flex', flexDirection: 'column' }}>
            {/* TOP BAR / INFO */}
            <div style={{ padding: '10px', background: '#111827', display: 'flex', justifyContent: 'space-between' }}>
                <div>Room: {roomCode}</div>
                <div>Status: {gameState?.slaveRoundStatus || 'Playing'}</div>
            </div>

            {/* TABLE AREA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                {/* OPPONENTS (Rough Layout) */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                    {players.filter(p => p.id !== playerId).map(p => (
                        <div key={p.id} style={{
                            padding: '10px', border: '1px solid #555', borderRadius: '8px',
                            opacity: gameState?.turn === p.id ? 1 : 0.5,
                            transform: gameState?.turn === p.id ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s'
                        }}>
                            <div>{p.name || p.id.slice(0, 5)}</div>
                            <div>{p.hand?.length} cards</div>
                            {/* Show last played card? */}
                        </div>
                    ))}
                </div>

                {/* CURRENT TRICK */}
                <div style={{ width: '200px', height: '150px', border: '2px dashed #666', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {gameState?.currentTrickCards?.length > 0 ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {gameState.currentTrickCards.map((c, i) => (
                                <div key={i} style={{ transform: 'scale(0.8)' }}>
                                    <Card {...c} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span style={{ color: '#666' }}>Empty Trick</span>
                    )}
                </div>
                {gameState?.trickOwnerId && <div style={{ marginTop: '10px', color: '#888', fontSize: '0.8rem' }}>Last Play: {players.find(p => p.id === gameState.trickOwnerId)?.name || 'Unknown'}</div>}

                {/* ERROR MSG */}
                {errorMsg && <div style={{ color: 'red', marginTop: '10px' }}>{errorMsg}</div>}
            </div>

            {/* MY CONTROLS */}
            <div style={{ padding: '20px', background: '#111827', borderTop: '1px solid #333' }}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={handlePlay}
                        disabled={!canPlay}
                        style={{
                            padding: '10px 30px', background: canPlay ? 'var(--color-crimson)' : '#555',
                            color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold'
                        }}
                    >
                        PLAY
                    </button>
                    <button
                        onClick={handlePass}
                        disabled={!isMyTurn}
                        style={{
                            padding: '10px 30px', background: 'transparent', border: '2px solid #555',
                            color: '#AAA', borderRadius: '5px', fontWeight: 'bold'
                        }}
                    >
                        PASS
                    </button>
                    {/* START BUTTON (If Host and fresh game) */}
                    {playerId === gameState?.bankerId && (!gameState?.winners) && ( // Rough check for start
                        <button onClick={() => startSlaveGame(roomCode)} style={{ marginLeft: '20px' }}>DEBUG START</button>
                    )}
                </div>

                {/* MY HAND */}
                <div style={{ display: 'flex', gap: '-40px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '20px' }}>
                    {sortHand(myHand).map((card, i) => {
                        const isSelected = selectedCards.some(c => c.suit === card.suit && c.value === card.value);
                        return (
                            <div
                                key={i}
                                onClick={() => handleCardClick(card)}
                                style={{
                                    transform: isSelected ? 'translateY(-20px)' : 'translateY(0)',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer',
                                    marginRight: '-40px',
                                    zIndex: i
                                }}
                            >
                                <Card {...card} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SlaveGameView;

import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../core/firebase';
import Card from '../components/Card';
import { playSlaveTurn, passTurn, sortHand, isValidPlay, performCardExchange, startNextRound, getRankLabels, startSlaveGame } from '../core/slaveHelpers';

const SlaveGameView = () => {
    const { roomCode, playerId, gameState } = useGame();
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState(null);

    useEffect(() => {
        if (!roomCode) return;

        const unsubPlayers = onSnapshot(collection(db, "rooms", roomCode, "players"), (snapshot) => {
            const pList = [];
            snapshot.forEach(doc => pList.push({ ...doc.data(), id: doc.id }));
            setPlayers(pList);

            const me = pList.find(p => p.id === playerId);
            if (me && me.hand) {
                setMyHand(me.hand);
            }
        });

        return () => unsubPlayers();
    }, [roomCode, playerId]);

    // Clear selection when turn changes
    useEffect(() => {
        setSelectedCards([]);
        setErrorMsg('');
    }, [gameState?.turn]);

    const handleCardClick = (card) => {
        if (!isMyTurn) return; // Only allow selection on your turn

        const isSelected = selectedCards.some(c => c.suit === card.suit && c.value === card.value);

        if (isSelected) {
            // Deselect
            setSelectedCards(selectedCards.filter(c => !(c.suit === card.suit && c.value === card.value)));
        } else {
            // Select - if already have 2, start new selection
            if (selectedCards.length >= 2) {
                setSelectedCards([card]);
            } else if (selectedCards.length === 1) {
                // Only allow selecting same rank for pairs
                const firstRank = selectedCards[0].value;
                if (card.value === firstRank) {
                    setSelectedCards([...selectedCards, card]);
                } else {
                    // Different rank - replace selection
                    setSelectedCards([card]);
                }
            } else {
                setSelectedCards([card]);
            }
        }
    };

    const handlePlay = async () => {
        if (isLoading || !canPlay) return;
        setIsLoading(true);
        setErrorMsg('');

        try {
            await playSlaveTurn(roomCode, playerId, selectedCards);
            setSelectedCards([]);
            setLastAction('played');
            setTimeout(() => setLastAction(null), 500);
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePass = async () => {
        if (isLoading || !isMyTurn) return;
        setIsLoading(true);
        setErrorMsg('');

        try {
            await passTurn(roomCode, playerId);
            setSelectedCards([]);
            setLastAction('passed');
            setTimeout(() => setLastAction(null), 500);
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isMyTurn = gameState?.turn === playerId;
    const canPlay = isMyTurn && selectedCards.length > 0 && isValidPlay(selectedCards, gameState?.currentTrickCards);
    const canPass = isMyTurn && gameState?.currentTrickCards?.length > 0;
    const sortedHand = sortHand(myHand);

    // Find whose turn it is
    const currentTurnPlayer = players.find(p => p.id === gameState?.turn);
    const trickOwner = players.find(p => p.id === gameState?.trickOwnerId);

    // Rank display
    const getRankLabel = (index, total) => {
        if (total <= 2) return index === 0 ? 'Winner' : 'Slave';
        const labels = ['President', 'Vice-P', 'Vice-S', 'Slave'];
        return labels[index] || `#${index + 1}`;
    };

    return (
        <div style={{
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* TOP BAR */}
            <div style={{
                padding: '12px 20px',
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backdropFilter: 'blur(10px)',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontWeight: 'bold' }}>Room: {roomCode}</div>
                    <div style={{
                        padding: '4px 10px',
                        background: 'rgba(251, 191, 36, 0.2)',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        color: '#fcd34d',
                        fontWeight: 'bold'
                    }}>
                        Round {gameState?.currentRound || 1} / {gameState?.winningGoal || '∞'}
                    </div>
                </div>

                <div style={{
                    padding: '6px 16px',
                    background: isMyTurn ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: isMyTurn ? '0 0 15px rgba(34,197,94,0.4)' : 'none'
                }}>
                    {isMyTurn ? '🎯 YOUR TURN' : `⏳ ${currentTurnPlayer?.name || 'Waiting'}...`}
                </div>
            </div>

            {/* PLAYER STATS BAR */}
            {gameState?.playerStats && Object.keys(gameState.playerStats).length > 0 && (
                <div style={{
                    padding: '8px 20px',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    fontSize: '0.8rem',
                    flexWrap: 'wrap'
                }}>
                    {players.filter(p => p.role === 'player').map(p => {
                        const stats = gameState.playerStats[p.id] || { president: 0, slave: 0 };
                        const isMe = p.id === playerId;
                        return (
                            <div key={p.id} style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '4px 12px',
                                background: isMe ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                                borderRadius: '8px'
                            }}>
                                <span style={{ color: isMe ? '#4ade80' : '#9ca3af' }}>{p.name}</span>
                                <span style={{ color: '#fbbf24' }}>👑{stats.president}</span>
                                <span style={{ color: '#6b7280' }}>😢{stats.slave}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* WINNERS BAR */}
            {gameState?.winners?.length > 0 && (
                <div style={{
                    padding: '8px',
                    background: 'rgba(234, 179, 8, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    fontSize: '0.9rem'
                }}>
                    {gameState.winners.map((wId, idx) => {
                        const winner = players.find(p => p.id === wId);
                        return (
                            <span key={wId} style={{ color: '#fcd34d' }}>
                                {getRankLabel(idx, players.length)}: {winner?.name || wId.slice(0, 5)}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* GAME COMPLETED / EXCHANGE OVERLAY */}
            {(gameState?.slaveRoundStatus === 'completed' || gameState?.slaveRoundStatus === 'exchanged') && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    flexDirection: 'column'
                }}>
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', maxWidth: '500px' }}>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', color: '#fcd34d' }}>
                            🏆 ROUND COMPLETE
                        </h1>

                        {/* RANK BADGES */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                            {gameState.winners.map((wId, idx) => {
                                const winner = players.find(p => p.id === wId);
                                const labels = getRankLabels(players.length);
                                const label = labels[idx] || `#${idx + 1}`;
                                const isMe = wId === playerId;
                                const isPresident = idx === 0;
                                const isSlave = idx === gameState.winners.length - 1;

                                return (
                                    <div key={wId} style={{
                                        padding: '15px 25px',
                                        background: isPresident ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                            : isSlave ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        borderRadius: '12px',
                                        animation: 'bounceIn 0.5s ease-out',
                                        animationDelay: `${idx * 0.1}s`,
                                        animationFillMode: 'both',
                                        border: isMe ? '3px solid #22c55e' : 'none',
                                        boxShadow: isMe ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                                    }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px' }}>
                                            {label}
                                        </div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {isPresident ? '👑 ' : isSlave ? '😢 ' : ''}
                                            {winner?.name || wId.slice(0, 6)}
                                            {isMe && ' (YOU)'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* EXCHANGE INFO */}
                        {gameState?.exchangeInfo && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(107,114,128,0.1))',
                                padding: '25px',
                                borderRadius: '16px',
                                marginBottom: '25px',
                                animation: 'slideUp 0.8s ease-out',
                                border: '1px solid rgba(251,191,36,0.2)'
                            }}>
                                <h3 style={{ marginBottom: '20px', color: 'white', fontSize: '1.3rem' }}>
                                    💱 Card Exchange
                                </h3>

                                {/* Show what cards were exchanged */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '1rem',
                                            color: '#fbbf24',
                                            marginBottom: '15px',
                                            fontWeight: 'bold'
                                        }}>
                                            👑 President received
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            {gameState.exchangeInfo.slaveGave?.map((c, i) => (
                                                <div key={i} className="exchange-card" style={{
                                                    animationDelay: `${i * 0.3}s`
                                                }}>
                                                    <Card {...c} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            Best cards from Slave
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '2rem',
                                        color: '#666'
                                    }}>
                                        ↔️
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '1rem',
                                            color: '#9ca3af',
                                            marginBottom: '15px',
                                            fontWeight: 'bold'
                                        }}>
                                            😢 Slave received
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            {gameState.exchangeInfo.presidentGave?.map((c, i) => (
                                                <div key={i} className="exchange-card" style={{
                                                    animationDelay: `${0.6 + i * 0.3}s`
                                                }}>
                                                    <Card {...c} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            Worst cards from President
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MY EXCHANGE STATUS */}
                        {(() => {
                            const me = players.find(p => p.id === playerId);
                            if (me?.receivedCards?.length > 0) {
                                const amPresident = gameState.winners[0] === playerId;
                                return (
                                    <div style={{
                                        background: amPresident ? 'rgba(251, 191, 36, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            {amPresident ? '✨ You received 2 best cards from Slave!' : '📦 You received 2 cards from President'}
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                            {me.receivedCards.map((c, i) => (
                                                <div key={i} style={{ transform: 'scale(0.4)', animation: 'bounceIn 0.5s ease-out' }}>
                                                    <Card {...c} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* ACTION BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {(gameState?.slaveRoundStatus === 'completed' || gameState?.slaveRoundStatus === 'exchanged') && playerId === gameState?.bankerId && (
                                <button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        setErrorMsg('');
                                        try {
                                            // Step 1: Deal new cards (shuffle)
                                            await startSlaveGame(roomCode);

                                            // Step 2: Wait to show new cards being dealt
                                            await new Promise(r => setTimeout(r, 2500));

                                            // Step 3: Perform card exchange
                                            await performCardExchange(roomCode);

                                            // Step 4: Wait to show exchange animation
                                            await new Promise(r => setTimeout(r, 4000));

                                            // Step 5: Start next round
                                            await startNextRound(roomCode);
                                        } catch (e) {
                                            console.error(e);
                                            setErrorMsg(e.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    style={{
                                        padding: '15px 30px',
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        cursor: isLoading ? 'wait' : 'pointer',
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                >
                                    {isLoading ? '🔄 Shuffling & Exchanging...' : '▶️ Next Round'}
                                </button>
                            )}
                        </div>

                        {gameState?.slaveRoundStatus === 'completed' && playerId !== gameState?.bankerId && (
                            <p style={{ color: '#9ca3af', marginTop: '20px' }}>
                                Waiting for host to start next round...
                            </p>
                        )}

                        {gameState?.slaveRoundStatus === 'exchanged' && playerId !== gameState?.bankerId && (
                            <p style={{ color: '#9ca3af', marginTop: '20px' }}>
                                Cards exchanged! Waiting for host to start...
                            </p>
                        )}
                    </div>
                </div>
            )}
            {/* GAME COMPLETE OVERLAY */}
            {gameState?.slaveRoundStatus === 'gameComplete' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.95), rgba(26,26,46,0.98))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    flexDirection: 'column'
                }}>
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', maxWidth: '600px', padding: '20px' }}>
                        <h1 style={{
                            fontSize: '3rem',
                            marginBottom: '10px',
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            🎊 GAME OVER 🎊
                        </h1>
                        <p style={{ color: '#9ca3af', marginBottom: '30px', fontSize: '1.1rem' }}>
                            {gameState?.currentRound || 1} rounds completed
                        </p>

                        {/* FINAL STANDINGS */}
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '25px',
                            marginBottom: '30px'
                        }}>
                            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '1.3rem' }}>🏆 Final Standings</h2>

                            {(gameState?.finalStandings || []).map((standing, idx, arr) => {
                                const player = players.find(p => p.id === standing.id);
                                const isMe = standing.id === playerId;
                                const isWinner = idx === 0;
                                const isLoser = idx === arr.length - 1 && arr.length > 1;

                                return (
                                    <div key={standing.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '15px 20px',
                                        marginBottom: '10px',
                                        background: isWinner
                                            ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.2))'
                                            : isLoser
                                                ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.1))'
                                                : isMe
                                                    ? 'rgba(34, 197, 94, 0.2)'
                                                    : 'rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        border: isWinner
                                            ? '2px solid #fbbf24'
                                            : isLoser
                                                ? '2px solid #ef4444'
                                                : 'none',
                                        animation: 'bounceIn 0.5s ease-out',
                                        animationDelay: `${idx * 0.1}s`,
                                        animationFillMode: 'both'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <span style={{
                                                fontSize: '1.5rem',
                                                width: '40px'
                                            }}>
                                                {isWinner ? '🥇' : isLoser ? '💀' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                            </span>
                                            <div>
                                                <span style={{
                                                    color: isWinner ? '#fbbf24' : isLoser ? '#ef4444' : 'white',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {player?.name || standing.id.slice(0, 6)}
                                                    {isMe && ' (YOU)'}
                                                </span>
                                                {isWinner && (
                                                    <div style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '2px' }}>
                                                        🏆 WINNER
                                                    </div>
                                                )}
                                                {isLoser && (
                                                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '2px' }}>
                                                        💔 LAST PLACE
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '1rem' }}>
                                            <span style={{ color: '#fbbf24' }}>👑 {standing.president || 0}</span>
                                            <span style={{ color: '#6b7280' }}>😢 {standing.slave || 0}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* NEW GAME BUTTON */}
                        {playerId === gameState?.bankerId && (
                            <button
                                onClick={async () => {
                                    // Reset game state for new game
                                    const { doc, updateDoc } = await import('firebase/firestore');
                                    const { db } = await import('../core/firebase');
                                    const roomRef = doc(db, "rooms", roomCode);
                                    await updateDoc(roomRef, {
                                        status: 'lobby',
                                        slaveRoundStatus: null,
                                        currentRound: 0,
                                        playerStats: {},
                                        winners: [],
                                        finalStandings: null,
                                        currentTrickCards: [],
                                        turn: null
                                    });
                                    window.location.reload();
                                }}
                                style={{
                                    padding: '15px 40px',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                🎮 Play Again
                            </button>
                        )}

                        {playerId !== gameState?.bankerId && (
                            <p style={{ color: '#9ca3af', marginTop: '20px' }}>
                                Waiting for host to start a new game...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* TABLE AREA */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                position: 'relative'
            }}>
                {/* OPPONENTS */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {players.filter(p => p.id !== playerId).map(p => {
                        const isTheirTurn = gameState?.turn === p.id;
                        const hasWon = gameState?.winners?.includes(p.id);

                        return (
                            <div key={p.id} style={{
                                padding: '12px 20px',
                                background: hasWon ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255,255,255,0.1)',
                                border: isTheirTurn ? '2px solid #22c55e' : '2px solid transparent',
                                borderRadius: '12px',
                                textAlign: 'center',
                                transform: isTheirTurn ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                opacity: hasWon ? 0.6 : 1
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                    {p.name || p.id.slice(0, 6)}
                                </div>
                                <div style={{
                                    fontSize: '1.2rem',
                                    color: hasWon ? '#fcd34d' : '#9ca3af'
                                }}>
                                    {hasWon ? '✓ OUT' : `${p.hand?.length || 0} 🃏`}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* TRICK PILE */}
                <div style={{
                    minWidth: '180px',
                    minHeight: '140px',
                    padding: '20px',
                    border: '3px dashed rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    position: 'relative'
                }}>
                    {gameState?.currentTrickCards?.length > 0 ? (
                        <div style={{
                            display: 'flex',
                            gap: '-20px',
                            animation: 'cardDrop 0.3s ease-out'
                        }}>
                            {gameState.currentTrickCards.map((c, i) => (
                                <div key={i} style={{
                                    transform: 'scale(0.7)',
                                    marginLeft: i > 0 ? '-30px' : '0'
                                }}>
                                    <Card {...c} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                            {isMyTurn ? 'Play any card(s)' : 'Waiting...'}
                        </span>
                    )}
                </div>

                {trickOwner && (
                    <div style={{ marginTop: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        Last: {trickOwner.name || 'Unknown'}
                    </div>
                )}

                {/* ERROR */}
                {errorMsg && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        color: '#fca5a5'
                    }}>
                        {errorMsg}
                    </div>
                )}

                {/* FIRST PLAY HINT */}
                {gameState?.isFirstPlay && isMyTurn && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        color: '#93c5fd'
                    }}>
                        First play must include 3♣
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div style={{
                padding: '15px 20px',
                background: 'rgba(0,0,0,0.5)',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '15px' }}>
                    <button
                        onClick={handlePlay}
                        disabled={!canPlay || isLoading}
                        style={{
                            padding: '12px 40px',
                            background: canPlay ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: canPlay ? 'pointer' : 'not-allowed',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: canPlay ? '0 4px 15px rgba(220, 38, 38, 0.4)' : 'none'
                        }}
                    >
                        {isLoading ? '...' : 'PLAY'}
                    </button>
                    <button
                        onClick={handlePass}
                        disabled={!canPass || isLoading}
                        style={{
                            padding: '12px 40px',
                            background: 'transparent',
                            border: canPass ? '2px solid #6b7280' : '2px solid #374151',
                            color: canPass ? '#d1d5db' : '#4b5563',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: canPass ? 'pointer' : 'not-allowed',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        PASS
                    </button>
                </div>

                {/* MY HAND */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    overflowX: 'auto',
                    paddingBottom: '10px',
                    gap: '0'
                }}>
                    {sortedHand.map((card, i) => {
                        const isSelected = selectedCards.some(c => c.suit === card.suit && c.value === card.value);


                        return (
                            <div
                                key={`${card.suit}-${card.value}-${i}`}
                                className={`hand-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleCardClick(card)}
                                style={{
                                    cursor: isMyTurn ? 'pointer' : 'default',
                                    marginLeft: i > 0 ? '-55px' : '0',
                                    zIndex: isSelected ? 100 : i,
                                    filter: !isMyTurn ? 'brightness(0.7)' : 'none',
                                    position: 'relative'
                                }}
                            >
                                <Card {...card} />
                            </div>
                        );
                    })}
                </div>

                {/* CARD COUNT */}
                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginTop: '5px' }}>
                    {sortedHand.length} cards in hand
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.02); }
                }
                @keyframes cardDrop {
                    0% { transform: translateY(-50px) rotate(-5deg); opacity: 0; }
                    60% { transform: translateY(5px) rotate(2deg); opacity: 1; }
                    100% { transform: translateY(0) rotate(0deg); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0); opacity: 0; }
                    40% { transform: scale(1.15); }
                    70% { transform: scale(0.95); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    0% { transform: translateY(40px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes cardSwapIn {
                    0% { 
                        transform: scale(0.4) translateX(-100px) rotateY(180deg); 
                        opacity: 0; 
                    }
                    50% { 
                        transform: scale(0.5) translateX(0) rotateY(90deg); 
                        opacity: 0.7; 
                    }
                    100% { 
                        transform: scale(0.5) translateX(0) rotateY(0deg); 
                        opacity: 1; 
                    }
                }
                @keyframes cardGlow {
                    0%, 100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
                    50% { box-shadow: 0 0 25px rgba(251, 191, 36, 0.6); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .exchange-card {
                    animation: cardSwapIn 1.2s ease-out forwards, cardGlow 2s ease-in-out infinite;
                }
                .exchange-card:nth-child(2) {
                    animation-delay: 0.3s;
                }
                .hand-card {
                    transform: scale(0.55);
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                }
                .hand-card:hover {
                    transform: translateY(-15px) scale(0.58);
                    z-index: 999 !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .hand-card.selected {
                    transform: translateY(-25px) scale(0.6);
                    z-index: 1000 !important;
                    box-shadow: 0 15px 40px rgba(34, 197, 94, 0.4);
                }
            `}</style>
        </div>
    );
};

export default SlaveGameView;

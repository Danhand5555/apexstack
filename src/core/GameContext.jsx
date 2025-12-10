import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
    const [gameState, setGameState] = useState(null);
    const [roomCode, setRoomCode] = useState(null);
    const [playerRole, setPlayerRole] = useState(null); // 'banker', 'player', 'observer'
    const [playerId, setPlayerId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect to subscribe to room updates when roomCode exists
    useEffect(() => {
        if (!roomCode) return;

        const unsubscribe = onSnapshot(doc(db, "rooms", roomCode), (doc) => {
            if (doc.exists()) {
                setGameState(doc.data());
            } else {
                setError("Room does not exist");
            }
        }, (err) => {
            console.error("Firestore error:", err);
            setError("Failed to sync game state");
        });

        return () => unsubscribe();
    }, [roomCode]);

    const value = {
        gameState,
        roomCode,
        playerRole,
        playerId,
        loading,
        error,
        setRoomCode,
        setPlayerRole,
        setPlayerId,
        setLoading
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

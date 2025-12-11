import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, writeBatch, collection, getDocs, runTransaction } from 'firebase/firestore';
import { createDeck, shuffleDeck, calculateHandValue } from './deck';

// Generate a random 4-letter room code
export const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const createRoom = async () => {
    const roomCode = generateRoomCode();
    // In a real app, check for collision. MVP: assume unique or handle error.

    // Default initial game state
    const initialState = {
        roomCode,
        status: 'lobby', // lobby, playing, payout
        bankerId: null, // Will be set to the creator
        turn: null,
        players: [], // sub-collections are better for scalability, but array is easier for MVP sync if small
        deck: [],
        dealerHand: [],
        timestamp: Date.now()
    };

    // Timeout Promise
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out - Check Firebase Rules or Network")), 5000));

    // Race setDoc with Timeout
    await Promise.race([
        setDoc(doc(db, "rooms", roomCode), initialState),
        timeout
    ]);

    return roomCode;
};

export const joinRoom = async (roomCode, playerId, playerData = {}) => {
    const roomRef = doc(db, "rooms", roomCode.toUpperCase());
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
        throw new Error("Room not found");
    }

    // For MVP, we might add player to the array if not already there
    // But actually, we want to handle this in the Lobby component
    return roomSnap.data();
};

export const joinAsRole = async (roomCode, playerId, role, playerName) => {
    // Add player to subcollection
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);
    await setDoc(playerRef, {
        id: playerId,
        role: role,
        status: role === 'observer' ? 'active' : 'waiting', // Observers auto-join
        chips: 1000, // Default start
        name: playerName || `Player ${playerId.slice(-4)}`
    });
};

export const confirmPlayer = async (roomCode, playerId) => {
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);
    await updateDoc(playerRef, {
        status: 'active'
    });
};

export const setRoomGoal = async (roomCode, goalAmount) => {
    const roomRef = doc(db, "rooms", roomCode);
    await updateDoc(roomRef, {
        winningGoal: parseInt(goalAmount)
    });
};

export const dealInitialHands = async (roomCode) => {
    const deck = shuffleDeck(createDeck());
    const batch = writeBatch(db);
    const roomRef = doc(db, "rooms", roomCode);

    // Get all players who are ready for the next round
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);
    const players = [];

    // Reset round-end players to active for next deal
    // Or just filter for anyone who is effectively "in"
    snapshot.forEach(doc => {
        const pData = doc.data();
        if (pData.role === 'player') {
            // For MVP, if they are active, waiting, or round_end, we include them
            if (['active', 'waiting', 'round_end'].includes(pData.status)) {
                players.push(pData);
            }
        }
    });

    if (players.length === 0) throw new Error("No active players to deal to");

    // Deal: 2 cards to each player, 2 to dealer (1 hidden)
    for (const player of players) {
        const hand = [deck.pop(), deck.pop()];
        const pRef = doc(db, "rooms", roomCode, "players", player.id);
        batch.update(pRef, {
            hand,
            status: 'playing',
            lastResult: null,
            lastValue: null
        });
    }

    const dealerHand = [deck.pop(), deck.pop()];
    dealerHand[1].hidden = true; // Hide second card

    batch.update(roomRef, {
        deck,
        dealerHand,
        status: 'playing',
        turn: players[0].id // First player's turn (simplified)
    });

    await batch.commit();
};

export const playerHit = async (roomCode, playerId) => {
    // Transaction to ensure deck integrity
    const roomRef = doc(db, "rooms", roomCode);
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        const playerDoc = await transaction.get(playerRef);

        if (!roomDoc.exists() || !playerDoc.exists()) throw new Error("Game state invalid");

        const deck = roomDoc.data().deck;
        const hand = playerDoc.data().hand;

        if (deck.length === 0) throw new Error("Deck empty");

        const newCard = deck.pop();
        hand.push(newCard);

        const value = calculateHandValue(hand);

        transaction.update(roomRef, { deck });
        transaction.update(playerRef, {
            hand,
            status: value > 21 ? 'busted' : 'playing'
        });
    });
};

export const playerStand = async (roomCode, playerId) => {
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);
    await updateDoc(playerRef, { status: 'stood' });
    // TODO: Trigger check for end of round? 
    // Usually dealer monitors or we trigger a cloud function, but here we can check client side if we want
};

export const playDealerTurn = async (roomCode) => {
    const roomRef = doc(db, "rooms", roomCode);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Room not found");

        const data = roomDoc.data();
        let deck = data.deck;
        let dealerHand = data.dealerHand;

        // Reveal hidden card
        dealerHand[1].hidden = false;

        // Dealer plays: hit until >= 17
        // (Simplified: Stand on all 17s)
        let dealerValue = calculateHandValue(dealerHand);
        while (dealerValue < 17) {
            if (deck.length === 0) break; // Should shuffle discard pile in real game
            dealerHand.push(deck.pop());
            dealerValue = calculateHandValue(dealerHand);
        }

        // Payouts
        const playersSnapshot = await getDocs(collection(db, "rooms", roomCode, "players"));
        playersSnapshot.forEach(pDoc => {
            const pData = pDoc.data();
            if (pData.status === 'active' || pData.status === 'waiting') return; // Skip non-players

            const pHandValue = calculateHandValue(pData.hand);
            let chips = pData.chips;
            let result = 'push';

            if (pData.status === 'busted') {
                result = 'loss';
                chips -= 100; // Simplified betting: fixed 100 bet
            } else if (dealerValue > 21) {
                result = 'win';
                chips += 100;
            } else if (pHandValue > dealerValue) {
                result = 'win';
                chips += 100;
            } else if (pHandValue < dealerValue) {
                result = 'loss';
                chips -= 100;
            }

            transaction.update(pDoc.ref, {
                chips,
                status: 'round_end',
                lastResult: result,
                lastValue: pHandValue,
                history: arrayUnion({
                    result,
                    value: pHandValue,
                    timestamp: Date.now()
                })
            });
        });

        transaction.update(roomRef, {
            deck,
            dealerHand,
            status: 'payout'
        });
    });
};

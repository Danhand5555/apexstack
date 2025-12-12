import { db } from './firebase';
import { doc, getDoc, updateDoc, runTransaction, collection, getDocs, writeBatch } from 'firebase/firestore';
import { createDeck, shuffleDeck } from './deck';

// --- RANKING LOGIC ---

// Map card values to Slave Rank (3 is lowest, 2 is highest)
// 3,4,5,6,7,8,9,10,J,Q,K,A,2
const RANK_MAP = {
    '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7,
    'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12
};

export const getCardRank = (value) => RANK_MAP[value];

export const sortHand = (hand) => {
    return [...hand].sort((a, b) => getCardRank(a.value) - getCardRank(b.value));
};

// --- VALIDATION ---

export const isValidPlay = (selectedCards, currentTrickCards) => {
    if (selectedCards.length === 0) return false;
    if (selectedCards.length > 2) return false; // Only Singles or Pairs for now

    // Check if cards are same rank
    const firstRank = getCardRank(selectedCards[0].value);
    const isPair = selectedCards.length === 2;
    if (isPair && firstRank !== getCardRank(selectedCards[1].value)) {
        return false;
    }

    // Determine rank of play
    const playRank = firstRank;

    // If trick is empty, any valid single/pair is allowed
    if (!currentTrickCards || currentTrickCards.length === 0) {
        return true;
    }

    // Must match quantity
    if (selectedCards.length !== currentTrickCards.length) {
        return false;
    }

    // Must be strictly higher rank
    const currentTrickRank = getCardRank(currentTrickCards[0].value);
    return playRank > currentTrickRank;
};


// --- GAME ACTIONS ---

export const startSlaveGame = async (roomCode) => {
    // 1. Create & Shuffle Deck
    // Note: createDeck() returns 52 cards.
    let deck = shuffleDeck(createDeck());

    // 2. Deal 13 cards to 4 players
    const batch = writeBatch(db);
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);

    const players = [];
    snapshot.forEach(doc => players.push({ ...doc.data() }));

    // Ensure we have at least 2 players
    if (players.length < 2) {
        throw new Error("Need at least 2 players to start.");
    }

    // Sorting players for determinism (needed for dealing remainders fairly/consistently)
    players.sort((a, b) => a.id.localeCompare(b.id));

    let starterId = null;

    // Deal cards
    // 52 cards distributed among N players
    const hands = new Array(players.length).fill().map(() => []);
    let pIdx = 0;

    while (deck.length > 0) {
        hands[pIdx].push(deck.pop());
        pIdx = (pIdx + 1) % players.length;
    }

    // Assign hands to players
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const hand = hands[i];

        // Sort hand for user convenience
        const sortedHand = sortHand(hand);

        // Check for 3 of Clubs (Suit: ♣, Value: 3)
        const has3Clubs = sortedHand.some(c => c.value === '3' && c.suit === '♣');
        if (has3Clubs) {
            starterId = player.id;
        }

        const pRef = doc(db, "rooms", roomCode, "players", player.id);
        batch.update(pRef, {
            hand: sortedHand,
            status: 'playing', // Everyone playing
            history: [] // Reset or keep? Probably keep general history but maybe clear for new game
        });
    }

    // Setup Room State
    const roomRef = doc(db, "rooms", roomCode);

    // Check if we have a defined "Slave" from previous round to start
    const roomSnap = await getDoc(roomRef);
    const roomData = roomSnap.data();

    // If we have winners (previous round existed), the Slave starts
    // (Prompt: "Subsequent Rounds: The Slave... starts")
    if (roomData.winners && roomData.winners.length === 4) {
        starterId = roomData.winners[3]; // Last place is Slave
    }

    // If first round (no winners yet), 3 of Clubs starts
    // If 3 of clubs not found (e.g. playing with fewer cards/players?), fallback to random?
    // With 52 cards and 4 players, someone MUST have it.
    if (!starterId && players.length > 0) starterId = players[0].id; // Fallback

    batch.update(roomRef, {
        status: 'playing',
        turn: starterId,
        currentTrickCards: [],
        trickOwnerId: null, // No one owns the trick initially
        winners: [], // Reset winners for this round
        slaveRoundStatus: 'playing'
    });

    await batch.commit();
};

export const playSlaveTurn = async (roomCode, playerId, selectedCards) => {
    const roomRef = doc(db, "rooms", roomCode);
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        const playerDoc = await transaction.get(playerRef);

        if (!roomDoc.exists() || !playerDoc.exists()) throw new Error("Game state invalid");

        const rData = roomDoc.data();
        const pData = playerDoc.data();

        // 1. Validation
        if (rData.turn !== playerId) throw new Error("Not your turn");

        // Verify user actually has these cards
        const hand = pData.hand;
        const validSelection = selectedCards.every(sel =>
            hand.some(h => h.suit === sel.suit && h.value === sel.value)
        );
        if (!validSelection) throw new Error("You do not have these cards");

        if (!isValidPlay(selectedCards, rData.currentTrickCards)) {
            throw new Error("Invalid move");
        }

        // 2. Execute Play
        // Remove cards from hand
        const newHand = hand.filter(h =>
            !selectedCards.some(sel => sel.suit === h.suit && sel.value === h.value)
        );

        // Update Room Trick
        transaction.update(roomRef, {
            currentTrickCards: selectedCards,
            trickOwnerId: playerId, // user owns this trick now
            turn: getNextPlayerId(rData.turn, roomCode) // Need helper for Next Turn
        });

        transaction.update(playerRef, {
            hand: newHand
        });

        // 3. Check Win Condition
        if (newHand.length === 0) {
            // Player finished!
            const newWinners = [...(rData.winners || []), playerId];
            transaction.update(roomRef, {
                winners: newWinners
            });

            // If 3 players finished, the 4th is auto-last (Slave)
            // We can end the round here or let the last person play?
            // Rules say "Ranks are assigned in the order players empty their hands".
            // Usually we play until 3 finish.
            if (newWinners.length === 3) {
                // Determine the 4th player
                // ... logic to find the remaining player ...
                // For MVP, just set round status to 'completed' or 'exchange'
                transaction.update(roomRef, {
                    slaveRoundStatus: 'exchange' // Ready for exchange
                });
            }
        }
    });
};

export const passTurn = async (roomCode, playerId) => {
    const roomRef = doc(db, "rooms", roomCode);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Room not found");

        const rData = roomDoc.data();
        if (rData.turn !== playerId) throw new Error("Not your turn");

        // Calculate next player
        // We need the list of players to know order.
        // Simplified: we assume we can get players list or it's stored in room?
        // Ideally we store `playerIds` array in room for order. 
        // For now, let's fetch players collection (expensive in transaction but necessary if order dynamic)
        // Better: assume `players` in room object or fetches separately?
        // Let's rely on a helper that we assume acts correctly.

        let nextPlayer = await getNextPlayerId(playerId, roomCode);

        // TRICK CLEARING LOGIC
        // "If all other players pass... the trick is cleared. The player who made the last, highest play starts."
        // Meaning: If nextPlayer === trickOwnerId, then everyone else passed.

        if (nextPlayer === rData.trickOwnerId) {
            // Everyone passed back to owner.
            // Owner clears trick and starts new one.
            transaction.update(roomRef, {
                currentTrickCards: [],
                trickOwnerId: null, // Owner starts fresh
                turn: nextPlayer
            });
        } else {
            // Just move turn
            transaction.update(roomRef, {
                turn: nextPlayer
            });
        }
    });
};

// Helper to get next active player
// This is non-trivial without player order list. 
// We will assume players are ordered alphabetically or by join time (ID).
const getNextPlayerId = async (currentId, roomCode) => {
    // This requires a read. 
    // Optimization: Store `playerOrder` array in room Doc.
    // For now, fetch all.
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);
    const players = [];
    snapshot.forEach(doc => {
        // Only include players who haven't finished (hand not empty or status not 'finished')
        // Actually, finished players are skipped in rotation? 
        // "Ranks are assigned in the order players empty their hands".
        // Once empty, they are out.
        const d = doc.data();
        if (d.hand && d.hand.length > 0) {
            players.push(d.id);
        }
    });

    // Sort to ensure consistent order (e.g. by ID or name)
    players.sort();

    const currIdx = players.indexOf(currentId);
    if (currIdx === -1) {
        // Current player maybe just finished? Then next is 0?
        // Or if current player passed, they are still in list.
        // If current not in list, find who would be after them?
        return players[0];
    }

    const nextIdx = (currIdx + 1) % players.length;
    return players[nextIdx];
};

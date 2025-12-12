import { db } from './firebase';
import { doc, getDoc, updateDoc, runTransaction, collection, getDocs, writeBatch } from 'firebase/firestore';
import { createDeck, shuffleDeck } from './deck';

// --- RANKING LOGIC ---

// Map card values to Slave Rank (3 is lowest, 2 is highest)
const RANK_MAP = {
    '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7,
    'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12
};

export const getCardRank = (value) => RANK_MAP[value] ?? -1;

export const sortHand = (hand) => {
    if (!hand) return [];
    return [...hand].sort((a, b) => getCardRank(a.value) - getCardRank(b.value));
};

// --- VALIDATION ---

export const isValidPlay = (selectedCards, currentTrickCards) => {
    if (!selectedCards || selectedCards.length === 0) return false;
    if (selectedCards.length > 2) return false; // Only Singles or Pairs

    // Check if all cards are same rank (required for pairs)
    const firstRank = getCardRank(selectedCards[0].value);
    if (selectedCards.length === 2) {
        if (firstRank !== getCardRank(selectedCards[1].value)) {
            return false;
        }
    }

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
    return firstRank > currentTrickRank;
};

// --- GAME ACTIONS ---

export const startSlaveGame = async (roomCode) => {
    // 1. Create & Shuffle Deck
    let deck = shuffleDeck(createDeck());

    // 2. Get all players
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);

    const players = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.role === 'player') { // Only include actual players, not observers
            players.push({ ...data, id: docSnap.id });
        }
    });

    if (players.length < 2) {
        throw new Error("Need at least 2 players to start.");
    }

    // Sort players for consistent order
    players.sort((a, b) => a.id.localeCompare(b.id));
    const playerOrder = players.map(p => p.id);

    // Deal cards evenly
    const hands = players.map(() => []);
    let pIdx = 0;
    while (deck.length > 0) {
        hands[pIdx].push(deck.pop());
        pIdx = (pIdx + 1) % players.length;
    }

    // Find who has 3 of Clubs
    let starterId = null;

    const batch = writeBatch(db);

    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const sortedHand = sortHand(hands[i]);

        // Check for 3 of Clubs
        const has3Clubs = sortedHand.some(c => c.value === '3' && c.suit === '♣');
        if (has3Clubs) {
            starterId = player.id;
        }

        const pRef = doc(db, "rooms", roomCode, "players", player.id);
        batch.update(pRef, {
            hand: sortedHand,
            status: 'playing'
        });
    }

    // Fallback starter
    if (!starterId) starterId = playerOrder[0];

    // Get current room data before updating
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);
    const roomData = roomSnap.data() || {};
    const previousWinners = roomData.winners || [];

    // Track round number (increment if there were previous winners, else start at 1)
    const currentRound = previousWinners.length > 0
        ? (roomData.currentRound || 0) + 1
        : 1;

    // Initialize or update player stats
    let playerStats = roomData.playerStats || {};

    // If this is a new round (not first), update stats from previous round
    if (previousWinners.length >= 2) {
        const presidentId = previousWinners[0];
        const slaveId = previousWinners[previousWinners.length - 1];

        // Initialize if not exists
        if (!playerStats[presidentId]) playerStats[presidentId] = { president: 0, slave: 0 };
        if (!playerStats[slaveId]) playerStats[slaveId] = { president: 0, slave: 0 };

        // Increment counts
        playerStats[presidentId].president = (playerStats[presidentId].president || 0) + 1;
        playerStats[slaveId].slave = (playerStats[slaveId].slave || 0) + 1;
    }

    // Setup Room State
    batch.update(roomRef, {
        status: 'dealing',
        turn: starterId,
        currentTrickCards: [],
        trickOwnerId: null,
        previousWinners: previousWinners,
        winners: [],
        slaveRoundStatus: 'dealing',
        playerOrder: playerOrder,
        currentRound: currentRound,
        playerStats: playerStats
    });

    await batch.commit();
};

export const playSlaveTurn = async (roomCode, playerId, selectedCards) => {
    if (!selectedCards || selectedCards.length === 0) {
        throw new Error("No cards selected");
    }

    const roomRef = doc(db, "rooms", roomCode);
    const playerRef = doc(db, "rooms", roomCode, "players", playerId);

    // Read current state first
    const [roomSnap, playerSnap] = await Promise.all([
        getDoc(roomRef),
        getDoc(playerRef)
    ]);

    if (!roomSnap.exists() || !playerSnap.exists()) {
        throw new Error("Game state invalid");
    }

    const rData = roomSnap.data();
    const pData = playerSnap.data();

    // Validation
    if (rData.turn !== playerId) {
        throw new Error("Not your turn");
    }

    // Verify user has these cards
    const hand = pData.hand || [];
    const validSelection = selectedCards.every(sel =>
        hand.some(h => h.suit === sel.suit && h.value === sel.value)
    );
    if (!validSelection) {
        throw new Error("You do not have these cards");
    }

    // First play can be any valid card(s)

    if (!isValidPlay(selectedCards, rData.currentTrickCards)) {
        throw new Error("Invalid move - must play higher rank");
    }

    // Execute Play
    const newHand = hand.filter(h =>
        !selectedCards.some(sel => sel.suit === h.suit && sel.value === h.value)
    );

    // Calculate next turn
    const playerOrder = rData.playerOrder || [];
    let nextTurnId = getNextActivePlayer(playerId, playerOrder, newHand.length === 0 ? playerId : null, rData.winners || []);

    // Prepare updates
    const roomUpdate = {
        currentTrickCards: selectedCards,
        trickOwnerId: playerId,
        turn: nextTurnId
    };

    const playerUpdate = {
        hand: newHand
    };

    // Check win condition
    if (newHand.length === 0) {
        const newWinners = [...(rData.winners || []), playerId];
        roomUpdate.winners = newWinners;

        // If only 1 player left with cards, they're the slave
        const activePlayers = playerOrder.filter(pid =>
            pid !== playerId && !(rData.winners || []).includes(pid)
        );

        if (activePlayers.length <= 1) {
            roomUpdate.slaveRoundStatus = 'completed';
            if (activePlayers.length === 1) {
                roomUpdate.winners = [...newWinners, activePlayers[0]];
            }
        }
    }

    // Write updates
    await Promise.all([
        updateDoc(roomRef, roomUpdate),
        updateDoc(playerRef, playerUpdate)
    ]);
};

export const passTurn = async (roomCode, playerId) => {
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) throw new Error("Room not found");

    const rData = roomSnap.data();
    if (rData.turn !== playerId) throw new Error("Not your turn");

    // Cannot pass if trick is empty (you must start)
    if (!rData.currentTrickCards || rData.currentTrickCards.length === 0) {
        throw new Error("Cannot pass - you must start the trick");
    }

    const playerOrder = rData.playerOrder || [];
    const winners = rData.winners || [];

    let nextPlayer = getNextActivePlayer(playerId, playerOrder, null, winners);

    // Check if only one active player remains (everyone else has won)
    // In this case, passing means they win the trick by default
    const activePlayers = playerOrder.filter(pid => !winners.includes(pid));
    const onlyOneActivePlayer = activePlayers.length === 1;

    // Trick clearing: If next player is the trick owner OR only one player remains
    if (nextPlayer === rData.trickOwnerId || onlyOneActivePlayer) {
        // If only one player left and they're the trick owner with no cards left,
        // the round is complete
        if (onlyOneActivePlayer) {
            // The last remaining player is the slave - round complete
            const lastPlayerId = activePlayers[0];
            await updateDoc(roomRef, {
                currentTrickCards: [],
                trickOwnerId: null,
                turn: lastPlayerId,
                winners: [...winners, lastPlayerId],
                slaveRoundStatus: 'completed'
            });
        } else {
            await updateDoc(roomRef, {
                currentTrickCards: [],
                trickOwnerId: null,
                turn: nextPlayer
            });
        }
    } else {
        await updateDoc(roomRef, {
            turn: nextPlayer
        });
    }
};

// Helper: Get next player who still has cards
function getNextActivePlayer(currentId, playerOrder, justFinishedId, winners) {
    if (!playerOrder || playerOrder.length === 0) return currentId;

    const currIdx = playerOrder.indexOf(currentId);
    const totalPlayers = playerOrder.length;

    for (let offset = 1; offset <= totalPlayers; offset++) {
        const nextIdx = (currIdx + offset) % totalPlayers;
        const nextId = playerOrder[nextIdx];

        // Skip players who have already won
        if (winners.includes(nextId)) continue;
        // Skip the player who just finished
        if (nextId === justFinishedId) continue;

        return nextId;
    }

    // Fallback: return current (shouldn't happen)
    return currentId;
}

// Get rank labels based on player count
export const getRankLabels = (playerCount) => {
    if (playerCount <= 2) return ['President', 'Slave'];
    if (playerCount === 3) return ['President', 'Neutral', 'Slave'];
    return ['President', 'Vice-President', 'Vice-Slave', 'Slave'];
};

// DEBUG: Simulate round end instantly (for testing)
export const debugEndRound = async (roomCode) => {
    const roomRef = doc(db, "rooms", roomCode);
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);

    const playerIds = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.role === 'player') {
            playerIds.push(docSnap.id);
        }
    });

    // Simulate winners order (first player wins, last player is slave)
    playerIds.sort();

    await updateDoc(roomRef, {
        winners: playerIds,
        slaveRoundStatus: 'completed',
        currentTrickCards: []
    });

    console.log("DEBUG: Round ended. Winners:", playerIds);
};

// Perform card exchange between President and Slave
export const performCardExchange = async (roomCode) => {
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) throw new Error("Room not found");

    const rData = roomSnap.data();
    // Use previousWinners (from last round) instead of winners (which was reset)
    const winners = rData.previousWinners || [];

    if (winners.length < 2) {
        console.log("No previous winners for exchange, skipping");
        // First game, no exchange needed
        await updateDoc(roomRef, { slaveRoundStatus: 'exchanged' });
        return null;
    }

    const presidentId = winners[0]; // First place
    const slaveId = winners[winners.length - 1]; // Last place

    // Get player hands (after new deal)
    const presRef = doc(db, "rooms", roomCode, "players", presidentId);
    const slaveRef = doc(db, "rooms", roomCode, "players", slaveId);

    const [presSnap, slaveSnap] = await Promise.all([
        getDoc(presRef),
        getDoc(slaveRef)
    ]);

    if (!presSnap.exists() || !slaveSnap.exists()) {
        throw new Error("Player data not found");
    }

    const presHand = sortHand(presSnap.data().hand || []);
    const slaveHand = sortHand(slaveSnap.data().hand || []);

    // Slave gives 2 BEST cards (highest rank = end of sorted array)
    const slaveGives = slaveHand.slice(-2); // Last 2 are highest
    const slaveKeeps = slaveHand.slice(0, -2);

    // President gives 2 WORST cards (lowest rank = start of sorted array)
    const presGives = presHand.slice(0, 2); // First 2 are lowest
    const presKeeps = presHand.slice(2);

    // Perform swap
    const newPresHand = sortHand([...presKeeps, ...slaveGives]);
    const newSlaveHand = sortHand([...slaveKeeps, ...presGives]);

    // Update database
    const batch = writeBatch(db);

    batch.update(presRef, {
        hand: newPresHand,
        receivedCards: slaveGives,
        gaveCards: presGives
    });

    batch.update(slaveRef, {
        hand: newSlaveHand,
        receivedCards: presGives,
        gaveCards: slaveGives
    });

    batch.update(roomRef, {
        slaveRoundStatus: 'exchanged',
        exchangeInfo: {
            presidentId,
            slaveId,
            presidentGave: presGives,
            slaveGave: slaveGives
        }
    });

    await batch.commit();

    return {
        presidentGave: presGives,
        slaveGave: slaveGives
    };
};

// Start next round after exchange
export const startNextRound = async (roomCode) => {
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) throw new Error("Room not found");

    const rData = roomSnap.data();
    const previousWinners = rData.previousWinners || [];
    const playerOrder = rData.playerOrder || [];
    const currentRound = rData.currentRound || 1;
    const roundLimit = parseInt(rData.winningGoal) || 999; // winningGoal is used as round limit for Slave

    // Check if game is complete
    if (currentRound >= roundLimit) {
        // Game over! Calculate final standings
        const playerStats = rData.playerStats || {};

        // Sort players by president count (most wins)
        const standings = Object.entries(playerStats)
            .map(([id, stats]) => ({ id, ...stats }))
            .sort((a, b) => (b.president || 0) - (a.president || 0));

        await updateDoc(roomRef, {
            status: 'gameComplete',
            slaveRoundStatus: 'gameComplete',
            finalStandings: standings,
            exchangeInfo: null,
            previousWinners: null
        });

        return { gameComplete: true, standings };
    }

    // Slave (last place) starts, or first player if no previous round
    let starterId = playerOrder[0];
    if (previousWinners.length >= 2) {
        starterId = previousWinners[previousWinners.length - 1]; // Slave starts
    }

    await updateDoc(roomRef, {
        status: 'playing',
        turn: starterId,
        currentTrickCards: [],
        trickOwnerId: null,
        slaveRoundStatus: 'playing',
        exchangeInfo: null,
        previousWinners: null // Clear after use
    });

    // Clear received/gave cards from players
    const playersRef = collection(db, "rooms", roomCode, "players");
    const snapshot = await getDocs(playersRef);

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
        batch.update(docSnap.ref, {
            receivedCards: null,
            gaveCards: null
        });
    });

    await batch.commit();

    return { gameComplete: false };
};

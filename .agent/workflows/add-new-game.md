---
description: How to add a new card game to APEX STACK
---

# Adding a New Game to APEX STACK

## Step 1: Create Game Logic
Create `src/core/{gameName}Helpers.js`:

```javascript
import { db } from './firebase';
import { doc, updateDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

// Required exports:
export const start{GameName}Game = async (roomCode) => {
  // 1. Get all players
  // 2. Create/shuffle deck
  // 3. Deal cards to players
  // 4. Set initial room state (turn, status, etc.)
};

export const play{GameName}Turn = async (roomCode, playerId, action) => {
  // 1. Validate action
  // 2. Update game state
  // 3. Check win condition
  // 4. Advance turn or end game
};

// Add other game-specific functions as needed
```

## Step 2: Create Game View
Create `src/views/{GameName}GameView.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { useGame } from '../core/GameContext';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../core/firebase';
import Card from '../components/Card';
import { start{GameName}Game, play{GameName}Turn } from '../core/{gameName}Helpers';

const {GameName}GameView = () => {
  const { roomCode, playerId, gameState } = useGame();
  const [players, setPlayers] = useState([]);
  
  // Subscribe to players
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rooms", roomCode, "players"),
      (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setPlayers(list);
      }
    );
    return unsub;
  }, [roomCode]);

  const me = players.find(p => p.id === playerId);
  const myHand = me?.hand || [];

  return (
    <div style={{ /* game container styles */ }}>
      {/* Top bar with room info, turn indicator */}
      {/* Main game area */}
      {/* Player's hand */}
      {/* Action buttons */}
      {/* Game complete overlay */}
    </div>
  );
};

export default {GameName}GameView;
```

## Step 3: Add to Landing.jsx
In the game type selection section:

```jsx
<button
  onClick={() => setGameType('{gamename}')}
  style={{ /* button styles */ }}
>
  {/* Icon */}
  {GAME_NAME}
</button>
```

## Step 4: Register in App.jsx
In `renderGameView()`:

```javascript
if (gameState.gameType === '{gamename}') {
  return <{GameName}GameView />;
}
```

Don't forget to import the view:
```javascript
import {GameName}GameView from './views/{GameName}GameView';
```

## Step 5: Update Lobby.jsx
In `handleStartGame()`:

```javascript
if (gameState?.gameType === '{gamename}') {
  const { start{GameName}Game } = await import('../core/{gameName}Helpers');
  await start{GameName}Game(roomCode);
}
```

## Step 6: Firebase Data Model
Update the room document with game-specific fields:

```javascript
{
  gameType: '{gamename}',
  // Add game-specific fields:
  // e.g., currentBet, discardPile, roundNumber, etc.
}
```

## Testing Checklist
- [ ] Game starts correctly from lobby
- [ ] All players see correct initial state
- [ ] Turn management works
- [ ] Game actions validate properly
- [ ] Win condition triggers correctly
- [ ] Game complete shows results
- [ ] "Play Again" returns to lobby

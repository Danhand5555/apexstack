# APEX STACK 🎴

> Premium multiplayer card game platform

## Features
- 🃏 **Blackjack** - Classic casino game
- 👑 **President (Slave)** - Strategic elimination game
- 🔄 **Real-time multiplayer** via Firebase
- 📱 **Mobile-responsive** design

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack
- React 18 + Vite
- Firebase Firestore (real-time database)
- Vercel (deployment)

## Project Structure
```
src/
├── core/           # Game logic & Firebase
│   ├── gameHelpers.js      # Blackjack logic
│   └── slaveHelpers.js     # President logic
├── components/     # Shared components
│   ├── Landing.jsx         # Home screen
│   ├── Lobby.jsx           # Game lobby
│   └── Card.jsx            # Card component
└── views/          # Game-specific views
    ├── SlaveGameView.jsx   # President game
    ├── BankerView.jsx      # Blackjack dealer
    └── PlayerView.jsx      # Blackjack player
```

## Adding a New Game

1. Create `src/core/newGameHelpers.js` with game logic
2. Create `src/views/NewGameView.jsx` for UI
3. Add game type to `Landing.jsx` selection
4. Register in `App.jsx` router
5. Update `Lobby.jsx` start handler

See [walkthrough.md](.gemini/antigravity/brain/*/walkthrough.md) for detailed docs.

## Environment Variables
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MSG_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Deployment
Push to `main` → Auto-deploys to Vercel

## License
MIT

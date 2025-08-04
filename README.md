# Draw & Guess Game

**Real-time online Pictionary-style multiplayer drawing and guessing game**  
Drawer picks a word, draws it live, others try to guess. Features: scoring, undo/clear, hint reveal over time, reconnect/resume, leaderboard.

## Features

- Real-time drawing with Socket.IO
- Drawer/guesser roles with manual round start
- Word hint system (underscores → letters over time)
- Score tracking and leaderboard
- Undo last stroke and clear canvas (synchronized)
- Rejoin after reload with canvas replay and round state
- Drawer cannot guess
- Responsive, modular frontend UI
- Separate client/server deploy (in my case Vercel + Railway)

## Usage

- Open the client URL in two windows.
- Enter name and (optionally) room code to join/create.
- Drawer picks a word via the custom UI, clicks “Start Round.”
- Guessers see hints and submit guesses; scores update on correct guesses.
- Drawer can undo last stroke or clear board.
- Reloading reconnects with current canvas and state.

## Architecture Overview

- **Server** (`/server`): Node.js + Socket.IO. Manages rooms, rounds, word selection, timers, hint logic, drawing history, scoring, and reconnections.  
- **Client** (`/client`): React app. Drawing board, chat, leaderboard, room management, and drawer UI. Communicates with server over WebSockets.

## Prerequisites

- Node.js (>=18 recommended)
- npm or yarn
- Git

## 🚀 Local Development

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <repo-folder>
```
### 2. Changing the variables
Right now the code has the deployes server links simply just replace these links with any of your localhost link (E.g http://localhost:3000/ for frontend/client and localhost:4000 for backend or serve)
this links are available in client/src/socket.js file location 

## Server Deployment
If you wish to deploy the project yourself simply look up implemmentations in following websites
### Backend
- Railway (easy to deploy but has limited time of deployment for free tier)
- fly.io (by far the best option for it but has a long setup process but it runs on amount of time active not deployed for free tier)
- Heruko (Similar to fly.io and has a long setup similar to gly.io)

### Frontend
- Vercel (By far the best and easy to lauch server)

## Possible Improvements

- Persistent backend storage (database) for rooms/scores
- Authentication / avatars
- Themes / dark mode
- Word category packs
- Undo history visual preview
- Sound effects / notifications

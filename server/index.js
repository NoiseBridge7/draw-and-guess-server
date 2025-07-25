const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const {
  createRoom,
  joinRoom,
  getRoom,
  setWord,
  startRound,
  handleGuess,
  endRound,
  rooms            
} = require('./rooms');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }
});

const ROUND_DURATION = 200; // should match rooms.js

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', ({ username }, callback) => {
    const roomCode = createRoom(socket, username);
    const room = getRoom(roomCode);
    socket.join(roomCode);
    io.to(roomCode).emit('systemMessage', `🔔 ${username} created the room!`);
    io.to(roomCode).emit('drawerAssigned', room.drawer);
    io.to(roomCode).emit('updatePlayers', room.players);
    callback({ roomCode });
  });

  socket.on('joinRoom', ({ roomCode, username }, callback) => {
    const success = joinRoom(socket, roomCode, username);
    if (!success) return callback({ success: false });
    const room = getRoom(roomCode);
    socket.join(roomCode);
    io.to(roomCode).emit('systemMessage', `🔔 ${username} joined the room!`);
    io.to(roomCode).emit('updatePlayers', room.players);
    if(!room.timer){ io.to(roomCode).emit('drawerAssigned', room.drawer); }
    callback({ success: true });
  });

  socket.on('setWord', ({ roomCode, word }) => {
    const room = getRoom(roomCode);
    if (!room || socket.id !== room.drawer) return;
    setWord(roomCode, word, io);
  });

  socket.on('startRound', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (room && socket.id === room.drawer) {
      startRound(roomCode, io);
    }
  });

  // Persist and broadcast drawing
  socket.on('drawing', (data) => {
    const room = getRoom(data.roomCode);
    if (room){
      room.history.push(data);
    }
    socket.to(data.roomCode).emit('drawing', data);
  });

  socket.on('undo', ({ roomCode }) => {
    const room = rooms[roomCode];
    console.log(`[UNDO] for room ${roomCode}, history length = ${room?.history.length}`);
    if (!room || room.history.length === 0) return;
    room.history.pop();
    io.to(roomCode).emit('clearBoard');
    io.to(roomCode).emit('drawingHistory', room.history);
  });

  // Replay history on reconnect
  socket.on('rejoin', ({ roomCode, username }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false });

    // Update player socket ID or add new
    let player = room.players.find(p => p.username === username);
    if (player) player.id = socket.id;
    else room.players.push({ id: socket.id, username, score: 0 });

    socket.join(roomCode);
    // Compute hint state
    const letterCount = room.word ? room.word.replace(/ /g, '').length : 0;
    const elapsed = room.timer ? ROUND_DURATION - room.timeLeft : 0;
    let seen = 0;
    const hint = room.word
      ? room.word.split('').map(ch => {
          if (ch === ' ') return '   ';
          seen++;
          return seen <= Math.floor((elapsed / ROUND_DURATION) * letterCount) ? ch : '_';
        }).join(' ')
      : '';

    callback({
      success: true,
      state: {
        players: room.players,
        drawerId: room.drawer,
        roundStarted: !!room.timer,
        timeLeft: room.timeLeft,
        hint,
      }
    });

    // Immediately replay canvas history
    socket.emit('drawingHistory', room.history);
  });

  socket.on('sendGuess', ({ roomCode, guess, username }) => {
    const room = getRoom(roomCode);
    if (!room || socket.id === room.drawer) return;
    const { correct } = handleGuess(roomCode, guess, username, io);
    if (correct) io.to(roomCode).emit('correctGuess', { username, guess });
    else io.to(roomCode).emit('chatMessage', { username, message: guess });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Clean up this user from any rooms they were in
    for(const [code, room] of Object.entries(rooms)){
      //Find and remove the player
      const idx = room.players.findIndex(p => p.id === socket.id);
      if(idx !== -1){
        room.players.splice(idx, 1);
        //Notify remaining players
        io.to(code).emit('updatePlayers', room.players);
        io.to(code).emit('systemMessage', `🔔 A player left the room.`);

        // If that was the drawer, rotate to the next one
        if (room.drawer === socket.id && room.players.length > 0) {
          room.drawer = room.players[0].id;
          io.to(code).emit('drawerAssigned', room.drawer);
        }

        // If the room is now empty, delete it
        if (room.players.length === 0) {
          clearInterval(room.timer);
          delete rooms[code];
          console.log(`Room ${code} deleted (empty).`);
       }

      }
    }

  });
});

server.listen(4000, () => console.log('Server running on port 4000'));
const rooms = {};
const ROUND_DURATION = 200; // seconds

function createRoom(socket, username) {
  const roomCode = Math.random().toString(36).substring(2, 7);
  rooms[roomCode] = {
    players: [{ id: socket.id, username, score: 0 }],
    drawer: socket.id,
    word: null,
    timer: null,
    timeLeft: ROUND_DURATION,
    history: [],
  };
  socket.join(roomCode);
  return roomCode;
}

function joinRoom(socket, roomCode, username) {
  const room = rooms[roomCode];
  if (!room) return false;
  room.players.push({ id: socket.id, username, score: 0 });
  socket.join(roomCode);
  return true;
}

function getRoom(roomCode) {
  return rooms[roomCode];
}

function setWord(roomCode, word, io) {
  const room = rooms[roomCode];
  if (!room) return;

  room.word = word;
  console.log(`[SET WORD] Word "${word}" set for room ${roomCode}. Awaiting manual start…`);

  // Tell the drawer what they picked
  io.to(room.drawer).emit("yourWord", word);

  // Notify everyone that the drawer is ready
  io.to(roomCode).emit("systemMessage", `🔔 Drawer has chosen a word. Click “Start Round” to begin.`);
}

function startRound(roomCode, io) {
  const room = rooms[roomCode];
  if (!room || !room.word) return;

  console.log(`[START ROUND] ${roomCode} — starting with word "${room.word}"`);

  rooms[roomCode].history = [];

  io.to(roomCode).emit("clearBoard");
  io.to(roomCode).emit("roundStarted");
  
  room.timeLeft = ROUND_DURATION;
  if (room.timer) clearInterval(room.timer);

  //Hinting System Count the number of words here too and then start timer
  const letterCount = room.word.replace(/ /g, "").length;

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(roomCode).emit("timerTick", room.timeLeft);

    // How many letters to reveal so far?
    const elapsed = ROUND_DURATION - room.timeLeft;
    const reveals = Math.floor((elapsed / ROUND_DURATION) * letterCount);

    // Build the hint string: spaces preserved, letters or underscores
    let seen = 0;
    const hint = room.word.split("").map(ch => {
        if (ch === " ") return "   "; // extra spacing for word breaks
        seen++;
        return seen <= reveals ? ch : "_";
      }).join(" ");

    // Send the hint to all guessers (drawer can ignore it)
    io.to(roomCode).emit("wordHint", hint);

    if (room.timeLeft <= 0) endRound(roomCode, io);
  }, 1000);
}

function handleGuess(roomCode, guess, username, io) {
  const room = rooms[roomCode];
  // ─── FIX: ignore any guesses until a word is set
  if (!room || !room.word) return { correct: false };

  const correct = guess.toLowerCase() === room.word.toLowerCase();
  if (correct) {
    const player = room.players.find(p => p.username === username);
    if (player) player.score++;

    io.to(roomCode).emit("updatePlayers", room.players);
    endRound(roomCode, io, username);
  }
  return { correct };
}

function endRound(roomCode, io, guessedBy = null) {
  const room = rooms[roomCode];
  if (!room) return;

  clearInterval(room.timer);
  room.timer = null;
  rooms[roomCode].history = [];
  io.to(roomCode).emit('clearBoard');
  io.to(roomCode).emit("systemMessage", `🔔 Round ended! The word was: ${room.word}`);
  io.to(roomCode).emit("roundEnded", { guessedBy });

  // rotate drawer
  const idx = room.players.findIndex(p => p.id === room.drawer);
  const next = (idx + 1) % room.players.length;
  room.drawer = room.players[next].id;

  io.to(roomCode).emit("systemMessage", `🔔 It's ${room.players[next].username}'s turn to draw!`);
  io.to(roomCode).emit("drawerAssigned", room.drawer);
  io.to(roomCode).emit("updatePlayers", room.players);

  // clear chosen word so next drawer must call setWord again
  room.word = null;
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  setWord,
  startRound,
  handleGuess,
  endRound,
  rooms
};
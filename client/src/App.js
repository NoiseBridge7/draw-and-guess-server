import './App.css';
import React, { useState, useEffect, useRef } from "react";
import socket from "./socket";
import DrawingBoard from "./components/DrawingBoard";
import ChatBox from "./components/ChatBox";
import Leaderboard from "./components/leaderboard";

function App() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [drawerId, setDrawerId] = useState(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hint, setHint] = useState('');
  const [wordChosen, setWordChosen] = useState(false);
  const [chosenWord, setChosenWord] = useState(""); 
  const [showRejoin, setShowRejoin] = useState(false);

  const nameRef = useRef(null);
  const roomRef = useRef(null);

  // on mount, put cursor in the name box
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // check for stored session
  useEffect(() => {
    const storedRoom = localStorage.getItem("roomCode");
    const storedUser = localStorage.getItem("username");
    if (storedRoom && storedUser) {
      setRoomCode(storedRoom);
      setUsername(storedUser);
      setShowRejoin(true);
    }
  }, []);

  // core socket & rejoin
  useEffect(() => {
    if (!joined) return;
    socket.on("connect", () => {
      // manual rejoin only
    });
    socket.on("updatePlayers", setPlayers);
    socket.on("yourWord", word => {
      if (word) { alert("🎨 Your word: " + word); setWordChosen(true); }
    });
    socket.on("drawerAssigned", id => {
      setDrawerId(id); setRoundStarted(false); setTimeLeft(null); setHint('');
      if (id === socket.id && roomCode) {
        const w = prompt("🧠 Enter a word to draw:");
        if (w?.trim()) socket.emit("setWord", { roomCode, word: w.trim() });
        else alert("Must enter a word.");
      }
    });
    socket.on("wordHint", setHint);
    socket.on("roundStarted", () => { setRoundStarted(true); setHint(''); });
    socket.on("timerTick", setTimeLeft);
    socket.on("roundEnded", ({ guessedBy }) => {
      setRoundStarted(false); setTimeLeft(null); setHint('');
      if (guessedBy) alert(`🎉 ${guessedBy} guessed!`);
      else alert("⏱️ Time's up!");
    });
    return () => {
      socket.off("connect"); socket.off("updatePlayers"); socket.off("yourWord");
      socket.off("drawerAssigned"); socket.off("wordHint"); socket.off("roundStarted");
      socket.off("timerTick"); socket.off("roundEnded");
    };
  }, [joined, roomCode, username]);

  const handleCreateRoom = () => {
    if (!username.trim()) return alert("Enter your name.");
    socket.emit("createRoom", { username }, ({ roomCode: code }) => {
      localStorage.setItem("roomCode", code);
      localStorage.setItem("username", username);
      setRoomCode(code); setJoined(true);
    });
  };

  const handleJoinRoom = () => {
    if (!username.trim()) return alert("Enter your name.");
    if (!roomCode.trim()) return alert("Enter a room code.");
    socket.emit("joinRoom", { roomCode, username }, ({ success }) => {
      if (success) {
        localStorage.setItem("roomCode", roomCode);
        localStorage.setItem("username", username);
        setJoined(true);
      } else alert("Room not found.");
    });
  };

  const handleRejoin = () => {
    if (!roomCode || !username) return;
    socket.emit("rejoin", { roomCode, username }, ({ success, state }) => {
      if (!success) return alert("Rejoin failed.");
      setPlayers(state.players);
      setDrawerId(state.drawerId);
      setRoundStarted(state.roundStarted);
      setTimeLeft(state.timeLeft);
      setHint(state.hint);
      socket.emit("drawingHistory", state.drawingHistory);
      setJoined(true);
    });
  };

  return (
      <div className="app-grid">
      <header className="header">
        <h1>Draw & Guess Game</h1>
      </header>

      {!joined ? (
        <aside className="lobby-panel">
          {/* join/create UI */}
          <input
            ref={nameRef}
            placeholder="Enter your name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                roomRef.current?.focus();
              }
            }}
          />

          <input
            placeholder="Room code (or leave blank to create)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}

            onKeyDown={e => {
              if(e.key === "Enter"){
                roomCode.trim() 
                ? handleJoinRoom() : handleCreateRoom();
              }
            }}
          />

          <button onClick={roomCode ? handleJoinRoom : handleCreateRoom}>
            {roomCode ? "Join Room" : "Create Room"}
          </button>
          {showRejoin && (
            <button onClick={handleRejoin}>🔁 Rejoin Previous Session</button>
          )}
        </aside>
      ) : (
        <>
          <aside className="leaderboard-panel">
            <Leaderboard players={players} drawerId={drawerId} />
          </aside>

          <main className="drawing-panel">
            <h3 className="room-code">Room: {roomCode}</h3>

            {drawerId === socket.id && !wordChosen && (
              <div className="word-picker">
                <h3>Enter a word to draw:</h3>
                <input
                  value={chosenWord}
                  onChange={e => setChosenWord(e.target.value)}
                  placeholder="e.g. tree"
                />
                <button
                  onClick={() => {
                    socket.emit("setWord", { roomCode, word: chosenWord });
                    setWordChosen(true);
                  }}
                  disabled={!chosenWord.trim()}
                >
                  OK
                </button>
              </div>
            )}

            {drawerId !== socket.id && hint && (
              <div className="hint">Hint: {hint}</div>
            )}

            {drawerId === socket.id && wordChosen && !roundStarted && (
              <button
                className="start-button"
                onClick={() => socket.emit("startRound", { roomCode })}
              >
                Start Round
              </button>
            )}

            <h4 className="timer">
              {roundStarted ? `⏳ ${timeLeft}s left` : "Waiting for round to start..."}
            </h4>

            <DrawingBoard roomCode={roomCode} drawerId={drawerId} />
          </main>

          <section className="chat-panel">
            <ChatBox
              roomCode={roomCode}
              username={username}
              drawerId={drawerId}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default App;

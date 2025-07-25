import React, {useState, useEffect} from "react";
import socket from "../socket";

function ChatBox({ roomCode, username, drawerId }) {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    socket.on('chatMessage', (msg) =>
      setHistory((h) => [...h, `${msg.username}: ${msg.message}`])
    );
    socket.on('correctGuess', ({ username }) =>
      setHistory((h) => [...h, `🎉 ${username} got it!`])
    );
    socket.on('systemMessage', (text) =>
      setHistory((h) => [...h, text])
    );
    return () => {
      socket.off('chatMessage');
      socket.off('correctGuess');
      socket.off('systemMessage');
    };
  }, []);

  const isDrawer = socket.id === drawerId;

  const send = () => {
    if (!message.trim()) return;
    socket.emit('sendGuess', { roomCode, guess: message.trim(), username });
    setMessage('');
  };

  return (
    <div>
      <div style={{ height: 200, overflowY: 'auto', border: '1px solid #ccc' }}>
        {history.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>

      {/* hide or disable input for the drawer: */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={e => {
          if(e.key === "Enter" && !isDrawer){
            send();
          }
        }}
        disabled={isDrawer}
        placeholder={isDrawer ? "Drawer can't guess" : 'Type your guess...'}
      />
      <button onClick={send} disabled={isDrawer}>
        Send
      </button>
    </div>
  );
}

export default ChatBox;
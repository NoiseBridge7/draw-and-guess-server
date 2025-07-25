import React, { useRef, useEffect, useState } from "react";
import socket from "../socket";

function DrawingBoard({ roomCode, drawerId }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set initial drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawFromSocket = (data) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    };

    const clearHandler = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    socket.on("drawing", drawFromSocket);
    socket.on('drawingHistory', history => {
    history.forEach(cmd => drawFromSocket(cmd));
    });
    
    socket.on('clearBoard', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("drawing", drawFromSocket);
      socket.off('drawingHistory');
      socket.off('clearBoard');
    };
  }, [roomCode, drawerId]);

  const handleMouseDown = (e) => {
    if (socket.id !== drawerId) return;

    isDrawing.current = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || socket.id !== drawerId) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const newX = e.nativeEvent.offsetX;
    const newY = e.nativeEvent.offsetY;

    const prev = isDrawing.current;

    // Determine current stroke style
    const drawColor = eraser ? '#FFFFFF' : color; 

    socket.emit("drawing", {
      roomCode,
      prevX: prev.x,
      prevY: prev.y,
      x: newX,
      y: newY,
      color: drawColor,
      lineWidth: lineWidth,
    });

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(newX, newY);
    ctx.stroke();

    isDrawing.current = { x: newX, y: newY };
  };

  const handleMouseUp = () => {
    if (socket.id !== drawerId) return;
    isDrawing.current = false;
  };

  // CHANGED: clear button handler
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearBoard', { roomCode });
  };

  return (
    <div>
      <div style={{display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center'}}>
        <label>
          Color:
          <input type = "color" value={color} onChange={(e) => { setColor(e.target.value); setEraser(false);}}/>
        </label>

        <label>
          Size :
          <input
            type="range"
            min={1}
            max={20}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          />
        </label>

        <button onClick={() => setEraser(!eraser)}>
          {eraser ? 'Pen' : 'Eraser'}
        </button>

        {socket.id === drawerId && (
          <>
          <button onClick={handleClear}>Clear</button>
          <button onClick={() => socket.emit('undo', { roomCode })}>
            Undo
          </button>
          </>
        )}

      </div>

    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{
        border: "2px solid #D4B483",
        marginTop: 20,
        cursor: socket.id === drawerId ? "crosshair" : "not-allowed", // 👈 visual cue
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
    </div>
  );
}

export default DrawingBoard;

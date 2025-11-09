// server/server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const RoomManager = require('./rooms');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const ROOM_MANAGER = new RoomManager();
const DRAWING_STATE = new DrawingState();

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id);

  let currentRoom = null;
  let user = { id: socket.id, color: null, name: null };

  // Client joins a room
  socket.on('join', ({ roomId, name }) => {
    currentRoom = ROOM_MANAGER.ensureRoom(roomId || 'main');
    user.name = name || `User-${socket.id.slice(0, 4)}`;
    user.color = currentRoom.assignColor(user.id);
    socket.join(currentRoom.id);

    const opLogSnapshot = DRAWING_STATE.getRoomOps(currentRoom.id);
    io.to(socket.id).emit('init', {
      roomId: currentRoom.id,
      userId: user.id,
      color: user.color,
      name: user.name,
      opLog: opLogSnapshot,
      users: ROOM_MANAGER.getUsers(currentRoom.id)
    });

    ROOM_MANAGER.addUser(currentRoom.id, user);
    io.in(currentRoom.id).emit('users:update', ROOM_MANAGER.getUsers(currentRoom.id));
  });

  // Stroke start
  socket.on('stroke:start', (payload) => {
    console.log(`🎨 Stroke start from ${socket.id} in room ${currentRoom?.id}`);
    const op = DRAWING_STATE.createOp(currentRoom.id, {
      type: 'stroke',
      userId: user.id,
      color: payload.color,
      width: payload.width,
      points: [payload.startPoint],
      tempId: payload.tempId,
      visible: true,
      timestamp: Date.now()
    });

    socket.emit('op:ack', { tempId: payload.tempId, opId: op.id, seq: op.seq });
    socket.to(currentRoom.id).emit('stroke:remoteStart', { op });
  });

  // Stroke update
  socket.on('stroke:update', (payload) => {
    const op = DRAWING_STATE.appendPoints(currentRoom.id, payload.opId, payload.points);
    if (!op) return;
    socket.to(currentRoom.id).emit('stroke:remoteUpdate', {
      opId: payload.opId,
      points: payload.points,
      seq: op.seq
    });
  });

  // Stroke end
  socket.on('stroke:end', (payload) => {
    const op = DRAWING_STATE.finalizeOp(currentRoom.id, payload.opId);
    io.in(currentRoom.id).emit('stroke:remoteEnd', { op });
  });

  // Cursor movement
// Cursor movement
socket.on('cursor:move', ({ x, y }) => {
  socket.to(currentRoom.id).emit('cursor:update', {
    userId: user.id,
    x,
    y,
    name: user.name,
    color: user.color
  });
});


  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
    if (currentRoom) {
      ROOM_MANAGER.removeUser(currentRoom.id, user.id);
      io.in(currentRoom.id).emit('users:update', ROOM_MANAGER.getUsers(currentRoom.id));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

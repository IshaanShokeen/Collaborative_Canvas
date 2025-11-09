// client/websocket.js
const SocketClient = (() => {
  const socket = io();

  socket.on("connect", () => {
    console.log("✅ Connected:", socket.id);
  });

  function join(roomId, name) {
    socket.emit("join", { roomId, name });
  }

  function on(ev, cb) {
    socket.on(ev, cb);
  }

  function emit(ev, payload) {
    socket.emit(ev, payload);
  }

  return { join, on, emit, socket };
})();

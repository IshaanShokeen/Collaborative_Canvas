// server/rooms.js
class Room {
  constructor(id) {
    this.id = id;
    this.users = {}; // userId -> {id, name, color}
    this.colorPool = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#6d4c41','#43a047','#fdd835'];
    this.nextColorIdx = 0;
  }
  assignColor(userId) {
    const color = this.colorPool[(this.nextColorIdx++) % this.colorPool.length];
    return color;
  }
}

class RoomManager {
  constructor() {
    this.rooms = {};
  }
  ensureRoom(id) {
    if (!this.rooms[id]) this.rooms[id] = new Room(id);
    return this.rooms[id];
  }
  addUser(roomId, user) {
    this.ensureRoom(roomId).users[user.id] = { id: user.id, name: user.name, color: user.color };
  }
  removeUser(roomId, userId) {
    const r = this.rooms[roomId];
    if (!r) return;
    delete r.users[userId];
  }
  getUsers(roomId) {
    const r = this.rooms[roomId];
    if (!r) return [];
    return Object.values(r.users);
  }
}

module.exports = RoomManager;

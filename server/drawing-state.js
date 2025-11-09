// server/drawing-state.js
const { v4: uuidv4 } = require('uuid');

class DrawingState {
  constructor() {
    this.rooms = {}; // roomId -> { opLog: [ops], seqCounter: n, opIndex: {opId:op} }
  }

  ensure(roomId) {
    if (!this.rooms[roomId]) {
      this.rooms[roomId] = { opLog: [], seqCounter: 0, opIndex: {} };
    }
    return this.rooms[roomId];
  }

  nextSeq(roomId) {
    const r = this.ensure(roomId);
    return ++r.seqCounter;
  }

  createOp(roomId, opData) {
    const r = this.ensure(roomId);
    const op = {
      id: uuidv4(),
      seq: this.nextSeq(roomId),
      type: opData.type, // 'stroke' etc
      userId: opData.userId,
      color: opData.color,
      width: opData.width,
      points: opData.points || [],
      visible: opData.visible !== false,
      timestamp: opData.timestamp || Date.now(),
      tempId: opData.tempId || null
    };
    r.opLog.push(op);
    r.opIndex[op.id] = op;
    return op;
  }

  appendPoints(roomId, opId, points) {
    const r = this.ensure(roomId);
    const op = r.opIndex[opId];
    if (!op) return null;
    op.points.push(...points);
    op.seq = this.nextSeq(roomId);
    return op;
  }

  finalizeOp(roomId, opId) {
    const r = this.ensure(roomId);
    const op = r.opIndex[opId];
    if (!op) return null;
    op.finalized = true;
    op.seq = this.nextSeq(roomId);
    return op;
  }

  toggleVisibility(roomId, opId, visible, byUserId) {
    const r = this.ensure(roomId);
    const target = r.opIndex[opId];
    if (!target) return null;
    target.visible = visible;
    // record a metadata op to make the sequence clear (optional)
    const meta = {
      id: uuidv4(),
      seq: this.nextSeq(roomId),
      type: visible ? 'meta:redo' : 'meta:undo',
      targetOpId: opId,
      by: byUserId,
      timestamp: Date.now()
    };
    r.opLog.push(meta);
    return meta;
  }

  getRoomOps(roomId) {
    const r = this.ensure(roomId);
    // return shallow copy so clients get op content in sequence order
    return r.opLog.slice();
  }
}

module.exports = DrawingState;

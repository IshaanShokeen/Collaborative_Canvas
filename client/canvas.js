// client/canvas.js
const CanvasApp = (() => {
  const canvas = document.getElementById("canvas");
  const cursorsContainer = document.getElementById("cursors");
  const ctx = canvas.getContext("2d");

  let userId = null;
  let roomId = "main";
  let color = "#3949ab";
  let width = 4;
  let tool = "brush";
  let currentOp = null;
  const opIndex = {};

  const remoteCursors = {};

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


  window.addEventListener("resize", resize);

  function drawStroke(op) {
   if (!op || !op.points || op.points.length < 1) return;

    ctx.strokeStyle = op.color;
    ctx.lineWidth = op.width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(op.points[0].x, op.points[0].y);

    for (let i = 1; i < op.points.length; i++) {
      ctx.lineTo(op.points[i].x, op.points[i].y);
    }

    ctx.stroke();
  }


  function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Object.values(opIndex)
      .filter(o => o.visible)
      .sort((a,b) => (a.seq||0)-(b.seq||0))
      .forEach(drawStroke);
  }

  function beginStroke(point, clr, w, t) {
    const tempId = "temp-" + Math.random().toString(36).slice(2, 9);
    const localOp = {
      id: null,
      tempId,
      color: t === "eraser" ? "#fff" : clr,
      width: t === "eraser" ? w * 2 : w,
      points: [point],
      visible: true
    };
    currentOp = localOp;
    drawStroke(localOp); // ✅ Draw instantly when you start
    SocketClient.emit("stroke:start", {
      tempId,
      startPoint: point,
      color: localOp.color,
      width: localOp.width,
      roomId: "main"
    });
  }



  function updateStroke(points) {
    if (!currentOp) return;
    currentOp.points.push(...points);
    drawStroke(currentOp); // ✅ Redraw on every update
    SocketClient.emit("stroke:update", {
      opId: currentOp.id || currentOp.tempId,
      points,
      roomId: "main"
    });
}


  function endStroke() {
    if (!currentOp) return;
    SocketClient.emit("stroke:end", {
      opId: currentOp.id || currentOp.tempId,
      roomId
    });
    currentOp = null;
  }

  // Remote ops
  function applyRemoteStart({ op }) {
    opIndex[op.id] = op;
    drawStroke(op);
  }

  function applyRemoteUpdate({ opId, points }) {
    const op = opIndex[opId];
    if (!op) return;
    op.points.push(...points);
    drawStroke(op);
  }

  function applyRemoteEnd({ op }) {
    opIndex[op.id] = op;
    redrawAll();
  }

  function onOpAck({ tempId, opId }) {
    if (currentOp && currentOp.tempId === tempId) {
      currentOp.id = opId;
      opIndex[opId] = currentOp;
    }
  }

function updateCursor(userId, x, y, name, color) {
  let c = remoteCursors[userId];
  if (!c) {
    const el = document.createElement("div");
    el.className = "cursor";
    el.style.color = color || "#2196f3";
    el.title = name || userId.slice(0, 4);
    cursorsContainer.appendChild(el);
    remoteCursors[userId] = c = { el };
  }

  c.el.style.left = x + "px";
  c.el.style.top = y + "px";
  c.el.style.color = color || "#2196f3";
}


  return {
    resize,
    beginStroke,
    updateStroke,
    endStroke,
    applyRemoteStart,
    applyRemoteUpdate,
    applyRemoteEnd,
    onOpAck,
    updateCursor
  };
})();

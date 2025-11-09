// client/main.js
const toolSelect = document.getElementById("tool");
const widthInput = document.getElementById("width");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const usersContainer = document.getElementById("users");
const canvasEl = document.getElementById("canvas");

// 🎨 Color Palette Setup
const swatches = document.querySelectorAll(".color-swatch");
const moreBtn = document.getElementById("moreColors");
const colorPopup = document.getElementById("colorPopup");
const popupColorPicker = document.getElementById("popupColorPicker");
const popupHex = document.getElementById("popupHex");
const applyColorBtn = document.getElementById("applyColor");
const closePopup = document.getElementById("closePopup");

let currentColor = "#3949ab"; // Default brush color

// Highlight active color
function updateActiveSwatch(activeEl) {
  swatches.forEach((s) => s.classList.remove("active"));
  if (activeEl) activeEl.classList.add("active");
}

// Swatch click handler
swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const color = swatch.dataset.color;
    currentColor = color;
    updateActiveSwatch(swatch);
  });
});

// === Popup color picker logic ===
moreBtn.addEventListener("click", () => {
  colorPopup.classList.remove("hidden");
  popupColorPicker.value = currentColor;
  popupHex.value = currentColor;
});

// Close popup button
closePopup.addEventListener("click", () => closeColorPopup());

// Close popup when clicking outside content
colorPopup.addEventListener("click", (e) => {
  if (e.target === colorPopup) {
    closeColorPopup();
  }
});

// Close popup with ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !colorPopup.classList.contains("hidden")) {
    closeColorPopup();
  }
});

// Function to smoothly close popup
function closeColorPopup() {
  colorPopup.classList.add("fade-out");
  setTimeout(() => {
    colorPopup.classList.add("hidden");
    colorPopup.classList.remove("fade-out");
  }, 200);
}

// Sync color picker with hex input
popupColorPicker.addEventListener("input", (e) => {
  const color = e.target.value;
  popupHex.value = color;
});

popupHex.addEventListener("input", (e) => {
  let val = e.target.value;
  if (!val.startsWith("#")) val = "#" + val;
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    popupColorPicker.value = val;
  }
});

// Apply chosen color
applyColorBtn.addEventListener("click", () => {
  currentColor = popupColorPicker.value;
  updateActiveSwatch(null);
  closeColorPopup();
});

let isDrawing = false;
let pendingPoints = [];

// Prevent default touch behaviors (scroll, zoom)
canvasEl.style.touchAction = "none";
document.body.style.overscrollBehavior = "none";

function setup() {
  const name = prompt("Enter your name (optional):") || "User";
  SocketClient.join("main", name);

  SocketClient.on("init", (payload) => {
    CanvasApp.resize();
    console.log("Room joined:", payload.roomId);
  });

  SocketClient.on("op:ack", (payload) => CanvasApp.onOpAck(payload));
  SocketClient.on("stroke:remoteStart", (p) => CanvasApp.applyRemoteStart(p));
  SocketClient.on("stroke:remoteUpdate", (p) => CanvasApp.applyRemoteUpdate(p));
  SocketClient.on("stroke:remoteEnd", (p) => CanvasApp.applyRemoteEnd(p));

  // Real-time cursor sync
  SocketClient.on("cursor:update", ({ userId, x, y, name, color }) => {
    CanvasApp.updateCursor(userId, x, y, name, color);
  });

  // ✅ Handle user list updates
  SocketClient.on("users:update", (users) => {
    const userList = document.getElementById("userList");
    if (!userList) return;
    userList.innerHTML = "";

    if (!users.length) {
      userList.textContent = "(0)";
      return;
    }

    const frag = document.createDocumentFragment();

    users.forEach((u) => {
      const pill = document.createElement("span");
      pill.className = "user-pill";

      const dot = document.createElement("span");
      dot.className = "user-dot";
      dot.style.background = u.color;

      const name = document.createElement("span");
      name.textContent = u.name || u.id.slice(0, 4);

      pill.append(dot, name);
      frag.appendChild(pill);
    });

    userList.appendChild(frag);
  });

  // ===== Canvas Drawing (Mouse + Touch + Pen) =====
  canvasEl.addEventListener("pointerdown", (e) => {
    if (["mouse", "touch", "pen"].includes(e.pointerType)) {
      e.preventDefault();
      isDrawing = true;

      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pt = { x, y, pressure: e.pressure || 0.5 };
      CanvasApp.beginStroke(pt, currentColor, +widthInput.value, toolSelect.value);

      pendingPoints = [];
      canvasEl.setPointerCapture(e.pointerId);
    }
  });

  canvasEl.addEventListener("pointermove", (e) => {
    if (["mouse", "touch", "pen"].includes(e.pointerType)) {
      e.preventDefault();

      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      SocketClient.emit("cursor:move", { x, y });

      if (!isDrawing) return;

      const pt = { x, y, pressure: e.pressure || 0.5 };
      pendingPoints.push(pt);
      if (pendingPoints.length >= 3) {
        CanvasApp.updateStroke(pendingPoints.splice(0));
      }
    }
  });

  canvasEl.addEventListener("pointerup", (e) => {
    if (["mouse", "touch", "pen"].includes(e.pointerType)) {
      e.preventDefault();

      if (!isDrawing) return;
      isDrawing = false;

      if (pendingPoints.length) CanvasApp.updateStroke(pendingPoints.splice(0));
      CanvasApp.endStroke();
      canvasEl.releasePointerCapture(e.pointerId);
    }
  });

  canvasEl.addEventListener("pointercancel", () => {
    if (isDrawing) {
      isDrawing = false;
      pendingPoints = [];
      CanvasApp.endStroke();
    }
  });
}

document.addEventListener("DOMContentLoaded", setup);

import "./style.css";

const canvas = document.createElement("canvas");
const traceCanvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const traceCtx = traceCanvas.getContext("2d");
document.body.appendChild(traceCanvas);
document.body.appendChild(canvas);

Object.assign(traceCanvas.style, {
  position: "absolute",
  top: "0",
  left: "0",
});
canvas.style.zIndex = "2";

function resizeCanvas() {
  [canvas, traceCanvas].forEach((c) => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
}
resizeCanvas();

const params = {
  color: "rgba(201, 0, 121, 0)",
  size: 500,
  divisions: 2,
  multiplier: 475,
  segments: 8,
};

let lines = [];
let animatedBalls = [];
let pulses = [];

// ----------------------------------------------------SON OSCILLARTEUR-------------------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const freqs = [85, 95, 120, 140, 160, 190, 210, 240, 245, 270, 300];

function playSound(index = 0) {
  const now = audioCtx.currentTime;
  const freq = freqs[index % freqs.length];

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  [osc1, osc2].forEach((osc, i) => {
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(i === 0 ? freq : freq * 2, now);
  });

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(440, now);
  filter.Q.setValueAtTime(3, now);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(filter);
  filter.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.5);
  osc2.stop(now + 1.5);
}
// ------------------------------FIN----------------------SON OSCILLARTEUR-------------------------------------------------
//-----------------------------------------------------FORMULE MATH CERCLE MODDULO-------------------------------------------------
function generatePoints() {
  const points = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const r = params.size;

  for (let i = 0; i < params.divisions; i++) {
    const angle = (i / params.divisions) * 2 * Math.PI;
    points.push({
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    });
  }
  return points;
}
// -----------------------------------------------------FIN FORMULE MATH CERCLE MODDULO-------------------------------------------------
// -----------------------------------------------------PULSES-------------------------------------------------
function drawPulses(ctx) {
  const now = performance.now();
  const duration = 700;

  pulses = pulses.filter((p) => {
    const elapsed = now - p.start;
    if (elapsed < duration) {
      const progress = elapsed / duration;
      const radius = 10 + progress * 40;
      const alpha = 1 - progress;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      return true;
    }
    return false;
  });
}
// -----------------------------------------------------FIN PULSES-------------------------------------------------
// -----------------------------------------------------LINES-----BALLES--------------------------------------------
function updateLines() {
  const points = generatePoints();
  lines = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = 1; j <= params.segments; j++) {
      const target = (i * j * params.multiplier) % points.length;
      lines.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[target].x,
        y2: points[target].y,
        selected: false,
      });
    }
  }

  animatedBalls.forEach((ball) => {
    const { x, y } = ball.getCurrentPosition();
    const closestLine = lines.reduce((closest, line) => {
      const midX = (line.x1 + line.x2) / 2;
      const midY = (line.y1 + line.y2) / 2;
      const dist = Math.hypot(x - midX, y - midY);
      if (!closest || dist < closest.dist) {
        return { line, dist };
      }
      return closest;
    }, null);

    if (closestLine) {
      ball.line = closestLine.line;
    }
  });
}
// -----------------------------------------------------FIN LINES-----BALLES--------------------------------------------
//zones couleur écran divisé en 4
function getZoneColor(x, y) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  if (x < centerX && y < centerY) return "#0091f7";
  if (x >= centerX && y < centerY) return "#ffac00";
  if (x < centerX && y >= centerY) return "#7cd18b";
  return "#ffe300";
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const distFromCenter = Math.hypot(mouseX - centerX, mouseY - centerY);

  if (distFromCenter > params.size) {
    if (animatedBalls.length > 0) {
      lines = [];
      animatedBalls = [];
    }
  }

  // Dessin du cercle et des lignes si on est dans la zone
  if (distFromCenter <= params.size) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, params.size, 0, 1 * Math.PI);
    ctx.strokeStyle = params.color;
    ctx.lineWidth = 0.1;
    ctx.stroke();

    let hoverColor = getZoneColor(mouseX, mouseY);
    const time = performance.now();

    lines.forEach((line) => {
      const isHover = isMouseNearLine(mouseX, mouseY, line);
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.strokeStyle = isHover ? hoverColor : params.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      const pulse = 5 + Math.sin(time / 150) * 4;
      [
        [line.x1, line.y1],
        [line.x2, line.y2],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? hoverColor : params.color;
        ctx.fill();
      });
    });
  }
  //-----------------------------------------------------CERCLE-------------------------------------------------
  ctx.beginPath();
  ctx.arc(centerX, centerY, params.size, 0, 2 * Math.PI);
  ctx.strokeStyle = params.color;
  ctx.lineWidth = 0.1;
  ctx.stroke();

  let hoverColor = getZoneColor(mouseX, mouseY);
  const time = performance.now();

  lines.forEach((line) => {
    const isHover = isMouseNearLine(mouseX, mouseY, line);
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.strokeStyle = isHover ? hoverColor : params.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    const pulse = 10 + Math.sin(time / 150) * 4;
    [
      [line.x1, line.y1],
      [line.x2, line.y2],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? hoverColor : params.color;
      ctx.fill();
    });
  });

  animatedBalls.forEach((ball) => {
    ball.update(centerX, centerY);
    ball.drawTrace(traceCtx);
  });

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

canvas.addEventListener("click", (e) => {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let closest = null;
  let minDist = Infinity;
  lines.forEach((line) => {
    const midX = (line.x1 + line.x2) / 2;
    const midY = (line.y1 + line.y2) / 2;
    const dist = Math.hypot(x - midX, y - midY);
    if (dist < minDist) {
      closest = line;
      minDist = dist;
    }
  });
  if (closest) {
    const color = getZoneColor(x, y);
    animatedBalls.push(new Ball(closest, color));
  }
  canvas.style.cursor = hovering ? "pointer" : "default";
});

let mouseX = 0;
let mouseY = 0;
let hovering = false;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  const cols = 2;
  const rows = 2;
  const col = Math.floor(mouseX / (canvas.width / cols));
  const row = Math.floor(mouseY / (canvas.height / rows));

  const multipliers = [475, 301, 150, 475];
  const divisionsList = [37, 97, 75, 60];
  const newMultiplier = multipliers[col];
  const newDivisions = divisionsList[row];

  if (
    params.multiplier !== newMultiplier ||
    params.divisions !== newDivisions
  ) {
    params.multiplier = newMultiplier;
    params.divisions = newDivisions;
    updateLines();
  }

  hovering = lines.some((line) => isMouseNearLine(mouseX, mouseY, line));
  canvas.style.cursor = hovering ? "pointer" : "default";
});

function isMouseNearLine(x, y, line) {
  const { x1, y1, x2, y2 } = line;
  const A = x - x1,
    B = y - y1,
    C = x2 - x1,
    D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;
  let px = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C;
  let py = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D;
  const dx = x - px,
    dy = y - py;
  return Math.sqrt(dx * dx + dy * dy) < 10;
}

class Ball {
  constructor(line, color) {
    this.line = line;
    this.pos = 0;
    this.dir = 1;
    this.traces = [];
    this.lastZone = null;
    this.speed = 0.025;
    this.color = color;
  }
  getCurrentPosition() {
    const x = this.line.x1 + (this.line.x2 - this.line.x1) * this.pos;
    const y = this.line.y1 + (this.line.y2 - this.line.y1) * this.pos;
    return { x, y };
  }

  update(centerX, centerY) {
    this.pos += this.speed * this.dir;
    const { x, y } = this.getCurrentPosition();
    this.traces.push({ x, y, time: performance.now(), color: this.color });
    const dist = Math.hypot(x - centerX, y - centerY);
    if (Math.abs(dist - params.size) < 1) {
      pulses.push({ x, y, start: performance.now() });
      const angle = Math.atan2(y - centerY, x - centerX);
      const index = Math.floor(
        ((angle + Math.PI) / (2 * Math.PI)) * freqs.length
      );
      if (index !== this.lastZone) {
        playSound(index);
        this.lastZone = index;
      }
    }
    if (this.pos > 1 || this.pos < 0) {
      const atEnd = this.pos > 1;
      const currX = atEnd ? this.line.x2 : this.line.x1;
      const currY = atEnd ? this.line.y2 : this.line.y1;
      const newLine = lines.find(
        (l) =>
          l !== this.line &&
          ((l.x1 === currX && l.y1 === currY) ||
            (l.x2 === currX && l.y2 === currY))
      );
      if (newLine) {
        this.line = newLine;
        this.dir = newLine.x1 === currX && newLine.y1 === currY ? 1 : -1;
        this.pos = this.dir === 1 ? 0 : 1;
      } else {
        this.pos = atEnd ? 1 : 0;
      }
    }
  }

  drawTrace(ctx) {
    const now = performance.now();
    const fade = 4000;
    this.traces = this.traces.filter((p) => {
      const age = now - p.time;
      if (age < fade) {
        const alpha = 1 - age / fade;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.fill();
        return true;
      }
      return false;
    });
  }
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

updateLines();
function animate() {
  requestAnimationFrame(animate);
  traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
  drawScene();
  drawPulses(ctx);
}
animate();

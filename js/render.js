import { FIELD, LANE_CX, RAIL_Y, VIEW, aimFor, railPoint } from "./sim.js";

const JP = '"Zen Maru Gothic", "WenQuanYi Micro Hei", "Droid Sans Fallback", "Yu Gothic", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function pocketColor(p) {
  if (p.type === "rensho") return "#9b4dff";
  if (p.type === "yakumono") return "#ff4d6d";
  if (p.type === "big") return "#ffb703";
  if (p.payout >= 8) return "#ff7a3c";
  return "#3ecf8e";
}

function drawPins(ctx, pins) {
  for (const pin of pins) {
    ctx.fillStyle = "#8a6230";
    ctx.beginPath();
    ctx.ellipse(pin.x + 1, pin.y + 2, pin.r, pin.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0d78a";
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,240,0.85)";
    ctx.beginPath();
    ctx.arc(pin.x - 1.3, pin.y - 1.5, pin.r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPocket(ctx, p, state, time) {
  const hot = p.id === state.hotId;
  const color = pocketColor(p);
  if (p.type === "chucker") {
    const glow = state.chuckerFlash > 0 ? 0.85 : 0.35 + Math.sin(time * 5) * 0.1;
    ctx.save();
    ctx.strokeStyle = `rgba(120, 230, 255, ${glow})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#7ef0ff";
    ctx.shadowBlur = 12;
    roundRect(ctx, p.x - 28, p.y - 14, 56, 28, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(180, 250, 255, 0.18)";
    roundRect(ctx, p.x - 28, p.y - 14, 56, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#08323a";
    ctx.font = `700 16px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", p.x, p.y + 1);
    ctx.restore();
    return;
  }

  if (hot) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 70, 30, ${0.55 + Math.sin(time * 6) * 0.4})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 8 + Math.sin(time * 6) * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff4d2a";
    ctx.font = `700 12px ${JP}`;
    ctx.textAlign = "center";
    ctx.fillText("熱", p.x, p.y - p.r - 8);
    ctx.restore();
  }

  if (p.type === "yakumono") {
    const open = p.openAnim || 0;
    ctx.save();
    if (open < 0.45) {
      ctx.fillStyle = "#9e2340";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffd0dc";
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        ctx.fillStyle = i % 2 ? "#ff5d7a" : "#c4314a";
        ctx.beginPath();
        ctx.ellipse(p.x + Math.cos(ang) * 3, p.y + Math.sin(ang) * 3, 7, 11, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff6f8";
      ctx.font = `700 13px ${JP}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("15", p.x, p.y + 1);
      ctx.restore();
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      const ang = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      const spread = 6 + open * (p.r + 10);
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.ellipse(p.x + Math.cos(ang) * spread, p.y + Math.sin(ang) * spread, 8, 13, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + p.r * 0.15, p.r * 0.92, p.r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(p.x - 2, p.y - 3, 2, p.x, p.y, p.r);
  g.addColorStop(0, "#4a3428");
  g.addColorStop(0.7, "#140e0b");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = p.type === "big" ? 4 : 3;
  ctx.strokeStyle = p.flash > 0 ? "#fff4c2" : color;
  ctx.shadowColor = color;
  ctx.shadowBlur = p.flash > 0 ? 18 : 6;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff6d8";
  ctx.font = `700 ${p.type === "big" ? 16 : 13}px ${JP}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.label, p.x, p.y + 0.5);
  if (p.held) {
    drawBall(ctx, p.x, p.y, 7, "glass", 1);
  }
  ctx.restore();
}

function drawBall(ctx, x, y, r, type, alpha, glint = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(40,20,10,0.32)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.78, r * 0.82, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
  if (type === "iron") {
    g.addColorStop(0, "#f7f9fc");
    g.addColorStop(0.42, "#a8b3c2");
    g.addColorStop(1, "#3a4450");
  } else {
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.38, "#d9f4ff");
    g.addColorStop(0.78, "#7eb4d4");
    g.addColorStop(1, "#3f7494");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28 + glint, y - r * 0.32, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  if (type !== "iron") {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, 0.4, 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBumper(ctx, b, time) {
  const flash = b.flash > 0;
  ctx.save();
  ctx.fillStyle = flash ? "#fff1a8" : "#ff4f7a";
  ctx.shadowColor = flash ? "#ffe56a" : "#ff4f7a";
  ctx.shadowBlur = flash ? 22 : 10;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * (0.62 + Math.sin(time * 4 + b.x) * 0.04), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 11px ${JP}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", b.x, b.y + 0.5);
  ctx.restore();
}

function drawGuide(ctx, state) {
  if (state.guide === false || state.powerPreview < 0.12) return;
  const aim = aimFor(state.powerPreview);
  ctx.save();
  ctx.strokeStyle = "rgba(255, 214, 90, 0.85)";
  ctx.fillStyle = "rgba(255, 196, 60, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(aim.x, RAIL_Y);
  ctx.lineTo(aim.x - 26, FIELD.t + 70);
  ctx.lineTo(aim.x + 26, FIELD.t + 70);
  ctx.closePath();
  ctx.fill();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(aim.x, RAIL_Y);
  ctx.lineTo(aim.x, FIELD.t + 120);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLane(ctx, state) {
  ctx.save();
  roundRect(ctx, 534, 78, 112, 760, 16);
  ctx.fillStyle = "#2a140e";
  ctx.fill();
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 3;
  ctx.stroke();

  const pull = state.powerPreview || 0;
  const gaugeH = 210;
  const gaugeY = 150;
  ctx.fillStyle = "#f0d7b0";
  ctx.font = `700 12px ${JP}`;
  ctx.textAlign = "center";
  ctx.fillText("強", 554, gaugeY - 6);
  ctx.fillText("弱", 554, gaugeY + gaugeH + 14);
  roundRect(ctx, 546, gaugeY, 16, gaugeH, 8);
  ctx.fillStyle = "#1a0c08";
  ctx.fill();
  ctx.strokeStyle = "#e6c36a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = pull > 0.85 ? "#ff4d4d" : pull > 0.45 ? "#ffb703" : "#7dffa8";
  const fill = gaugeH * pull;
  roundRect(ctx, 548, gaugeY + gaugeH - fill, 12, Math.max(0, fill), 6);
  ctx.fill();
  if (state.lastPower) {
    const y = gaugeY + gaugeH - gaugeH * state.lastPower;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(546, y);
    ctx.lineTo(564, y);
    ctx.stroke();
  }

  const knobY = 790 + pull * 64;
  const springTop = 700 + pull * 64;
  ctx.strokeStyle = "#d7d7df";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const coils = 8;
  for (let i = 0; i <= coils * 2; i += 1) {
    const t = i / (coils * 2);
    const y = springTop + (knobY - 28 - springTop) * t;
    const x = i === 0 || i === coils * 2 ? LANE_CX : LANE_CX + (i % 2 === 0 ? -12 : 12);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = "#c81e1e";
  ctx.strokeStyle = "#ffd0d0";
  ctx.lineWidth = 2;
  roundRect(ctx, LANE_CX - 26, knobY - 18, 52, 44, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 14px ${JP}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("引く", LANE_CX, knobY + 4);

  const resting = state.phase === "ready" || state.phase === "attract";
  if (resting) {
    const specR = state.ballType === "iron" ? 10 : 9;
    drawBall(ctx, LANE_CX, springTop - specR, specR, state.ballType, state.phase === "attract" ? 0.45 : 1);
  }
  ctx.restore();
}

function drawRail(ctx, time) {
  ctx.save();
  ctx.strokeStyle = "#b8893d";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(48, RAIL_Y);
  ctx.lineTo(LANE_CX, RAIL_Y);
  ctx.stroke();
  ctx.strokeStyle = "#ffe7a8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, RAIL_Y - 3);
  ctx.lineTo(LANE_CX, RAIL_Y - 3);
  ctx.stroke();
  for (let i = 0; i < 14; i += 1) {
    const x = 70 + i * 36;
    const on = Math.floor(time * 8 + i) % 4 === 0;
    ctx.fillStyle = on ? "#fff1b0" : "#8c5a22";
    ctx.beginPath();
    ctx.arc(x, RAIL_Y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const HOPPER = { w: 640, h: 220 };
export const GAZE = { w: 900, h: 540 };

function packRows(count, width, r) {
  const cols = Math.max(1, Math.floor((width - 8) / (r * 2)));
  const rows = [];
  let left = count;
  let row = 0;
  while (left > 0 && row < 48) {
    const capacity = row % 2 ? Math.max(1, cols - 1) : cols;
    const n = Math.min(capacity, left);
    rows.push(n);
    left -= n;
    row += 1;
  }
  return { rows, hidden: left };
}

function chooseRadius(count, width, height, maxR) {
  if (count <= 0) return maxR;
  let r = maxR;
  for (let i = 0; i < 10; i += 1) {
    const { rows, hidden } = packRows(count, width, r);
    const need = rows.length * r * 1.68 + r * 1.4;
    if (hidden === 0 && need <= height) return r;
    r *= 0.84;
  }
  return Math.max(3.6, r);
}

function pileBalls(count, rect, r) {
  const { rows, hidden } = packRows(count, rect.w - 18, r);
  const balls = [];
  const floor = rect.y + rect.h - 14;
  let idx = 0;
  for (let row = 0; row < rows.length; row += 1) {
    const n = rows[row];
    const y = floor - r - row * r * 1.68;
    const span = n * r * 2;
    const start = rect.x + (rect.w - span) / 2 + r;
    for (let i = 0; i < n; i += 1) {
      const wobble = Math.sin(idx * 12.989) * r * 0.07;
      balls.push({ x: start + i * r * 2 + wobble, y, r, idx });
      idx += 1;
    }
  }
  return { balls, hidden };
}

function drawWood(ctx, rect, radius) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, "#a56b3c");
  g.addColorStop(0.2, "#6b3a1e");
  g.addColorStop(1, "#3a1c10");
  ctx.fillStyle = g;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fill();
  ctx.strokeStyle = "#e6c27a";
  ctx.lineWidth = 3;
  roundRect(ctx, rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3, radius - 1);
  ctx.stroke();
}

function drawBowlInterior(ctx, rect) {
  const inset = 10;
  const x = rect.x + inset;
  const y = rect.y + 28;
  const w = rect.w - inset * 2;
  const h = rect.h - 38;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#2a140e");
  g.addColorStop(0.55, "#140a08");
  g.addColorStop(1, "#3a2216");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 214, 150, 0.28)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  return { x, y, w, h };
}

function columnTarget(count) {
  if (count <= 1) return 1;
  if (count <= 6) return count;
  if (count <= 28) return 6;
  if (count <= 70) return 9;
  if (count <= 160) return 12;
  return 16;
}

function drawPile(ctx, interior, count, type, time, fallN, fallAge, tiltX, tiltY, maxR, close) {
  if (count <= 0) {
    ctx.fillStyle = "rgba(255, 220, 170, 0.55)";
    ctx.font = `700 15px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("まだ玉がない", interior.x + interior.w / 2, interior.y + interior.h / 2);
    return;
  }
  const cols = columnTarget(count);
  const packW = Math.min(interior.w - 8, cols * maxR * 2 + 8);
  const pack = {
    x: interior.x + (interior.w - packW) / 2,
    y: interior.y,
    w: packW,
    h: interior.h,
  };
  const r = chooseRadius(count, pack.w, pack.h, maxR);
  const { balls, hidden } = pileBalls(count, pack, r);
  const cy = interior.y + interior.h / 2;
  const fall = Math.max(0, 1 - fallAge / 0.85);
  const reach = close ? 78 : 12;
  const ordered = balls.slice().sort((a, b) => a.y - b.y);
  for (const b of ordered) {
    const fresh = fallN > 0 && b.idx >= balls.length - Math.min(fallN, balls.length);
    const drop = fresh ? fall * fall * (86 + (b.idx % 6) * 12) : 0;
    const depth = (b.y - interior.y) / Math.max(1, interior.h);
    const scale = close ? 0.84 + depth * 0.34 : 1;
    const rr = b.r * scale;
    const x = b.x + tiltX * reach + tiltX * (cy - b.y) * (close ? 0.2 : 0.03);
    const y = b.y - drop + tiltY * (close ? 26 : 6);
    if (y + rr < interior.y - 8) continue;
    const glint = Math.sin(time * 2.2 + b.idx * 0.7) * rr * 0.12 + tiltX * rr * 0.35;
    drawBall(ctx, x, y, rr, type, 1, glint);
  }
  if (hidden > 0) {
    ctx.fillStyle = "#ffe7b0";
    ctx.font = `700 14px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`ほか ${hidden}`, interior.x + interior.w / 2, interior.y + 4);
  }
}

function renderOwned(ctx, view, time, size, close) {
  const { w, h } = size;
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, close ? "#4a2218" : "#3a1a12");
  sky.addColorStop(1, "#1a0c08");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const loose = Math.max(0, view.loose | 0);
  const boxed = Math.max(0, view.boxed | 0);
  const type = view.type === "iron" ? "iron" : "glass";
  const tiltX = view.tiltX || 0;
  const tiltY = view.tiltY || 0;
  const pad = close ? 18 : 12;
  let dish;
  let crate = null;
  if (boxed > 0) {
    const crateW = Math.round(w * (close ? 0.34 : 0.3));
    const gap = 12;
    dish = { x: pad, y: close ? 18 : 10, w: w - pad * 2 - crateW - gap, h: h - (close ? 36 : 20) };
    crate = { x: w - pad - crateW, y: dish.y, w: crateW, h: dish.h };
  } else {
    dish = { x: pad, y: close ? 18 : 10, w: w - pad * 2, h: h - (close ? 36 : 20) };
  }

  const label = (rect, text) => {
    ctx.fillStyle = "#ffe1a8";
    ctx.font = `700 ${close ? 16 : 13}px ${JP}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, rect.x + 14, rect.y + 8);
  };

  drawWood(ctx, dish, 16);
  label(dish, `受け皿 ${loose}`);
  const dishIn = drawBowlInterior(ctx, dish);
  drawPile(ctx, dishIn, loose, type, time, view.looseFallN || 0, view.looseFallAge || 99, tiltX, tiltY, close ? 46 : 18, close);

  if (crate) {
    drawWood(ctx, crate, 16);
    label(crate, `箱 ${boxed}`);
    const crateIn = drawBowlInterior(ctx, crate);
    ctx.save();
    roundRect(ctx, crateIn.x, crateIn.y, crateIn.w, crateIn.h, 12);
    ctx.clip();
    drawPile(ctx, crateIn, boxed, type, time, view.boxedFallN || 0, view.boxedFallAge || 99, tiltX * 0.45, tiltY * 0.45, close ? 36 : 15, close);
    ctx.restore();
    ctx.strokeStyle = "rgba(210, 240, 255, 0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, crateIn.x + 6, crateIn.y + 6, crateIn.w - 12, crateIn.h - 12, 8);
    ctx.stroke();
  }
}

export function renderHopper(ctx, view, time) {
  renderOwned(ctx, view, time, HOPPER, false);
}

export function renderGaze(ctx, view, time) {
  renderOwned(ctx, view, time, GAZE, true);
}

function drawFx(ctx, fx) {
  for (const ring of fx.rings) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ring.life);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const p of fx.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const pop of fx.popups) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, pop.life * 1.6));
    ctx.fillStyle = pop.color;
    ctx.font = `700 ${pop.size || 22}px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(40,10,10,0.65)";
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }
}

export function render(ctx, state, fx, time) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.save();
  const shake = fx.shake || 0;
  if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  roundRect(ctx, 18, 28, FIELD.r - 18 + 8, FIELD.b - 18, 18);
  const bg = ctx.createLinearGradient(0, 40, 0, FIELD.b);
  bg.addColorStop(0, "#fff1cf");
  bg.addColorStop(0.5, "#f3d7a0");
  bg.addColorStop(1, "#e2b56a");
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, FIELD.l, FIELD.t - 8, FIELD.r - FIELD.l, FIELD.b - FIELD.t + 8, 12);
  ctx.clip();
  ctx.strokeStyle = "rgba(160, 90, 40, 0.13)";
  ctx.lineWidth = 1;
  for (let x = FIELD.l; x < FIELD.r; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD.t);
    ctx.lineTo(x, FIELD.b);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(190, 40, 40, 0.18)";
  ctx.fillStyle = "rgba(190, 40, 40, 0.08)";
  roundRect(ctx, FIELD.l + 8, FIELD.b - 58, FIELD.r - FIELD.l - 16, 48, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#8d2f2f";
  ctx.font = `700 14px ${JP}`;
  ctx.textAlign = "center";
  ctx.fillText("アウト", (FIELD.l + FIELD.r) / 2, FIELD.b - 28);

  if (state.fever > 0) {
    ctx.fillStyle = `rgba(255, 60, 90, ${0.08 + Math.sin(time * 12) * 0.04})`;
    ctx.fillRect(FIELD.l, FIELD.t, FIELD.r - FIELD.l, FIELD.b - FIELD.t);
  }

  drawGuide(ctx, state);
  drawPins(ctx, state.pins);
  for (const b of state.bumpers) drawBumper(ctx, b, time);
  for (const p of state.pockets) drawPocket(ctx, p, state, time);

  if (fx.trail && fx.trail.length > 1) {
    ctx.beginPath();
    ctx.moveTo(fx.trail[0].x, fx.trail[0].y);
    for (const pt of fx.trail) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = state.ballType === "iron" ? "rgba(180,190,200,0.45)" : "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (state.ball && state.phase === "play") {
    drawBall(ctx, state.ball.x, state.ball.y, state.ball.r, state.ballType, 1);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(FIELD.l + 30, FIELD.t + 10);
  ctx.lineTo(FIELD.l + 120, FIELD.t + 70);
  ctx.stroke();

  const names = [
    ["安定", 470, 210],
    ["大穴", 274, 340],
    ["役物", 88, 630],
  ];
  ctx.fillStyle = "rgba(120, 60, 30, 0.45)";
  ctx.font = `700 13px ${JP}`;
  ctx.textAlign = "center";
  for (const [label, x, y] of names) ctx.fillText(label, x, y);

  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#7a3b22";
  roundRect(ctx, FIELD.l - 4, FIELD.t - 12, FIELD.r - FIELD.l + 8, FIELD.b - FIELD.t + 16, 14);
  ctx.stroke();

  drawRail(ctx, time);
  if (state.ball && (state.phase === "lane" || state.phase === "rail" || state.phase === "drop")) {
    drawBall(ctx, state.ball.x, state.ball.y, state.ball.r, state.ballType, 1);
  }
  if (state.phase === "attract") {
    const s = (time * 0.18) % 1;
    const p = railPoint(s * 0.92 + 0.04);
    drawBall(ctx, p.x, p.y, 8, "glass", 0.4);
  }

  drawLane(ctx, state);
  if (state.ball && state.phase === "drop") {
    drawBall(ctx, state.ball.x, state.ball.y, state.ball.r, state.ballType, 1);
  }
  drawFx(ctx, fx);

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255, 244, 200, ${Math.min(0.45, fx.flash)})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  ctx.restore();
}

export { VIEW };

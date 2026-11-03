import { FIELD, LANE_CX, VIEW, railPoint } from "./sim.js";

const JP = '"BIZ UDPGothic", "WenQuanYi Micro Hei", "Droid Sans Fallback", "Yu Gothic", sans-serif';

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
    ctx.save();
    ctx.strokeStyle = state.chuckerFlash > 0 ? "#f4ead6" : "#16110e";
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x - 28, p.y - 14, 56, 28);
    ctx.fillStyle = state.chuckerFlash > 0 ? "#f0d36a" : "#efe6d2";
    ctx.fillRect(p.x - 26, p.y - 12, 52, 24);
    ctx.fillStyle = "#16110e";
    ctx.font = `700 16px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", p.x, p.y + 1);
    ctx.restore();
    return;
  }

  if (hot) {
    ctx.save();
    ctx.strokeStyle = "#c4312e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 7, 0, Math.PI * 2);
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
      ctx.fillStyle = "#8d8f94";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.86, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#16110e";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - p.r * 0.4, p.y - p.r * 0.42);
      ctx.lineTo(p.x + p.r * 0.4, p.y - p.r * 0.42);
      ctx.stroke();
      ctx.fillStyle = "#16110e";
      ctx.font = `700 13px ${JP}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("15", p.x, p.y + 4);
      ctx.restore();
      return;
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
  ctx.strokeStyle = p.flash > 0 ? "#f4ead6" : color;
  ctx.stroke();
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
  ctx.fillStyle = flash ? "#f0d36a" : "#c4312e";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
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

function traceRail(ctx, lift) {
  const n = 36;
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const p = railPoint(i / n);
    const y = p.y - lift;
    if (i === 0) ctx.moveTo(p.x, y);
    else ctx.lineTo(p.x, y);
  }
}

function drawLane(ctx, state, time) {
  const join = railPoint(0);
  ctx.save();
  ctx.fillStyle = "#3a2118";
  ctx.fillRect(534, join.y - 6, 112, 836 - (join.y - 6));
  ctx.strokeStyle = "#16110e";
  ctx.lineWidth = 3;
  ctx.strokeRect(534, join.y - 6, 112, 836 - (join.y - 6));

  const pull = state.powerPreview || 0;
  const gaugeH = 210;
  const gaugeY = 150;
  ctx.fillStyle = "#f0d7b0";
  ctx.font = `700 12px ${JP}`;
  ctx.textAlign = "center";
  ctx.fillText("強", 554, gaugeY - 6);
  ctx.fillText("弱", 554, gaugeY + gaugeH + 14);
  ctx.fillStyle = "#16110e";
  ctx.fillRect(546, gaugeY, 16, gaugeH);
  ctx.strokeStyle = "#c8b48a";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(546, gaugeY, 16, gaugeH);
  ctx.fillStyle = pull > 0.85 ? "#c4312e" : pull > 0.45 ? "#e0a122" : "#2f6b3a";
  const fill = gaugeH * pull;
  ctx.fillRect(548, gaugeY + gaugeH - fill, 12, Math.max(0, fill));
  if (state.lastPower) {
    const y = gaugeY + gaugeH - gaugeH * state.lastPower;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(546, y);
    ctx.lineTo(564, y);
    ctx.stroke();
  }

  const knobY = 748 + pull * 52;
  const springTop = 668 + pull * 52;
  ctx.strokeStyle = "#d7d7df";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const coils = 7;
  for (let i = 0; i <= coils * 2; i += 1) {
    const t = i / (coils * 2);
    const y = springTop + (knobY - 36 - springTop) * t;
    const x = i === 0 || i === coils * 2 ? LANE_CX : LANE_CX + (i % 2 === 0 ? -12 : 12);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const charged = pull > 0.08;
  ctx.fillStyle = "#f4ead6";
  ctx.fillRect(540, 612, 100, 42);
  ctx.strokeStyle = "#16110e";
  ctx.lineWidth = 2;
  ctx.strokeRect(540, 612, 100, 42);
  ctx.fillStyle = "#16110e";
  ctx.font = `700 16px ${JP}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(charged ? "離すと打つ" : "下へ引く", LANE_CX, 626);
  ctx.font = `700 13px ${JP}`;
  ctx.fillText(charged ? "指を離す" : "離すと玉が出る", LANE_CX, 644);

  const bob = !charged && (state.phase === "ready" || state.phase === "attract") ? Math.sin(time * 5) * 5 : 0;
  ctx.fillStyle = "#9d1c24";
  ctx.strokeStyle = "#16110e";
  ctx.lineWidth = 3;
  ctx.fillRect(LANE_CX - 40, knobY - 8 + bob, 80, 62);
  ctx.strokeRect(LANE_CX - 40, knobY - 8 + bob, 80, 62);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(LANE_CX, knobY + 36 + bob);
  ctx.lineTo(LANE_CX - 16, knobY + 14 + bob);
  ctx.lineTo(LANE_CX + 16, knobY + 14 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 18px ${JP}`;
  ctx.fillText(charged ? "離す" : "引く", LANE_CX, knobY + 8 + bob);

  const resting = state.phase === "ready" || state.phase === "attract";
  if (resting) {
    const specR = state.ballType === "iron" ? 10 : 9;
    drawBall(ctx, LANE_CX, springTop - specR, specR, state.ballType, state.phase === "attract" ? 0.45 : 1);
  }
  ctx.restore();
}

function drawRail(ctx, time) {
  ctx.save();
  ctx.fillStyle = "#f3e0b4";
  ctx.beginPath();
  ctx.moveTo(FIELD.l, FIELD.t);
  const n = 36;
  for (let i = n; i >= 0; i -= 1) {
    const p = railPoint(i / n);
    if (p.x < FIELD.l || p.x > FIELD.r) continue;
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(FIELD.r, FIELD.t);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#16110e";
  ctx.lineWidth = 16;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  traceRail(ctx, 0);
  ctx.stroke();
  ctx.strokeStyle = "#b8893d";
  ctx.lineWidth = 10;
  traceRail(ctx, 0);
  ctx.stroke();
  ctx.strokeStyle = "#ffe7a8";
  ctx.lineWidth = 2;
  traceRail(ctx, 3);
  ctx.stroke();
  for (let i = 0; i <= 16; i += 1) {
    const p = railPoint(i / 16);
    const on = Math.floor(time * 8 + i) % 4 === 0;
    ctx.fillStyle = on ? "#fff1b0" : "#8c5a22";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const HOPPER = { w: 640, h: 150 };
export const GAZE = { w: 900, h: 540 };

function drawWood(ctx, rect) {
  ctx.fillStyle = "#6a4328";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "#16110e";
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
  ctx.strokeStyle = "#c8b48a";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
}

function drawBowlInterior(ctx, rect) {
  const inset = 10;
  const x = rect.x + inset;
  const y = rect.y + 28;
  const w = rect.w - inset * 2;
  const h = rect.h - 38;
  ctx.fillStyle = "#1c1612";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#8a8174";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  return { x, y, w, h };
}

function drawPhysical(ctx, interior, balls, space, count, hidden, type, time, tiltX) {
  if (!balls || !space || count <= 0) {
    ctx.fillStyle = "rgba(255, 220, 170, 0.55)";
    ctx.font = `700 15px ${JP}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("まだ玉がない", interior.x + interior.w / 2, interior.y + interior.h / 2);
    return;
  }
  const scale = Math.min(interior.w / space.w, interior.h / space.h);
  const ox = interior.x + (interior.w - space.w * scale) / 2;
  const oy = interior.y + interior.h - space.h * scale;
  const ordered = balls.slice().sort((a, b) => a.y - b.y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(interior.x, interior.y, interior.w, interior.h);
  ctx.clip();
  for (let i = 0; i < ordered.length; i += 1) {
    const b = ordered[i];
    const rr = b.r * scale;
    const glint = Math.sin(time * 2.2 + i * 0.7) * rr * 0.12 + (tiltX || 0) * rr * 0.28;
    drawBall(ctx, ox + b.x * scale, oy + b.y * scale, rr, type, 1, glint);
  }
  ctx.restore();
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
  ctx.fillStyle = "#4a382c";
  ctx.fillRect(0, 0, w, h);

  const loose = Math.max(0, view.loose | 0);
  const boxed = Math.max(0, view.boxed | 0);
  const type = view.type === "iron" ? "iron" : "glass";
  const tiltX = view.tiltX || 0;
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
    ctx.fillStyle = "#f4ead6";
    ctx.font = `700 ${close ? 16 : 13}px ${JP}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, rect.x + 14, rect.y + 8);
  };

  drawWood(ctx, dish);
  label(dish, `受け皿 ${loose}`);
  const dishIn = drawBowlInterior(ctx, dish);
  drawPhysical(ctx, dishIn, view.dishBalls, view.dishSpace, loose, view.dishHidden || 0, type, time, tiltX);

  if (crate) {
    drawWood(ctx, crate);
    label(crate, `箱 ${boxed}`);
    const crateIn = drawBowlInterior(ctx, crate);
    ctx.save();
    ctx.beginPath();
    ctx.rect(crateIn.x, crateIn.y, crateIn.w, crateIn.h);
    ctx.clip();
    drawPhysical(ctx, crateIn, view.boxBalls, view.boxSpace, boxed, view.boxHidden || 0, type, time, tiltX * 0.45);
    ctx.restore();
    ctx.strokeStyle = "#d5dde4";
    ctx.lineWidth = 2;
    ctx.strokeRect(crateIn.x + 6, crateIn.y + 6, crateIn.w - 12, crateIn.h - 12);
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

  ctx.fillStyle = "#f3e0b4";
  ctx.fillRect(FIELD.l, FIELD.t, FIELD.r - FIELD.l, FIELD.b - FIELD.t);

  ctx.save();
  ctx.beginPath();
  ctx.rect(FIELD.l, FIELD.t - 8, FIELD.r - FIELD.l, FIELD.b - FIELD.t + 8);
  ctx.clip();
  ctx.strokeStyle = "rgba(160, 90, 40, 0.13)";
  ctx.lineWidth = 1;
  for (let x = FIELD.l; x < FIELD.r; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD.t);
    ctx.lineTo(x, FIELD.b);
    ctx.stroke();
  }
  ctx.strokeStyle = "#8d2f2f";
  ctx.fillStyle = "#e7c7b4";
  ctx.fillRect(FIELD.l + 8, FIELD.b - 58, FIELD.r - FIELD.l - 16, 48);
  ctx.strokeRect(FIELD.l + 8, FIELD.b - 58, FIELD.r - FIELD.l - 16, 48);
  ctx.fillStyle = "#8d2f2f";
  ctx.font = `700 14px ${JP}`;
  ctx.textAlign = "center";
  ctx.fillText("アウト", (FIELD.l + FIELD.r) / 2, FIELD.b - 28);

  if (state.fever > 0) {
    ctx.fillStyle = `rgba(255, 60, 90, ${0.08 + Math.sin(time * 12) * 0.04})`;
    ctx.fillRect(FIELD.l, FIELD.t, FIELD.r - FIELD.l, FIELD.b - FIELD.t);
  }

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
  ctx.strokeStyle = "#16110e";
  ctx.beginPath();
  ctx.moveTo(FIELD.l - 4, FIELD.t);
  ctx.lineTo(FIELD.l - 4, FIELD.b + 4);
  ctx.lineTo(FIELD.r + 4, FIELD.b + 4);
  ctx.lineTo(FIELD.r + 4, FIELD.t);
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

  drawLane(ctx, state, time);
  if (state.ball && (state.phase === "lane" || state.phase === "rail" || state.phase === "drop")) {
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

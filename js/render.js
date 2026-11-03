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

function drawBall(ctx, x, y, r, type, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(80,50,20,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + r * 0.75, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
  if (type === "iron") {
    g.addColorStop(0, "#f4f7fb");
    g.addColorStop(0.45, "#9aa6b5");
    g.addColorStop(1, "#3e4854");
  } else {
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.4, "#d7f6ff");
    g.addColorStop(1, "#6ea8c9");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
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

function drawSpill(ctx, state) {
  const spill = Math.max(0, state.stock - state.boxedAt);
  if (spill < 12) return;
  const n = Math.min(36, spill - 8);
  ctx.save();
  for (let i = 0; i < n; i += 1) {
    const col = i % 9;
    const row = Math.floor(i / 9);
    const x = 70 + col * 42 + (row % 2) * 14;
    const y = FIELD.b - 18 - row * 16;
    drawBall(ctx, x, y, 8, "glass", 0.55);
  }
  if (spill > 28) {
    const g = ctx.createLinearGradient(0, 680, 0, FIELD.b);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(FIELD.l, 680, FIELD.r - FIELD.l, FIELD.b - 680);
  }
  ctx.restore();
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

  drawSpill(ctx, state);

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

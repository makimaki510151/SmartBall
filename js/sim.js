// スマートボールの盤面シミュレーション。
// 描画もDOMも持たない。ブラウザとヘッドレス検証の両方から使う。

export const VIEW = { w: 660, h: 900 };
export const FIELD = { l: 40, t: 96, r: 508, b: 830 };
export const LANE_CX = 592;
export const RAIL_Y = 58;
export const STAR_AT = [150, 300, 500, 800, 1200, 1800];

const RAIL_SPAN = LANE_CX - 48;

export function starCount(best) {
  let n = 0;
  for (const s of STAR_AT) if (best >= s) n += 1;
  return n;
}

export function nextStar(best) {
  for (const s of STAR_AT) if (best < s) return s;
  return null;
}

export function ballSpec(type) {
  if (type === "iron") {
    return { r: 10, catchBonus: 160, grav: 700, rest: 0.34, name: "鉄球" };
  }
  return { r: 9, catchBonus: 0, grav: 540, rest: 0.46, name: "ガラス玉" };
}

function makeRng(seed) {
  if (seed == null) return Math.random;
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function powerToS(power) {
  const p = clamp((power - 0.12) / 0.88, 0, 1);
  return 0.2 + p * 0.78;
}

export function railPoint(s) {
  return { x: LANE_CX - clamp(s, 0, 1) * RAIL_SPAN, y: RAIL_Y };
}

export function zoneInfo(x) {
  if (x >= 430) return { zone: "右の安定穴", hint: "入りやすい。払い出し5", tone: "safe" };
  if (x >= 340) return { zone: "右の中穴", hint: "払い出し8。役物・右の筋", tone: "mid" };
  if (x >= 255) return { zone: "中央の大穴", hint: "払い出し15。落ちると大きい", tone: "big" };
  if (x >= 200) return { zone: "チャッカー筋", hint: "通すと役物が開く", tone: "mid" };
  if (x >= 120) return { zone: "左の中穴", hint: "役物・左の筋", tone: "mid" };
  return { zone: "左サイド", hint: "壁に当たりやすい", tone: "left" };
}

export function aimFor(power) {
  const s = powerToS(power);
  const p = railPoint(s);
  return { ...p, s, ...zoneInfo(p.x) };
}

function makePockets() {
  return [
    { id: "safe", name: "安定穴", x: 470, y: 250, r: 20, payout: 5, type: "normal", catch: 980, label: "5" },
    { id: "left5", name: "左穴", x: 96, y: 268, r: 18, payout: 5, type: "normal", catch: 780, label: "5" },
    { id: "big", name: "中央大穴", x: 274, y: 392, r: 24, payout: 15, type: "big", catch: 640, label: "15" },
    { id: "midR", name: "右中穴", x: 392, y: 470, r: 18, payout: 8, type: "normal", catch: 780, label: "8" },
    { id: "midL", name: "左中穴", x: 168, y: 470, r: 18, payout: 8, type: "normal", catch: 760, label: "8" },
    { id: "renL", name: "連勝穴・左", x: 214, y: 560, r: 18, payout: 16, type: "rensho", pair: "ren", catch: 740, label: "連" },
    { id: "renR", name: "連勝穴・右", x: 334, y: 560, r: 18, payout: 16, type: "rensho", pair: "ren", catch: 740, label: "連" },
    { id: "yL", name: "役物・左", x: 88, y: 668, r: 22, payout: 15, type: "yakumono", catch: 980, label: "15", open: false, openAnim: 0 },
    { id: "yC", name: "役物・中", x: 300, y: 730, r: 24, payout: 15, type: "yakumono", catch: 1000, label: "15", open: false, openAnim: 0 },
    { id: "yR", name: "役物・右", x: 398, y: 648, r: 22, payout: 15, type: "yakumono", catch: 960, label: "15", open: false, openAnim: 0 },
    { id: "last", name: "スレスレ穴", x: 274, y: 792, r: 17, payout: 5, type: "normal", catch: 880, label: "5" },
    { id: "chucker", name: "スタートチャッカー", x: 242, y: 168, r: 16, payout: 1, type: "chucker", label: "S" },
  ];
}

function nearPocket(pockets, x, y) {
  for (const p of pockets) {
    if (p.type === "chucker") {
      if (Math.abs(x - p.x) < 46 && Math.abs(y - p.y) < 28) return true;
    } else if (Math.hypot(x - p.x, y - p.y) < p.r + 22) {
      return true;
    }
  }
  return false;
}

function makePins(pockets) {
  const pins = [];
  const bumpers = [
    { x: 210, y: 330, r: 14 },
    { x: 338, y: 330, r: 14 },
  ];
  const add = (x, y, r = 5.1, force = false) => {
    const margin = force ? 7 : 14;
    if (x < FIELD.l + margin || x > FIELD.r - margin || y < FIELD.t + 22 || y > FIELD.b - 14) return;
    if (nearPocket(pockets, x, y)) return;
    for (const b of bumpers) {
      if (Math.hypot(x - b.x, y - b.y) < b.r + 14) return;
    }
    for (const p of pins) {
      if (Math.hypot(x - p.x, y - p.y) < 16) return;
    }
    pins.push({ x, y, r });
  };
  const wall = (x, y0, y1, step) => {
    let i = 0;
    for (let y = y0; y <= y1; y += step) {
      add(x + (i % 2 ? 6 : -6), y, 5, true);
      i += 1;
    }
  };

  // レーンの仕切り。完全には閉じず、弾んだ玉は隣へこぼれる。
  wall(438, 140, 630, 24);
  wall(356, 188, 640, 26);
  wall(208, 200, 540, 26);
  wall(136, 160, 650, 26);

  // 安定穴の手前の釘。当たると減速して落ち、外すと速いまま唇で跳ねる。
  add(452, 168, 5, true);
  add(486, 196, 5, true);
  add(448, 214, 4.6, true);

  // 中央大穴の袖。入口は広く、遅い玉は落ちる。
  add(228, 332, 5.2, true);
  add(320, 332, 5.2, true);
  add(220, 436, 5, true);
  add(328, 436, 5, true);

  // チャッカーの袖
  add(214, 150, 4.8, true);
  add(270, 150, 4.8, true);

  // 中盤のまばらな釘
  const scatter = [
    [168, 300], [168, 360], [230, 250], [274, 286], [318, 250],
    [392, 300], [392, 390], [100, 360], [100, 430],
    [168, 560], [230, 640], [392, 560], [450, 360], [450, 470],
    [274, 500], [274, 640], [334, 640],
  ];
  for (const [x, y] of scatter) add(x, y, 5, true);

  // 底は中央のスレスレ穴へ少しだけ寄せる
  for (let i = 0; i < 5; i += 1) {
    add(70 + i * 28, 748 + i * 12, 4.8, true);
    add(478 - i * 28, 748 + i * 12, 4.8, true);
  }

  return { pins, bumpers: bumpers.map((b) => ({ ...b, flash: 0, cd: 0 })) };
}

export function createState(seed) {
  const rand = makeRng(seed);
  const pockets = makePockets();
  const { pins, bumpers } = makePins(pockets);
  const hotPool = ["safe", "left5", "big", "midR", "midL", "last"];
  return {
    phase: "attract",
    yen: 1000,
    stock: 0,
    bestStock: 0,
    pockets,
    pins,
    bumpers,
    hotId: hotPool[Math.floor(rand() * hotPool.length)],
    ball: null,
    ballType: "glass",
    powerPreview: 0,
    lastPower: null,
    launchPower: 0,
    railS: 0,
    railTarget: 0,
    railV: 2.35,
    heat: 0,
    fever: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    yakuTimer: 0,
    resolveT: 0,
    shotId: 0,
    boxedAt: 0,
    chuckerFlash: 0,
    stats: {
      launches: 0,
      pockets: 0,
      outs: 0,
      rensho: 0,
      yakumono: 0,
      chucker: 0,
      fever: 0,
    },
    events: [],
    lastResult: null,
    lastPay: 0,
    lastId: null,
    lastChucker: false,
    lastDropX: null,
    pendingYaku: 0,
    guide: true,
    _pinCd: 0,
    _stuckT: 0,
    rand,
  };
}

function push(state, event) {
  state.events.push(event);
  if (state.events.length > 80) state.events.splice(0, state.events.length - 80);
}

function touchBest(state) {
  if (state.stock > state.bestStock) {
    const before = starCount(state.bestStock);
    state.bestStock = state.stock;
    const after = starCount(state.bestStock);
    if (after > before) push(state, { type: "star", stars: after, best: state.bestStock });
  }
}

function addStock(state, n) {
  if (n <= 0) return;
  state.stock += n;
  if (state.stock > 9999) {
    const extra = state.stock - 9999;
    state.stock = 9999;
    state.yen = Math.min(999999, state.yen + extra);
    push(state, { type: "cap", extra });
  }
  touchBest(state);
}

function addHeat(state, n) {
  if (state.fever > 0) {
    state.fever = Math.min(22, state.fever + n * 0.015);
    return;
  }
  state.heat = clamp(state.heat + n, 0, 100);
  if (state.heat >= 100) startFever(state);
}

function startFever(state) {
  const rising = state.fever <= 0 && !state.stats._feverOn;
  state.fever = Math.max(state.fever, 16);
  state.heat = 100;
  state.stats._feverOn = true;
  openYakumono(state, { quiet: true, seconds: 16 });
  if (rising) {
    state.stats.fever += 1;
    push(state, { type: "fever-start" });
  }
}

function openYakumono(state, { quiet = false, seconds = 12 } = {}) {
  let changed = false;
  for (const p of state.pockets) {
    if (p.type === "yakumono" && !p.open) {
      p.open = true;
      changed = true;
    }
  }
  state.yakuTimer = Math.max(state.yakuTimer, seconds);
  if (changed && !quiet) push(state, { type: "yaku-open" });
}

function closeYakumono(state) {
  let any = false;
  for (const p of state.pockets) {
    if (p.type === "yakumono" && p.open) {
      p.open = false;
      any = true;
    }
  }
  if (any) push(state, { type: "yaku-close" });
}

function payoutOf(state, pocket) {
  let pay = pocket.payout;
  if (pocket.id === state.hotId) pay += 3;
  if (state.fever > 0) pay = Math.ceil(pay * 1.5);
  if (state.combo > 1) pay += Math.min(5, state.combo - 1);
  if (pocket.type === "rensho" && state.fever > 0) pay += 20;
  return pay;
}

function notePocket(state, pocket, pay, kind) {
  state.combo += 1;
  state.comboTimer = 4.6;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  addHeat(state, 22 + Math.min(16, state.combo * 3));
  state.stats.pockets += 1;
  state.lastResult = "pocket";
  state.lastPay = pay;
  state.lastId = pocket.id;
  addStock(state, pay);
  push(state, {
    type: "pocket",
    id: pocket.id,
    name: pocket.name,
    pay,
    x: pocket.x,
    y: pocket.y,
    kind,
    combo: state.combo,
    hot: pocket.id === state.hotId,
  });
}

function finishResolve(state) {
  if (state.pendingYaku) {
    openYakumono(state, { seconds: state.pendingYaku });
    state.pendingYaku = 0;
  }
  state.phase = state.stock > 0 ? "ready" : "empty";
  state.ball = null;
}

export function giveBalls(state, n) {
  addStock(state, n);
  if (state.stock > 0 && (state.phase === "empty" || state.phase === "attract")) state.phase = "ready";
}

export function insertCoin(state) {
  if (state.yen < 100) return false;
  state.yen -= 100;
  addStock(state, 25);
  if (state.phase === "attract" || state.phase === "empty") state.phase = "ready";
  push(state, { type: "coin", stock: state.stock });
  return true;
}

export function launch(state, power) {
  if (state.phase !== "ready") {
    push(state, { type: "busy" });
    return { ok: false, reason: state.phase === "empty" || state.stock <= 0 ? "empty" : "busy" };
  }
  if (state.stock <= 0) {
    state.phase = "empty";
    push(state, { type: "empty" });
    return { ok: false, reason: "empty" };
  }
  if (power < 0.12) {
    push(state, { type: "weak" });
    return { ok: false, reason: "weak" };
  }
  const spec = ballSpec(state.ballType);
  state.stock -= 1;
  state.shotId += 1;
  state.phase = "lane";
  state.launchPower = power;
  state.lastPower = power;
  state.ball = {
    x: LANE_CX,
    y: 748 + power * 64,
    vx: 0,
    vy: -(1480 + power * 820),
    r: spec.r,
    grav: spec.grav,
    rest: spec.rest,
    catchBonus: spec.catchBonus,
    shotId: state.shotId,
    didChucker: false,
    age: 0,
    skipId: null,
    skipT: 0,
  };
  state.stats.launches += 1;
  state.lastResult = null;
  state.lastPay = 0;
  state.lastId = null;
  state.lastChucker = false;
  state.lastDropX = null;
  state._stuckT = 0;
  push(state, { type: "launch", power });

  if (state.stats.launches % 40 === 0) {
    const big = state.stats.launches % 200 === 0;
    if (big) {
      addStock(state, 30);
      startFever(state);
      push(state, { type: "big-service", pay: 30 });
    } else {
      addStock(state, 10);
      openYakumono(state, { seconds: 12 });
      push(state, { type: "service", pay: 10 });
    }
  }
  return { ok: true };
}

export function rerollTable(state) {
  if (state.phase === "lane" || state.phase === "rail" || state.phase === "drop" || state.phase === "play") {
    return false;
  }
  const hotPool = ["safe", "left5", "big", "midR", "midL", "last"];
  state.hotId = hotPool[Math.floor(state.rand() * hotPool.length)];
  for (const p of state.pockets) {
    if (p.type === "rensho") p.held = false;
    if (p.type === "yakumono") p.open = false;
  }
  state.yakuTimer = 0;
  push(state, { type: "reroll", hotId: state.hotId });
  return true;
}

function tickTimers(state, dt) {
  if (state.chuckerFlash > 0) state.chuckerFlash = Math.max(0, state.chuckerFlash - dt);
  if (state._pinCd > 0) state._pinCd -= dt;
  for (const p of state.pockets) {
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt);
    if (p.type === "yakumono") {
      const target = p.open ? 1 : 0;
      p.openAnim += (target - p.openAnim) * Math.min(1, dt * 9);
    }
  }
  for (const b of state.bumpers) {
    if (b.flash > 0) b.flash = Math.max(0, b.flash - dt);
    if (b.cd > 0) b.cd = Math.max(0, b.cd - dt);
  }
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.fever > 0) {
    state.fever -= dt;
    if (state.fever <= 0) {
      state.fever = 0;
      state.heat = 28;
      state.stats._feverOn = false;
      push(state, { type: "fever-end" });
    }
  } else if (state.heat > 0) {
    state.heat = Math.max(0, state.heat - dt * 1.35);
  }
  if (state.yakuTimer > 0) {
    state.yakuTimer -= dt;
    if (state.yakuTimer <= 0 && state.fever <= 0) closeYakumono(state);
  }
  if (state.ball && state.ball.skipT > 0) state.ball.skipT -= dt;
}

function stepLane(state, dt) {
  const ball = state.ball;
  ball.y += ball.vy * dt;
  if (ball.y <= RAIL_Y) {
    ball.y = RAIL_Y;
    ball.x = LANE_CX;
    state.phase = "rail";
    state.railS = 0;
    state.railTarget = powerToS(state.launchPower);
    state.railV = 2.15 + state.launchPower * 0.35;
  }
}

function stepRail(state, dt) {
  const ball = state.ball;
  state.railS += state.railV * dt;
  const s = Math.min(state.railS, state.railTarget);
  const p = railPoint(s);
  ball.x = p.x;
  ball.y = p.y;
  if (state.railS >= state.railTarget) {
    state.phase = "drop";
    state.lastDropX = p.x;
    ball.x = p.x + (state.rand() - 0.5) * 20;
    ball.y = RAIL_Y;
    ball.vx = (state.rand() - 0.5) * 36;
    ball.vy = 40;
  }
}

function stepDrop(state, dt) {
  const ball = state.ball;
  ball.vy += 900 * dt;
  ball.y += ball.vy * dt;
  ball.x += ball.vx * dt;
  if (ball.y >= FIELD.t + ball.r + 6) {
    ball.y = FIELD.t + ball.r + 6;
    state.phase = "play";
    ball.vy = Math.max(ball.vy, 70);
  }
}

function pushOut(ball, p, rest) {
  let dx = ball.x - p.x;
  let dy = ball.y - p.y;
  let d = Math.hypot(dx, dy);
  if (d < 0.001) {
    dx = 0;
    dy = -1;
    d = 1;
  }
  const nx = dx / d;
  const ny = dy / d;
  const min = p.r + 1.5;
  ball.x = p.x + nx * min;
  ball.y = p.y + ny * min;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + rest) * vn * nx;
    ball.vy -= (1 + rest) * vn * ny;
  }
}

function capture(state, pocket) {
  const ball = state.ball;
  pocket.flash = 0.45;
  if (pocket.type === "rensho") {
    const partner = state.pockets.find((q) => q.type === "rensho" && q.id !== pocket.id);
    if (pocket.held) {
      pushOut(ball, pocket, 0.4);
      return;
    }
    if (partner && partner.held) {
      pocket.held = false;
      partner.held = false;
      state.stats.rensho += 1;
      const pay = payoutOf(state, pocket);
      notePocket(state, pocket, pay, "rensho");
      state.phase = "resolve";
      state.resolveT = 0.48;
      state.ball = null;
      return;
    }
    pocket.held = true;
    state.lastResult = "rensho-hold";
    state.lastId = pocket.id;
    addHeat(state, 8);
    push(state, { type: "rensho-hold", id: pocket.id, x: pocket.x, y: pocket.y, name: pocket.name });
    state.phase = "resolve";
    state.resolveT = 0.34;
    state.ball = null;
    return;
  }

  if (pocket.type === "yakumono") {
    pocket.open = false;
    state.stats.yakumono += 1;
    const pay = payoutOf(state, pocket);
    notePocket(state, pocket, pay, "yakumono");
    state.phase = "resolve";
    state.resolveT = 0.42;
    state.ball = null;
    return;
  }

  const pay = payoutOf(state, pocket);
  notePocket(state, pocket, pay, pocket.type === "big" ? "big" : "normal");
  state.phase = "resolve";
  state.resolveT = 0.36;
  state.ball = null;
}

function hitChucker(state, ball) {
  if (ball.didChucker) return;
  ball.didChucker = true;
  state.lastChucker = true;
  state.chuckerFlash = 0.55;
  state.stats.chucker += 1;
  let pay = 1;
  if (state.fever > 0) pay += 1;
  state.combo += 1;
  state.comboTimer = 4.6;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  addHeat(state, 12);
  addStock(state, pay);
  // 開くのはこの玉が落ちたあと。同じ玉で役物まで取り切らせない。
  state.pendingYaku = Math.max(state.pendingYaku || 0, 9);
  push(state, { type: "chucker", x: 242, y: 168, pay, combo: state.combo });
}

function resolvePlay(state, dt) {
  const ball = state.ball;
  if (!ball || state.phase !== "play") return;
  const prevX = ball.x;
  const prevY = ball.y;
  ball.age += dt;
  ball.vy += ball.grav * dt;
  ball.vx *= Math.exp(-0.55 * dt);
  ball.vy *= Math.exp(-0.06 * dt);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const r = ball.r;
  if (ball.x < FIELD.l + r) {
    ball.x = FIELD.l + r;
    ball.vx = Math.abs(ball.vx) * 0.62;
  } else if (ball.x > FIELD.r - r) {
    ball.x = FIELD.r - r;
    ball.vx = -Math.abs(ball.vx) * 0.62;
  }
  if (ball.y < FIELD.t + r) {
    ball.y = FIELD.t + r;
    ball.vy = Math.abs(ball.vy) * 0.45;
  }

  const spNow = Math.hypot(ball.vx, ball.vy);
  if (spNow > 980) {
    const k = 980 / spNow;
    ball.vx *= k;
    ball.vy *= k;
  }

  for (const pin of state.pins) {
    let dx = ball.x - pin.x;
    let dy = ball.y - pin.y;
    let d = Math.hypot(dx, dy);
    const min = r + pin.r;
    if (d >= min) continue;
    if (d < 0.001) {
      dx = state.rand() - 0.5;
      dy = state.rand() - 0.5;
      d = Math.hypot(dx, dy) || 1;
    }
    const nx = dx / d;
    const ny = dy / d;
    ball.x = pin.x + nx * min;
    ball.y = pin.y + ny * min;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      const speed = Math.hypot(ball.vx, ball.vy);
      const rest = ball.rest * (speed > 420 ? 0.82 : 1);
      ball.vx -= (1 + rest) * vn * nx;
      ball.vy -= (1 + rest) * vn * ny;
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      ball.vx -= vt * 0.08 * tx;
      ball.vy -= vt * 0.08 * ty;
      if (speed > 70 && state._pinCd <= 0) {
        state._pinCd = 0.06;
        push(state, { type: "pin", x: pin.x, y: pin.y, speed });
      }
    }
  }

  for (const b of state.bumpers) {
    let dx = ball.x - b.x;
    let dy = ball.y - b.y;
    let d = Math.hypot(dx, dy);
    const min = r + b.r;
    if (d >= min || b.cd > 0) continue;
    if (d < 0.001) {
      dx = 0;
      dy = -1;
      d = 1;
    }
    const nx = dx / d;
    const ny = dy / d;
    b.cd = 0.16;
    b.flash = 0.28;
    const kick = 240 + state.rand() * 36;
    ball.x = b.x + nx * (min + 0.5);
    ball.y = b.y + ny * (min + 0.5);
    ball.vx = nx * kick;
    ball.vy = ny * kick;
    let pay = 0;
    if (state.rand() < 0.08) {
      pay = 1;
      addStock(state, 1);
      addHeat(state, 3);
    }
    push(state, { type: "bumper", x: b.x, y: b.y, pay });
  }

  for (const p of state.pockets) {
    if (p.type !== "yakumono" || p.open) continue;
    if (Math.hypot(ball.x - p.x, ball.y - p.y) < p.r + r * 0.25) {
      pushOut(ball, p, 0.72);
      p.flash = 0.12;
    }
  }

  const gate = { x0: 230, x1: 254, y0: 150, y1: 188 };
  if (!ball.didChucker && ball.y > prevY) {
    const y0 = prevY;
    const y1 = ball.y;
    if (y1 >= gate.y0 && y0 <= gate.y1) {
      const mid = (gate.y0 + gate.y1) / 2;
      const t = y1 === y0 ? 0 : clamp((mid - y0) / (y1 - y0), 0, 1);
      const x = prevX + (ball.x - prevX) * t;
      if (x >= gate.x0 && x <= gate.x1) hitChucker(state, ball);
    }
  }

  if (state.phase !== "play") return;

  for (const p of state.pockets) {
    if (p.type === "chucker") continue;
    if (p.type === "yakumono" && !p.open) continue;
    const d = Math.hypot(ball.x - p.x, ball.y - p.y);
    const mouth = p.r + r * 0.72;
    if (d > mouth) continue;
    if (ball.skipId === p.id && ball.skipT > 0) {
      pushOut(ball, p, 0.35);
      continue;
    }
    if (p.type === "rensho" && p.held) {
      pushOut(ball, p, 0.4);
      continue;
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    const catchV = (p.catch ?? 320) + ball.catchBonus;
    const nx = (p.x - ball.x) / Math.max(d, 1);
    const ny = (p.y - ball.y) / Math.max(d, 1);
    if (speed <= catchV && d <= p.r + r * 0.5) {
      capture(state, p);
      return;
    }
    if (speed <= catchV * 1.2) {
      ball.vx = ball.vx * 0.72 + nx * 140;
      ball.vy = ball.vy * 0.72 + ny * 140;
      continue;
    }
    if (d <= p.r + r * 0.05) {
      pushOut(ball, p, 0.42);
      ball.skipId = p.id;
      ball.skipT = 0.16;
      push(state, { type: "nearmiss", x: p.x, y: p.y, id: p.id });
    }
  }

  if (state.phase !== "play") return;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 22) state._stuckT += dt;
  else state._stuckT = 0;
  if (state._stuckT > 0.65) {
    ball.vy += 120;
    ball.vx += (state.rand() - 0.5) * 80;
    state._stuckT = 0;
  }

  if (ball.y > FIELD.b - 8 || ball.age > 13) {
    state.stats.outs += 1;
    state.combo = 0;
    state.comboTimer = 0;
    if (state.fever <= 0) state.heat = Math.max(0, state.heat - 6);
    state.lastResult = "out";
    push(state, { type: "out", x: ball.x, y: Math.min(ball.y, FIELD.b - 10) });
    state.phase = "resolve";
    state.resolveT = 0.24;
    state.ball = null;
  }
}

export function step(state, dt) {
  tickTimers(state, dt);
  if (state.phase === "lane") stepLane(state, dt);
  else if (state.phase === "rail") stepRail(state, dt);
  else if (state.phase === "drop") stepDrop(state, dt);
  else if (state.phase === "play") {
    const sub = 3;
    for (let i = 0; i < sub; i += 1) {
      if (state.phase !== "play") break;
      resolvePlay(state, dt / sub);
    }
  } else if (state.phase === "resolve") {
    state.resolveT -= dt;
    if (state.resolveT <= 0) finishResolve(state);
  }
}

function runSelfTest() {
  const powers = [0.16, 0.22, 0.34, 0.48, 0.58, 0.7, 0.84, 1];
  console.log("power  aimX  zone     in  out hold  chu   EV  stuck");
  for (const power of powers) {
    const aim = aimFor(power);
    let inn = 0;
    let out = 0;
    let hold = 0;
    let chucker = 0;
    let pay = 0;
    let ev = 0;
    let stuck = 0;
    const ids = {};
    const N = 100;
    for (let i = 0; i < N; i += 1) {
      const s = createState(1000 + i * 17 + Math.round(power * 100));
      s.stock = 3;
      s.phase = "ready";
      s.yen = 500;
      const res = launch(s, power);
      if (!res.ok) {
        stuck += 1;
        continue;
      }
      let guard = 0;
      while (s.phase !== "ready" && s.phase !== "empty" && guard < 8000) {
        step(s, 1 / 120);
        guard += 1;
      }
      if (guard >= 8000) stuck += 1;
      if (s.lastResult === "pocket") {
        inn += 1;
        pay += s.lastPay;
        ids[s.lastId] = (ids[s.lastId] || 0) + 1;
      } else if (s.lastResult === "rensho-hold") hold += 1;
      else out += 1;
      if (s.lastChucker) chucker += 1;
      ev += s.stock - 2;
    }
    const top = Object.entries(ids).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(
      power.toFixed(2).padStart(4),
      String(Math.round(aim.x)).padStart(5),
      aim.tone.padEnd(5),
      String(inn).padStart(4),
      String(out).padStart(4),
      String(hold).padStart(4),
      String(chucker).padStart(5),
      (ev / N).toFixed(2).padStart(6),
      String(stuck).padStart(5),
      top,
    );
  }

  const s = createState(1);
  if (!insertCoin(s) || s.stock !== 25 || s.yen !== 900) {
    console.error("coin failed", s.stock, s.yen);
    process.exitCode = 1;
  }
  const weak = launch(s, 0.05);
  if (weak.ok) {
    console.error("weak launch should fail");
    process.exitCode = 1;
  }
  console.log("coin+weak ok", "stock", s.stock, "yen", s.yen);

  console.log("--- yakumono open ---");
  for (const power of [0.18, 0.35, 0.55, 0.75, 0.92]) {
    let hits = 0;
    const ids = {};
    const N = 60;
    let ev = 0;
    for (let i = 0; i < N; i += 1) {
      const st = createState(4000 + i * 13 + Math.round(power * 50));
      st.stock = 3;
      st.phase = "ready";
      openYakumono(st, { quiet: true, seconds: 20 });
      st.events.length = 0;
      launch(st, power);
      let guard = 0;
      while (st.phase !== "ready" && st.phase !== "empty" && guard < 8000) {
        step(st, 1 / 120);
        guard += 1;
      }
      ev += st.stock - 2;
      if (st.lastResult === "pocket") {
        ids[st.lastId] = (ids[st.lastId] || 0) + 1;
        if (st.lastId === "yL" || st.lastId === "yC" || st.lastId === "yR") hits += 1;
      }
    }
    const aim = aimFor(power);
    const top = Object.entries(ids).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(power.toFixed(2), "x", Math.round(aim.x), "yaku", hits, "EV", (ev / N).toFixed(2), top);
  }
}

const invoked = typeof process !== "undefined" && process.argv?.[1]?.endsWith("sim.js");
if (invoked) runSelfTest();

import {
  VIEW,
  aimFor,
  createState,
  giveBalls,
  insertCoin,
  launch,
  nextStar,
  rerollTable,
  starCount,
  step,
} from "./sim.js";
import { GAZE, HOPPER, render, renderGaze, renderHopper } from "./render.js";

const SAVE_KEY = "smartball-yokomon-v1";

export const PRIZES = [
  { id: "ramune", name: "ラムネ", cost: 20, sell: 50, blurb: "ビー玉のころがる音がする瓶。", hue: 188 },
  { id: "kinako", name: "きなこ棒", cost: 40, sell: 70, blurb: "甘くて素朴な縁日の定番。", hue: 36 },
  { id: "ohajiki", name: "おはじき", cost: 60, sell: 90, blurb: "光るガラスが七つ。", hue: 276 },
  { id: "dagashi", name: "駄菓子袋", cost: 90, sell: 120, blurb: "店主が奥から出してくれる袋。", hue: 8 },
  { id: "hanabi", name: "手持ち花火", cost: 130, sell: 160, blurb: "夜店の匂いがしそうだ。", hue: 4 },
  { id: "kingyo", name: "金魚", cost: 180, sell: 210, blurb: "ぽうっと泳ぐ赤い一匹。", hue: 350 },
  { id: "maneki", name: "招き猫", cost: 250, sell: 280, blurb: "左手をあげて、次の出玉を招く。", hue: 42 },
  { id: "tsuten", name: "通天閣の根付", cost: 360, sell: 400, blurb: "新世界のネオンを小さく閉じ込めた。", hue: 262 },
  { id: "trophy", name: "横モノの杯", cost: 520, sell: 520, blurb: "長く台に座った人だけの杯。", hue: 46 },
];

const MISSION_POOL = [
  { key: "pockets", text: "入賞を8回させる", goal: 8, reward: { balls: 18 } },
  { key: "big", text: "中央の大穴に入れる", goal: 1, reward: { yen: 120, balls: 8 } },
  { key: "rensho", text: "連勝穴をそろえる", goal: 1, reward: { balls: 24 } },
  { key: "yaku", text: "役物に2回入れる", goal: 2, reward: { balls: 20 } },
  { key: "safe", text: "安定穴に6回入れる", goal: 6, reward: { balls: 12 } },
  { key: "combo", text: "コンボを4までつなぐ", goal: 4, reward: { balls: 16 } },
  { key: "fever", text: "フィーバーを起こす", goal: 1, reward: { yen: 200 } },
  { key: "chucker", text: "チャッカーを3回通す", goal: 3, reward: { balls: 10 } },
  { key: "gain", text: "払い出しを40球あつめる", goal: 40, reward: { yen: 100, balls: 10 } },
];

function rewardText(reward) {
  const bits = [];
  if (reward.balls) bits.push(`${reward.balls}球`);
  if (reward.yen) bits.push(`${reward.yen}円`);
  return bits.join("と");
}

export class Game {
  constructor({ canvas, hopper, audio, els }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hopper = hopper;
    this.hopperCtx = hopper.getContext("2d");
    this.audio = audio;
    this.els = els;
    this.state = createState();
    this.fx = { particles: [], rings: [], popups: [], shake: 0, flash: 0, trail: [], trailId: 0 };
    this.paused = false;
    this.missions = [];
    this.lifetime = { pockets: 0, launches: 0, rensho: 0, fever: 0, clears: 0 };
    this.collection = {};
    this.discovered = {};
    this.shownStock = 0;
    this.speechT = 6;
    this.speech = "100円入れると、玉が25個おりてくる。";
    this.pleadAt = -99999;
    this.ironUnlocked = false;
    this.coachSeen = false;
    this.spillWarned = false;
    this.showcase = {
      loose: 0,
      boxed: 0,
      type: "glass",
      looseFallN: 0,
      looseFallAt: 0,
      boxedFallN: 0,
      boxedFallAt: 0,
      tiltX: 0,
      tiltY: 0,
    };
    this.gazeCanvas = null;
    this.gazeCtx = null;
    this.gazeTiltX = 0;
    this.gazeTiltY = 0;
    this.gazeDrag = false;
    this._scReady = false;
    this.missionDirty = true;
    this.keyHold = false;
    this.acc = 0;
    this.lastT = 0;
    this.ui = {};
    this.load();
    this.missions = this.rollMissions();
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.round(VIEW.w * dpr);
    this.canvas.height = Math.round(VIEW.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.hopper.width = Math.round(HOPPER.w * dpr);
    this.hopper.height = Math.round(HOPPER.h * dpr);
    this.hopperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.gazeCanvas && this.gazeCtx) {
      this.gazeCanvas.width = Math.round(GAZE.w * dpr);
      this.gazeCanvas.height = Math.round(GAZE.h * dpr);
      this.gazeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  attachGaze(canvas) {
    this.gazeCanvas = canvas;
    this.gazeCtx = canvas.getContext("2d");
    this.gazeTiltX = 0;
    this.gazeTiltY = 0;
    this.gazeDrag = false;
    this.resize();
  }

  detachGaze() {
    this.gazeCanvas = null;
    this.gazeCtx = null;
    this.gazeDrag = false;
    this.gazeTiltX = 0;
    this.gazeTiltY = 0;
  }

  tickShowcase(now) {
    const loose = Math.max(0, this.state.stock - this.state.boxedAt);
    const boxed = Math.max(0, Math.min(this.state.stock, this.state.boxedAt));
    const sc = this.showcase;
    if (!this._scReady) {
      this._scReady = true;
    } else {
      const dL = loose - sc.loose;
      const dB = boxed - sc.boxed;
      if (dL > 0) {
        sc.looseFallN = Math.min(48, dL);
        sc.looseFallAt = now;
      } else if (dL < 0) {
        sc.looseFallN = 0;
      }
      if (dB > 0) {
        sc.boxedFallN = Math.min(48, dB);
        sc.boxedFallAt = now;
      } else if (dB < 0) {
        sc.boxedFallN = 0;
      }
    }
    sc.loose = loose;
    sc.boxed = boxed;
    sc.type = this.state.ballType;
    if (this.gazeCtx && !this.gazeDrag) {
      this.gazeTiltX *= 0.9;
      this.gazeTiltY *= 0.9;
    }
    const sway = this.gazeCtx && !this.gazeDrag ? Math.sin(now / 1000 * 0.75) * 0.22 : 0;
    const tx = (this.gazeCtx ? this.gazeTiltX : 0) + sway;
    const ty = this.gazeCtx ? this.gazeTiltY : 0;
    sc.tiltX += (tx - sc.tiltX) * 0.18;
    sc.tiltY += (ty - sc.tiltY) * 0.18;
    sc.looseFallAge = sc.looseFallAt ? (now - sc.looseFallAt) / 1000 : 99;
    sc.boxedFallAge = sc.boxedFallAt ? (now - sc.boxedFallAt) / 1000 : 99;
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return;
      if (Number.isFinite(data.yen)) this.state.yen = data.yen;
      if (Number.isFinite(data.bestStock)) this.state.bestStock = data.bestStock;
      if (data.lifetime) this.lifetime = { ...this.lifetime, ...data.lifetime };
      if (data.collection) this.collection = data.collection;
      if (data.discovered) this.discovered = data.discovered;
      if (data.ballType === "iron" || data.ballType === "glass") this.state.ballType = data.ballType;
      if (typeof data.guide === "boolean") this.state.guide = data.guide;
      this.ironUnlocked = !!data.ironUnlocked || this.lifetime.pockets >= 25;
      this.coachSeen = !!data.coachSeen;
      if (data.audio) {
        if (Number.isFinite(data.audio.master)) this.audio.masterVol = data.audio.master;
        if (Number.isFinite(data.audio.bgm)) this.audio.bgmVol = data.audio.bgm;
        if (Number.isFinite(data.audio.se)) this.audio.seVol = data.audio.se;
        this.audio.muted = !!data.audio.muted;
        this.audio.applyGains();
      }
    } catch {
      // 壊れた保存データは無視して、初回の台として始める。
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1,
        yen: this.state.yen,
        bestStock: this.state.bestStock,
        lifetime: this.lifetime,
        collection: this.collection,
        discovered: this.discovered,
        ballType: this.state.ballType,
        guide: this.state.guide,
        ironUnlocked: this.ironUnlocked,
        coachSeen: this.coachSeen,
        audio: {
          master: this.audio.masterVol,
          bgm: this.audio.bgmVol,
          se: this.audio.seVol,
          muted: this.audio.muted,
        },
      }));
    } catch {
      // プライベートモードなどで保存できない場合も、その場の遊技は続ける。
    }
  }

  rollMissions() {
    const bag = [...MISSION_POOL].sort(() => Math.random() - 0.5);
    return bag.slice(0, 3).map((m) => ({ ...m, prog: 0, done: false }));
  }

  say(text, seconds = 3.4) {
    this.speech = text;
    this.speechT = seconds;
  }

  pump() {
    const events = this.state.events.splice(0, this.state.events.length);
    for (const ev of events) this.onEvent(ev);
  }

  start() {
    const loop = (t) => {
      const dt = this.lastT ? Math.min(0.05, (t - this.lastT) / 1000) : 0;
      this.lastT = t;
      if (!this.paused) {
        if (this.keyHold && this.state.phase === "ready") {
          this.state.powerPreview = Math.min(1, this.state.powerPreview + dt * 1.15);
        }
        this.acc += dt;
        let n = 0;
        const h = 1 / 120;
        while (this.acc >= h && n < 8) {
          step(this.state, h);
          this.acc -= h;
          n += 1;
        }
        if (n === 8) this.acc = 0;
        this.pump();
        this.audio.setTempo(this.state.fever > 0 ? 1.08 : 1);
        this.audio.schedule();
        this.trackTrail();
        if (this.speechT > 0) this.speechT -= dt;
      }
      this.updateFx(dt);
      this.tickShowcase(t);
      render(this.ctx, this.state, this.fx, t / 1000);
      renderHopper(this.hopperCtx, this.showcase, t / 1000);
      if (this.gazeCtx) renderGaze(this.gazeCtx, this.showcase, t / 1000);
      this.sync();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  trackTrail() {
    const ball = this.state.ball;
    if (!ball) {
      if (this.state.phase === "ready" || this.state.phase === "empty" || this.state.phase === "attract") {
        this.fx.trail = [];
      }
      return;
    }
    if (this.fx.trailId !== ball.shotId) {
      this.fx.trail = [];
      this.fx.trailId = ball.shotId;
    }
    const last = this.fx.trail[this.fx.trail.length - 1];
    if (!last || Math.hypot(ball.x - last.x, ball.y - last.y) > 4) {
      this.fx.trail.push({ x: ball.x, y: ball.y });
      if (this.fx.trail.length > 18) this.fx.trail.shift();
    }
  }

  updateFx(dt) {
    for (const p of this.fx.particles) {
      p.life -= dt;
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (this.fx.particles.length > 200) this.fx.particles.splice(0, this.fx.particles.length - 200);
    this.fx.particles = this.fx.particles.filter((p) => p.life > 0);
    for (const ring of this.fx.rings) {
      ring.life -= dt;
      ring.r += 80 * dt;
    }
    this.fx.rings = this.fx.rings.filter((r) => r.life > 0);
    for (const pop of this.fx.popups) {
      pop.life -= dt;
      pop.y -= 26 * dt;
    }
    this.fx.popups = this.fx.popups.filter((p) => p.life > 0);
    this.fx.shake = Math.max(0, this.fx.shake - dt * 16);
    this.fx.flash = Math.max(0, this.fx.flash - dt * 1.3);
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.75);
      this.fx.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.45 + Math.random() * 0.45,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3.2,
      });
    }
  }

  ring(x, y, color) {
    this.fx.rings.push({ x, y, r: 10, life: 0.55, color });
  }

  popup(x, y, text, color, size = 24) {
    this.fx.popups.push({ x, y, text, color, life: 0.9, size });
  }

  fly(x, y, text) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = rect.left + (x / VIEW.w) * rect.width;
    const sy = rect.top + (y / VIEW.h) * rect.height;
    const el = document.createElement("div");
    el.className = "fly";
    el.textContent = text;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    document.body.appendChild(el);
    const dest = this.els.stock.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dest.left + dest.width / 2 - sx}px, ${dest.top + dest.height / 2 - sy}px) scale(0.45)`;
      el.style.opacity = "0";
    });
    setTimeout(() => el.remove(), 720);
  }

  onEvent(ev) {
    const s = this.state;
    if (ev.type === "coin") {
      this.audio.play("coin");
      this.audio.play("payout", { pay: 12 });
      this.say("25球、おりてきた。右のレバーを下へ引いて、離す。");
      this.burst(590, 180, "#ffe08a", 22, 180);
    } else if (ev.type === "launch") {
      this.audio.play("launch");
      this.lifetime.launches += 1;
    } else if (ev.type === "weak") {
      this.audio.play("weak");
      this.say("もう少し引いて。軽すぎると玉は出ない。");
    } else if (ev.type === "busy") {
      this.audio.play("busy");
    } else if (ev.type === "empty") {
      this.say(s.yen >= 100 ? "玉がない。もう100円いれる？" : "持ち金が心もとないね。");
    } else if (ev.type === "pin") {
      this.audio.play("pin", { speed: ev.speed });
    } else if (ev.type === "bumper") {
      this.audio.play("bumper");
      this.burst(ev.x, ev.y, "#ffd0e0", 10, 140);
      if (ev.pay) this.popup(ev.x, ev.y - 10, "+1", "#fff");
    } else if (ev.type === "nearmiss") {
      this.audio.play("nearmiss");
      this.popup(ev.x, ev.y - 16, "惜しい", "#ffd0a8", 16);
    } else if (ev.type === "chucker") {
      this.audio.play("chucker");
      this.popup(ev.x, ev.y, `+${ev.pay}`, "#b8fff6", 18);
      this.ring(ev.x, ev.y, "#7ef0ff");
      this.say("チャッカー通過。この玉が落ちたら、役物が開く。");
      this.noteMission(ev);
    } else if (ev.type === "yaku-open") {
      this.audio.play("yaku-open");
      this.say("役物が開いた。開いているうちに、15の穴を狙って。");
      this.burst(274, 680, "#ffd166", 26, 200);
    } else if (ev.type === "yaku-close") {
      this.audio.play("yaku-close");
    } else if (ev.type === "rensho-hold") {
      this.audio.play("rensho-hold");
      this.popup(ev.x, ev.y - 18, "待機", "#e5d0ff", 16);
      this.say("連勝穴の片方がはまった。もう一方に入れると払い出し。");
    } else if (ev.type === "pocket") {
      const rich = ev.kind === "rensho" || ev.kind === "yakumono" || ev.kind === "big";
      this.audio.play(ev.kind === "rensho" ? "rensho" : "pocket", { pay: ev.pay });
      this.audio.play("payout", { pay: ev.pay });
      this.popup(ev.x, ev.y - 12, `+${ev.pay}`, rich ? "#ffe56a" : "#fffdf2", rich ? 30 : 22);
      this.ring(ev.x, ev.y, rich ? "#ffd166" : "#fff");
      this.burst(ev.x, ev.y, rich ? "#ffd166" : "#fff6d0", rich ? 28 : 14, rich ? 240 : 160);
      this.fx.shake = rich ? 9 : 3.5;
      this.fx.flash = rich ? 0.38 : 0.08;
      this.fly(ev.x, ev.y, `+${ev.pay}`);
      this.lifetime.pockets += 1;
      if (ev.kind === "rensho") this.lifetime.rensho += 1;
      if (!this.ironUnlocked && this.lifetime.pockets >= 25) {
        this.ironUnlocked = true;
        this.audio.play("star");
        this.say("鉄球が使えるようになった。重くて、穴に沈みやすい。");
      } else if (ev.kind === "rensho") {
        this.say(ev.combo >= 3 ? `${ev.combo}コンボ！ 連勝穴がそろった。` : "連勝穴がそろった！");
      } else if (ev.kind === "yakumono") {
        this.say(ev.combo >= 3 ? `${ev.combo}コンボ！ 役物に入った。` : "役物に入った！");
      } else if (ev.hot) {
        this.say(`熱い穴だ。${ev.pay}球。`);
      } else if (ev.combo >= 3) {
        this.say(`${ev.combo}コンボ！ ${ev.name}で${ev.pay}球。`);
      } else {
        this.say(`${ev.name}。${ev.pay}球もらった。`);
      }
      this.noteMission(ev);
      if (navigator.vibrate) navigator.vibrate(rich ? 28 : 10);
    } else if (ev.type === "out") {
      this.audio.play("out");
      this.popup(ev.x, ev.y - 10, "アウト", "#ffb4b4", 18);
      const lines = ["アウト。力を少し変えてみよう。", "惜しいねえ。", "今のは唇で跳ねた。少し弱く。"];
      this.say(lines[Math.floor(Math.random() * lines.length)]);
    } else if (ev.type === "fever-start") {
      this.audio.play("fever");
      this.fx.flash = 0.55;
      this.fx.shake = 10;
      this.lifetime.fever += 1;
      this.say("フィーバー！ しばらく払い出しが増える。");
      this.noteMission({ type: "fever" });
      this.burst(274, 400, "#ff4d6d", 36, 280);
    } else if (ev.type === "fever-end") {
      this.say("フィーバーが終わった。また熱をためよう。");
    } else if (ev.type === "service") {
      this.audio.play("service");
      this.say(`毎度あり。サービス${ev.pay}球だよ。`);
      this.burst(300, 200, "#fff1a8", 20, 180);
    } else if (ev.type === "big-service") {
      this.audio.play("fever");
      this.say("大サービス！ 店主が本気を出した。");
      this.fx.flash = 0.45;
    } else if (ev.type === "star") {
      this.audio.play("star");
      this.fx.flash = 0.4;
      this.say(`星が${ev.stars}つ。長く座ってくれて、ありがとう。`);
      this.save();
    } else if (ev.type === "reroll") {
      this.audio.play("ui");
      const hot = s.pockets.find((p) => p.id === ev.hotId);
      this.say(`台を入れ替えた。今日熱いのは${hot ? hot.name : "どこか"}。`);
    } else if (ev.type === "cap") {
      this.say("持ち玉が満杯。あふれた分はコインにした。");
    }
  }

  noteMission(ev) {
    let changed = false;
    for (const m of this.missions) {
      if (m.done) continue;
      let hit = false;
      if (m.key === "pockets" && ev.type === "pocket") hit = true;
      else if (m.key === "big" && ev.kind === "big") hit = true;
      else if (m.key === "rensho" && ev.kind === "rensho") hit = true;
      else if (m.key === "yaku" && ev.kind === "yakumono") hit = true;
      else if (m.key === "safe" && ev.id === "safe") hit = true;
      else if (m.key === "combo" && ev.type === "pocket") {
        m.prog = Math.max(m.prog, ev.combo || 0);
        changed = true;
      } else if (m.key === "chucker" && ev.type === "chucker") hit = true;
      else if (m.key === "gain" && (ev.type === "pocket" || ev.type === "chucker")) {
        m.prog += ev.pay || 0;
        changed = true;
      } else if (m.key === "fever" && ev.type === "fever") hit = true;
      if (hit) {
        m.prog += 1;
        changed = true;
      }
      if (m.prog >= m.goal && !m.done) {
        m.prog = m.goal;
        m.done = true;
        this.payMission(m);
      }
    }
    if (this.missions.length && this.missions.every((m) => m.done)) {
      giveBalls(this.state, 30);
      this.lifetime.clears += 1;
      this.audio.play("service");
      this.say("今日のお題、全部クリア。サービスで30球。");
      this.missions = this.rollMissions();
      changed = true;
      this.save();
    }
    if (changed) this.missionDirty = true;
  }

  payMission(m) {
    if (m.reward.balls) giveBalls(this.state, m.reward.balls);
    if (m.reward.yen) this.state.yen = Math.min(999999, this.state.yen + m.reward.yen);
    this.audio.play("prize");
    this.say(`お題クリア。「${m.text}」で${rewardText(m.reward)}。`);
    this.save();
  }

  setPreview(power) {
    if (this.state.phase !== "ready") return;
    this.state.powerPreview = Math.max(0, Math.min(1, power));
  }

  release() {
    this.keyHold = false;
    const power = this.state.powerPreview;
    this.state.powerPreview = 0;
    launch(this.state, power);
    this.pump();
  }

  repeat() {
    this.audio.unlock();
    if (this.state.lastPower == null) {
      this.say("まずはレバーで、自分の力加減を覚えよう。");
      return;
    }
    this.state.powerPreview = 0;
    launch(this.state, this.state.lastPower);
    this.pump();
  }

  coin() {
    this.audio.unlock();
    if (this.state.yen < 100) {
      this.say("100円たりない。景品をコインに戻すか、店主を頼って。");
      return false;
    }
    insertCoin(this.state);
    this.pump();
    this.save();
    return true;
  }

  box() {
    const spill = this.state.stock - this.state.boxedAt;
    if (spill < 8) {
      this.say("まだ、箱にしまうほどは積もってない。");
      return;
    }
    this.state.boxedAt = this.state.stock;
    this.audio.play("box");
    if (Math.random() < 0.22) {
      giveBalls(this.state, 1);
      this.say("箱にしまった。底に玉がひとつ残っていた。");
    } else {
      this.say("箱にしまった。窓ごしに、玉を眺められる。");
    }
  }

  plead() {
    const now = performance.now();
    if (this.state.yen >= 100 || this.state.stock > 0) return;
    if (now - this.pleadAt < 20000) {
      this.say("店主は今、奥でお茶を飲んでる。少し待って。");
      return;
    }
    this.pleadAt = now;
    this.audio.unlock();
    this.state.yen += 100;
    this.audio.play("plead");
    insertCoin(this.state);
    this.pump();
    this.say("店主が100円貸してくれた。また遊べるよ。");
    this.save();
  }

  reroll() {
    if (!rerollTable(this.state)) {
      this.say("玉が転がっているあいだは、台を替えられない。");
      this.pump();
      return;
    }
    this.pump();
  }

  setBall(type) {
    if (type === "iron" && !this.ironUnlocked) {
      this.say(`鉄球は入賞25回で開く。いま${this.lifetime.pockets}回。`);
      return;
    }
    const moving = ["lane", "rail", "drop", "play"].includes(this.state.phase);
    if (moving) {
      this.say("この玉が落ちてから替えよう。");
      return;
    }
    this.state.ballType = type;
    this.say(type === "iron" ? "鉄球にした。重くて、穴に沈みやすい。" : "ガラス玉にした。軽くて、よく跳ねる。");
    this.save();
  }

  setGuide(on) {
    this.state.guide = on;
    this.save();
  }

  exchange(id) {
    const prize = PRIZES.find((p) => p.id === id);
    if (!prize) return;
    if (this.state.stock < prize.cost) {
      this.say(`まだ${prize.cost - this.state.stock}球たりない。`);
      return;
    }
    this.state.stock -= prize.cost;
    if (this.state.stock === 0 && (this.state.phase === "ready" || this.state.phase === "attract")) {
      this.state.phase = "empty";
    }
    this.collection[id] = (this.collection[id] || 0) + 1;
    const first = !this.discovered[id];
    this.discovered[id] = true;
    this.audio.unlock();
    this.audio.play("prize");
    this.fx.flash = 0.45;
    this.burst(300, 300, `hsl(${prize.hue} 90% 62%)`, 30, 220);
    this.say(first ? `${prize.name}を、はじめて手に入れた。` : `${prize.name}を、もう一つ交換した。`);
    this.save();
  }

  sell(id) {
    const prize = PRIZES.find((p) => p.id === id);
    if (!prize || !(this.collection[id] > 0)) return;
    this.collection[id] -= 1;
    this.state.yen = Math.min(999999, this.state.yen + prize.sell);
    this.audio.play("coin");
    this.say(`${prize.name}を${prize.sell}円にした。また玉が買える。`);
    this.save();
  }

  markCoach() {
    this.coachSeen = true;
    this.save();
  }

  sync() {
    const s = this.state;
    const els = this.els;
    if (this.shownStock !== s.stock) {
      const diff = s.stock - this.shownStock;
      this.shownStock += Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.35);
      if (Math.abs(s.stock - this.shownStock) < 0.6) this.shownStock = s.stock;
    }
    const stockText = String(Math.round(this.shownStock));
    if (this.ui.stock !== stockText) {
      if (this.ui.stock != null && Number(stockText) > Number(this.ui.stock)) els.stock.classList.add("bump");
      els.stock.textContent = stockText;
      this.ui.stock = stockText;
      clearTimeout(this._bump);
      this._bump = setTimeout(() => els.stock.classList.remove("bump"), 180);
    }
    const yenText = `${s.yen.toLocaleString("ja-JP")}円`;
    if (this.ui.yen !== yenText) {
      els.yen.textContent = yenText;
      this.ui.yen = yenText;
    }
    const best = String(s.bestStock);
    if (this.ui.best !== best) {
      els.best.textContent = best;
      this.ui.best = best;
    }
    const next = nextStar(s.bestStock);
    const nextText = next ? `あと${next - s.bestStock}` : "満点";
    if (this.ui.next !== nextText) {
      els.nextStar.textContent = nextText;
      this.ui.next = nextText;
    }
    const stars = starCount(s.bestStock);
    const starText = `${"★".repeat(stars)}${"☆".repeat(Math.max(0, 6 - stars))}`;
    if (this.ui.stars !== starText) {
      els.stars.textContent = starText;
      this.ui.stars = starText;
    }
    const remain = s.stats.launches % 40 === 0 && s.stats.launches > 0 ? 40 : 40 - (s.stats.launches % 40);
    const remainText = `あと${remain}球`;
    if (this.ui.remain !== remainText) {
      els.service.textContent = remainText;
      this.ui.remain = remainText;
    }
    const renL = s.pockets.find((p) => p.id === "renL")?.held;
    const renR = s.pockets.find((p) => p.id === "renR")?.held;
    const renText = `左${renL ? "●" : "○"} 右${renR ? "●" : "○"}`;
    if (this.ui.ren !== renText) {
      els.rensho.textContent = renText;
      this.ui.ren = renText;
    }
    const hot = s.pockets.find((p) => p.id === s.hotId);
    const hotText = hot ? `${hot.name}（+3）` : "—";
    if (this.ui.hot !== hotText) {
      els.hot.textContent = hotText;
      this.ui.hot = hotText;
    }
    const speech = this.speechT > 0 ? this.speech : "右のレバーを下に引いて、離すと玉が出る。";
    if (this.ui.speech !== speech) {
      els.speech.textContent = speech;
      this.ui.speech = speech;
    }
    const aim = s.powerPreview >= 0.12 ? aimFor(s.powerPreview) : null;
    const aimText = aim ? `ねらい：${aim.zone}（${aim.hint}）` : (s.lastPower ? "白線は、前回の力加減。" : "レバーを下に引いて、離す。");
    if (this.ui.aim !== aimText) {
      els.aim.textContent = aimText;
      this.ui.aim = aimText;
    }
    const lamps = Math.round((s.fever > 0 ? 100 : s.heat) / 100 * els.heat.children.length);
    if (this.ui.lamps !== lamps) {
      [...els.heat.children].forEach((lamp, i) => lamp.classList.toggle("on", i < lamps));
      this.ui.lamps = lamps;
    }
    els.fever.hidden = s.fever <= 0;
    if (s.combo >= 2 && s.comboTimer > 0) {
      els.combo.hidden = false;
      const comboText = `${s.combo} COMBO`;
      if (this.ui.combo !== comboText) els.combo.textContent = comboText;
      this.ui.combo = comboText;
    } else {
      els.combo.hidden = true;
    }
    document.body.classList.toggle("fever", s.fever > 0);
    const canCoin = s.yen >= 100;
    els.coin.disabled = !canCoin;
    els.coin.classList.toggle("hot", canCoin && (s.phase === "attract" || s.phase === "empty"));
    const broke = s.yen < 100 && s.stock === 0 && (s.phase === "empty" || s.phase === "attract");
    els.plead.hidden = !broke;
    els.repeat.disabled = s.lastPower == null || s.phase !== "ready";
    els.box.disabled = s.stock - s.boxedAt < 8;
    els.glass.classList.toggle("on", s.ballType === "glass");
    els.iron.classList.toggle("on", s.ballType === "iron");
    els.iron.disabled = !this.ironUnlocked;
    els.iron.title = this.ironUnlocked ? "重くて穴に落ちやすい" : `入賞${this.lifetime.pockets}/25で解禁`;
    els.guide.checked = s.guide !== false;
    const spill = s.stock - s.boxedAt;
    const gazeCount = document.getElementById("gaze-count");
    if (gazeCount) {
      const kind = s.ballType === "iron" ? "鉄球" : "ガラス玉";
      gazeCount.textContent = `受け皿 ${spill}、箱 ${Math.min(s.boxedAt, s.stock)}。あわせて ${s.stock} の${kind}。皿をドラッグすると、山を傾けて見られる。`;
    }
    if (spill >= 80 && !this.spillWarned) {
      this.spillWarned = true;
      this.say("受け皿が山になった。箱にしまうと、箱の窓から眺められる。");
    }
    if (spill < 8) this.spillWarned = false;
    if (this.missionDirty) {
      els.missions.innerHTML = this.missions.map((m) => (
        `<li class="${m.done ? "done" : ""}"><span>${m.text}</span><b>${Math.min(m.goal, Math.floor(m.prog))}/${m.goal}</b><small>${rewardText(m.reward)}</small></li>`
      )).join("");
      this.missionDirty = false;
    }
  }
}

// 効果音とBGMはすべてWeb Audioでその場で鳴らす。外部ファイルは使わない。

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.se = null;
    this.bgm = null;
    this.masterVol = 0.75;
    this.bgmVol = 0.42;
    this.seVol = 0.85;
    this.muted = false;
    this.tempoMul = 1;
    this.barIndex = 0;
    this.nextBar = 0;
    this.started = false;
    this._pinAt = 0;
    this._noise = null;
  }

  unlock() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.se = ctx.createGain();
      this.bgm = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 16;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.24;
      this.se.connect(comp);
      comp.connect(this.master);
      this.bgm.connect(this.master);
      this.master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.4);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      this._noise = buf;
      this.applyGains();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.started = true;
    if (!this.nextBar) this.nextBar = this.ctx.currentTime + 0.12;
  }

  applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVol, t, 0.03);
    this.bgm.gain.setTargetAtTime(this.bgmVol, t, 0.05);
    this.se.gain.setTargetAtTime(this.seVol, t, 0.02);
  }

  setMaster(v) { this.masterVol = v; this.applyGains(); }
  setBgm(v) { this.bgmVol = v; this.applyGains(); }
  setSe(v) { this.seVol = v; this.applyGains(); }
  setMuted(m) { this.muted = m; this.applyGains(); }
  setTempo(mul) { this.tempoMul = mul; }

  duck() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bgm.gain.setTargetAtTime(this.bgmVol * 0.4, t, 0.02);
    this.bgm.gain.setTargetAtTime(this.bgmVol, t + 0.28, 0.12);
  }

  tone(freq, dur, type, gain, slide) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.se);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  toneAt(when, freq, dur, type, gain, slide) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(Math.max(40, freq), when);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + Math.min(0.02, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(this.se);
    o.start(when);
    o.stop(when + dur + 0.03);
  }

  burst(dur, gain, freq, q) {
    if (!this.ctx || !this._noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq || 900;
    filter.Q.value = q || 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.se);
    const offset = Math.random() * Math.max(0, this._noise.duration - dur);
    src.start(t, offset, dur);
  }

  play(name, opt = {}) {
    if (!this.started) return;
    const pay = opt.pay || 5;
    switch (name) {
      case "coin":
        this.tone(880, 0.08, "triangle", 0.12);
        this.tone(1320, 0.14, "triangle", 0.1);
        this.burst(0.18, 0.08, 1800, 0.5);
        break;
      case "launch":
        this.burst(0.22, 0.16, 400, 0.4);
        this.tone(240, 0.18, "sine", 0.1, 90);
        break;
      case "weak":
        this.tone(140, 0.12, "sine", 0.06);
        break;
      case "pin": {
        const now = this.ctx.currentTime;
        if (now - this._pinAt < 0.045) break;
        this._pinAt = now;
        const f = 420 + Math.min(900, (opt.speed || 200) * 0.7);
        this.tone(f, 0.045, "triangle", 0.035);
        break;
      }
      case "pocket":
        this.duck();
        this.arpeggio(pay >= 15 ? [523, 659, 784, 1046] : pay >= 8 ? [440, 554, 659] : [392, 494, 587], 0.09, 0.11);
        this.burst(0.12, 0.08, 1400, 1);
        break;
      case "payout":
        for (let i = 0; i < Math.min(8, 3 + Math.round(pay / 4)); i += 1) {
          this.toneAt(this.ctx.currentTime + i * 0.045, 700 + (i % 3) * 90, 0.05, "square", 0.03);
        }
        this.burst(0.25, 0.05, 2200, 0.4);
        break;
      case "out":
        this.tone(200, 0.2, "sine", 0.07, 70);
        break;
      case "chucker":
        this.tone(660, 0.08, "square", 0.05);
        this.tone(990, 0.12, "square", 0.05);
        break;
      case "yaku-open":
        this.tone(280, 0.22, "sawtooth", 0.04, 880);
        this.burst(0.15, 0.06, 600, 0.6);
        break;
      case "yaku-close":
        this.tone(440, 0.1, "sine", 0.04, 180);
        break;
      case "rensho-hold":
        this.burst(0.08, 0.1, 220, 0.8);
        this.tone(520, 0.1, "triangle", 0.07);
        break;
      case "rensho":
        this.duck();
        this.arpeggio([523, 659, 784, 1046, 1318], 0.1, 0.12);
        break;
      case "fever":
        this.duck();
        this.arpeggio([392, 523, 659, 784, 1046, 1318], 0.08, 0.13);
        this.burst(0.3, 0.08, 500, 0.4);
        break;
      case "service":
        this.arpeggio([523, 659, 784, 1046], 0.09, 0.09);
        break;
      case "prize":
        this.duck();
        this.arpeggio([659, 831, 988, 1318], 0.11, 0.12);
        break;
      case "ui":
        this.tone(740, 0.05, "sine", 0.04);
        break;
      case "bumper":
        this.tone(300, 0.08, "square", 0.05, 620);
        break;
      case "box":
        this.burst(0.14, 0.09, 180, 0.5);
        this.tone(180, 0.1, "triangle", 0.05);
        break;
      case "nearmiss":
        this.tone(760, 0.12, "sine", 0.04, 380);
        break;
      case "plead":
        this.tone(330, 0.16, "triangle", 0.06);
        this.tone(415, 0.18, "triangle", 0.05);
        break;
      case "star":
        this.arpeggio([880, 1174, 1568, 2093], 0.07, 0.08);
        break;
      case "busy":
        this.tone(180, 0.05, "square", 0.03);
        break;
      default:
        break;
    }
  }

  arpeggio(notes, step, dur) {
    const t = this.ctx.currentTime;
    notes.forEach((n, i) => this.toneAt(t + i * step, n, dur, "triangle", 0.07));
  }

  schedule() {
    if (!this.started || !this.ctx) return;
    const beat = (60 / 96) / this.tempoMul;
    const bar = beat * 4;
    if (!this.nextBar) this.nextBar = this.ctx.currentTime + 0.1;
    let guard = 0;
    while (this.nextBar < this.ctx.currentTime + 0.32 && guard < 4) {
      this.playBar(this.nextBar, this.barIndex % 8, beat);
      this.barIndex += 1;
      this.nextBar += bar;
      guard += 1;
    }
  }

  playBar(when, index, beat) {
    const bass = [98, 98, 73, 87, 98, 110, 87, 73][index];
    this.pad(when, bass, beat * 1.6, 0.018);
    this.pad(when + beat * 2, bass * 1.5, beat, 0.012);
    for (let i = 0; i < 4; i += 1) {
      this.hat(when + beat * i, i % 2 === 0 ? 0.012 : 0.008);
    }
    const melody = [
      [392, 494, 587, 494],
      [440, 0, 523, 392],
      [349, 440, 523, 587],
      [392, 330, 392, 494],
      [523, 494, 440, 392],
      [0, 440, 0, 523],
      [392, 494, 0, 587],
      [440, 392, 330, 294],
    ][index];
    melody.forEach((n, i) => {
      if (!n) return;
      this.pad(when + beat * i, n, beat * 0.85, 0.02, "triangle");
    });
  }

  pad(when, freq, dur, gain, type = "sine") {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(this.bgm);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  hat(when, gain) {
    if (!this._noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgm);
    src.start(when, Math.random() * 0.2, 0.05);
  }
}

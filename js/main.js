import { VIEW } from "./sim.js";
import { AudioEngine } from "./audio.js";
import { Game, PRIZES } from "./game.js";

const $ = (id) => document.getElementById(id);

const audio = new AudioEngine();
const canvas = $("board");

for (const row of document.querySelectorAll(".bulb-row")) {
  for (let i = 0; i < 16; i += 1) {
    const bulb = document.createElement("i");
    bulb.style.setProperty("--i", String(i));
    row.appendChild(bulb);
  }
}

const heat = $("heat");
for (let i = 0; i < 12; i += 1) {
  heat.appendChild(document.createElement("i"));
}

const game = new Game({
  canvas,
  audio,
  els: {
    stock: $("stock"),
    yen: $("yen"),
    best: $("best"),
    nextStar: $("next-star"),
    stars: $("stars"),
    service: $("service-left"),
    rensho: $("rensho-readout"),
    hot: $("hot-readout"),
    speech: $("speech"),
    aim: $("aim"),
    heat,
    fever: $("fever"),
    combo: $("combo"),
    coin: $("coin"),
    plead: $("plead"),
    repeat: $("repeat"),
    box: $("box"),
    glass: $("ball-glass"),
    iron: $("ball-iron"),
    guide: $("guide"),
    missions: $("missions"),
  },
});

const modal = $("modal");

function pos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW.w,
    y: ((event.clientY - rect.top) / rect.height) * VIEW.h,
  };
}

let pull = null;

canvas.addEventListener("pointerdown", (event) => {
  const p = pos(event);
  if (p.x < 520) return;
  audio.unlock();
  pull = { y: p.y, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
  game.setPreview(0);
  event.preventDefault();
});

canvas.addEventListener("pointermove", (event) => {
  if (!pull || pull.id !== event.pointerId) return;
  const p = pos(event);
  game.setPreview((p.y - pull.y) / 210);
});

function endPull(event) {
  if (!pull || (event && pull.id !== event.pointerId)) return;
  pull = null;
  game.release();
}

canvas.addEventListener("pointerup", endPull);
canvas.addEventListener("pointercancel", () => {
  if (!pull) return;
  pull = null;
  game.state.powerPreview = 0;
});

let keyCharging = false;
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === "Space" || event.code === "ArrowDown") {
    event.preventDefault();
    if (event.repeat || !modal.hidden) return;
    audio.unlock();
    keyCharging = true;
    game.keyHold = true;
  } else if (event.code === "Enter" || event.code === "KeyR") {
    event.preventDefault();
    if (!modal.hidden) return;
    game.repeat();
  } else if (event.code === "KeyC") {
    if (!modal.hidden) return;
    game.coin();
  } else if (event.code === "KeyB") {
    if (!modal.hidden) return;
    game.box();
  } else if (event.code === "KeyM") {
    toggleMute();
  } else if (event.code === "Escape") {
    closeModal();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code !== "Space" && event.code !== "ArrowDown") return;
  if (!keyCharging) return;
  keyCharging = false;
  game.release();
});

$("coin").addEventListener("click", () => game.coin());
$("repeat").addEventListener("click", () => game.repeat());
$("box").addEventListener("click", () => game.box());
$("plead").addEventListener("click", () => game.plead());
$("reroll").addEventListener("click", () => game.reroll());
$("ball-glass").addEventListener("click", () => game.setBall("glass"));
$("ball-iron").addEventListener("click", () => game.setBall("iron"));
$("guide").addEventListener("change", (event) => game.setGuide(event.target.checked));

function bindSlider(id, apply) {
  const input = $(id);
  input.addEventListener("input", () => {
    audio.unlock();
    apply(Number(input.value) / 100);
    game.save();
  });
}

bindSlider("vol", (v) => audio.setMaster(v));
bindSlider("bgm", (v) => audio.setBgm(v));
bindSlider("se", (v) => audio.setSe(v));

function toggleMute() {
  audio.unlock();
  audio.setMuted(!audio.muted);
  $("mute").textContent = audio.muted ? "音を戻す" : "音を消す";
  $("mute").setAttribute("aria-pressed", audio.muted ? "true" : "false");
  game.save();
}

$("mute").addEventListener("click", toggleMute);

function syncAudioControls() {
  $("vol").value = String(Math.round(audio.masterVol * 100));
  $("bgm").value = String(Math.round(audio.bgmVol * 100));
  $("se").value = String(Math.round(audio.seVol * 100));
  $("mute").textContent = audio.muted ? "音を戻す" : "音を消す";
  $("mute").setAttribute("aria-pressed", audio.muted ? "true" : "false");
}

function openModal(kind, html) {
  modal.dataset.kind = kind;
  modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  modal.hidden = false;
  game.paused = true;
  modal.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", closeModal));
}

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  modal.innerHTML = "";
  game.paused = false;
  if (!game.coachSeen) game.markCoach();
}

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

function helpHtml(first) {
  return `
    <p class="eyebrow">遊び方</p>
    <h2>横モノのスマートボール</h2>
    <ol>
      <li>「100円投入」で玉が25個、受け皿に落ちてくる。</li>
      <li>右の赤いレバーを下に引いて離す。強く引くほど、玉は左のほうへ落ちる。</li>
      <li>右の安定穴は入りやすく、5球。中央の15は速すぎると唇で跳ねる。</li>
      <li>Sのチャッカーを通すと、下の役物が開く。開いた穴に入ると15球。入った口は閉じる。</li>
      <li>「連」の穴は、左右そろってはじめて払い出される。</li>
      <li>玉がガラスに積もったら「箱にしまう」。20球から、縁日の景品と交換できる。</li>
    </ol>
    <p>同じ力で打てるように、ゲージの白線が前回の強さを覚えている。スペースキーの長押しでもレバーになる。</p>
    <p class="note">これは現金の動かないおもちゃです。景品はブラウザの中のコレクションで、実物とは交換できません。</p>
    <button type="button" data-close>${first ? "台につく" : "とじる"}</button>
  `;
}

function prizeCard(prize, mode) {
  const owned = game.collection[prize.id] || 0;
  const known = !!game.discovered[prize.id];
  const afford = game.state.stock >= prize.cost;
  if (mode === "book" && !known) {
    return `<article class="prize locked"><div class="medal" style="--h:${prize.hue}">?</div><h3>？？？</h3><p>${prize.cost}球で交換すると、中身がわかる。</p></article>`;
  }
  const actions = mode === "book"
    ? `<p class="own">所持 ${owned}</p>`
    : `<p class="own">所持 ${owned}</p>
       <button type="button" data-buy="${prize.id}" ${afford ? "" : "disabled"}>${prize.cost}球で交換</button>
       <button type="button" data-sell="${prize.id}" ${owned ? "" : "disabled"}>${prize.sell}円にする</button>`;
  return `<article class="prize"><div class="medal" style="--h:${prize.hue}">${prize.name.slice(0, 1)}</div><h3>${prize.name}</h3><p>${prize.blurb}</p>${actions}</article>`;
}

function openPrizes(mode) {
  const title = mode === "book" ? "景品図鑑" : "景品交換";
  const lead = mode === "book"
    ? "はじめて交換した景品が、ここに残る。"
    : `いまの持ち玉は ${game.state.stock}。20球からラムネと交換できる。コインに戻すと、また玉が買える。`;
  openModal(mode, `
    <p class="eyebrow">縁日のカウンター</p>
    <h2>${title}</h2>
    <p>${lead}</p>
    <div class="prize-grid">${PRIZES.map((p) => prizeCard(p, mode)).join("")}</div>
    <button type="button" data-close>とじる</button>
  `);
  modal.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      game.exchange(btn.dataset.buy);
      openPrizes(mode);
    });
  });
  modal.querySelectorAll("[data-sell]").forEach((btn) => {
    btn.addEventListener("click", () => {
      game.sell(btn.dataset.sell);
      openPrizes(mode);
    });
  });
}

$("help").addEventListener("click", () => openModal("help", helpHtml(false)));
$("prizes").addEventListener("click", () => openPrizes("prizes"));
$("book").addEventListener("click", () => openPrizes("book"));

window.addEventListener("resize", () => game.resize());
syncAudioControls();
game.start();

if (!game.coachSeen) openModal("help", helpHtml(true));

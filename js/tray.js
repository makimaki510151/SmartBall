// 受け皿と箱の中の玉。盤面のシミュレーションとは別に、皿の底へ落ちて積み上がる。

export function createTray(kind) {
  if (kind === "box") {
    return { w: 112, h: 120, r: 9.2, bowl: 16, cap: 72, balls: [] };
  }
  return { w: 260, h: 120, r: 11.2, bowl: 70, cap: 96, balls: [] };
}

function floorY(world, x) {
  const t = (x - world.w / 2) / (world.w / 2);
  return world.h - 6 - world.bowl * t * t;
}

function floorSlope(world, x) {
  const half = world.w / 2;
  const t = (x - world.w / 2) / half;
  return (-world.bowl * 2 * t) / half;
}

export function syncTray(world, target) {
  const goal = Math.max(0, Math.min(world.cap, target | 0));
  let added = 0;
  while (world.balls.length < goal) {
    const i = world.balls.length;
    const r = world.r * (0.94 + (i % 5) * 0.02);
    const lane = (added * 0.61803398875) % 1;
    world.balls.push({
      x: world.w * (0.36 + 0.28 * lane),
      y: -r * (1.4 + added * 2.45),
      vx: (lane - 0.5) * 30,
      vy: 70,
      r,
    });
    added += 1;
  }
  while (world.balls.length > goal) {
    let k = 0;
    for (let i = 1; i < world.balls.length; i += 1) {
      if (world.balls[i].y < world.balls[k].y) k = i;
    }
    world.balls.splice(k, 1);
  }
}

function collidePair(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const min = a.r + b.r;
  if (dist >= min) return;
  if (dist < 0.0001) {
    dx = 0.01;
    dy = 0;
    dist = 0.01;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv >= 0) return;
  const j = -(1 + 0.04) * rv * 0.5;
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
  const tx = -ny;
  const ty = nx;
  const tv = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
  const jf = tv * 0.12;
  a.vx += jf * tx;
  a.vy += jf * ty;
  b.vx -= jf * tx;
  b.vy -= jf * ty;
}

function stick(world, ball, balls, gx, gy) {
  const fy = floorY(world, ball.x) - ball.r;
  let nx = 0;
  let ny = 0;
  let contacts = 0;
  if (ball.y > fy - 1.6) {
    const slope = floorSlope(world, ball.x);
    const nl = Math.hypot(slope, 1) || 1;
    nx += slope / nl;
    ny += -1 / nl;
    contacts += 1;
  }
  for (const other of balls) {
    if (other === ball || other.y < ball.y - 0.4) continue;
    const dx = ball.x - other.x;
    const dy = ball.y - other.y;
    const dist = Math.hypot(dx, dy);
    if (dist < ball.r + other.r + 1.2 && dist > 0.001) {
      nx += dx / dist;
      ny += dy / dist;
      contacts += 1;
    }
  }
  if (!contacts) return;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl;
  ny /= nl;
  const gn = gx * nx + gy * ny;
  if (gn > -30) return;
  const gtx = gx - gn * nx;
  const gty = gy - gn * ny;
  const gt = Math.hypot(gtx, gty);
  if (Math.abs(gx) < 200 && Math.hypot(ball.vx, ball.vy) < 80 && gt < 0.26 * -gn) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

function contain(world, ball, balls, gx, gy, rest) {
  if (ball.x < ball.r) {
    ball.x = ball.r;
    if (ball.vx < 0) ball.vx *= -0.12;
  } else if (ball.x > world.w - ball.r) {
    ball.x = world.w - ball.r;
    if (ball.vx > 0) ball.vx *= -0.12;
  }
  const fy = floorY(world, ball.x) - ball.r;
  if (ball.y > fy) {
    const pen = ball.y - fy;
    const slope = floorSlope(world, ball.x);
    let nx = slope;
    let ny = -1;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    ball.x += nx * pen;
    ball.y += ny * pen;
    if (ball.x < ball.r) ball.x = ball.r;
    if (ball.x > world.w - ball.r) ball.x = world.w - ball.r;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= vn * nx;
      ball.vy -= vn * ny;
    }
    ball.vx *= 0.82;
    ball.vy *= 0.82;
  }
  if (rest) stick(world, ball, balls, gx, gy);
}

function integrate(world, dt, gx, gy) {
  const balls = world.balls;
  for (const ball of balls) {
    ball.vx += gx * dt;
    ball.vy += gy * dt;
    ball.vx *= Math.exp(-1.35 * dt);
    ball.vy *= Math.exp(-0.55 * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    contain(world, ball, balls, gx, gy, false);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) collidePair(balls[i], balls[j]);
    }
    const rest = pass === 2;
    for (const ball of balls) contain(world, ball, balls, gx, gy, rest);
  }
}

export function stepTray(world, dt, gx = 0, gy = 1180) {
  if (!(dt > 0)) return;
  const steps = Math.max(1, Math.min(5, Math.ceil(dt / (1 / 120))));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) integrate(world, h, gx, gy);
}

function measure(world) {
  let minY = Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let fast = 0;
  let outside = 0;
  let above = 0;
  for (const ball of world.balls) {
    minY = Math.min(minY, ball.y);
    maxY = Math.max(maxY, ball.y);
    sx += ball.x;
    if (Math.hypot(ball.vx, ball.vy) > 45) fast += 1;
    if (ball.x < ball.r - 1 || ball.x > world.w - ball.r + 1 || ball.y > world.h + 2) outside += 1;
    if (ball.y < -2) above += 1;
  }
  return {
    spread: maxY - minY,
    meanX: sx / world.balls.length,
    fast,
    outside,
    above,
    minY,
  };
}

function runSelfTest() {
  const world = createTray("dish");
  syncTray(world, 25);
  const born = measure(world);
  console.log("born minY", born.minY.toFixed(1));
  if (born.minY >= 0) {
    console.error("balls did not spawn above the dish");
    process.exitCode = 1;
  }
  for (let i = 0; i < 480; i += 1) stepTray(world, 1 / 60);
  const rest = measure(world);
  console.log("tray", world.balls.length, "spread", rest.spread.toFixed(1), "meanX", rest.meanX.toFixed(1), "fast", rest.fast, "out", rest.outside, "above", rest.above);
  if (world.balls.length !== 25 || rest.spread < world.r * 2.2 || rest.outside || rest.above || rest.fast > 2) {
    console.error("tray pile did not settle");
    process.exitCode = 1;
  }
  if (Math.abs(rest.meanX - world.w / 2) > world.w * 0.2) {
    console.error("pile is not in the dish");
    process.exitCode = 1;
  }
  for (let i = 0; i < 200; i += 1) stepTray(world, 1 / 60, 1100, 1180);
  const tilted = measure(world);
  console.log("tilt meanX", tilted.meanX.toFixed(1), "shift", (tilted.meanX - rest.meanX).toFixed(1), "fast", tilted.fast, "out", tilted.outside);
  if (tilted.meanX < rest.meanX + 16 || tilted.outside) {
    console.error("pile did not roll when the dish tilted");
    process.exitCode = 1;
  }
  syncTray(world, 24);
  if (world.balls.length !== 24) {
    console.error("remove failed");
    process.exitCode = 1;
  }
  const box = createTray("box");
  syncTray(box, 25);
  for (let i = 0; i < 420; i += 1) stepTray(box, 1 / 60);
  const piled = measure(box);
  console.log("box spread", piled.spread.toFixed(1), "fast", piled.fast, "above", piled.above);
  if (piled.spread < box.r * 3 || piled.above || piled.outside || piled.fast > 2) {
    console.error("box did not stack");
    process.exitCode = 1;
  }
}

const invoked = typeof process !== "undefined" && process.argv?.[1]?.endsWith("tray.js");
if (invoked) runSelfTest();

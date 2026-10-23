// MASHIN — дээрээс харсан замын тоглоом. React-аас хамааралгүй тоглоомын дүрэм + зураг.
// Бүх хэмжээ W×H логик пикселээр, canvas-ыг дэлгэцэнд таарч томруулна.

export const W = 360;
export const H = 640;
export const LANES = 4;
const ROAD_X = 30;
const ROAD_W = W - ROAD_X * 2;
const LANE_W = ROAD_W / LANES;
const CAR_W = 42;
const CAR_H = 76;
const PLAYER_Y = H - 120;

export type Mode = "girl" | "boy";

export const MODES: Record<
  Mode,
  {
    label: string;
    emoji: string;
    desc: string;
    color: string;
    startSpeed: number; // px/s
    maxSpeed: number;
    accel: number; // px/s²
    spawnMin: number; // s
    spawnMax: number;
    doubleChance: number; // нэг дор 2 машин гарах магадлал
    lives: number;
    laneChangers: boolean; // эгнээ сольдог машинууд
    shieldChance: number;
  }
> = {
  girl: {
    label: "GIRL",
    emoji: "💖",
    desc: "Амархан • 3 амь • удаан • бамбай олон",
    color: "#ec4899",
    startSpeed: 240,
    maxSpeed: 560,
    accel: 5,
    spawnMin: 0.95,
    spawnMax: 1.5,
    doubleChance: 0.12,
    lives: 3,
    laneChangers: false,
    shieldChance: 0.35,
  },
  boy: {
    label: "BOY",
    emoji: "🔥",
    desc: "Хэцүү • 1 амь • хурдан • эгнээ сольдог машинууд",
    color: "#3b82f6",
    startSpeed: 340,
    maxSpeed: 920,
    accel: 10,
    spawnMin: 0.55,
    spawnMax: 0.95,
    doubleChance: 0.45,
    lives: 1,
    laneChangers: true,
    shieldChance: 0.15,
  },
};

const ENEMY_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7", "#14b8a6", "#f97316", "#e5e7eb", "#64748b"];

// Явсан зайгаар өдөр → орой → шөнө солигдоно
const PALETTES = [
  { name: "☀️ Өдөр", grass: "#4caf50", grass2: "#45a049", road: "#4b4b55", line: "#f5f5f4", dark: 0 },
  { name: "🌅 Орой боллоо", grass: "#c7783f", grass2: "#bb6d36", road: "#3e3641", line: "#ffe1a8", dark: 0.18 },
  { name: "🌙 Шөнө боллоо", grass: "#12301c", grass2: "#0e2817", road: "#1e1e28", line: "#a1a1aa", dark: 0.5 },
];
const PHASE_DIST = 6000;

type Enemy = { lane: number; x: number; y: number; rel: number; color: string; toLane: number | null };
type Item = { kind: "coin" | "shield"; lane: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

export type Game = {
  mode: Mode;
  speed: number;
  dist: number;
  coins: number;
  lives: number;
  lane: number;
  x: number;
  invuln: number;
  shield: number;
  enemies: Enemy[];
  items: Item[];
  particles: Particle[];
  spawnT: number;
  itemT: number;
  road: number;
  shake: number;
  phase: number;
  banner: { text: string; t: number } | null;
  over: boolean;
  time: number;
};

const laneX = (i: number) => ROAD_X + LANE_W * (i + 0.5);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function newGame(mode: Mode): Game {
  const m = MODES[mode];
  return {
    mode,
    speed: m.startSpeed,
    dist: 0,
    coins: 0,
    lives: m.lives,
    lane: 1,
    x: laneX(1),
    invuln: 0,
    shield: 0,
    enemies: [],
    items: [],
    particles: [],
    spawnT: 1.2,
    itemT: 0.8,
    road: 0,
    shake: 0,
    phase: 0,
    banner: null,
    over: false,
    time: 0,
  };
}

export function score(g: Game) {
  return Math.floor(g.dist / 10) + g.coins * 25;
}

export function kmh(g: Game) {
  return Math.round(g.speed / 3.2);
}

export function steer(g: Game, dir: -1 | 1) {
  if (g.over) return;
  g.lane = Math.min(LANES - 1, Math.max(0, g.lane + dir));
}

function burst(g: Game, x: number, y: number, colors: string[], n: number, power: number, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = rand(power * 0.3, power);
    const life = rand(0.35, 0.8);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life,
      max: life,
      color: colors[i % colors.length],
      size: rand(size * 0.5, size * 1.3),
    });
  }
}

function laneBusyNearTop(g: Game, lane: number) {
  return g.enemies.some((e) => (e.lane === lane || e.toLane === lane) && e.y < CAR_H * 2.2);
}

function hits(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}

/** Нэг алхам (dt секунд) — машин, саад, зоос, мөргөлдөөнийг шинэчилнэ */
export function update(g: Game, dt: number) {
  if (g.over) {
    tickParticles(g, dt);
    return;
  }
  const m = MODES[g.mode];
  g.time += dt;
  g.speed = Math.min(m.maxSpeed, g.speed + m.accel * dt);
  g.dist += g.speed * dt;
  g.road = (g.road + g.speed * dt) % 80;
  g.x += (laneX(g.lane) - g.x) * Math.min(1, dt * 14);
  g.invuln = Math.max(0, g.invuln - dt);
  g.shield = Math.max(0, g.shield - dt);
  g.shake = Math.max(0, g.shake - dt);
  if (g.banner) {
    g.banner.t -= dt;
    if (g.banner.t <= 0) g.banner = null;
  }

  const phase = Math.floor(g.dist / PHASE_DIST) % PALETTES.length;
  if (phase !== g.phase) {
    g.phase = phase;
    g.banner = { text: PALETTES[phase].name, t: 2.2 };
  }

  // Шинэ машинууд — нэг эгнээ үргэлж чөлөөтэй байна
  g.spawnT -= dt;
  if (g.spawnT <= 0) {
    const pace = Math.max(0.55, m.startSpeed / g.speed);
    g.spawnT = rand(m.spawnMin, m.spawnMax) * pace;
    const count = Math.random() < m.doubleChance ? 2 : 1;
    const free = [0, 1, 2, 3].filter((l) => !laneBusyNearTop(g, l));
    for (let i = 0; i < count && free.length > 1; i++) {
      const lane = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      g.enemies.push({
        lane,
        x: laneX(lane),
        y: -CAR_H,
        rel: rand(0.45, 0.72),
        color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
        toLane: null,
      });
    }
  }

  // Зоос, бамбай
  g.itemT -= dt;
  if (g.itemT <= 0) {
    g.itemT = rand(0.7, 1.4);
    const lane = Math.floor(Math.random() * LANES);
    const shield = Math.random() < m.shieldChance * 0.25 && g.shield <= 0;
    if (!laneBusyNearTop(g, lane)) {
      if (shield) g.items.push({ kind: "shield", lane, y: -30 });
      else for (let i = 0; i < 3; i++) g.items.push({ kind: "coin", lane, y: -30 - i * 42 });
    }
  }

  for (const e of g.enemies) {
    e.y += g.speed * dt * e.rel;
    // BOY: зарим машин гэнэт эгнээ солино
    if (m.laneChangers && e.toLane === null && e.y > 60 && e.y < 260 && Math.random() < dt * 0.35) {
      const to = e.lane + (Math.random() < 0.5 ? -1 : 1);
      if (to >= 0 && to < LANES && !g.enemies.some((o) => o !== e && (o.lane === to || o.toLane === to) && Math.abs(o.y - e.y) < CAR_H * 1.6)) {
        e.toLane = to;
      }
    }
    if (e.toLane !== null) {
      const tx = laneX(e.toLane);
      e.x += Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x), dt * 110);
      if (Math.abs(tx - e.x) < 0.5) {
        e.lane = e.toLane;
        e.toLane = null;
      }
    }
  }
  for (const it of g.items) it.y += g.speed * dt;

  // Мөргөлдөөн
  const pw = CAR_W - 10;
  const ph = CAR_H - 12;
  for (const e of [...g.enemies]) {
    if (!hits(g.x, PLAYER_Y, pw, ph, e.x, e.y, CAR_W - 8, CAR_H - 10)) continue;
    if (g.shield > 0) {
      burst(g, e.x, e.y, [e.color, "#ffffff", "#93c5fd"], 26, 260);
      g.enemies.splice(g.enemies.indexOf(e), 1);
      g.coins += 2;
      g.shake = 0.15;
      continue;
    }
    if (g.invuln > 0) continue;
    g.lives -= 1;
    g.shake = 0.4;
    burst(g, (g.x + e.x) / 2, (PLAYER_Y + e.y) / 2, ["#fde047", "#f97316", "#ef4444", "#ffffff", "#52525b"], 46, 340, 5);
    g.enemies.splice(g.enemies.indexOf(e), 1);
    if (g.lives <= 0) {
      g.over = true;
      burst(g, g.x, PLAYER_Y, [MODES[g.mode].color, "#fde047", "#f97316", "#27272a"], 40, 300, 6);
      return;
    }
    g.invuln = 1.6;
  }
  for (const it of [...g.items]) {
    if (!hits(g.x, PLAYER_Y, CAR_W, CAR_H, laneX(it.lane), it.y, 24, 24)) continue;
    g.items.splice(g.items.indexOf(it), 1);
    if (it.kind === "coin") {
      g.coins += 1;
      burst(g, laneX(it.lane), it.y, ["#fde047", "#facc15", "#ffffff"], 8, 120, 3);
    } else {
      g.shield = 5;
      g.banner = { text: "🛡️ Бамбай!", t: 1.2 };
      burst(g, laneX(it.lane), it.y, ["#60a5fa", "#93c5fd", "#ffffff"], 16, 160, 3);
    }
  }

  g.enemies = g.enemies.filter((e) => e.y < H + CAR_H);
  g.items = g.items.filter((it) => it.y < H + 30);
  tickParticles(g, dt);
}

function tickParticles(g: Game, dt: number) {
  for (const p of g.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt + g.speed * dt * 0.3 * (g.over ? 0 : 1);
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
}

// ---------------- Зураг ----------------

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, lights: boolean) {
  const x = cx - CAR_W / 2;
  const y = cy - CAR_H / 2;
  // сүүдэр
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  rr(ctx, x + 3, y + 5, CAR_W, CAR_H, 10);
  ctx.fill();
  // дугуй
  ctx.fillStyle = "#111";
  for (const [wx, wy] of [[-3, 10], [CAR_W - 4, 10], [-3, CAR_H - 24], [CAR_W - 4, CAR_H - 24]]) {
    rr(ctx, x + wx, y + wy, 7, 15, 3);
    ctx.fill();
  }
  // их бие
  ctx.fillStyle = color;
  rr(ctx, x, y, CAR_W, CAR_H, 11);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rr(ctx, x + 4, y + 4, CAR_W / 2 - 4, CAR_H - 8, 8);
  ctx.fill();
  // шил
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  rr(ctx, x + 6, y + 16, CAR_W - 12, 16, 5);
  ctx.fill();
  rr(ctx, x + 7, y + CAR_H - 24, CAR_W - 14, 11, 4);
  ctx.fill();
  // дээвэр
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  rr(ctx, x + 7, y + 34, CAR_W - 14, CAR_H - 60, 5);
  ctx.fill();
  // гэрэл
  ctx.fillStyle = lights ? "#fef9c3" : "#fde68a";
  rr(ctx, x + 5, y + 2, 9, 5, 2);
  ctx.fill();
  rr(ctx, x + CAR_W - 14, y + 2, 9, 5, 2);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  rr(ctx, x + 5, y + CAR_H - 6, 9, 4, 2);
  ctx.fill();
  rr(ctx, x + CAR_W - 14, y + CAR_H - 6, 9, 4, 2);
  ctx.fill();
}

/** Нэг кадр зурна. countdown > 0 бол дунд нь тоо харуулна */
export function draw(ctx: CanvasRenderingContext2D, g: Game, countdown = 0) {
  const pal = PALETTES[g.phase];
  ctx.save();
  if (g.shake > 0) ctx.translate(rand(-6, 6) * g.shake * 2.5, rand(-6, 6) * g.shake * 2.5);

  // зүлэг
  ctx.fillStyle = pal.grass;
  ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.fillStyle = pal.grass2;
  for (let y = -80 + g.road; y < H; y += 80) {
    ctx.fillRect(-10, y, ROAD_X + 10, 40);
    ctx.fillRect(W - ROAD_X, y, ROAD_X + 10, 40);
  }
  // мод, бут
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  for (let y = -160 + ((g.road * 2) % 160); y < H; y += 160) {
    ctx.beginPath();
    ctx.arc(12, y + 30, 9, 0, Math.PI * 2);
    ctx.arc(W - 12, y + 110, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // зам
  ctx.fillStyle = pal.road;
  ctx.fillRect(ROAD_X, -10, ROAD_W, H + 20);
  // хашлага (улаан цагаан)
  for (let y = -80 + g.road; y < H; y += 40) {
    ctx.fillStyle = Math.floor((y - g.road) / 40) % 2 === 0 ? "#ef4444" : "#f5f5f4";
    ctx.fillRect(ROAD_X - 6, y, 6, 40);
    ctx.fillRect(ROAD_X + ROAD_W, y, 6, 40);
  }
  // эгнээний тасархай зураас
  ctx.fillStyle = pal.line;
  for (let l = 1; l < LANES; l++) {
    const lx = ROAD_X + LANE_W * l - 2;
    for (let y = -80 + g.road; y < H; y += 80) ctx.fillRect(lx, y, 4, 40);
  }

  // зоос, бамбай
  for (const it of g.items) {
    const x = laneX(it.lane);
    if (it.kind === "coin") {
      const s = Math.abs(Math.sin(g.time * 6 + it.y * 0.05));
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.ellipse(x, it.y, 11 * Math.max(0.25, s), 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.ellipse(x, it.y, 6 * Math.max(0.25, s), 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(96,165,250,0.35)";
      ctx.beginPath();
      ctx.arc(x, it.y, 17 + Math.sin(g.time * 8) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(x, it.y - 12);
      ctx.lineTo(x + 10, it.y - 7);
      ctx.lineTo(x + 8, it.y + 6);
      ctx.lineTo(x, it.y + 12);
      ctx.lineTo(x - 8, it.y + 6);
      ctx.lineTo(x - 10, it.y - 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1.5, it.y - 6, 3, 11);
    }
  }

  const night = pal.dark > 0.3;
  for (const e of g.enemies) drawCar(ctx, e.x, e.y, e.color, night);

  // тоглогч
  if (!g.over) {
    const blink = g.invuln > 0 && Math.floor(g.invuln * 12) % 2 === 0;
    if (!blink) drawCar(ctx, g.x, PLAYER_Y, MODES[g.mode].color, night);
    if (g.shield > 0) {
      ctx.strokeStyle = `rgba(96,165,250,${0.5 + Math.sin(g.time * 10) * 0.25})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(g.x, PLAYER_Y, CAR_W * 0.95, CAR_H * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // орой, шөнө — харанхуй, машины урд гэрэл
  if (pal.dark > 0) {
    ctx.fillStyle = `rgba(5,5,20,${pal.dark})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    if (night && !g.over) {
      const grad = ctx.createRadialGradient(g.x, PLAYER_Y - 110, 10, g.x, PLAYER_Y - 110, 140);
      grad.addColorStop(0, "rgba(254,249,195,0.35)");
      grad.addColorStop(1, "rgba(254,249,195,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(g.x - 14, PLAYER_Y - 36);
      ctx.lineTo(g.x - 90, PLAYER_Y - 260);
      ctx.lineTo(g.x + 90, PLAYER_Y - 260);
      ctx.lineTo(g.x + 14, PLAYER_Y - 36);
      ctx.closePath();
      ctx.fill();
    }
  }

  // оч
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // HUD
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  rr(ctx, 8, 8, W - 16, 38, 12);
  ctx.fill();
  ctx.font = "800 15px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(`${score(g)}`, 18, 27);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fde047";
  ctx.fillText(`🪙 ${g.coins}`, W / 2 - 18, 27);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${kmh(g)} км/ц`, W - 18, 27);
  if (MODES[g.mode].lives > 1) {
    ctx.textAlign = "left";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("❤️".repeat(Math.max(0, g.lives)), 14, 62);
  }
  if (g.shield > 0) {
    ctx.textAlign = "right";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText(`🛡️ ${g.shield.toFixed(1)}с`, W - 14, 62);
  }

  if (g.banner) {
    ctx.globalAlpha = Math.min(1, g.banner.t * 2);
    ctx.textAlign = "center";
    ctx.font = "900 26px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.fillText(g.banner.text, W / 2, H * 0.3);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  if (countdown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);
    const n = Math.ceil(countdown);
    const f = countdown - Math.floor(countdown);
    ctx.textAlign = "center";
    ctx.font = `900 ${Math.round(70 + f * 40)}px system-ui, sans-serif`;
    ctx.fillStyle = n === 1 ? "#4ade80" : "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.fillText(String(n), W / 2, H / 2);
    ctx.shadowBlur = 0;
  }
}

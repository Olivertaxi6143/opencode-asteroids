'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
  // Skin selection: 1-3 select skin, C cycles skins
  if (e.code >= 'Digit1' && e.code <= 'Digit3') {
    const n = parseInt(e.code.charAt(5), 10); // '1', '2', or '3'
    currentSkin = skinIndex(n);
  }
  if (e.code === 'KeyC') {
    currentSkin = skinIndex(currentSkin + 1);
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    // Speed power-up countdown
    if (speedMultiplier > 1 && velocidadTimer > 0) {
      velocidadTimer -= dt;
      if (velocidadTimer <= 0) {
        speedMultiplier = 1;
      }
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * speedMultiplier * dt;
      this.vy += Math.sin(this.angle) * THRUST * speedMultiplier * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple-shot: three parallel bullets spread across the ship
    if (tripleShotTimer > 0) {
      const SPREAD = 6;
      return [new Bullet(ox, oy, this.angle),
        new Bullet(ox + Math.sin(this.angle) * SPREAD, oy - Math.cos(this.angle) * SPREAD, this.angle),
        new Bullet(ox - Math.sin(this.angle) * SPREAD, oy + Math.cos(this.angle) * SPREAD, this.angle)];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparici�n
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[currentSkin - 1];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Three distinct geometric silhouettes, all facing positive X.
    switch (currentSkin) {
      case 1: // Interceptor: a narrow, angular fighter.
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, -14);
        ctx.lineTo(-8, 14);
        ctx.closePath();
        ctx.stroke();
        // Narrow interceptor exhaust.
        if (this.thrusting && Math.random() > 0.35) {
          ctx.beginPath();
          ctx.moveTo(-8, -4);
          ctx.lineTo(-8 - rand(4, 8), 0);
          ctx.lineTo(-8, 4);
          ctx.strokeStyle = skin.thrust;
          ctx.stroke();
        }
        break;

      case 2: // Diamond Cruiser: a broad four-point ship.
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.lineTo(-2, -16);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-2, 16);
        ctx.closePath();
        ctx.stroke();
        // Rear exhaust keeps the visual direction aligned with movement.
        if (this.thrusting && Math.random() > 0.35) {
          ctx.beginPath();
          ctx.moveTo(-15, -5);
          ctx.lineTo(-15 - rand(4, 10), 0);
          ctx.lineTo(-15, 5);
          ctx.strokeStyle = skin.thrust;
          ctx.stroke();
        }
        break;

      case 3: // Saucer: a rounded ship with a forward cockpit.
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(5, 0, 6, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        // Saucer exhaust.
        if (this.thrusting && Math.random() > 0.35) {
          ctx.beginPath();
          ctx.moveTo(-15, -4);
          ctx.lineTo(-15 - rand(5, 11), 0);
          ctx.lineTo(-15, 4);
          ctx.strokeStyle = skin.thrust;
          ctx.stroke();
        }
        break;
    }

  // Triple-shot power-up visual indicator
  if (tripleShotTimer > 0) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1;
    for (const offset of [-5, 0, 5]) {
      ctx.beginPath();
      ctx.moveTo(-5, offset);
      ctx.lineTo(5, offset);
      ctx.stroke();
    }
    ctx.restore();
  }

ctx.restore();
  }
}

// ── Estrella Fugaz (shooting star) ──────────────────────────────────────────
class EstrellaFugaz {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.dead = false;
    this.ttl = 8.0; // lifetime in seconds

    // Sensible speed, varied direction
    const angle = rand(0, Math.PI * 2);
    const speed = 200 + rand(0, 100); // moderate
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(1, 3);
    this.rot = rand(0, Math.PI * 2);

    // Trail particles: track a short path of positions.
    // Position history is stored for trail drawing
    this.trail = [];
  }

  update(dt) {
    // Accumulate position for the trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.pop();

    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    this.rot += this.rotSpeed * dt;

    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Draw trail particles
    this.trail.forEach((pos, i) => {
      const alpha = (i / this.trail.length);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - alpha).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.trail.length > 1 && i < this.trail.length - 1) {
        const prev = this.trail[i + 1];
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    });

    // Draw the estrella fugaz shape (a bright streak)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // A simple "streak" shape
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius / 2, this.radius);
    ctx.lineTo(-this.radius / 2, this.radius);
    ctx.lineTo(0, -this.radius);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Speed power-up ─────────────────────────────────────────────────────────────
let velocidadPowerUp = null;
let tripleShotPowerUp = null;

// Skin system
// Available ship skins: 1=white, 2=cyan, 3=yellow. Press 1-3 to select, press C to cycle.
const SKINS = [
  { name: 'White',        stroke: '#fff',    thrust: 'rgba(255, 130, 0, 0.85)' },
  { name: 'Cyan',        stroke: '#0ff',    thrust: 'rgba(0, 255, 255, 0.85)' },
  { name: 'Yellow',      stroke: '#ff0',    thrust: 'rgba(255, 255, 0, 0.85)' },
];
let currentSkin = 1; // 1-based index, matches SKINS array

// Helper: wrap skin index into valid range
function skinIndex(n) { return ((n - 1) % SKINS.length) + 1; }

class VelocidadPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.active = true;
  }
}

class TripleShotPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.active = true;
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles;
let estrellaFugaz;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let velocidadTimer;
let speedMultiplier = 1;
let tripleShotTimer = 0;
let escudoActivo = false;
let tiempoEscudo = 0;
let cooldownEscudo = 0;

// Shooting star scheduler state
let starSpawnTimer = 0;      // counts down to next star spawn (seconds)
const MAX_CONCURRENT_STARS = 2;  // max active shooting stars at once

function spawnStarSafe() {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < 150);
  return new EstrellaFugaz(x, y);
}

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  velocidadPowerUp = null;
  velocidadTimer = 0;
  speedMultiplier = 1;
  spawnAsteroids(4);
  // Reset shooting star scheduler — stars spawn over time, not all at once
  estrellaFugaz = [];
  starSpawnTimer = rand(4, 8);  // first star spawns in 4–8 seconds
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  ship.reset();
  spawnAsteroids(3 + level);
  // Reset shooting star scheduler — stars spawn over time, not all at once
  estrellaFugaz = [];
  starSpawnTimer = rand(4, 8);  // first star spawns in 4–8 seconds
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // --- Player shield ---
  if (pressed('KeyC') && cooldownEscudo <= 0 && tiempoEscudo <= 0) {
    escudoActivo = true;
    tiempoEscudo = 5;
    cooldownEscudo = 10;
    ship.invincible = 5; // enables collision detection to work
  }

  // Shield countdown and cooldown
  if (escudoActivo) {
    tiempoEscudo -= dt;
    if (tiempoEscudo <= 0) {
      escudoActivo = false;
    }
  }
  if (cooldownEscudo > 0) {
    cooldownEscudo -= dt;
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  // Shooting star scheduler: spawn stars over time, cap concurrent
  if (starSpawnTimer > 0) {
    starSpawnTimer -= dt;
    if (starSpawnTimer <= 0 && estrellaFugaz.length < MAX_CONCURRENT_STARS) {
      estrellaFugaz.push(spawnStarSafe());
      starSpawnTimer = rand(4, 8);
    }
  }

  // Update existing stars and remove expired ones
  for (let i = estrellaFugaz.length - 1; i >= 0; i--) {
    const star = estrellaFugaz[i];
    star.update(dt);
    if (star.dead) {
      estrellaFugaz.splice(i, 1);
    }
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // 20% chance to drop a speed power-up
        if (Math.random() < 0.2) {
          velocidadPowerUp = new VelocidadPowerUp(a.x, a.y);
        }
        // 20% chance to drop a triple-shot power-up
        if (Math.random() < 0.2) {
          tripleShotPowerUp = new TripleShotPowerUp(a.x, a.y);
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    if (b.dead) continue;
    if (estrellaFugaz && estrellaFugaz.length > 0) {
      for (const star of estrellaFugaz) {
        if (!star.dead && dist(b, star) < star.radius) {
          b.dead = true;
          star.dead = true;
          score += 500;
          explode(star.x, star.y, 16);
          break; // only one star per bullet
        }
      }
    }
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    // Nave vs estrella fugaz - contacto instantáneo muerto
    if (ship.invincible <= 0) {
      if (estrellaFugaz && estrellaFugaz.length > 0) {
        for (const star of estrellaFugaz) {
          if (!star.dead && dist(ship, star) < ship.radius + star.radius) {
            killShip();
            star.dead = true;
            break; // only one star collision
          }
        }
      }
    }
  }

  // Speed power-up pickup
  if (velocidadPowerUp && ship.invincible <= 0) {
    if (dist(ship, velocidadPowerUp) < ship.radius + velocidadPowerUp.radius) {
      speedMultiplier = 2;
      velocidadTimer = 5;
      velocidadPowerUp = null;
    }
  }

  // Triple-shot power-up pickup
  if (tripleShotPowerUp && ship.invincible <= 0) {
    if (dist(ship, tripleShotPowerUp) < ship.radius + tripleShotPowerUp.radius) {
      tripleShotTimer = 5;
      tripleShotPowerUp = null;
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Speed power-up status
  if (speedMultiplier > 1) {
    ctx.fillStyle = '#ffff00';
    ctx.font = '15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`DOBLE VELOCIDAD`, W / 2, 26);
    ctx.fillStyle = '#fff';
  }

  // Shield status
  if (escudoActivo) {
    ctx.fillStyle = '#00ffff';
    ctx.font = '15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ESCUDO ACTIVO`, W / 2, 36);
    ctx.fillStyle = '#fff';
  }

  // Triple-shot power-up status
  if (tripleShotTimer > 0) {
    ctx.fillStyle = '#ff00ff';
    ctx.font = '15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TRIPLE SHOT`, W / 2, 46);
    ctx.fillStyle = '#fff';
  }

  // Skin indicator and controls
  ctx.fillStyle = '#0ff';
  ctx.font = '15px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SKIN: ${SKINS[currentSkin - 1].name}  [1-3/C]`, 14, 52);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  // Draw speed power-up
  if (velocidadPowerUp) {
    ctx.save();
    ctx.translate(velocidadPowerUp.x, velocidadPowerUp.y);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(0, 0, velocidadPowerUp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -velocidadPowerUp.radius);
    ctx.lineTo(0, -velocidadPowerUp.radius - 5);
    ctx.lineTo(velocidadPowerUp.radius * 0.5, -velocidadPowerUp.radius - 2);
    ctx.lineTo(0, -velocidadPowerUp.radius);
    ctx.lineTo(-velocidadPowerUp.radius * 0.5, -velocidadPowerUp.radius - 2);
    ctx.stroke();
    ctx.restore();
  }

  // Draw triple-shot power-up: three small magenta projectiles to represent three shots
  if (tripleShotPowerUp) {
    ctx.save();
    ctx.translate(tripleShotPowerUp.x, tripleShotPowerUp.y);
    ctx.fillStyle = '#ff00ff';
    const spread = 6;
    for (const offset of [-spread, 0, spread]) {
      ctx.beginPath();
      ctx.arc(offset, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offset - 3, -3);
      ctx.lineTo(offset + 3, -3);
      ctx.lineTo(offset, 3);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw estrella fugaz + trail
  if (typeof estrellaFugaz !== 'undefined' && estrellaFugaz) {
    estrellaFugaz.forEach(star => star.draw());
  }

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);

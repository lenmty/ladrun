(() => {
  'use strict';
  const W = 960, H = 320, FLOOR = 258;
  const JUMP_HOLD_ACCEL = 850, JUMP_HOLD_LIMIT = 0.20, JUMP_RELEASE_FACTOR = 0.90;
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const ui = {
    score: document.querySelector('#score'), best: document.querySelector('#best'),
    message: document.querySelector('#message'), title: document.querySelector('#message-title'),
    help: document.querySelector('#message-help'), controls: document.querySelector('#controls'),
    scoreLabel: document.querySelector('#score-label'), bestLabel: document.querySelector('#best-label'),
    themeToggle: document.querySelector('#theme-toggle'),
    jumpZone: document.querySelector('#jump-zone'), duckZone: document.querySelector('#duck-zone'),
  };
  const ru = /^ru/i.test(navigator.language || '');
  const copy = ru ? {
    start: 'Нажмите Space, чтобы начать', over: 'Столкновение!', restart: 'Space или Enter — начать заново',
    startMobile: 'Коснитесь Калеба, чтобы играть', restartMobile: 'Коснитесь, чтобы сыграть снова',
    controls: 'Space / ↑ / W — прыжок · ↓ / S — пригнуться', controlsMobile: 'Коснитесь экрана, чтобы прыгнуть', score: 'СЧЁТ', best: 'РЕКОРД',
  } : {
    start: 'Press Space to start', over: 'Game over', restart: 'Space or Enter to restart',
    startMobile: 'Tap Caleb to play', restartMobile: 'Tap to play again',
    controls: 'Space / ↑ / W — jump · ↓ / S — duck', controlsMobile: 'Tap anywhere to jump', score: 'SCORE', best: 'BEST',
  };
  document.documentElement.lang = ru ? 'ru' : 'en';
  ui.scoreLabel.textContent = copy.score; ui.bestLabel.textContent = copy.best;
  ui.controls.textContent = matchMedia('(pointer: coarse)').matches ? copy.controlsMobile : copy.controls;
  if (ui.jumpZone && ui.duckZone) {
    ui.jumpZone.setAttribute('aria-label', ru ? 'Прыжок' : 'Jump');
    ui.duckZone.setAttribute('aria-label', ru ? 'Пригнуться' : 'Duck');
  }

  const images = {};
  function preload(key, src) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => { images[key] = image; resolve(); };
      image.onerror = reject; image.src = src;
    });
  }
  const assetsReady = Promise.all([
    preload('caleb', SPRITE_CONFIG.caleb.image),
    preload('wanderers', SPRITE_CONFIG.wanderers.image),
  ]);
  const bestKey = 'caleb-runner-best';
  let best = Number(localStorage.getItem(bestKey)) || 0;
  let score = 0, state = 'ready', lastTime = 0, worldOffset = 0;
  let speed = 350, distance = 0, nextSpawn = 690, obstacles = [];
  let duckHeld = false, jumpHeld = false, scoreShown = -1;
  const player = { x: 112, jumpY: 0, vy: 0, grounded: true, frameClock: 0, jumpHoldTime: 0 };

  function padScore(value) { return String(Math.floor(value)).padStart(5, '0'); }
  function updateHud(force = false) {
    if (force || scoreShown !== score) { ui.score.textContent = padScore(score); scoreShown = score; }
    ui.best.textContent = padScore(best);
  }
  function setMessage(title, help, visible) {
    ui.title.textContent = title; ui.help.textContent = help;
    ui.message.classList.toggle('hidden', !visible);
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('caleb-runner-theme', theme);
    const next = theme === 'dark' ? (ru ? 'Переключить на светлую тему' : 'Switch to light theme')
      : (ru ? 'Переключить на тёмную тему' : 'Switch to dark theme');
    ui.themeToggle.setAttribute('aria-label', next);
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#20211f' : '#f2f0e8';
  }
  function currentPlayerFrame() {
    const f = SPRITE_CONFIG.caleb.frames;
    if (state === 'over') return f.crash;
    if (state !== 'running') return f.idle;
    if (!player.grounded) return f.jump;
    if (duckHeld) return f[Math.floor(player.frameClock / 0.13) % 2 ? 'duck2' : 'duck1'];
    return f[Math.floor(player.frameClock / 0.105) % 2 ? 'run2' : 'run1'];
  }
  function startGame() {
    score = 0; distance = 0; speed = 350; worldOffset = 0;
    nextSpawn = coarsePointer ? 450 : 690; obstacles = [];
    player.jumpY = 0; player.vy = 0; player.grounded = true; player.frameClock = 0; player.jumpHoldTime = 0;
    duckHeld = false; jumpHeld = false; scoreShown = -1; state = 'running'; lastTime = performance.now();
    setMessage('', '', false); updateHud(true);
  }
  function finishGame() {
    if (state !== 'running') return;
    state = 'over'; duckHeld = false; jumpHeld = false;
    // Freeze at the impact height: ground impacts stay grounded, aerial impacts stay airborne.
    player.vy = 0;
    if (score > best) { best = score; localStorage.setItem(bestKey, String(best)); }
    updateHud(true);
    setMessage(copy.over, `${coarsePointer ? copy.restartMobile : copy.restart} · ${padScore(score)}`, true);
  }
  function jump() {
    if (state !== 'running' || !player.grounded) return;
    player.grounded = false; player.vy = -560; player.jumpHoldTime = 0;
  }
  function releaseJumpHold() {
    if (!jumpHeld) return;
    jumpHeld = false;
    if (state === 'running' && !player.grounded && player.vy < 0) player.vy *= JUMP_RELEASE_FACTOR;
  }
  function isTapOnCaleb(event) {
    const r = canvas.getBoundingClientRect();
    const x = (event.clientX - r.left) * W / r.width;
    const y = (event.clientY - r.top) * H / r.height;
    const frame = SPRITE_CONFIG.caleb.frames.idle;
    const width = frame.rect[2] * SPRITE_CONFIG.caleb.scale;
    const height = frame.rect[3] * SPRITE_CONFIG.caleb.scale;
    const top = FLOOR - height;
    return x >= player.x - 20 && x <= player.x + width + 20 && y >= top - 20 && y <= FLOOR + 12;
  }
  function makeObstacle() {
    const types = SPRITE_CONFIG.wanderers.types;
    const all = Object.keys(types);
    const category = Math.random() < 0.48 ? 'small' : (Math.random() < 0.52 ? 'large' : 'air');
    const candidates = all.filter(name => types[name].category === category);
    const name = candidates[Math.floor(Math.random() * candidates.length)];
    const type = types[name];
    let bottom = FLOOR + (type.groundOffset || 0);
    let flight = null;
    if (type.category === 'air') {
      const band = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
      flight = band;
      bottom = FLOOR - ({ low: 8, medium: 60, high: 101 }[band]);
    }
    return { name, type, x: W + 24, bottom, frameClock: 0, flight };
  }
  function chooseGap(currentSpeed) {
    // Keep obstacle timing playable while making the gaps gradually shorter.
    const difficulty = Math.min(score / 5000, 1);
    const minSeconds = 2.15 - 0.90 * difficulty;
    const maxSeconds = 2.65 - 1.05 * difficulty;
    return currentSpeed * (minSeconds + Math.random() * (maxSeconds - minSeconds));
  }
  function boxForPlayer(frame) {
    const rect = frame.rect, scale = SPRITE_CONFIG.caleb.scale, hit = frame.hit;
    const width = rect[2] * scale, height = rect[3] * scale;
    if (!hit) return null;
    const jumpY = player.grounded ? 0 : player.jumpY;
    const top = FLOOR - height - jumpY;
    return { left: player.x + width * hit[0], top: top + height * hit[1],
      right: player.x + width * (hit[0] + hit[2]), bottom: top + height * (hit[1] + hit[3]) };
  }
  function boxForObstacle(o) {
    // Medium flyers leave a clear lower duck lane and upper long-jump lane.
    const hit = o.flight === 'medium' ? [0.05, 0.34, 0.90, 0.52] : o.type.hit;
    const rect = o.type.frames[Math.floor(o.frameClock / 0.18) % 2];
    const w = rect[2] * o.type.scale, h = rect[3] * o.type.scale, y = o.bottom - h;
    return { left: o.x + w * hit[0], top: y + h * hit[1],
      right: o.x + w * (hit[0] + hit[2]), bottom: y + h * (hit[1] + hit[3]) };
  }
  function intersects(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
  function update(dt) {
    if (state !== 'running') return;
    player.frameClock += dt;
    // Ramp linearly to 900, then keep increasing logarithmically without a hard cap.
    speed = score <= 5000
      ? 350 + score * 0.11
      : 900 + 120 * Math.log1p((score - 5000) / 5000);
    // Mobile zoom crops the visible horizon by 20%; slow the world proportionally
    // so obstacles still get comparable on-screen reaction time as on desktop.
    const moveSpeed = speed * (coarsePointer ? 0.90 : 1);
    const traveled = moveSpeed * dt;
    distance += traveled; score = Math.floor(distance / 8); worldOffset = (worldOffset + traveled) % 42;
    if (distance >= nextSpawn) { obstacles.push(makeObstacle()); nextSpawn = distance + chooseGap(moveSpeed); }
    for (const o of obstacles) { o.x -= traveled; o.frameClock += dt; }
    obstacles = obstacles.filter(o => o.x + Math.max(...o.type.frames.map(r => r[2] * o.type.scale)) > -4);
    if (!player.grounded) {
      if (jumpHeld && player.vy < 0 && player.jumpHoldTime < JUMP_HOLD_LIMIT) {
        const holdDt = Math.min(dt, JUMP_HOLD_LIMIT - player.jumpHoldTime);
        player.vy -= JUMP_HOLD_ACCEL * holdDt;
        player.jumpHoldTime += holdDt;
      }
      player.vy += 1700 * dt; player.jumpY += -player.vy * dt;
      if (player.jumpY <= 0) { player.jumpY = 0; player.vy = 0; player.grounded = true; }
    }
    // Crash is a terminal visual state; collision checks stop before it is selected.
    const pbox = boxForPlayer(currentPlayerFrame());
    if (pbox && obstacles.some(o => intersects(pbox, boxForObstacle(o)))) finishGame();
    updateHud();
  }
  function drawSprite(image, rect, x, y, scale) {
    const [sx, sy, sw, sh] = rect;
    // Apply the same scale to both axes; never round width and height separately.
    ctx.drawImage(image, sx, sy, sw, sh, Math.round(x), Math.round(y), sw * scale, sh * scale);
  }
  function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f2f0e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#454545';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, FLOOR + 1); ctx.lineTo(W, FLOOR + 1); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    for (let x = -worldOffset; x < W; x += 42) ctx.fillRect(Math.round(x), FLOOR + 7, 10, 2);
    if (images.wanderers) for (const o of obstacles) {
      const rect = o.type.frames[Math.floor(o.frameClock / 0.18) % 2];
      drawSprite(images.wanderers, rect, o.x, o.bottom - rect[3] * o.type.scale, o.type.scale);
    }
    if (images.caleb) {
      const frame = currentPlayerFrame(), scale = SPRITE_CONFIG.caleb.scale;
      const [,,sw,sh] = frame.rect;
      const y = FLOOR - sh * scale - (player.grounded ? 0 : player.jumpY);
      drawSprite(images.caleb, frame.rect, player.x, y, scale);
    }
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.width / 3 * dpr));
    // Fit the 3:1 logical world uniformly; never stretch x and y independently.
    const scale = Math.min(canvas.width / W, canvas.height / H);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    draw();
  }
  function loop(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  function onKeyDown(e) {
    if (e.target instanceof Element && e.target.closest('#theme-toggle')) return;
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown'].includes(key)) e.preventDefault();
    if (state !== 'running') {
      if (key === ' ' || key === 'enter') { if (assetsLoaded) startGame(); }
      return;
    }
    if ([' ', 'arrowup', 'w'].includes(key)) {
      jumpHeld = true;
      if (!e.repeat) jump();
    }
    if (!coarsePointer && ['arrowdown', 's'].includes(key)) duckHeld = true;
  }
  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'w'].includes(key)) releaseJumpHold();
    if (['arrowdown', 's'].includes(key)) duckHeld = false;
  }
  let assetsLoaded = false;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', e => {
    const inGame = e.target instanceof Element && !!e.target.closest('.canvas-wrap');
    const onThemeButton = e.target instanceof Element && !!e.target.closest('#theme-toggle');
    const zone = e.target instanceof Element ? e.target.closest('.touch-zone') : null;
    if (state === 'ready') {
      const canStart = coarsePointer ? isTapOnCaleb(e) : inGame;
      if (canStart && assetsLoaded) { e.preventDefault(); startGame(); }
      return;
    }
    if (state === 'over') {
      if (coarsePointer || inGame) { if (!onThemeButton) e.preventDefault(); startGame(); }
      return;
    }
    if (coarsePointer) {
      if (zone === ui.jumpZone) {
        e.preventDefault(); jumpHeld = true; jump();
      } else if (zone === ui.duckZone) {
        e.preventDefault(); duckHeld = true;
      } else if (onThemeButton) {
        // The theme control keeps its normal click behavior outside the touch zones.
      }
    }
  }, { passive: false });
  function endTouchControl() {
    if (!coarsePointer) return;
    releaseJumpHold(); duckHeld = false;
  }
  window.addEventListener('pointerup', endTouchControl);
  window.addEventListener('pointercancel', endTouchControl);
  window.addEventListener('resize', resizeCanvas);
  setTheme(document.documentElement.dataset.theme || 'light');
  ui.themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
  assetsReady.then(() => {
    assetsLoaded = true; setMessage('Caleb Runner', coarsePointer ? copy.startMobile : copy.start, true); resizeCanvas();
    updateHud(true); requestAnimationFrame(loop);
  }).catch(() => setMessage('Sprites missing', 'Keep Caleb.png and Wanderers.png beside index.html', true));
})();

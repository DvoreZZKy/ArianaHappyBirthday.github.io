// Аудио
const sfxPop = document.getElementById('sfx-pop');
const heartbeat = document.getElementById('heartbeat');
const heartmove = document.getElementById('heartmove');
sfxPop.volume = 1.0;
heartbeat.volume = 1.0;
heartmove.volume = 1.0;

function playPop() {
  sfxPop.currentTime = 0;
  sfxPop.play().catch(e => {
    console.log("Звук заблокирован браузером или файл не найден");
  });
}
function playHeartbeat() {
  heartbeat.play().catch(e => {
    console.log("Звук заблокирован браузером или файл не найден");
  });
}
function playHeartmove() {
  heartmove.play().catch(e => {
    console.log("Звук заблокирован браузером или файл не найден");
  });
}

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });

const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');

let W, H, CX, CY, SCALE;
let layers = [];
let startTime = 0;
let isFinished = false;

let cachedHeartPath = null;
let cachedHeartOutline = null;
let cachedSmallHeart = null;

// ---------- ПАРАМЕТРЫ ----------
const LAYERS        = 5;       
const HEART_SPAN    = 1.15;
const FONT_BASE     = 0.0575;

const NEON_COLOR  = '#ff001a'; 
const PINK_COLOR  = '#ff3366'; 
const PINK_WAVE_ON_WHITE = '#e6004c'; 
const BG_WHITE    = '#ffffff'; 

const MAX_TOTAL_PHRASES = 1600;

const FADE_DURATION = 1300;
const LAYER_DELAY   = 700;
const PHRASE_SPREAD = 2200;

const OUTLINE_JITTER       = 0.25;
const OUTLINE_DEPTH        = 0.08;
const OUTLINE_DENSITY_MUL  = 1.4;
const OUTLINE_ALPHA_MUL    = 1.10;
const EDGE_EXTRA_DENSITY   = 1.15;
const EDGE_EXTRA_ALPHA     = 1.10;

// ---------- ТАЙМЛАЙН ----------
const T_CENTER_TEXT_START = 4500;
const T_CENTER_TEXT_FADE  = 1200;

const T_SOLID_FILL_START = 6000; 
const T_SOLID_FILL_DUR   = 300;  
const T_INSTANT_FILL_AND_PULSE = T_SOLID_FILL_START; 
const T_WAVE1_DUR   = 250;   

const T_PHRASES_FADEOUT_START = T_INSTANT_FILL_AND_PULSE + T_WAVE1_DUR;
const T_PHRASES_FADEOUT_DUR   = 500; 

const T_WAVE2_START = T_INSTANT_FILL_AND_PULSE + 1000; 
const T_WAVE2_DUR   = 250;   

const T_TEXT_FADEOUT_START = T_WAVE2_START + 500;  
const T_TEXT_FADEOUT_DUR   = 4000;  

const T_WAVE3_START = T_WAVE2_START + 1200; 
const T_WAVE3_DUR   = 250;
const T_HEART_FLY_START = T_WAVE3_START + 800; 
const T_HEART_FLY_DUR   = 1500; 

// ---------- ЧАСТИЦЫ ----------
let particles = [];
let lastMouseX = 0, lastMouseY = 0;
let distanceAccumulator = 0;
const MAX_PARTICLES = 35;      
const SPAWN_DISTANCE = 15;     

// ------------------------------------------------------------------
function buildPhraseSprite(fontSize) {
  const text = 'I love you';
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = `${fontSize}px "Segoe UI", Arial, sans-serif`;
  const metrics = tempCtx.measureText(text);
  
  const w = Math.ceil(metrics.width) + 40;
  const h = Math.ceil(fontSize) + 40;
  
  const oc = document.createElement('canvas');
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext('2d');
  
  octx.font = `${fontSize}px "Segoe UI", Arial, sans-serif`;
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.shadowColor = NEON_COLOR;
  octx.shadowBlur = 12;
  octx.fillStyle = NEON_COLOR;
  octx.fillText(text, w/2, h/2);
  
  octx.shadowBlur = 4;
  octx.fillStyle = NEON_COLOR;
  octx.fillText(text, w/2, h/2);
  
  return { canvas: oc, w, h };
}

function buildHeartPath(scale) {
  const p = new Path2D();
  const points = 100;
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t)
                - 2 * Math.cos(3*t) - Math.cos(4*t));
    const px = x * scale * SCALE / 16;
    const py = y * scale * SCALE / 16;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  return p;
}

function initCache() {
  cachedHeartPath = buildHeartPath(HEART_SPAN);
  cachedHeartOutline = buildHeartPath(1.0);
  cachedSmallHeart = buildHeartPath(0.04); 
}

function drawHeartOutline(kMultiplier, color, alpha, lineWidth) {
  if (!cachedHeartOutline) return;
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(kMultiplier, kMultiplier);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth / kMultiplier; 
  ctx.stroke(cachedHeartOutline);
  ctx.restore();
}

function drawWidePulse(kMultiplier, color, alpha, isLight = false) {
  if (isLight) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
  }

  drawHeartOutline(kMultiplier, color, alpha * 0.6, 20);
  drawHeartOutline(kMultiplier, color, alpha * 0.85, 8);
  drawHeartOutline(kMultiplier, color, alpha * 1.0, 3);
}

function heartContourPoint(t, k) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t)
              - 2 * Math.cos(3*t) - Math.cos(4*t));
  return {
    x: CX + x * k * SCALE / 16,
    y: CY + y * k * SCALE / 16
  };
}

function rebuild() {
  layers = [];
  let totalPlaced = 0;
  const step = HEART_SPAN / LAYERS;
  const baseSize = SCALE * FONT_BASE;
  
  const spriteEven = buildPhraseSprite(baseSize);
  const spriteOdd  = buildPhraseSprite(baseSize * 0.65);

  for (let L = 0; L < LAYERS; L++) {
    const isEdge = (L === 0);
    const k = 1 - L * step;
    const isEven = (L % 2 === 0);
    const fontSize = isEven ? baseSize : baseSize * 0.65;
    const sprite = isEven ? spriteEven : spriteOdd;

    let opacity = isEven ? 1.0 : 0.4;
    opacity *= OUTLINE_ALPHA_MUL;

    const densityFactor = 1.0 - (L / LAYERS) * 0.6;
    const baseCount = isEven ? 80 : 50;
    let count = Math.round(baseCount * densityFactor * OUTLINE_DENSITY_MUL);

    if (isEdge) {
      count = Math.round(count * EDGE_EXTRA_DENSITY);
      opacity *= EDGE_EXTRA_ALPHA;
    }

    const phrases = [];
    for (let i = 0; i < count; i++) {
      if (totalPlaced >= MAX_TOTAL_PHRASES) break;
      const t = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
      const depth = Math.random() * (step * OUTLINE_DEPTH);
      const kPoint = k - depth;
      const p = heartContourPoint(t, kPoint);
      const jitterX = (Math.random() - 0.5) * fontSize * OUTLINE_JITTER;
      const jitterY = (Math.random() - 0.5) * fontSize * OUTLINE_JITTER;
      const bornOffset = Math.random() * PHRASE_SPREAD;
      phrases.push({
        x: p.x + jitterX, y: p.y + jitterY, size: fontSize, bornOffset, isEdge, sprite 
      });
      totalPlaced++;
    }

    for (let i = phrases.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [phrases[i], phrases[j]] = [phrases[j], phrases[i]];
    }

    layers.push({ phrases, opacity, delay: L * LAYER_DELAY, isEdge });
  }
}

function resize() {
  if (isFinished) return;
  
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;

  CX = W / 2;
  CY = H / 2 - (H * 0.05);
  SCALE = Math.min(W, H) / 3.2;
  startTime = 0;
  initCache();
  rebuild();
}

function easeOut(t) {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ------------------------------------------------------------------
// Логика частиц
// ------------------------------------------------------------------
window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  distanceAccumulator += dist;

  while (distanceAccumulator >= SPAWN_DISTANCE) {
    distanceAccumulator -= SPAWN_DISTANCE;
    if (particles.length < MAX_PARTICLES) {
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - 0.5, 
        size: Math.random() * 0.4 + 0.5,   
        life: 1.0,
        decay: Math.random() * 0.015 + 0.015, 
        angle: (Math.random() - 0.5) * 0.5
      });
    }
  }
});

function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

  if (particles.length > 0) {
    pCtx.globalCompositeOperation = 'lighter';
    pCtx.shadowColor = PINK_COLOR;
    pCtx.shadowBlur = 6;
    pCtx.fillStyle = PINK_COLOR;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.angle += 0.03;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      pCtx.save();
      pCtx.translate(p.x, p.y);
      pCtx.rotate(p.angle);
      const localScale = p.size * (0.5 + p.life * 0.5);
      pCtx.scale(localScale, localScale);
      pCtx.globalAlpha = p.life * 0.8;
      pCtx.fill(cachedSmallHeart);
      pCtx.restore();
    }
  }

  requestAnimationFrame(drawParticles);
}

// ------------------------------------------------------------------
// Основная анимация
// ------------------------------------------------------------------
function draw(now) {
  if (isFinished) return;

  if (!startTime) startTime = now;
  const elapsed = now - startTime;

  let textAlpha = 0;
  if (elapsed > T_CENTER_TEXT_START) {
    textAlpha = easeOut((elapsed - T_CENTER_TEXT_START) / T_CENTER_TEXT_FADE);
  }
  if (elapsed > T_TEXT_FADEOUT_START) {
    const outProgress = Math.min(1, (elapsed - T_TEXT_FADEOUT_START) / T_TEXT_FADEOUT_DUR);
    textAlpha *= (1 - easeOut(outProgress));
  }

  let solidHeartAlpha = 0;
  if (elapsed > T_SOLID_FILL_START) {
    solidHeartAlpha = easeOut(Math.min(1, (elapsed - T_SOLID_FILL_START) / T_SOLID_FILL_DUR));
  }

  let phrasesAlpha = 1.0; 
  if (elapsed > T_PHRASES_FADEOUT_START) {
    phrasesAlpha = 1.0 - easeOut(Math.min(1, (elapsed - T_PHRASES_FADEOUT_START) / T_PHRASES_FADEOUT_DUR));
  }

  let wave1Progress = 0;
  const tSinceFill = elapsed - T_INSTANT_FILL_AND_PULSE;
  if (tSinceFill > 0 && tSinceFill < T_WAVE1_DUR) wave1Progress = tSinceFill / T_WAVE1_DUR;
  else if (tSinceFill >= T_WAVE1_DUR) wave1Progress = 1;

  let themeProgress = 0;
  let wave2Progress = 0;
  if (elapsed > T_WAVE2_START) {
    wave2Progress = Math.min(1, (elapsed - T_WAVE2_START) / T_WAVE2_DUR);
    themeProgress = wave2Progress;
  }

  let wave3Progress = 0;
  if (elapsed > T_WAVE3_START) {
    wave3Progress = Math.min(1, (elapsed - T_WAVE3_START) / T_WAVE3_DUR);
  }

  if (elapsed > T_HEART_FLY_START + T_HEART_FLY_DUR) {
    isFinished = true;
    
    canvas.style.display = 'none';
    document.getElementById('corner-heart').classList.add('visible');
    document.body.style.backgroundColor = '#ffffff';
    
    setTimeout(() => {
      document.getElementById('site-content').classList.add('visible');
    }, 100);

    return; 
  }

  let flyProgress = 0;
  if (elapsed > T_HEART_FLY_START) {
    flyProgress = easeInOut(Math.min(1, (elapsed - T_HEART_FLY_START) / T_HEART_FLY_DUR));
  }

  // 1. Фон
  const bgColor = themeProgress === 0 ? '#000000' : 
                  (themeProgress === 1 ? BG_WHITE : 
                   `rgb(${Math.round(255 * themeProgress)}, ${Math.round(255 * themeProgress)}, ${Math.round(255 * themeProgress)})`);
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  if (themeProgress < 1) {
    const glowAlpha = 1 - themeProgress;
    const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, SCALE * 1.2);
    grad.addColorStop(0, `rgba(40, 0, 0, ${0.3 * glowAlpha})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Фразы
  const hidePhrases = solidHeartAlpha > 0.5 || phrasesAlpha <= 0.01;
  if (!hidePhrases) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    for (let L = 0; L < layers.length; L++) {
      const layer = layers[L];
      const layerStart = layer.delay;
      for (let i = 0; i < layer.phrases.length; i++) {
        const ph = layer.phrases[i];
        const localT = elapsed - layerStart - ph.bornOffset;
        if (localT < 0) continue;
        const fade = easeOut(localT / FADE_DURATION);
        if (fade <= 0.001) continue;
        ctx.globalAlpha = fade * layer.opacity * phrasesAlpha;
        ctx.drawImage(ph.sprite.canvas, ph.x - ph.sprite.w/2, ph.y - ph.sprite.h/2);
      }
    }
  }

  // 3. Сплошное сердце (с эффектом биения)
  if (solidHeartAlpha > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // --- ЭФФЕКТ БИЕНИЯ ---
    let beatScale = 1.0;
    
    // Удары при волнах
    if (wave1Progress > 0 && wave1Progress < 1) {
      beatScale += 0.10 * Math.sin(wave1Progress * Math.PI);
      playHeartbeat();
    }
    if (wave2Progress > 0 && wave2Progress < 1) {
      beatScale += 0.07 * Math.sin(wave2Progress * Math.PI);
        playHeartbeat();
    }
    if (wave3Progress > 0 && wave3Progress < 1) {
      beatScale += 0.05 * Math.sin(wave3Progress * Math.PI);
      playHeartbeat();
    }

    // Постоянное лёгкое "дыхание" между волнами
    const heartbeat = 0.02 * Math.sin(elapsed * 0.005);
    beatScale += heartbeat;

    // Позиция и масштаб для полёта в угол
    let currentX = CX;
    let currentY = CY;
    let flyScale = 1.0;

    if (flyProgress > 0) {
        playHeartmove();
      const targetScale = 0.15;
      const targetX = 80; 
      const targetY = 80;
      
      flyScale = 1 - flyProgress * (1 - targetScale);
      currentX = CX + (targetX - CX) * flyProgress;
      currentY = CY + (targetY - CY) * flyProgress;
    }

    // Применяем трансформации: сначала полёт, потом биение
    ctx.translate(currentX, currentY);
    ctx.scale(flyScale * beatScale, flyScale * beatScale);
    ctx.translate(-CX, -CY);

    const r = Math.round(255 * (1 - themeProgress) + 255 * themeProgress);
    const g = Math.round(0 * (1 - themeProgress) + 51 * themeProgress);
    const b = Math.round(26 * (1 - themeProgress) + 102 * themeProgress);
    
    ctx.globalAlpha = solidHeartAlpha;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.translate(CX, CY);
    ctx.fill(cachedHeartPath);
    
    ctx.restore();
  }

  // 4. Волны
  if (wave1Progress > 0 && wave1Progress < 1) {
    const waveK = 1.0 + easeInOut(wave1Progress) * 1.5; 
    drawWidePulse(waveK, NEON_COLOR, 1.0 - wave1Progress, false);
  }
  if (wave2Progress > 0 && wave2Progress < 1) {
    const waveK = 1.0 + easeInOut(wave2Progress) * 1.5; 
    drawWidePulse(waveK, '#ff66cc', 1.0 - wave2Progress, false);
  }
  if (wave3Progress > 0 && wave3Progress < 1) {
    const waveK = 1.0 + easeInOut(wave3Progress) * 1.8; 
    drawWidePulse(waveK, PINK_WAVE_ON_WHITE, 1.0 - wave3Progress, true);
  }

  // 5. Текст
  if (textAlpha > 0.01) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (themeProgress < 0.5) {
      ctx.shadowColor = NEON_COLOR;
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = textAlpha;
      ctx.font = `600 ${SCALE * 0.28}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText('Love you', CX, CY);
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = PINK_COLOR;
      ctx.globalAlpha = textAlpha;
      ctx.font = `600 ${SCALE * 0.28}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText('Love you', CX, CY);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  requestAnimationFrame(draw);
}

// ------------------------------------------------------------------
// УПРАВЛЕНИЕ ЭТАПАМИ
// ------------------------------------------------------------------
function startAnimation() {
  startTime = 0;
  isFinished = false;
  resize();
  
  playPop();
  
  requestAnimationFrame(draw);
}

function startProgress() {
  let progress = 0;
  const fillEl = document.getElementById('progress-fill');
  const textEl = document.getElementById('progress-text');

  function updateProgress() {
    progress += Math.random() / 2;
    if (progress >= 100) {
      progress = 100;
      fillEl.style.width = '100%';
      textEl.textContent = '100%';

      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        startAnimation();
      }, 400);
      return;
    }
    fillEl.style.width = progress + '%';
    textEl.textContent = Math.floor(progress) + '%';
    requestAnimationFrame(updateProgress);
  }

  updateProgress();
}

// Кнопка "Начать"
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden');
    loadingScreen.style.display = 'flex';
    startProgress();
  }, 100);
});

// Инициализация
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(drawParticles);

// ==========================================================
// ФОНОВЫЕ СЕРДЕЧКИ (поднимаются снизу вверх)
// ==========================================================

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let bgW, bgH;
let bgParticles = [];
let bgSmallHeartPath = null;

const BG_HEARTS_COUNT = 40;
const BG_HEART_COLOR = 'rgba(255, 51, 102, 0.4)';
const BG_DIRECTION = 'up'; // 'up' — поднимаются, 'down' — падают

function buildBgHeartPath() {
  const p = new Path2D();
  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t)
                - 2 * Math.cos(3*t) - Math.cos(4*t));
    const px = x / 16;
    const py = y / 16;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  return p;
}

function initBgHearts() {
  bgW = bgCanvas.width = window.innerWidth;
  bgH = bgCanvas.height = window.innerHeight;
  bgSmallHeartPath = buildBgHeartPath();

  bgParticles = [];
  for (let i = 0; i < BG_HEARTS_COUNT; i++) {
    bgParticles.push(createBgHeart(true));
  }
}

function createBgHeart(randomStart = false) {
  const size = Math.random() * 30 + 10;

  return {
    x: Math.random() * bgW,
    y: randomStart
       ? Math.random() * bgH
       : (BG_DIRECTION === 'up' ? bgH + size : -size),
    size: size,
    speed: (Math.random() * 0.5 + 0.2) * (size / 20),
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: Math.random() * 0.02 + 0.01
  };
}

function drawBgHearts() {
  bgCtx.clearRect(0, 0, bgW, bgH);
  bgCtx.fillStyle = BG_HEART_COLOR;

  for (let i = 0; i < bgParticles.length; i++) {
    const h = bgParticles[i];

    // Движение
    if (BG_DIRECTION === 'up') h.y -= h.speed;
    else h.y += h.speed;

    // Покачивание и вращение
    h.sway += h.swaySpeed;
    const offsetX = Math.sin(h.sway) * 20;
    h.angle += h.rotationSpeed;

    // Перерождение за краем
    if (BG_DIRECTION === 'up' && h.y < -h.size) {
      Object.assign(h, createBgHeart(false));
    } else if (BG_DIRECTION === 'down' && h.y > bgH + h.size) {
      Object.assign(h, createBgHeart(false));
    }

    // Отрисовка
    bgCtx.save();
    bgCtx.translate(h.x + offsetX, h.y);
    bgCtx.rotate(h.angle);
    bgCtx.scale(h.size, h.size);
    bgCtx.fill(bgSmallHeartPath);
    bgCtx.restore();
  }

  requestAnimationFrame(drawBgHearts);
}

window.addEventListener('resize', () => {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  bgW = window.innerWidth;
  bgH = window.innerHeight;
});

initBgHearts();
requestAnimationFrame(drawBgHearts);
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');

let W, H, CX, CY, SCALE;
let cachedSmallHeart = null;

const PINK_COLOR = '#ff3366';

// ---------- ЧАСТИЦЫ ----------
let particles = [];
let lastMouseX = 0, lastMouseY = 0;
let distanceAccumulator = 0;
const MAX_PARTICLES = 35;
const SPAWN_DISTANCE = 15;

// ------------------------------------------------------------------
// Path2D маленького сердечка (в локальных координатах)
// ------------------------------------------------------------------
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
  cachedSmallHeart = buildHeartPath(0.04);
}

// ------------------------------------------------------------------
// Resize
// ------------------------------------------------------------------
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  pCanvas.width = W;
  pCanvas.height = H;
  CX = W / 2;
  CY = H / 2;
  SCALE = Math.min(W, H) / 3.2;
  initCache();
}

// ------------------------------------------------------------------
// Спавн частиц при движении мыши
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

// ------------------------------------------------------------------
// Отрисовка частиц
// ------------------------------------------------------------------
function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

  if (particles.length > 0 && cachedSmallHeart) {
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
// Инициализация
// ------------------------------------------------------------------
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(drawParticles);

// ==========================================================
// ФОНОВЫЕ СЕРДЕЧКИ (Падают или Поднимаются)
// ==========================================================

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let bgW, bgH;
let bgParticles = [];
let bgSmallHeartPath = null;

// Настройки
const BG_HEARTS_COUNT = 40; // Сколько сердечек на экране одновременно
const BG_HEART_COLOR = 'rgba(255, 51, 102, 0.4)'; // Розовый с прозрачностью
const DIRECTION = 'up'; // 'up' (поднимаются) или 'down' (падают)

// Создаём путь для сердечка (копируем из основного кода, но в локальных координатах)
function buildBgHeartPath() {
  const p = new Path2D();
  const scale = 1.0;
  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t)
                - 2 * Math.cos(3*t) - Math.cos(4*t));
    // Делим на 16, чтобы вписать в масштаб 1x1
    const px = x * scale / 16;
    const py = y * scale / 16;
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

function createBgHeart(isRandomStart = false) {
  // Случайный размер (эффект глубины: от 10 до 40 пикселей)
  const size = Math.random() * 30 + 10; 
  
  return {
    x: Math.random() * bgW,
    // Если стартуем впервые — раскидываем по всему экрану. Иначе — за краем экрана.
    y: isRandomStart 
       ? Math.random() * bgH 
       : (DIRECTION === 'up' ? bgH + size : -size),
    size: size,
    speed: (Math.random() * 0.5 + 0.2) * (size / 20), // Большие плывут быстрее
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    sway: Math.random() * Math.PI * 2, // Для покачивания из стороны в сторону
    swaySpeed: Math.random() * 0.02 + 0.01
  };
}

function drawBgHearts() {
  bgCtx.clearRect(0, 0, bgW, bgH);
  
  bgCtx.fillStyle = BG_HEART_COLOR;

  for (let i = 0; i < bgParticles.length; i++) {
    const h = bgParticles[i];
    
    // Движение вверх или вниз
    if (DIRECTION === 'up') {
      h.y -= h.speed;
    } else {
      h.y += h.speed;
    }
    
    // Покачивание (синусоида)
    h.sway += h.swaySpeed;
    const offsetX = Math.sin(h.sway) * 20; // Амплитуда покачивания
    h.angle += h.rotationSpeed;

    // Если сердечко улетело за экран — перерождаем его с другой стороны
    if (DIRECTION === 'up' && h.y < -h.size) {
      Object.assign(h, createBgHeart(false));
    } else if (DIRECTION === 'down' && h.y > bgH + h.size) {
      Object.assign(h, createBgHeart(false));
    }

    // Рисуем
    bgCtx.save();
    bgCtx.translate(h.x + offsetX, h.y);
    bgCtx.rotate(h.angle);
    bgCtx.scale(h.size, h.size); // Масштабируем базовый путь 1x1 до нужного размера
    bgCtx.fill(bgSmallHeartPath);
    bgCtx.restore();
  }

  requestAnimationFrame(drawBgHearts);
}

// Следим за ресайзом окна
window.addEventListener('resize', () => {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  bgW = window.innerWidth;
  bgH = window.innerHeight;
});

// Запускаем
initBgHearts();
requestAnimationFrame(drawBgHearts);

// Логика для кнопки "Сюрприз"
const texts = [
  "Ты — мой любимый человек ♥",
  "Ты справишься с любыми трудностями!",
  "Твой смех — лучшее, что есть на свете.",
  "Спасибо, что ты рядом.",
  "Год будет крутым, я обещаю.",
  "Ты сегодня прекрасно выглядишь (даже если не вижу).",
  "Я всегда на твоей стороне.",
  "Ты делаешь этот мир лучше."
];

const btn = document.getElementById('surprise-btn');
const textElement = document.getElementById('surprise-text');
let isAnimating = false; // Защита от быстрого клика

// Скрипт подключён на нескольких страницах — интерактив есть только на interactive.html.
if (btn && textElement) {
  btn.addEventListener('click', function() {
    if (isAnimating) return;
    isAnimating = true;

    textElement.classList.remove('fade-in');
    textElement.classList.add('fade-out');

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * texts.length);
      textElement.innerText = texts[randomIndex];

      textElement.classList.remove('fade-out');
      textElement.classList.add('fade-in');

      setTimeout(() => {
        isAnimating = false;
      }, 400);
    }, 400);
  });
}

// Таймер присутствует только на странице интерактива.
const timerElement = document.getElementById("timer");

function updateTimer() {
  if (!timerElement) return;

  const targetDate = new Date("2027-11-18T00:00:00").getTime();
  const now = Date.now();
  const distance = targetDate - now;

  if (distance < 0) {
    timerElement.textContent = "Этот день настал!";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  timerElement.textContent = `${days}д ${hours}ч ${minutes}м ${seconds}с`;
}

if (timerElement) {
  updateTimer();
  setInterval(updateTimer, 1000);
}

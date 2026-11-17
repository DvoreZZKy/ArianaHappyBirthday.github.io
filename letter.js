const envelope = document.querySelector(".envelope");
const canvas = document.querySelector("#scratch-canvas");
const ctx = canvas.getContext("2d", {
    willReadFrequently: true
});

const cursor = document.querySelector("#scratch-cursor");
const controls = document.querySelector("#scratch-controls");
const percentText = document.querySelector("#scratch-percent");
const exitBtn = document.querySelector("#exit-btn");

const img = new Image();
img.src = "Assets/imgs/letter.png";

// Настройки
const brushSize = 80;
const imageScale = 10;
const sampleStep = 16;
const finishThreshold = 95;

let scratching = false;
let lastX = null;
let lastY = null;

let completed = false;
let initialized = false;
let envelopeOpened = false;

let samplePoints = [];
let totalPixels = 0;

let lastProgressUpdate = 0;

// Скрываем панель до открытия конверта
controls.style.opacity = "0";
controls.style.visibility = "hidden";
controls.style.pointerEvents = "none";

// Открытие конверта
envelope.addEventListener("click", () => {
    if (envelopeOpened) return;

    envelopeOpened = true;
    envelope.classList.add("open");

    // Показываем процент после анимации открытия
    setTimeout(() => {
        controls.style.visibility = "visible";
        controls.style.opacity = "1";
        controls.style.pointerEvents = "auto";
    }, 1800);
});

// Загрузка изображения
img.onload = () => {
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) {
        console.error("Canvas имеет нулевой размер");
        return;
    }

    canvas.width = Math.round(width * dpr * imageScale);
    canvas.height = Math.round(height * dpr * imageScale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.globalCompositeOperation = "source-over";

    ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Запоминаем изначально непрозрачные пиксели
    const data = ctx.getImageData(
        0, 0,
        canvas.width,
        canvas.height
    ).data;

    samplePoints = [];
    totalPixels = 0;

    for (let y = 0; y < canvas.height; y += sampleStep) {
        for (let x = 0; x < canvas.width; x += sampleStep) {
            const index = (y * canvas.width + x) * 4;

            if (data[index + 3] > 128) {
                samplePoints.push(index + 3);
                totalPixels++;
            }
        }
    }

    ctx.globalCompositeOperation = "destination-out";

    initialized = true;

    console.log("PNG загружена");
    console.log("Точек для подсчёта:", totalPixels);
};

img.onerror = () => {
    console.error("Ошибка загрузки PNG:", img.src);
};

// Стирание
function scratch(e) {
    if (!initialized || completed || !envelopeOpened) return;

    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left) *
        canvas.width / rect.width;

    const y = (e.clientY - rect.top) *
        canvas.height / rect.height;

    ctx.globalCompositeOperation = "destination-out";

    ctx.beginPath();

    if (lastX !== null) {
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
    } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineWidth = brushSize * 2 * (scaleX + scaleY) / 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.stroke();

    lastX = x;
    lastY = y;

    // Не пересчитываем процент на каждом кадре
    const now = performance.now();

    if (now - lastProgressUpdate >= 150) {
        lastProgressUpdate = now;
        updateProgress();
    }
}

// Подсчёт прогресса
function updateProgress() {
    if (!initialized || completed || totalPixels === 0) return;

    const data = ctx.getImageData(
        0, 0,
        canvas.width,
        canvas.height
    ).data;

    let erasedPixels = 0;

    for (const index of samplePoints) {
        if (data[index] <= 128) {
            erasedPixels++;
        }
    }

    let percent = Math.floor(
        erasedPixels / totalPixels * 100
    );

    // С 95% сразу засчитываем 100%
    if (percent >= finishThreshold) {
        finishScratch();
        return;
    }

    percentText.textContent = percent + "%";
}

// Завершение
function finishScratch() {
    if (completed) return;

    completed = true;
    scratching = false;

    ctx.clearRect(
        0, 0,
        canvas.width,
        canvas.height
    );

    percentText.textContent = "100%";

    cursor.style.display = "none";

    canvas.style.pointerEvents = "none";

    exitBtn.classList.add("visible");
}

// Курсор
canvas.addEventListener("pointermove", (e) => {
    if (completed || !envelopeOpened) return;

    cursor.style.display = "block";
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";

    if (scratching) {
        scratch(e);
    }
});

canvas.addEventListener("pointerleave", () => {
    cursor.style.display = "none";
});

// Начало стирания
canvas.addEventListener("pointerdown", (e) => {
    if (!initialized || completed || !envelopeOpened) return;

    scratching = true;

    lastX = null;
    lastY = null;

    canvas.setPointerCapture(e.pointerId);

    scratch(e);
});

// Остановка
function stopScratch() {
    if (!scratching) return;

    scratching = false;

    lastX = null;
    lastY = null;

    updateProgress();
}

canvas.addEventListener("pointerup", stopScratch);
canvas.addEventListener("pointercancel", stopScratch);
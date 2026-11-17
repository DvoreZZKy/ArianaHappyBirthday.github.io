
const audio = new Audio("Assets/music/bg-music.mp3");

audio.loop = true;
audio.preload = "auto";

const STORAGE = {
    time: "siteMusicTime",
    volume: "siteMusicVolume",
    playing: "siteMusicPlaying",
    started: "siteMusicStarted"
};

// Определяем текущую страницу
const currentPage = location.pathname.split("/").pop();
const isMain = currentPage === "main.html";

// Запускать ли музыку
const startFromIndex =
    sessionStorage.getItem("siteMusicStartOnMain") === "true";

if (isMain && startFromIndex) {
    sessionStorage.setItem(STORAGE.started, "true");
    sessionStorage.setItem(STORAGE.playing, "true");
    sessionStorage.setItem(STORAGE.time, "0");

    sessionStorage.removeItem("siteMusicStartOnMain");
}

const shouldPlay =
    isMain ||
    sessionStorage.getItem(STORAGE.started) === "true";

// Громкость
const savedVolume = sessionStorage.getItem(STORAGE.volume);

audio.volume = savedVolume !== null
    ? Number(savedVolume)
    : 0.3;

// Восстанавливаем позицию
const savedTime = Number(
    sessionStorage.getItem(STORAGE.time) || 0
);

// Создаём интерфейс
const player = document.createElement("div");
player.id = "music-player";

player.innerHTML = `
    <button id="music-toggle" title="Пауза">
        ❚❚
    </button>

    <div class="music-volume-wrapper">
        <span>♫</span>
        <input
            id="music-volume"
            type="range"
            min="0"
            max="100"
            value="${Math.round(audio.volume * 100)}"
        >
        <span id="music-volume-value">
            ${Math.round(audio.volume * 100)}%
        </span>
    </div>
`;

document.body.appendChild(player);

const toggleBtn = document.querySelector("#music-toggle");
const volumeSlider = document.querySelector("#music-volume");
const volumeValue = document.querySelector("#music-volume-value");

function updateVolumeUI() {
    const percent = Math.round(audio.volume * 100);
    volumeSlider.value = String(percent);
    volumeValue.textContent = percent + "%";
    volumeSlider.style.background = `linear-gradient(to right, #ff3366 ${percent}%, #ffd3df ${percent}%)`;
}

updateVolumeUI();

// Стили кнопки
function updateButton() {
    toggleBtn.textContent = audio.paused ? "▶" : "❚❚";
    toggleBtn.title = audio.paused ? "Воспроизвести" : "Пауза";
}

updateButton();

// Воспроизведение
async function playMusic() {
    try {
        await audio.play();

        sessionStorage.setItem(STORAGE.playing, "true");
        updateButton();
    } catch (error) {
        console.warn("Автовоспроизведение заблокировано:", error);
        updateButton();
    }
}

// Пауза / воспроизведение
toggleBtn.addEventListener("click", async () => {
    if (audio.paused) {
        sessionStorage.setItem(STORAGE.started, "true");
        await playMusic();
    } else {
        audio.pause();
        sessionStorage.setItem(STORAGE.playing, "false");
        updateButton();
    }
});

// Регулятор громкости
volumeSlider.addEventListener("input", () => {
    const volume = Number(volumeSlider.value);

    audio.volume = volume / 100;

    volumeValue.textContent = volume + "%";
    volumeSlider.style.background = `linear-gradient(to right, #ff3366 ${volume}%, #ffd3df ${volume}%)`;

    sessionStorage.setItem(
        STORAGE.volume,
        String(audio.volume)
    );
});

// Сохраняем позицию воспроизведения
audio.addEventListener("timeupdate", () => {
    sessionStorage.setItem(
        STORAGE.time,
        String(audio.currentTime)
    );
});

// Сохраняем состояние при уходе со страницы
window.addEventListener("pagehide", () => {
    sessionStorage.setItem(
        STORAGE.time,
        String(audio.currentTime)
    );

    sessionStorage.setItem(
        STORAGE.playing,
        String(!audio.paused)
    );
});

// Восстанавливаем музыку после загрузки
audio.addEventListener("loadedmetadata", async () => {
    if (savedTime > 0 && savedTime < audio.duration) {
        audio.currentTime = savedTime;
    }

    if (shouldPlay &&
        sessionStorage.getItem(STORAGE.playing) !== "false") {
        await playMusic();
    }

    if (shouldPlay &&
        sessionStorage.getItem(STORAGE.playing) === "false") {
        updateButton();
    }
});

// Если пользователь остановил музыку, не запускаем её автоматически
audio.addEventListener("pause", updateButton);
audio.addEventListener("play", updateButton);

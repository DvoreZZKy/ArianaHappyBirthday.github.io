
(() => {
    const effectsCurrentPage = location.pathname.split("/").pop();

    // Плавное появление страницы
    if (effectsCurrentPage !== "index.html" && effectsCurrentPage !== "") {
        document.body.classList.add("page-enter");
    }

    // Перехват внутренних переходов
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");

        if (!link) return;

        // Не трогаем внешние ссылки и специальные переходы
        if (
            link.target === "_blank" ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey ||
            e.metaKey ||
            link.hasAttribute("download")
        ) {
            return;
        }

        const url = new URL(link.href, location.href);

        if (
            url.origin !== location.origin ||
            !url.pathname.endsWith(".html") ||
            url.pathname === location.pathname
        ) {
            return;
        }

        const targetPage = url.pathname.split("/").pop();

        // Переход с индекса на главную
        if (
            (effectsCurrentPage === "index.html" || effectsCurrentPage === "") &&
            targetPage === "main.html"
        ) {
            sessionStorage.setItem("siteMusicStarted", "true");
            sessionStorage.setItem("siteMusicPlaying", "true");
            sessionStorage.setItem("siteMusicTime", "0");
            sessionStorage.setItem("siteMusicStartOnMain", "true");

            return;
        }

        // Остальные переходы с анимацией
        e.preventDefault();

        document.body.classList.add("page-leaving");

        setTimeout(() => {
            location.href = url.href;
        }, 350);
    });

    window.addEventListener("pageshow", () => {
        document.body.classList.remove("page-leaving");
    });
})();

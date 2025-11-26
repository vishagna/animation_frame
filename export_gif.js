// Tạo worker URL cho gif.js
function workerURL() {
    const code = `importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');`;
    return URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
}

/**
 * Xuất GIF
 * @param {Array<HTMLImageElement>} frames - mảng image đã load
 * @param {Object} options - {fps, scale, useBg, bgColor}
 */
function exportGIF(frames, options) {
    const { fps, scale, useBg, bgColor } = options;

    const gif = new GIF({
        workers: 2,
        quality: 1,
        transparent: true,
        workerScript: workerURL()
    });

    for (let img of frames) {
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;

        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        if (useBg) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, c.width, c.height);
        }

        ctx.drawImage(img, 0, 0, c.width, c.height);

        gif.addFrame(c, { delay: 1000 / fps });
    }

    gif.on("finished", blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "output.gif";
        a.click();
        URL.revokeObjectURL(url);
    });

    gif.render();
}


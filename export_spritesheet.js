/**
 * Xuất sprite sheet từ list frame
 * @param {Array<Array<File>>} listsOfFiles - Mỗi phần tử là 1 mảng File (tương ứng 1 dòng)
 * @param {Object} options - {scale, useBg, bgColor}
 */
async function exportSpriteSheet(listsOfFrames, options) {
    const { scale, useBg, bgColor } = options;

    // listsOfFrames là Array<Array<Image>>, không cần load lại
    const allFrames = listsOfFrames;

    // Tính kích thước canvas sprite sheet
    const rowHeights = allFrames.map(frames => {
        if (frames.length === 0) return 0;
        return Math.max(...frames.map(f => f.height * scale));
    });

    const sheetWidth = Math.max(...allFrames.map(frames => 
        frames.reduce((sum, f) => sum + f.width * scale, 0)
    ));

    const sheetHeight = rowHeights.reduce((sum, h) => sum + h, 0);

    // Tạo canvas
    const canvas = document.createElement("canvas");
    canvas.width = sheetWidth;
    canvas.height = sheetHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Vẽ từng frame
    let yOffset = 0;
    for (let row = 0; row < allFrames.length; row++) {
        const frames = allFrames[row];
        let xOffset = 0;

        for (let img of frames) {
            if (useBg) {
                ctx.fillStyle = bgColor;
                ctx.fillRect(xOffset, yOffset, img.width * scale, img.height * scale);
            }

            ctx.drawImage(img, xOffset, yOffset, img.width * scale, img.height * scale);
            xOffset += img.width * scale;
        }

        yOffset += rowHeights[row];
    }

    // Xuất PNG
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spritesheet.png";
        a.click();
        URL.revokeObjectURL(url);
    }, "image/png");
}

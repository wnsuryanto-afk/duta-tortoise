/**
 * Watermark utility — overlay text on image via Canvas API
 * Watermark: "🐢 Duta Tortoise\n[Nama User]\n[Tanggal] [Jam]"
 */

const MAX_DIM = 1080;
const JPEG_QUALITY = 0.8;

/**
 * @param {File} file - Original image file
 * @param {string} userName - Full name of uploader
 * @returns {Promise<File>} - New File with watermark embedded
 */
export async function addWatermark(file, userName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize if too large
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Build watermark text
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const lines = [
          '🐢 Duta Tortoise',
          userName || 'User',
          `${dateStr} ${timeStr}`,
        ];

        const fontSize = Math.max(12, Math.round(width * 0.022));
        const padding = 10;
        const lineHeight = fontSize + 4;
        const boxH = lines.length * lineHeight + padding * 2;
        const maxTextW = Math.max(...lines.map(l => {
          ctx.font = `bold ${fontSize}px Arial`;
          return ctx.measureText(l).width;
        }));
        const boxW = maxTextW + padding * 2;

        const x = width - boxW - 8;
        const y = height - boxH - 8;

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(x, y, boxW, boxH, 6)
          : ctx.rect(x, y, boxW, boxH);
        ctx.fill();

        // Text
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px Arial`;
        lines.forEach((line, i) => {
          ctx.fillText(line, x + padding, y + padding + (i + 1) * lineHeight - 4);
        });

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas toBlob failed'));
            const wFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(wFile);
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
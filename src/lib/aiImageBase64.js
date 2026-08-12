/**
 * Ubah berkas gambar menjadi base64 JPEG yang sudah dikecilkan agar hemat & cepat
 * saat dikirim ke AI Vision. Mengembalikan { base64, dataUrl, blob }.
 * @param {File} file
 * @param {number} maxDim  dimensi terpanjang maksimum (default 1500px)
 */
export async function fileToCompressedBase64(file, maxDim = 1500) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const outDataUrl = canvas.toDataURL("image/jpeg", 0.8);
  const base64 = outDataUrl.split(",")[1];
  const blob = await (await fetch(outDataUrl)).blob();

  return { base64, dataUrl: outDataUrl, blob };
}
/**
 * Ubah berkas gambar menjadi base64 JPEG yang sudah dikecilkan agar hemat & cepat
 * saat dikirim ke AI Vision. Mengembalikan { base64, dataUrl, blob, file }.
 *
 * `file` WAJIB dipakai saat mengunggah ke Base44, bukan `blob`. Blob hasil
 * canvas tidak punya nama berkas, dan UploadFile menyusunnya jadi objek kosong
 * lalu menolak dengan "'file' field is an empty object". Dua layar AI lain
 * (InvoiceVisionUpload dan ExpiryVisionScan) sudah lama mengirim blob dan
 * kegagalannya ditelan blok catch, jadi lampiran fotonya tidak pernah
 * tersimpan tanpa ada yang tahu.
 *
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

  const namaAsal = (file?.name || "foto").replace(/\.[^.]+$/, "").slice(0, 60) || "foto";
  const berkas = new File([blob], `${namaAsal}.jpg`, { type: "image/jpeg" });

  return { base64, dataUrl: outDataUrl, blob, file: berkas };
}
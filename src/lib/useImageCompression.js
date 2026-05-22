import { useState, useCallback } from "react";

/**
 * Hook untuk kompresi gambar sebelum upload
 * @param {Object} options - Compression options
 * @returns {Object} { compressing, compressImage, error }
 */
export function useImageCompression(options = {}) {
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);

  const compressImage = useCallback(async (file, customOptions = {}) => {
    if (!file || !file.type.startsWith('image/')) {
      setError("File bukan gambar");
      return null;
    }

    setCompressing(true);
    setError(null);

    const opts = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      quality: 0.8,
      ...options,
      ...customOptions,
    };

    try {
      const originalSize = file.size;
      
      // Create canvas for compression
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;

      // Resize if too large
      if (width > opts.maxWidthOrHeight || height > opts.maxWidthOrHeight) {
        const ratio = Math.min(opts.maxWidthOrHeight / width, opts.maxWidthOrHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, width, height);

      // Compress to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', opts.quality);
      });

      // Create compressed file
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: 'image/jpeg',
      });

      const compressedSize = compressedFile.size;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      setCompressing(false);
      
      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        reduction,
        preview: URL.createObjectURL(compressedFile),
      };
    } catch (err) {
      console.error("Compression error:", err);
      setError("Gagal mengompres gambar");
      setCompressing(false);
      return null;
    }
  }, [options]);

  return { compressing, compressImage, error };
}

/**
 * Compress image helper function (non-hook version)
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Compressed file info
 */
export async function compressImage(file, options = {}) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error("File bukan gambar");
  }

  const opts = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    quality: 0.8,
    ...options,
  };

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > opts.maxWidthOrHeight || height > opts.maxWidthOrHeight) {
    const ratio = Math.min(opts.maxWidthOrHeight / width, opts.maxWidthOrHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', opts.quality);
  });

  const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
    type: 'image/jpeg',
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    reduction: ((1 - compressedFile.size / file.size) * 100).toFixed(1),
    preview: URL.createObjectURL(compressedFile),
  };
}
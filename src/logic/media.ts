const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/**
 * Reads a user-supplied exercise media file into a data URL suitable for
 * storing directly on Exercise.mediaFile (no backend to upload to). GIFs are
 * passed through untouched since <canvas> would flatten them to one frame;
 * static images are downscaled to mobile resolution and re-encoded as JPEG.
 */
export async function readExerciseMediaFile(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  if (file.type === 'image/gif') return dataUrl;

  const img = await loadImage(dataUrl);
  if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) return dataUrl;

  const scale = MAX_DIMENSION / Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/** Resolves an Exercise.mediaFile value to a usable <img> src. */
export function resolveMediaSrc(mediaFile: string): string {
  return mediaFile.startsWith('data:') ? mediaFile : `/exercises/${mediaFile}`;
}

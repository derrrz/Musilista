// Comprime uma imagem no navegador antes do upload (canvas, sem dependência):
// lado máximo 1600 px, JPEG q0.8. Prints de tela caem de MBs para ~100–400 KB,
// o que poupa o Vercel Blob e cabe folgado no limite de body da rota.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo não é uma imagem');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível ler a imagem');
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    // Se a recompressão não ajudou (ex: PNG pequeno), manda o original.
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } finally {
    bitmap.close();
  }
}

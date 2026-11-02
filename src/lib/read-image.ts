const MAX_EDGE = 900;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL = 900_000;

export async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar (JPG, PNG, atau WEBP).");
  if (file.size > MAX_BYTES) throw new Error("Ukuran foto maksimal 8 MB.");

  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Gagal membaca foto."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("File foto tidak bisa dibuka."));
    el.src = src;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal mengolah foto.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > MAX_DATA_URL) {
    throw new Error("Foto terlalu besar. Pilih gambar yang lebih kecil.");
  }
  return dataUrl;
}

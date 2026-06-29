import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a base64 data URL to a Blob
 */
export const dataUrlToBlob = (dataUrl: string, mimeType: string): Blob => {
  const byteArray = Uint8Array.from(atob(dataUrl.split(",")[1]), c => c.charCodeAt(0));
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Upload an image (from data URL) to Supabase Storage
 * Used for tool checkout/checkin photos and signatures
 */
export const uploadDataUrlImage = async (
  dataUrl: string,
  type: "photo" | "signature",
  module: "ferramentas" | "veiculos",
  direction: "saidas" | "entradas" | "problemas"
): Promise<string | null> => {
  try {
    const mimeType = type === "photo" ? "image/jpeg" : "image/png";
    const ext = type === "photo" ? "jpg" : "png";
    const blob = dataUrlToBlob(dataUrl, mimeType);

    const seq = String(Date.now()).slice(-6);
    const dateFolder = new Date().toISOString().slice(0, 10);
    const dirLabel = direction === "saidas" ? "saida" : direction === "entradas" ? "entrada" : "problema";
    const fileName = `${module}/${direction}/${dateFolder}/${dirLabel}_${type}_${seq}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("imagens")
      .upload(fileName, blob);

    if (uploadError) throw uploadError;
    return fileName;
  } catch (error) {
    console.error(`Error uploading ${type}:`, error);
    return null;
  }
};

/**
 * Slugify a name for safe filename usage (lowercase, no accents, no spaces).
 */
export const slugifyForFile = (input: string): string => {
  return (input || "veiculo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "veiculo";
};

/**
 * Upload a File object to Supabase Storage
 * Used for vehicle checkout/checkin photos
 * Filename pattern: {assetSlug}_{yyyymmdd}_{prefix}_{seq}.{ext}
 */
export const uploadFileImage = async (
  file: File,
  prefix: string,
  module: "ferramentas" | "veiculos",
  direction: "saidas" | "entradas",
  assetName?: string
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const now = new Date();
  const seq = String(now.getTime()).slice(-6);
  const dateFolder = now.toISOString().slice(0, 10);
  const ymd = dateFolder.replace(/-/g, "");
  const slug = slugifyForFile(assetName || (direction === "saidas" ? "saida" : "entrada"));
  const filePath = `${module}/${direction}/${dateFolder}/${slug}_${ymd}_${prefix}_${seq}.${fileExt}`;

  const { error } = await supabase.storage.from("imagens").upload(filePath, file);
  if (error) throw error;
  return filePath;
};

/**
 * Detecta o bucket de Storage a partir de um path/URL.
 * Atualmente todo o conteúdo vive no bucket "imagens".
 */
export function detectBucket(_path: string): string {
  return "imagens";
}

/**
 * Extrai o path interno do Storage a partir de uma URL completa ou retorna o
 * próprio valor se já for um path.
 */
export function extractStoragePath(url: string, bucket?: string): string {
  const patterns: RegExp[] = [];
  if (bucket) {
    patterns.push(new RegExp(`/${bucket}/(.+?)(?:\\?.*)?$`));
    patterns.push(new RegExp(`/object/public/${bucket}/(.+?)(?:\\?.*)?$`));
  }
  patterns.push(
    /\/imagens\/(.+?)(\?.*)?$/,
    /\/object\/public\/imagens\/(.+?)(\?.*)?$/,
  );

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
}


// TEMPORÁRIO: utilitários da página /admin/exportar-fotos.
// Lista recursivamente o bucket "imagens", baixa cada arquivo e monta um ZIP
// no navegador mantendo exatamente a estrutura de pastas e nomes do bucket.
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

export const EXPORT_BUCKET = "imagens";
const PAGE_SIZE = 1000;
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;

export interface ExportEntry {
  path: string;
  size: number | null;
  /** Presente apenas quando a listagem veio da função do servidor. */
  signedUrl?: string | null;
}

export type ListSource = "cliente" | "servidor";

/** Lista recursivamente pelo cliente (respeita as políticas de acesso do usuário). */
async function listViaClient(): Promise<ExportEntry[]> {
  const files: ExportEntry[] = [];
  const queue: string[] = [""];
  while (queue.length > 0) {
    const prefix = queue.shift() as string;
    let offset = 0;
    // Paginação: o storage devolve no máximo `limit` itens por chamada.
    while (true) {
      const { data, error } = await supabase.storage.from(EXPORT_BUCKET).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      const entries = data ?? [];
      for (const entry of entries) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null) {
          queue.push(fullPath); // pasta
        } else if (entry.name !== ".emptyFolderPlaceholder") {
          const size = typeof entry.metadata?.size === "number" ? (entry.metadata.size as number) : null;
          files.push({ path: fullPath, size });
        }
      }
      if (entries.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return files;
}

/** Lista pela função do servidor (service role) e recebe URLs assinadas. */
async function listViaServer(): Promise<ExportEntry[]> {
  const { data, error } = await supabase.functions.invoke<{ files: ExportEntry[]; error?: string }>(
    "export-images-list",
    { body: {} },
  );
  if (error) throw error;
  if (!data || !Array.isArray(data.files)) throw new Error(data?.error ?? "Resposta inválida do servidor");
  return data.files;
}

/** Tenta pelo cliente; se falhar ou vier vazio, usa a função do servidor. */
export async function listAllFiles(): Promise<{ files: ExportEntry[]; source: ListSource }> {
  try {
    const files = await listViaClient();
    if (files.length > 0) return { files, source: "cliente" };
  } catch (err) {
    console.warn("[exportar-fotos] listagem pelo cliente falhou, usando servidor:", err);
  }
  const files = await listViaServer();
  return { files, source: "servidor" };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function downloadOne(entry: ExportEntry): Promise<Blob> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (entry.signedUrl) {
        const res = await fetch(entry.signedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.blob();
      }
      const { data, error } = await supabase.storage.from(EXPORT_BUCKET).download(entry.path);
      if (error || !data) throw error ?? new Error("Arquivo vazio");
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(800 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha no download");
}

/**
 * Baixa todos os arquivos (com concorrência limitada) e adiciona ao ZIP
 * usando o caminho exato do bucket. Retorna os caminhos que falharam.
 */
export async function downloadIntoZip(
  zip: JSZip,
  files: ExportEntry[],
  onProgress: (done: number) => void,
): Promise<string[]> {
  const failures: string[] = [];
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const entry = files[next++];
      try {
        const blob = await downloadOne(entry);
        zip.file(entry.path, blob, { binary: true, createFolders: true });
      } catch (err) {
        console.error("[exportar-fotos] falha:", entry.path, err);
        failures.push(entry.path);
      }
      done += 1;
      onProgress(done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  return failures;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

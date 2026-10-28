// TEMPORÁRIO: exportação de todas as fotos do bucket "imagens" em um único ZIP.
import { useState } from "react";
import { Navigate } from "react-router-dom";
import JSZip from "jszip";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ModuleHero } from "@/components/ModuleHero";
import { Download, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  downloadBlob,
  downloadIntoZip,
  formatBytes,
  listAllFiles,
  type ListSource,
} from "@/lib/exportImages";

type Phase = "idle" | "listing" | "downloading" | "zipping" | "ready" | "error";

export default function AdminExportPhotos() {
  const { profile } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [zipPercent, setZipPercent] = useState(0);
  const [source, setSource] = useState<ListSource | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (profile && profile.role !== "admin") return <Navigate to="/" replace />;

  const busy = phase === "listing" || phase === "downloading" || phase === "zipping";

  const handleStart = async () => {
    setPhase("listing");
    setDone(0);
    setTotal(0);
    setZipPercent(0);
    setFailures([]);
    setZipBlob(null);
    setErrorMsg(null);
    try {
      const { files, source: src } = await listAllFiles();
      setSource(src);
      setTotal(files.length);
      setTotalBytes(files.reduce((acc, f) => acc + (f.size ?? 0), 0));
      if (files.length === 0) throw new Error("Nenhum arquivo encontrado no armazenamento.");

      setPhase("downloading");
      const zip = new JSZip();
      const failed = await downloadIntoZip(zip, files, setDone);
      setFailures(failed);

      setPhase("zipping");
      const blob = await zip.generateAsync(
        { type: "blob", compression: "STORE", streamFiles: true },
        (meta) => setZipPercent(Math.round(meta.percent)),
      );
      setZipBlob(blob);
      setPhase("ready");
      downloadBlob(blob, "imagens.zip");
      toast.success("ZIP gerado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      setErrorMsg(msg);
      setPhase("error");
      toast.error(`Falha na exportação: ${msg}`);
    }
  };

  const percent = phase === "zipping" ? zipPercent : total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="pb-24">
      <ModuleHero
        eyebrow="Módulo · Administração"
        title="Exportar Fotos"
        subtitle="Baixe todas as fotos do armazenamento em um único arquivo ZIP"
      />
      <div className="max-w-2xl mx-auto w-full px-3 sm:px-6 pt-4 space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              O arquivo mantém exatamente as mesmas pastas e nomes do armazenamento. Recomendado usar um
              computador: o volume pode passar de 1 GB e a aba precisa ficar aberta até o fim.
            </p>

            <Button onClick={handleStart} disabled={busy} className="w-full sm:w-auto">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Baixar todas as fotos (ZIP)
            </Button>

            {phase !== "idle" && (
              <div className="space-y-2" aria-live="polite">
                <Progress value={phase === "listing" ? 0 : percent} />
                <p className="text-sm text-foreground">
                  {phase === "listing" && "Listando arquivos..."}
                  {phase === "downloading" && `Baixando ${done} de ${total} arquivos`}
                  {phase === "zipping" && `Gerando ZIP... ${zipPercent}%`}
                  {phase === "ready" && `Concluído: ${total - failures.length} de ${total} arquivos no ZIP`}
                  {phase === "error" && `Erro: ${errorMsg}`}
                </p>
                {total > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total estimado: {formatBytes(totalBytes)}
                    {source && ` · listagem via ${source}`}
                  </p>
                )}
              </div>
            )}

            {phase === "ready" && zipBlob && (
              <Button variant="outline" onClick={() => downloadBlob(zipBlob, "imagens.zip")}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar imagens.zip novamente
              </Button>
            )}

            {failures.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {failures.length} arquivo(s) não puderam ser baixados
                </p>
                <ul className="text-xs text-muted-foreground max-h-40 overflow-auto break-all">
                  {failures.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Images,
  Folder,
  ArrowLeft,
  Loader2,
  Download,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Home,
  LogIn,
  LogOut,
  Car,
  FolderOpen,
  Search,
  X,
} from "lucide-react";

const PAGE_SIZE = 24;


interface StorageItem {
  name: string;
  id?: string | null;
  created_at?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

interface FolderStructure {
  label: string;
  path: string;
  description?: string;
  icon?: typeof Folder;
  children?: FolderStructure[];
}

const FOLDER_TREE: FolderStructure[] = [
  {
    label: "Veículos",
    path: "veiculos",
    description: "Fotos de retirada e devolução",
    icon: Car,
    children: [
      { label: "Entradas", path: "veiculos/entradas", description: "Devoluções", icon: LogIn },
      { label: "Saídas", path: "veiculos/saidas", description: "Retiradas", icon: LogOut },
    ],
  },
];

const LABEL_MAP: Record<string, string> = {
  veiculos: "Veículos",
  entradas: "Entradas",
  saidas: "Saídas",
};

const ICON_MAP: Record<string, typeof Folder> = {
  veiculos: Car,
  entradas: LogIn,
  saidas: LogOut,
};

export default function AdminGallery() {
  const { profile } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<StorageItem[]>([]);
  const [files, setFiles] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; path: string }[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (currentPath) {
      loadFiles(currentPath);
      updateBreadcrumbs(currentPath);
    } else {
      setFolders([]);
      setFiles([]);
      setSignedUrls({});
      setBreadcrumbs([]);
    }
    setSearch("");
    setPage(1);
  }, [currentPath]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }


  const updateBreadcrumbs = (path: string) => {
    const parts = path.split("/");
    const crumbs: { label: string; path: string }[] = [];
    let accumulated = "";
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      crumbs.push({ label: LABEL_MAP[part] || part, path: accumulated });
    }
    setBreadcrumbs(crumbs);
  };

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("imagens")
        .list(path, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const visibleItems = (data || []).filter((item) => item.name !== ".emptyFolderPlaceholder");
      const folderItems = visibleItems.filter((item) => !item.id);
      const imageFiles = visibleItems.filter((item) => !!item.id);

      setFolders(folderItems);
      setFiles(imageFiles);
      setSignedUrls({});


    } catch (error: any) {
      toast.error("Erro ao carregar imagens", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${fileName}"?`)) return;

    try {
      const fullPath = `${currentPath}/${fileName}`;
      const { error } = await supabase.storage.from("imagens").remove([fullPath]);
      if (error) throw error;
      toast.success("Imagem excluída!");
      loadFiles(currentPath);
    } catch (error: any) {
      toast.error("Erro ao excluir", { description: error.message });
    }
  };

  const handleDownload = async (fileName: string) => {
    const url = signedUrls[fileName];
    if (!url) return;

    try {
      const { saveFileToDisk } = await import("@/lib/pwa");
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
      const mime =
        blob.type ||
        (ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "png"
            ? "image/png"
            : "application/octet-stream");
      await saveFileToDisk(blob, {
        suggestedName: fileName,
        mimeType: mime,
        extension: `.${ext}`,
        description: "Imagem",
      });
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const openFolder = (folderName: string) => {
    setCurrentPath(`${currentPath}/${folderName}`);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderFolderNav = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FOLDER_TREE.map((folder) => {
        const Icon = folder.icon || Folder;
        return (
          <Card
            key={folder.path}
            className="overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{folder.label}</h3>
                  {folder.description && (
                    <p className="text-xs text-muted-foreground">{folder.description}</p>
                  )}
                </div>
              </div>
            </div>
            {folder.children && (
              <CardContent className="p-3 space-y-1.5">
                {folder.children.map((sub) => {
                  const SubIcon = sub.icon || Folder;
                  return (
                    <button
                      key={sub.path}
                      onClick={() => setCurrentPath(sub.path)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <SubIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{sub.label}</p>
                        {sub.description && (
                          <p className="text-xs text-muted-foreground">{sub.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Images className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Galeria de Imagens</h1>
            <p className="text-sm text-muted-foreground">
              Navegue pelas fotos do sistema organizadas por módulo
            </p>
          </div>
          {currentPath && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {folders.length} pasta{folders.length === 1 ? "" : "s"} · {files.length} imagem
              {files.length === 1 ? "" : "ns"}
            </Badge>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {currentPath && (
        <div className="flex items-center gap-1 flex-wrap text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPath("")}
            className="gap-1.5 h-8 px-2.5"
          >
            <Home className="w-3.5 h-3.5" />
            Início
          </Button>
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <div key={crumb.path} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <Button
                  variant={isLast ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPath(crumb.path)}
                  className="h-8 px-2.5"
                >
                  {crumb.label}
                </Button>
              </div>
            );
          })}
          {breadcrumbs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const parent = breadcrumbs[breadcrumbs.length - 2]?.path || "";
                setCurrentPath(parent);
              }}
              className="gap-1.5 h-8 px-2.5 ml-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </Button>
          )}
        </div>
      )}

      {!currentPath ? (
        renderFolderNav()
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando imagens…</p>
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">Pasta vazia</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhuma imagem foi encontrada aqui ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {folders.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Pastas
                  </h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {folders.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map((folder) => {
                  const Icon = ICON_MAP[folder.name] || Folder;
                  const label = LABEL_MAP[folder.name] || folder.name;
                  return (
                    <button
                      key={`folder-${folder.name}`}
                      onClick={() => openFolder(folder.name)}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={label}>
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">Abrir</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {files.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Imagens
                  </h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {files.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {files.map((file) => (
                  <Card
                    key={file.id || file.name}
                    className="overflow-hidden group cursor-pointer border-border/60 hover:border-primary/50 hover:shadow-lg transition-all"
                    onClick={() => signedUrls[file.name] && setEnlargedImage(signedUrls[file.name])}
                  >
                    <div className="relative aspect-square bg-muted">
                      {signedUrls[file.name] ? (
                        <img
                          src={signedUrls[file.name]}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-8 h-8 shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.name);
                          }}
                          title="Baixar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="w-8 h-8 shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.name);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white/95 truncate font-medium" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex justify-between text-[10px] text-white/75 mt-0.5">
                          <span>{formatFileSize(file.metadata?.size)}</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

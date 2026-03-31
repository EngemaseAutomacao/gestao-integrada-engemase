import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Images, Folder, ArrowLeft, Loader2, Download, Trash2, ChevronRight } from "lucide-react";

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
  children?: FolderStructure[];
}

const FOLDER_TREE: FolderStructure[] = [
  {
    label: "Ferramentas",
    path: "ferramentas",
    children: [
      { label: "Catálogo", path: "ferramentas/catalogo" },
      { label: "Entradas", path: "ferramentas/entradas" },
      { label: "Saídas", path: "ferramentas/saidas" },
    ],
  },
  {
    label: "Veículos",
    path: "veiculos",
    children: [
      { label: "Catálogo", path: "veiculos/catalogo" },
      { label: "Entradas", path: "veiculos/entradas" },
      { label: "Saídas", path: "veiculos/saidas" },
    ],
  },
];

export default function AdminGallery() {
  const { profile } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<StorageItem[]>([]);
  const [files, setFiles] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; path: string }[]>([]);

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
  }, [currentPath]);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const updateBreadcrumbs = (path: string) => {
    const parts = path.split("/");
    const crumbs: { label: string; path: string }[] = [];

    const labelMap: Record<string, string> = {
      ferramentas: "Ferramentas",
      veiculos: "Veículos",
      entradas: "Entradas",
      saidas: "Saídas",
      catalogo: "Catálogo",
    };

    let accumulated = "";
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      crumbs.push({ label: labelMap[part] || part, path: accumulated });
    }
    setBreadcrumbs(crumbs);
  };

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("imagens")
        .list(path, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const visibleItems = (data || []).filter((item) => item.name !== ".emptyFolderPlaceholder");
      const folderItems = visibleItems.filter((item) => !item.id);
      const imageFiles = visibleItems.filter((item) => !!item.id);

      setFolders(folderItems);
      setFiles(imageFiles);

      const urls: Record<string, string> = {};
      await Promise.all(
        imageFiles.map(async (file) => {
          const fullPath = `${path}/${file.name}`;
          const { data: urlData, error: urlError } = await supabase.storage
            .from("imagens")
            .createSignedUrl(fullPath, 3600);

          if (!urlError && urlData) {
            urls[file.name] = urlData.signedUrl;
          }
        })
      );
      setSignedUrls(urls);
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

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {FOLDER_TREE.map((folder) => (
        <div key={folder.path}>
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => !folder.children && setCurrentPath(folder.path)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{folder.label}</p>
                  {folder.children && (
                    <p className="text-xs text-muted-foreground">Contém subpastas</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          {folder.children && (
            <div className="ml-6 mt-2 space-y-2">
              {folder.children.map((sub) => (
                <Card
                  key={sub.path}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setCurrentPath(sub.path)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{sub.label}</p>
                      <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Images className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Galeria de Imagens</h1>
          <p className="text-muted-foreground">Navegue pelas fotos do sistema</p>
        </div>
      </div>

      {currentPath && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPath("")} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Início
          </Button>
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Button
                variant={i === breadcrumbs.length - 1 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCurrentPath(crumb.path)}
              >
                {crumb.label}
              </Button>
            </div>
          ))}
          <Badge variant="outline" className="ml-2">
            {folders.length} pasta(s), {files.length} arquivo(s)
          </Badge>
        </div>
      )}

      {!currentPath ? (
        renderFolderNav()
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Images className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma pasta ou imagem nesta pasta</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {folders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Pastas</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <Card
                    key={`folder-${folder.name}`}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => openFolder(folder.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Folder className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" title={folder.name}>{folder.name}</p>
                          <p className="text-xs text-muted-foreground">Abrir subpasta</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Imagens</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file) => (
                  <Card key={file.id || file.name} className="overflow-hidden group">
                    <div className="relative aspect-square">
                      {signedUrls[file.name] ? (
                        <img
                          src={signedUrls[file.name]}
                          alt={file.name}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setEnlargedImage(signedUrls[file.name])}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" onClick={() => handleDownload(file.name)} title="Baixar">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDelete(file.name)} title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs truncate" title={file.name}>{file.name}</p>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1 gap-2">
                        <span>{formatFileSize(file.metadata?.size)}</span>
                        <span className="truncate">{formatDate(file.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {enlargedImage && (
            <img src={enlargedImage} alt="Imagem ampliada" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

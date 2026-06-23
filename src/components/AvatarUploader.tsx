import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarUploaderProps {
  fallback: React.ReactNode;
  className?: string;
  size?: "sm" | "lg";
}

export function AvatarUploader({ fallback, className, size = "sm" }: AvatarUploaderProps) {
  const { user, profile, refreshProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Resolve signed URL when avatar_url changes
  useState(() => {
    let active = true;
    (async () => {
      if (!profile?.avatar_url) {
        setSignedUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 60 * 60);
      if (active && data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
    return () => {
      active = false;
    };
  });

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      await refreshProfile();
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) setSignedUrl(data.signedUrl);
      toast.success("Foto de perfil atualizada!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const isLarge = size === "lg";

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative group rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden",
        isLarge ? "w-16 h-16 lg:w-20 lg:h-20" : "w-11 h-11",
        className,
      )}
      aria-label="Alterar foto de perfil"
      disabled={uploading}
    >
      {signedUrl ? (
        <img src={signedUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
      ) : (
        <div className={cn("flex items-center justify-center w-full h-full", isLarge ? "p-2" : "")}>
          {fallback}
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {uploading ? (
          <Loader2 className={cn("animate-spin text-white", isLarge ? "w-6 h-6" : "w-4 h-4")} />
        ) : (
          <Camera className={cn("text-white", isLarge ? "w-6 h-6" : "w-4 h-4")} />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

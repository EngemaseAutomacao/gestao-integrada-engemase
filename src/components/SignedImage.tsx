import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SignedImageProps {
  storagePath: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
}

/**
 * Detects the correct bucket for a given storage path.
 */
function detectBucket(path: string): string {
  if (path.startsWith("ferramentas/") || path.startsWith("veiculos/")) {
    return "imagens";
  }
  if (path.includes("/imagens/")) return "imagens";
  if (path.includes("/tool-images/")) return "tool-images";
  return "checkout-images";
}

/**
 * Extracts the storage path from a full URL or returns the path as-is.
 */
function extractStoragePath(url: string): string {
  const patterns = [
    /\/checkout-images\/(.+?)(\?.*)?$/,
    /\/object\/public\/checkout-images\/(.+?)(\?.*)?$/,
    /\/tool-images\/(.+?)(\?.*)?$/,
    /\/object\/public\/tool-images\/(.+?)(\?.*)?$/,
    /\/imagens\/(.+?)(\?.*)?$/,
    /\/object\/public\/imagens\/(.+?)(\?.*)?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

export function SignedImage({ storagePath, alt, className, bucket }: SignedImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      return;
    }

    const resolvedBucket = bucket || detectBucket(storagePath);
    const path = extractStoragePath(storagePath);

    supabase.storage
      .from(resolvedBucket)
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error creating signed URL:", error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [storagePath, bucket]);

  if (!storagePath || !signedUrl) return null;

  return <img src={signedUrl} alt={alt} className={className} />;
}

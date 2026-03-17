import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SignedImageProps {
  storagePath: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
}

/**
 * Extracts the storage path from a full Supabase public URL or returns the path as-is.
 */
function extractStoragePath(url: string): string {
  const match = url.match(/\/checkout-images\/(.+?)(\?.*)?$/);
  if (match) return match[1];
  // Try object/public pattern
  const match2 = url.match(/\/object\/public\/checkout-images\/(.+?)(\?.*)?$/);
  if (match2) return match2[1];
  return url;
}

export function SignedImage({ storagePath, alt, className, bucket = "checkout-images" }: SignedImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      return;
    }

    const path = extractStoragePath(storagePath);

    supabase.storage
      .from(bucket)
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

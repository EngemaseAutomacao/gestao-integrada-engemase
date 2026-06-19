import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectBucket, extractStoragePath } from "@/lib/storageUtils";

interface SignedImageProps {
  storagePath: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
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

  return <img src={signedUrl} alt={alt} className={className} loading="lazy" decoding="async" />;
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectBucket, extractStoragePath } from "@/lib/storageUtils";


/**
 * Hook to get a signed URL for a storage image.
 * Auto-detects the correct bucket based on path.
 */
export function useSignedUrl(publicUrl: string | null | undefined, overrideBucket?: string) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    const bucket = overrideBucket || detectBucket(publicUrl);
    const path = extractStoragePath(publicUrl, bucket);
    
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
  }, [publicUrl, overrideBucket]);

  return signedUrl;
}

/**
 * Hook to get multiple signed URLs at once.
 */
export function useSignedUrls(urls: (string | null | undefined)[], overrideBucket?: string) {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    const fetchUrls = async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          if (!url) return null;
          const bucket = overrideBucket || detectBucket(url);
          const path = extractStoragePath(url, bucket);
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);
          if (error) {
            console.error("Error creating signed URL:", error);
            return null;
          }
          return data.signedUrl;
        })
      );
      setSignedUrls(results);
    };

    fetchUrls();
  }, [JSON.stringify(urls), overrideBucket]);

  return signedUrls;
}

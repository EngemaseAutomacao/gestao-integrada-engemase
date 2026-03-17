import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a full Supabase public URL or returns the path as-is.
 */
function extractStoragePath(url: string): string {
  // If it's a full URL, extract the path after /checkout-images/
  const match = url.match(/\/checkout-images\/(.+)$/);
  if (match) return match[1];
  // Already a path
  return url;
}

/**
 * Hook to get a signed URL for a checkout image.
 * Returns a signed URL that expires in 1 hour.
 */
export function useSignedUrl(publicUrl: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    const path = extractStoragePath(publicUrl);
    
    supabase.storage
      .from("checkout-images")
      .createSignedUrl(path, 3600) // 1 hour
      .then(({ data, error }) => {
        if (error) {
          console.error("Error creating signed URL:", error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [publicUrl]);

  return signedUrl;
}

/**
 * Hook to get multiple signed URLs at once.
 */
export function useSignedUrls(urls: (string | null | undefined)[]) {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    const fetchUrls = async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          if (!url) return null;
          const path = extractStoragePath(url);
          const { data, error } = await supabase.storage
            .from("checkout-images")
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
  }, [JSON.stringify(urls)]);

  return signedUrls;
}

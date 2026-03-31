import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a full Supabase URL or returns the path as-is.
 * Supports both old bucket names and new "imagens" bucket.
 */
function extractStoragePath(url: string, bucket: string): string {
  // Try to extract path from full URL for common bucket patterns
  const patterns = [
    new RegExp(`/${bucket}/(.+?)(?:\\?.*)?$`),
    new RegExp(`/object/public/${bucket}/(.+?)(?:\\?.*)?$`),
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

/**
 * Determines the correct bucket for a given path.
 * New paths start with ferramentas/ or veiculos/ → "imagens" bucket.
 * Old paths → "checkout-images" bucket (legacy).
 */
function detectBucket(path: string): string {
  if (path.startsWith("ferramentas/") || path.startsWith("veiculos/")) {
    return "imagens";
  }
  // If it's a full URL with imagens bucket
  if (path.includes("/imagens/")) return "imagens";
  if (path.includes("/tool-images/")) return "tool-images";
  // Default to checkout-images for legacy paths
  return "checkout-images";
}

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

"use client";

import { useEffect, useState } from "react";
import { fetchImageBlob } from "@/lib/solid/photos";

/**
 * Pod images need an authenticated fetch — `<img src={podUrl}>` would 401
 * because the browser sends no DPoP token. This hook fetches the blob with
 * the session's fetch (via `getFile`), exposes it as an object URL, and
 * revokes the object URL on cleanup / url change so blobs don't leak.
 */
export function useAuthedImage(url: string | null): {
  src: string | null;
  loading: boolean;
  error: boolean;
} {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const blob = await fetchImageBlob(url);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, loading, error };
}

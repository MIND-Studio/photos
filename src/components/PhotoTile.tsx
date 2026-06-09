"use client";

import { ImageOff } from "lucide-react";
import { Skeleton } from "@mind-studio/ui";
import { useAuthedImage } from "@/hooks/useAuthedImage";
import type { Photo } from "@/lib/solid/photos";

/**
 * One square thumbnail in the grid. The image bytes are fetched with the
 * authenticated session (pod URLs 401 in a plain <img>) via useAuthedImage.
 */
export default function PhotoTile({
  photo,
  onOpen,
}: {
  photo: Photo;
  onOpen: () => void;
}) {
  const { src, loading, error } = useAuthedImage(photo.url);

  return (
    <button
      type="button"
      onClick={onOpen}
      title={photo.name}
      className="group relative aspect-square w-full overflow-hidden rounded-lg border bg-muted/40 outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
      data-testid="photo-tile"
    >
      {loading && <Skeleton className="absolute inset-0 rounded-none" />}
      {error && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="size-6" />
          <span className="px-2 font-mono text-[10px] uppercase tracking-wide">
            failed
          </span>
        </span>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={photo.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
        />
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
        {photo.name}
      </span>
    </button>
  );
}

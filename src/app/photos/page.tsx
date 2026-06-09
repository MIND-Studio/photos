"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Skeleton, Spinner } from "@mind-studio/ui";
import { ImagePlus, Upload, X } from "lucide-react";
import {
  ensureSession,
  rememberSignedOutPath,
} from "@/lib/solid/auth";
import { podRootFromWebId, photosContainerFor } from "@/lib/config";
import {
  listPhotos,
  uploadPhoto,
  deletePhoto,
  type Photo,
} from "@/lib/solid/photos";
import PhotoTile from "@/components/PhotoTile";
import Lightbox from "@/components/Lightbox";

type UploadState = {
  id: string;
  name: string;
  status: "uploading" | "error";
  message?: string;
};

export default function PhotosPage() {
  // null = still checking the session; "" = signed out; else the container URL
  const [container, setContainer] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureSession()
      .then((info) => {
        if (!info.isLoggedIn || !info.webId) {
          rememberSignedOutPath();
          setContainer("");
          return;
        }
        setContainer(photosContainerFor(podRootFromWebId(info.webId)));
      })
      .catch((e) => {
        setContainer("");
        setLoadError(String(e));
      });
  }, []);

  const refresh = useCallback(async (containerUrl: string) => {
    setLoadError(null);
    try {
      // A 404 on first list = container not created yet → empty gallery.
      setPhotos(await listPhotos(containerUrl));
    } catch (e) {
      setLoadError(String(e));
      setPhotos((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    if (container) void refresh(container);
  }, [container, refresh]);

  function pickFiles() {
    fileInputRef.current?.click();
  }

  async function onFilesChosen(fileList: FileList | null) {
    if (!fileList || !container) return;
    const files = Array.from(fileList);
    // Allow re-selecting the same files later.
    if (fileInputRef.current) fileInputRef.current.value = "";
    await Promise.all(
      files.map(async (file) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
        try {
          const photo = await uploadPhoto(container, file);
          setUploads((u) => u.filter((x) => x.id !== id));
          setPhotos((prev) => [photo, ...(prev ?? [])]);
        } catch (e) {
          setUploads((u) =>
            u.map((x) =>
              x.id === id ? { ...x, status: "error", message: String(e) } : x
            )
          );
        }
      })
    );
  }

  async function onDelete(photo: Photo) {
    await deletePhoto(photo.url);
    const prev = photos ?? [];
    const idx = prev.findIndex((p) => p.url === photo.url);
    const next = prev.filter((p) => p.url !== photo.url);
    setPhotos(next);
    // Advance the lightbox to a neighbor, or close it on the last photo.
    setLightboxUrl(
      next.length
        ? next[Math.min(Math.max(idx, 0), next.length - 1)].url
        : null
    );
  }

  // ----- signed-out / loading shells -------------------------------------

  if (container === null) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-10">
        <GridSkeleton />
      </section>
    );
  }

  if (container === "") {
    return (
      <section className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Signed out
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Connect your pod to see your photos.
        </h1>
        <Button asChild className="mt-6">
          <Link href="/connect">Connect a pod</Link>
        </Button>
      </section>
    );
  }

  // ----- main surface ------------------------------------------------------

  const lightboxIndex =
    photos && lightboxUrl
      ? photos.findIndex((p) => p.url === lightboxUrl)
      : -1;
  const lightboxPhoto =
    photos && lightboxIndex >= 0 ? photos[lightboxIndex] : null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-10">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFilesChosen(e.target.files)}
        data-testid="file-input"
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Photos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {photos === null
              ? "Loading…"
              : `${photos.length} photo${photos.length === 1 ? "" : "s"} in your pod`}
          </p>
        </div>
        <Button onClick={pickFiles} data-testid="upload-button">
          <Upload className="size-4" />
          Upload
        </Button>
      </div>

      {loadError && (
        <p className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load your photos: {loadError}
        </p>
      )}

      {uploads.length > 0 && (
        <ul className="mt-4 space-y-2" data-testid="upload-progress">
          {uploads.map((u) => (
            <li
              key={u.id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                u.status === "error"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {u.status === "uploading" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <X className="size-4 shrink-0" />
              )}
              <span className="min-w-0 truncate font-mono text-xs">
                {u.name}
              </span>
              <span className="ml-auto shrink-0">
                {u.status === "uploading" ? (
                  "Uploading…"
                ) : (
                  <span className="flex items-center gap-2">
                    <span
                      className="max-w-[16rem] truncate"
                      title={u.message}
                    >
                      {u.message ?? "Upload failed"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setUploads((all) => all.filter((x) => x.id !== u.id))
                      }
                    >
                      Dismiss
                    </Button>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {photos === null ? (
          <GridSkeleton />
        ) : photos.length === 0 && uploads.length === 0 ? (
          <EmptyState onPick={pickFiles} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {photos.map((photo) => (
              <PhotoTile
                key={photo.url}
                photo={photo}
                onOpen={() => setLightboxUrl(photo.url)}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxPhoto && photos && (
        <Lightbox
          photo={lightboxPhoto}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < photos.length - 1}
          onPrev={() => setLightboxUrl(photos[lightboxIndex - 1].url)}
          onNext={() => setLightboxUrl(photos[lightboxIndex + 1].url)}
          onClose={() => setLightboxUrl(null)}
          onDelete={() => onDelete(lightboxPhoto)}
        />
      )}
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/20 px-6 py-24 text-center transition hover:border-primary/60 hover:bg-muted/40"
      data-testid="empty-state"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ImagePlus className="size-8" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        No photos yet
      </span>
      <span className="max-w-sm text-sm text-muted-foreground">
        Click to upload your first pictures. They go straight into{" "}
        <span className="font-mono">apps/photos/</span> in your pod — nowhere
        else.
      </span>
    </button>
  );
}

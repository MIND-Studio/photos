"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Spinner,
} from "@mind-studio/ui";
import { ChevronLeft, ChevronRight, ImageOff, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthedImage } from "@/hooks/useAuthedImage";
import type { Photo } from "@/lib/solid/photos";

/**
 * Fullscreen overlay for one photo: large authed image, filename, prev/next
 * arrows, Esc/✕ to close, and Delete behind a confirm dialog. Keyboard:
 * Esc closes, ←/→ navigate (disabled while the confirm dialog is open).
 */
export default function Lightbox({
  photo,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onDelete,
}: {
  photo: Photo;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const { src, loading, error } = useAuthedImage(photo.url);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (confirmOpen) return; // let the dialog own the keyboard
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, hasPrev, hasNext, onPrev, onNext, onClose]);

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      setConfirmOpen(false);
    } catch (e) {
      setDeleteError(String(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
      data-testid="lightbox"
    >
      {/* Top bar: filename + actions */}
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="min-w-0 truncate font-mono text-sm text-white/90">{photo.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete photo"
            title="Delete photo"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Image area, click on the backdrop closes */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-6 sm:px-16"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {loading && <Spinner className="size-8 text-white/70" />}
        {error && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <ImageOff className="size-10" />
            <p className="text-sm">Could not load this photo.</p>
          </div>
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={photo.name}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
          />
        )}

        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white sm:left-4"
            onClick={onPrev}
            aria-label="Previous photo"
            title="Previous (←)"
          >
            <ChevronLeft className="size-7" />
          </Button>
        )}
        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white sm:right-4"
            onClick={onNext}
            aria-label="Next photo"
            title="Next (→)"
          >
            <ChevronRight className="size-7" />
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription className="break-all">
              <span className="font-mono">{photo.name}</span> will be permanently removed from your
              pod. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Delete failed: {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                // Keep the dialog open until the pod confirms the delete.
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Spinner className="size-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

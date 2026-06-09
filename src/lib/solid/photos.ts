"use client";

import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getThing,
  getUrlAll,
  getDatetime,
  getFile,
  deleteFile,
  saveFileInContainer,
  createContainerAt,
  getSourceUrl,
  FetchError,
} from "@inrupt/solid-client";
import { session } from "./session";

/**
 * Pod I/O for the photo gallery. The pod is the ONLY store — every call here
 * goes through the OIDC session's authenticated fetch. Solid gotchas honored:
 *
 *   - `saveFileInContainer`'s slug is advisory: the server picks the final
 *     URL, so we ALWAYS read it back via `getSourceUrl(result)`.
 *   - `contentType` is ALWAYS passed explicitly — the LDP default is
 *     `application/octet-stream` and previews break without it.
 *   - A 404 on first list means "container not created yet" → empty state,
 *     not an error. The container is created lazily on first upload.
 */

export type Photo = {
  /** The actual resource URL on the pod (server-assigned). */
  url: string;
  /** Display name — the last path segment, decoded. */
  name: string;
  /** image/* content type as reported by the server (or guessed). */
  contentType: string;
  modified?: Date;
};

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const IANA_PREFIX = "http://www.w3.org/ns/iana/media-types/";

function authedFetch(): typeof fetch {
  return session().fetch as typeof fetch;
}

/**
 * Wrap the authenticated fetch with `cache: 'no-store'` so CSS containment
 * triples aren't served from the browser cache after a write. Without this,
 * listing right after upload/delete sees stale results.
 */
function noCacheFetch(): typeof fetch {
  const inner = authedFetch();
  return ((url: RequestInfo | URL, init?: RequestInit) =>
    inner(url, { ...init, cache: "no-store" })) as typeof fetch;
}

function is404(e: unknown): boolean {
  return e instanceof FetchError && e.statusCode === 404;
}

/**
 * Extension fallback for servers that don't expose IANA media-type triples
 * in their container listings.
 */
export function guessImageContentType(nameOrUrl: string): string | null {
  const lower = nameOrUrl.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".heic")) return "image/heic";
  return null;
}

function decodedBasename(url: string): string {
  const tail = url.split("/").filter(Boolean).pop() ?? url;
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}

/**
 * List the photos in `containerUrl`, newest first. Only resources whose
 * content type is image/* are returned — CSS advertises each child's media
 * type as an `rdf:type` of `http://www.w3.org/ns/iana/media-types/<type>#Resource`
 * in the containment listing; we fall back to extension sniffing where that
 * triple is absent. A 404 (container not yet created) returns [].
 */
export async function listPhotos(containerUrl: string): Promise<Photo[]> {
  let dataset;
  try {
    dataset = await getSolidDataset(containerUrl, { fetch: noCacheFetch() });
  } catch (e) {
    if (is404(e)) return [];
    throw e;
  }
  const urls = getContainedResourceUrlAll(dataset);
  const photos: Photo[] = [];
  for (const url of urls) {
    if (url.endsWith("/")) continue; // sub-containers are not photos
    const thing = getThing(dataset, url);
    let contentType: string | null = null;
    if (thing) {
      const ianaType = getUrlAll(thing, RDF_TYPE).find((t) =>
        t.startsWith(IANA_PREFIX)
      );
      if (ianaType) {
        contentType = ianaType
          .slice(IANA_PREFIX.length)
          .replace(/#Resource$/, "");
      }
    }
    if (!contentType) contentType = guessImageContentType(url);
    if (!contentType || !contentType.startsWith("image/")) continue;
    const modified = thing
      ? getDatetime(thing, "http://purl.org/dc/terms/modified") ?? undefined
      : undefined;
    photos.push({ url, name: decodedBasename(url), contentType, modified });
  }
  return photos.sort((a, b) => {
    const am = a.modified?.getTime() ?? 0;
    const bm = b.modified?.getTime() ?? 0;
    if (am !== bm) return bm - am;
    return a.name.localeCompare(b.name);
  });
}

/** Create the app container if it doesn't exist yet (lazy, idempotent). */
async function ensureContainer(containerUrl: string): Promise<void> {
  try {
    await getSolidDataset(containerUrl, { fetch: noCacheFetch() });
  } catch (e) {
    if (!is404(e)) throw e;
    await createContainerAt(containerUrl, { fetch: authedFetch() });
  }
}

/**
 * Upload one image file into the container. Returns the Photo with the
 * server-assigned URL (the slug is advisory — never assume it was honored).
 */
export async function uploadPhoto(
  containerUrl: string,
  file: File
): Promise<Photo> {
  const contentType =
    file.type && file.type.startsWith("image/")
      ? file.type
      : guessImageContentType(file.name) ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Not an image: ${file.name}`);
  }
  await ensureContainer(containerUrl);
  // The File's `name` is the slug suggestion (the explicit `slug` option is
  // deprecated in @inrupt/solid-client v3). Either way it is ADVISORY — the
  // server picks the final URL, which we read back below.
  const saved = await saveFileInContainer(containerUrl, file, {
    contentType, // ALWAYS explicit — default octet-stream breaks previews
    fetch: authedFetch(),
  });
  const url = getSourceUrl(saved);
  if (!url) throw new Error("Upload succeeded but no resource URL returned");
  return {
    url,
    name: decodedBasename(url),
    contentType,
    modified: new Date(),
  };
}

export async function deletePhoto(url: string): Promise<void> {
  await deleteFile(url, { fetch: authedFetch() });
}

/** Fetch the image bytes with the authenticated session (pod URLs 401 in <img>). */
export async function fetchImageBlob(url: string): Promise<Blob> {
  return await getFile(url, { fetch: authedFetch() });
}

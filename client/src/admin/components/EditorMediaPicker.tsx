import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImageOff, Trash2, Upload } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { UploadedFile } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Modal, Skeleton } from "../../components/ui";
import { EditorIconButton } from "./EditorChrome";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Shared state + mutations for the uploads library.
 * Used by the full-page media library and the modal picker so both stay in sync
 * with the same validation and toast behaviour.
 */
export function useMediaLibrary() {
  const toast = useToast();
  const [files, setFiles] = useState<UploadedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ files: UploadedFile[] }>("/admin/uploads");
      setFiles(d.files);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      setFiles((f) => f ?? []);
    }
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("Image too large", `${file.name} is ${formatBytes(file.size)}. The limit is 8 MB.`);
        return null;
      }
      setUploading(true);
      try {
        const dataBase64 = await readAsDataURL(file);
        const res = await api.post<UploadedFile>("/admin/uploads", { filename: file.name, dataBase64 });
        toast.success("Image uploaded", res.name);
        await load();
        return res;
      } catch (e) {
        toast.error("Upload failed", errorMessage(e));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [load, toast],
  );

  const remove = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        await api.del(`/admin/uploads/${encodeURIComponent(name)}`);
        toast.success("Image deleted", name);
        await load();
        return true;
      } catch (e) {
        toast.error("Could not delete image", errorMessage(e));
        return false;
      }
    },
    [load, toast],
  );

  return { files, error, uploading, load, upload, remove };
}

/** Upload button with the hidden file input wired up. */
export function MediaUploadButton({
  uploading,
  onFile,
  variant = "primary",
  size = "md",
  label = "Upload image",
}: {
  uploading: boolean;
  onFile: (file: File) => void | Promise<unknown>;
  variant?: "primary" | "secondary" | "dark";
  size?: "sm" | "md";
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      <Button type="button" variant={variant} size={size} loading={uploading} onClick={() => inputRef.current?.click()}>
        <Upload size={14} /> {label}
      </Button>
    </>
  );
}

/**
 * Modal media picker: browse the uploads library, upload a new image,
 * delete stale ones, and pick an image via `onSelect(url)`.
 */
export function EditorMediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const { files, error, uploading, load, upload, remove } = useMediaLibrary();
  const [confirm, setConfirm] = useState<UploadedFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const pick = (url: string) => {
    onSelect(url);
    onClose();
  };

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    const ok = await remove(confirm.name);
    setDeleting(false);
    if (ok) setConfirm(null);
  };

  const loading = files === null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Choose an image" size="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <p className="text-xs text-slate-500 font-medium">Click an image to use it, or upload a new one (png, jpg, gif, webp - max 8 MB).</p>
          <MediaUploadButton uploading={uploading} onFile={upload} size="sm" />
        </div>

        {error && (
          <Alert type="error" className="mb-4">
            {error}{" "}
            <button className="underline font-bold" onClick={() => load()}>
              Retry
            </button>
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={<ImageOff size={26} />}
            title="No images yet"
            description="Upload your first image to start the media library."
            action={<MediaUploadButton uploading={uploading} onFile={upload} />}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f) => (
              <div key={f.name} className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden hover:border-amber-400 hover:shadow-md transition-all">
                <button type="button" onClick={() => pick(f.url)} className="block w-full" title={`Use ${f.name}`} aria-label={`Use ${f.name}`}>
                  <img src={f.url} alt={f.name} loading="lazy" className="h-24 w-full object-cover bg-slate-100 dark:bg-slate-800" />
                </button>
                <div className="px-2.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate" title={f.name}>
                    {f.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium tabular-nums">{formatBytes(f.size)}</div>
                </div>
                <div className="flex items-center justify-between pl-1 pr-1 pb-1">
                  <button
                    type="button"
                    onClick={() => pick(f.url)}
                    className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-slate-900 hover:bg-amber-50 transition-colors"
                  >
                    <Check size={12} /> Use image
                  </button>
                  <EditorIconButton title="Delete image" danger onClick={() => setConfirm(f)}>
                    <Trash2 size={14} />
                  </EditorIconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete image?"
        message={confirm ? `"${confirm.name}" will be permanently removed. Any article or page still referencing it will show a broken image.` : ""}
      />
    </>
  );
}

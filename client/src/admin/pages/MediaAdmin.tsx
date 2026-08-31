import { useEffect, useMemo, useState } from "react";
import { Code2, ImageOff, Link as LinkIcon, Trash2 } from "lucide-react";
import type { UploadedFile } from "../../lib/types";
import { copyToClipboard, formatDateTime } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, ConfirmDialog, EmptyState, Skeleton } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreSearch } from "../components/CoreControls";
import { EditorIconButton } from "../components/EditorChrome";
import { formatBytes, MediaUploadButton, useMediaLibrary } from "../components/EditorMediaPicker";

export default function MediaAdmin() {
  usePageTitle("Media library");
  const toast = useToast();
  const { files, error, uploading, load, upload, remove } = useMediaLibrary();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<UploadedFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = files ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((f) => f.name.toLowerCase().includes(needle));
  }, [files, q]);

  const copyUrl = async (f: UploadedFile) => {
    const absolute = `${window.location.origin}${f.url}`;
    if (await copyToClipboard(absolute)) toast.success("URL copied", absolute);
    else toast.error("Could not copy", "Clipboard access was blocked by the browser.");
  };

  const copyMarkdown = async (f: UploadedFile) => {
    const snippet = `![](${f.url})`;
    if (await copyToClipboard(snippet)) toast.success("Markdown copied", snippet);
    else toast.error("Could not copy", "Clipboard access was blocked by the browser.");
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
    <div className="animate-fade-in">
      <CorePageHeader
        eyebrow="Content"
        title="Media"
        subtitle="Every image uploaded to the site. Use them as article covers or embed them in article and page bodies."
        actions={<MediaUploadButton uploading={uploading} onFile={upload} />}
      />

      {error && (
        <Alert type="error" className="mb-6">
          {error}{" "}
          <button className="underline font-bold" onClick={() => load()}>
            Retry
          </button>
        </Alert>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <CoreSearch value={q} onChange={setQ} placeholder="Search file names..." className="flex-1 sm:max-w-sm" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 sm:ml-auto tabular-nums">
            {filtered.length} of {(files ?? []).length} files
          </span>
        </div>

        {loading ? (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ImageOff size={26} />}
            title={files && files.length === 0 ? "No images yet" : "No files match"}
            description={files && files.length === 0 ? "Upload png, jpg, gif or webp images (max 8 MB) to build your media library." : "Try a different search."}
            action={files && files.length === 0 ? <MediaUploadButton uploading={uploading} onFile={upload} /> : undefined}
          />
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((f) => (
              <div key={f.name} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden hover:border-amber-400 hover:shadow-md transition-all flex flex-col">
                <a href={f.url} target="_blank" rel="noreferrer" title={`Open ${f.name}`} className="block">
                  <img src={f.url} alt={f.name} loading="lazy" className="h-36 w-full object-cover bg-slate-100 dark:bg-slate-800" />
                </a>
                <div className="p-3 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={f.name}>
                    {f.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1 tabular-nums">
                    {formatBytes(f.size)}
                    {f.modifiedAt ? ` - ${formatDateTime(f.modifiedAt)}` : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-2 pb-2">
                  <div className="flex items-center gap-0.5">
                    <EditorIconButton title="Copy URL" onClick={() => copyUrl(f)}>
                      <LinkIcon size={14} />
                    </EditorIconButton>
                    <EditorIconButton title="Copy Markdown" onClick={() => copyMarkdown(f)}>
                      <Code2 size={14} />
                    </EditorIconButton>
                  </div>
                  <EditorIconButton title="Delete image" danger onClick={() => setConfirm(f)}>
                    <Trash2 size={14} />
                  </EditorIconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete image?"
        message={confirm ? `"${confirm.name}" will be permanently removed. Any article or page that still references it will show a broken image.` : ""}
      />
    </div>
  );
}

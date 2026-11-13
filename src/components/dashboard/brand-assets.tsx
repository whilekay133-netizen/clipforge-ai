"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

interface Asset { id: string; url: string | null; mime_type: string; size_bytes: number; created_at: string }

export function BrandAssets() {
  const [items, setItems] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/brand-assets", { cache: "no-store" });
    const body = await res.json();
    if (res.ok) setItems(body.items); else setError(body.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(file: File) {
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/brand-assets", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) return setError(body.error ?? "Upload failed");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this asset?")) return;
    const res = await fetch("/api/brand-assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) load(); else setError((await res.json()).error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
        <div><p className="font-medium">Upload a logo</p><p className="text-sm text-muted">PNG, JPG or WEBP up to 5 MB. Only upload assets you own or are licensed to use.</p></div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        <Button onClick={() => input.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload</Button>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Alert tone="info">Logo overlays on rendered videos are coming in a later release. Assets you upload now will be available then.</Alert>
      {!items && <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>}
      {items?.length === 0 && <EmptyState icon={Palette} title="No brand assets" description="Upload your logo to keep your brand ready for future videos." />}
      {items && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <div key={a.id} className="group overflow-hidden rounded-2xl border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="grid aspect-square place-items-center bg-[repeating-conic-gradient(#1a1f38_0%_25%,#141830_0%_50%)] bg-[length:20px_20px] p-6">{a.url && <img src={a.url} alt="Brand asset" className="max-h-full max-w-full object-contain" />}</div>
              <div className="flex items-center justify-between p-3 text-xs text-muted">
                <span>{formatDate(a.created_at)} · {(a.size_bytes / 1024).toFixed(0)} KB</span>
                <button onClick={() => remove(a.id)} className="hover:text-danger" aria-label="Delete asset"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

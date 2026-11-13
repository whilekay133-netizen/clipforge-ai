"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Download, FileText, Loader2, Pencil, RotateCcw, Save, Trash2, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { ACTIVE_STATUSES, MODES, PIPELINE_STAGES, STATUS_LABEL, statusTone } from "@/lib/catalog";
import { cuesToVtt } from "@/lib/subtitles";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";
import type { Project, ProjectSettings, ProjectStatus, Scene, SubtitleCue } from "@/lib/types";

interface Props {
  project: Project;
  scenes: Scene[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  generation: { estimated_credits: number; actual_credits: number | null; error: string | null } | null;
}

export function ProjectView({ project, scenes: initialScenes, videoUrl, thumbnailUrl, generation }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [statusMessage, setStatusMessage] = useState(project.status_message);
  const [sceneStates, setSceneStates] = useState(initialScenes.map((s) => ({ scene_number: s.scene_number, status: s.status })));
  const [title, setTitle] = useState(project.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [cues, setCues] = useState<SubtitleCue[]>(project.subtitles ?? []);
  const [dirtyCues, setDirtyCues] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const active = ACTIVE_STATUSES.includes(status);
  const settings = project.settings as ProjectSettings;

  // Poll real workflow state while processing (survives refreshes — state lives in the database)
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/generate/status?projectId=${project.id}`, { cache: "no-store" });
      if (!res.ok || stop) return;
      const body = await res.json();
      setStatus(body.project.status);
      setStatusMessage(body.project.status_message);
      setSceneStates(body.scenes);
      if (!ACTIVE_STATUSES.includes(body.project.status)) router.refresh();
    };
    const t = setInterval(tick, 4000);
    tick();
    return () => { stop = true; clearInterval(t); };
  }, [active, project.id, router]);

  const vttUrl = useMemo(() => (cues.length ? URL.createObjectURL(new Blob([cuesToVtt(cues)], { type: "text/vtt" })) : null), [cues]);

  async function call(action: string, input: RequestInfo, init?: RequestInit) {
    setBusy(action);
    setError("");
    setSaved("");
    try {
      const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      return body;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const saveTitle = async () => {
    if (await call("title", `/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ title }) })) { setEditingTitle(false); router.refresh(); }
  };
  const saveCues = async () => {
    if (await call("subs", `/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ subtitles: cues }) })) { setDirtyCues(false); setSaved("Subtitles saved."); }
  };
  const retry = async () => {
    if (await call("retry", `/api/projects/${project.id}/retry`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } })) { setStatus("queued"); router.refresh(); }
  };
  const cancel = async () => {
    if (!confirm("Cancel this generation? Reserved credits will be refunded.")) return;
    if (await call("cancel", "/api/generate/cancel", { method: "POST", body: JSON.stringify({ projectId: project.id }) })) { setStatus("cancelled"); router.refresh(); }
  };
  const remove = async () => {
    if (!confirm("Delete this project and all of its media? This can't be undone.")) return;
    if (await call("delete", `/api/projects/${project.id}`, { method: "DELETE" })) router.replace("/dashboard/projects");
  };

  const currentStageIndex = PIPELINE_STAGES.indexOf(status === "processing" ? "queued" : status);
  const stages = PIPELINE_STAGES.filter((s) => !(s === "generating_voiceover" && !settings.voice?.enabled) && !(["assembling_video", "rendering", "generating_script"].includes(s) && !MODES.find((m) => m.id === project.mode)?.usesScript));
  const doneScenes = sceneStates.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex max-w-lg gap-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus /><Button size="icon" onClick={saveTitle} disabled={busy === "title"} aria-label="Save title"><Check className="h-4 w-4" /></Button></div>
          ) : (
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="truncate">{title}</span>
              <button onClick={() => setEditingTitle(true)} className="text-muted hover:text-fg" aria-label="Rename"><Pencil className="h-4 w-4" /></button>
            </h1>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone={statusTone(status)}>{active && <Loader2 className="h-3 w-3 animate-spin" />}{STATUS_LABEL[status]}</Badge>
            <span>{MODES.find((m) => m.id === project.mode)?.name}</span>·<span>{settings.durationSec}s</span>·<span>{settings.aspectRatio}</span>·<span>{settings.style}</span>·<span>Created {formatDateTime(project.created_at)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "completed" && (
            <>
              <a href={`/api/projects/${project.id}/download`} className={buttonVariants()}><Download className="h-4 w-4" /> Download MP4</a>
              {cues.length > 0 && <a href={`/api/projects/${project.id}/download?kind=srt`} className={buttonVariants({ variant: "secondary" })}><FileText className="h-4 w-4" /> SRT</a>}
              {cues.length > 0 && <a href={`/api/projects/${project.id}/download?kind=vtt`} className={buttonVariants({ variant: "secondary" })}><FileText className="h-4 w-4" /> VTT</a>}
            </>
          )}
          {(status === "failed" || status === "cancelled") && <Button onClick={retry} disabled={!!busy}><RotateCcw className="h-4 w-4" /> Retry</Button>}
          {active && <Button variant="secondary" onClick={cancel} disabled={!!busy}><XCircle className="h-4 w-4" /> Cancel</Button>}
          {!active && <Button variant="ghost" onClick={remove} disabled={!!busy} aria-label="Delete project"><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">{saved}</Alert>}

      {active && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Generating your video</h2>
            <span className="text-xs text-muted">You can leave this page — we&apos;ll notify you when it&apos;s ready.</span>
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stages.filter((s) => s !== "completed").map((s) => {
              const idx = PIPELINE_STAGES.indexOf(s);
              const state = idx < currentStageIndex ? "done" : idx === currentStageIndex ? "active" : "todo";
              return (
                <li key={s} className={cn("rounded-xl border p-3 text-xs", state === "active" ? "border-brand/50 bg-brand/10" : "border-border")}>
                  <div className="flex items-center gap-2">
                    {state === "done" && <Check className="h-4 w-4 text-success" />}
                    {state === "active" && <Loader2 className="h-4 w-4 animate-spin text-brand-soft" />}
                    {state === "todo" && <span className="h-4 w-4 rounded-full border border-border" />}
                    <span className={state === "todo" ? "text-muted" : ""}>{STATUS_LABEL[s]}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          {status === "generating_scenes" && sceneStates.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-muted"><span>Scenes completed</span><span>{doneScenes} / {sceneStates.length}</span></div>
              <div className="flex gap-1">{sceneStates.map((s) => <span key={s.scene_number} title={`Scene ${s.scene_number}: ${s.status}`} className={cn("h-2 flex-1 rounded-full", s.status === "completed" ? "bg-success" : s.status === "failed" ? "bg-danger" : "skeleton")} />)}</div>
            </div>
          )}
          {statusMessage && <p className="mt-4 text-sm text-muted">{statusMessage}</p>}
          <p className="mt-2 text-xs text-muted">AI video generation usually takes a few minutes per scene. Progress reflects real workflow stages.</p>
        </div>
      )}

      {(status === "failed" || status === "cancelled") && (
        <Alert tone={status === "failed" ? "danger" : "warning"}>
          <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div>{statusMessage ?? STATUS_LABEL[status]}{generation?.error && status === "failed" && <div className="mt-1 text-xs opacity-80">Details: {generation.error}</div>}</div></div>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {videoUrl ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              <video controls playsInline preload="metadata" poster={thumbnailUrl ?? undefined} src={videoUrl}
                className={cn("mx-auto max-h-[70vh] w-full", settings.aspectRatio === "9:16" && "max-w-sm")}>
                {vttUrl && <track kind="subtitles" src={vttUrl} srcLang="en" label="Subtitles" default />}
              </video>
            </div>
          ) : !active && (
            <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-border text-sm text-muted">No video yet</div>
          )}
          {project.status === "completed" && (
            <p className="text-xs text-muted">Duration {formatDuration(Number(project.duration_sec))} · {project.resolution} · {generation?.actual_credits ?? generation?.estimated_credits} credits used</p>
          )}
          {cues.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold">Subtitles</h2>
                <Button size="sm" onClick={saveCues} disabled={!dirtyCues || busy === "subs"}><Save className="h-3.5 w-3.5" /> Save</Button>
              </div>
              <div className="max-h-96 divide-y divide-border/60 overflow-y-auto">
                {cues.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2">
                    <span className="w-24 shrink-0 font-mono text-[11px] text-muted">{c.start.toFixed(1)}–{c.end.toFixed(1)}s</span>
                    <input value={c.text} maxLength={500} onChange={(e) => { const next = [...cues]; next[i] = { ...c, text: e.target.value }; setCues(next); setDirtyCues(true); }}
                      className="flex-1 rounded-md bg-transparent px-2 py-1 text-sm hover:bg-surface-2 focus:bg-surface-2 focus:outline-none" />
                  </div>
                ))}
              </div>
              <p className="border-t border-border px-5 py-2 text-xs text-muted">Edits apply to the player and to SRT/VTT downloads. Burned-in captions are on the roadmap.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {project.script && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold">Script</h2>
              <p className="mt-2 text-sm text-muted">{project.script.summary}</p>
              {project.script.hashtags?.length > 0 && <p className="mt-2 text-xs text-brand-soft">{project.script.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-surface">
            <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Scenes {initialScenes.length > 0 && <span className="text-muted">({initialScenes.length})</span>}</h2>
            {initialScenes.length === 0 ? <p className="px-5 py-6 text-sm text-muted">{active ? "Scenes appear once the script is ready." : "No scenes."}</p> : (
              <ol className="max-h-[32rem] divide-y divide-border/60 overflow-y-auto">
                {initialScenes.map((s) => {
                  const st = sceneStates.find((x) => x.scene_number === s.scene_number)?.status ?? s.status;
                  return (
                    <li key={s.id} className="px-5 py-3 text-sm">
                      <div className="flex items-center justify-between"><span className="font-medium">Scene {s.scene_number} <span className="text-xs text-muted">· {Number(s.duration_sec)}s</span></span>
                        <Badge tone={st === "completed" ? "success" : st === "failed" ? "danger" : "info"}>{st}</Badge></div>
                      {s.script && <p className="mt-1 text-muted">{s.script}</p>}
                      <p className="mt-1 line-clamp-2 text-xs text-muted/70">{s.visual_prompt}</p>
                      {s.error && st === "failed" && <p className="mt-1 text-xs text-danger">{s.error}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Prompt</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{project.prompt}</p>
            {project.enhanced_prompt && <><h3 className="mt-4 text-xs font-semibold text-brand-soft">Enhanced prompt used</h3><Textarea readOnly value={project.enhanced_prompt} rows={5} className="mt-2 text-xs" /></>}
          </div>
        </div>
      </div>
    </div>
  );
}

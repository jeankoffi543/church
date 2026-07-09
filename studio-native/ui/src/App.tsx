import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./lib/api";
import type { EncoderConfig, StudioDoc } from "./lib/api";
import { StageMonitor } from "./components/StageMonitor";
import { TransitionBar } from "./components/TransitionBar";
import { ResizableRow } from "./components/ResizableRow";
import { ScenesDock } from "./components/ScenesDock";
import { SourcesDock } from "./components/SourcesDock";
import { MixerDock, AudioPatch } from "./components/MixerDock";
import { InspectorDock } from "./components/InspectorDock";
import { ControlsDock } from "./components/ControlsDock";
import { SettingsModal } from "./components/SettingsModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { StatusBar, EncoderStats } from "./components/StatusBar";
import { StudioHeader } from "./components/StudioHeader";
import { TransformBox } from "./components/TransformBox";
import type { StudioLayer } from "./lib/api";
import { hasAudioKind } from "./lib/studio-layers";
import { cn } from "./lib/cn";

type Transform = { x: number; y: number; w: number; h: number };
const OVERLAY_KINDS = ["text", "bible", "song"];
const genId = () => `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const FULL: Transform = { x: 0, y: 0, w: 1, h: 1 };

/** The programme-compositor source id a store layer maps to, or null if it isn't
 * a compositable source. Overlays live under `overlay:<id>`; devices are fixed. */
function sourceIdFor(kind: string, id: string): string | null {
  if (OVERLAY_KINDS.includes(kind)) return `overlay:${id}`;
  if (kind === "screen") return "screen";
  if (kind === "camera") return "camera";
  return null;
}

export function App() {
  const [doc, setDoc] = useState<StudioDoc | null>(null);
  const [progFrame, setProgFrame] = useState<string | null>(null);
  const [prevFrame, setPrevFrame] = useState<string | null>(null);
  const [status, setStatus] = useState("Prêt");
  const progShownRef = useRef<Set<string>>(new Set());

  const [screenActive, setScreenActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraId, setCameraId] = useState("");
  const shownRef = useRef<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>(FULL);

  const [encoders, setEncoders] = useState<string[]>([]);
  const [encCfg, setEncCfg] = useState<EncoderConfig | null>(null);
  const [encResolved, setEncResolved] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [recPath, setRecPath] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveEnded, setLiveEnded] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [rtmpsUrl, setRtmpsUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  const [levels, setLevels] = useState<Record<string, number>>({});
  const audioChanRef = useRef<Set<string>>(new Set());
  const [dualLayout, setDualLayout] = useState(true);
  const [dockResetNonce, setDockResetNonce] = useState(0);
  const [replayOnCut, setReplayOnCut] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirmState({ title, message, onConfirm });

  const fadeMs = 400; // fade-to-black duration (the web ÉCRAN VIDE is a toggle)
  const [outStats, setOutStats] = useState<{ fps: number; kbps: number } | null>(null);
  const statsPrev = useRef<{ id: string; frames: number; bytes: number; elapsed_ms: number } | null>(null);

  const fail = useCallback((e: unknown) => setStatus(String(e)), []);
  const black = doc?.program?.black ?? false;

  // ── boot: auto-start the engine + load contract/state ─────────────────────
  useEffect(() => {
    api.startPreview().catch(fail);
    api.getStudioState().then(setDoc).catch(fail);
    api.listCameras().then((l) => {
      setCameraId((id) => id || l[0]?.id || "");
    }).catch(() => {});
    api.listEncoders().then(setEncoders).catch(() => {});
    api.getEncoderConfig().then((i) => { setEncCfg(i.config); setEncResolved(i.resolved); }).catch(() => {});
  }, [fail]);

  // ── slow poll: status + stats ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      api.screenStatus().then((s) => setScreenActive(s.active)).catch(() => {});
      api.cameraStatus().then((s) => setCameraActive(s.active)).catch(() => {});
      api.broadcastStatus().then((s) => {
        setLive(s.active);
        if (s.ended_reason) setLiveEnded(s.ended_reason);
      }).catch(() => {});
      (async () => {
        for (const id of ["broadcast", "record"]) {
          const s = await api.outputStats(id).catch(() => null);
          if (!s) continue;
          const prev = statsPrev.current;
          if (prev && prev.id === id && s.elapsed_ms > prev.elapsed_ms) {
            const dt = (s.elapsed_ms - prev.elapsed_ms) / 1000;
            setOutStats({ fps: (s.frames - prev.frames) / dt, kbps: ((s.bytes - prev.bytes) * 8) / dt / 1000 });
          }
          statsPrev.current = { id, ...s };
          return;
        }
        statsPrev.current = null;
        setOutStats(null);
      })();
    }, 500);
    const f = setInterval(() => {
      api.programFrame().then((u) => u && setProgFrame(u)).catch(() => {});
      api.previewMonitorFrame().then((u) => u && setPrevFrame(u)).catch(() => {});
      api.mixerLevels().then(setLevels).catch(() => {});
    }, 120);
    return () => { clearInterval(t); clearInterval(f); };
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────
  const refreshDoc = (d: StudioDoc) => setDoc(d);
  const cmd = (c: api.StudioCommand) => api.applyCommand(c).then(refreshDoc).catch(fail);

  const selectLayer = (id: string) => {
    setSelectedId(id);
    setTransform(FULL);
    cmd({ type: "selectLayer", id });
  };

  // Reactive store→compositor sync: whenever the document changes, reconcile the
  // compositor's shown overlays with the ACTIVE scene's visible overlay layers —
  // showing plays each layer's entrance (CHR-110), hiding detaches it. This is
  // what makes scene-switching + visibility edits actually change the programme,
  // rather than the UI poking the compositor by hand.
  useEffect(() => {
    if (!doc) return;
    const scene = doc.scenes.find((s) => s.id === doc.currentSceneId);
    const want = new Set(
      (scene?.layers ?? [])
        .filter((l) => OVERLAY_KINDS.includes(l.kind) && l.visible)
        .map((l) => l.id),
    );
    const cur = shownRef.current;
    // Editing stages overlays on the PREVIEW compositor (CHR-115); CUT sends them
    // on-air (programme).
    for (const id of want) if (!cur.has(id)) api.showPreviewOverlay(id).catch(() => {});
    for (const id of cur) if (!want.has(id)) api.hidePreviewOverlay(id).catch(() => {});
    shownRef.current = want;

    // Device sources (screen / camera) follow the scene's layers' visibility:
    // adding + showing a "screen"/"camera" source starts the real device; hiding
    // stops it. Idempotent (double-start errors are caught).
    const layers = scene?.layers ?? [];
    const screenWanted = layers.some((l) => l.kind === "screen" && l.visible);
    const camLayer = layers.find((l) => l.kind === "camera" && l.visible);
    if (screenWanted && !screenActive) api.startScreen().catch(() => {});
    if (!screenWanted && screenActive) api.stopScreen().catch(() => {});
    // Start the camera with the LAYER's chosen device (inspector picker, CHR-123).
    if (camLayer && !cameraActive) api.startCamera(((camLayer.deviceId as string) || cameraId) || null).catch(() => {});
    if (!camLayer && cameraActive) api.stopCamera().catch(() => {});

    // Audio bus channels (CHR-124): each visible "audio" source gets a real bus
    // channel (a tone stand-in until real input capture) that the mixer drives
    // and the outputs carry. Reconcile against what's attached.
    const wantAudio = new Set(layers.filter((l) => l.kind === "audio" && l.visible).map((l) => l.id));
    const curAudio = audioChanRef.current;
    for (const l of layers) {
      if (wantAudio.has(l.id) && !curAudio.has(l.id)) {
        api.mixerChannelAdd(l.id, 220).catch(() => {});
        api.mixerChannelSet(l.id, (l.audioLevel as number) ?? 80, (l.audioGain as number) ?? 0, (l.audioMuted as boolean) ?? false, (l.audioBalance as number) ?? 0).catch(() => {});
      }
    }
    for (const id of curAudio) if (!wantAudio.has(id)) api.mixerChannelRemove(id).catch(() => {});
    audioChanRef.current = wantAudio;
  }, [doc, screenActive, cameraActive, cameraId]);

  // CUT: promote the preview's staged overlays to the PROGRAMME (on-air +
  // recorded), reconciling what's already there, then advance the domain.
  const cut = () => {
    const scene = doc?.scenes.find((s) => s.id === doc.currentSceneId);
    const want = new Set(
      (scene?.layers ?? []).filter((l) => OVERLAY_KINDS.includes(l.kind) && l.visible).map((l) => l.id),
    );
    const cur = progShownRef.current;
    for (const id of want) if (!cur.has(id)) api.showOverlay(id).catch(() => {});
    for (const id of cur) if (!want.has(id)) api.hideOverlay(id).catch(() => {});
    progShownRef.current = want;
    cmd({ type: "cut" });
  };

  const applyTransform = (t: Transform) => {
    setTransform(t);
    const layer = currentLayer();
    if (!layer) return;
    const sid = sourceIdFor(layer.kind, layer.id);
    if (!sid) return;
    const [cw, ch] = [1920, 1080];
    // The drag surface is the Aperçu monitor → move the preview compositor pad.
    api.setPreviewLayerTransform(sid, Math.round(t.x * cw), Math.round(t.y * ch),
      Math.max(1, Math.round(t.w * cw)), Math.max(1, Math.round(t.h * ch))).catch(() => {});
  };

  const setEncoder = (patch: Partial<EncoderConfig>) => {
    setEncCfg((prev) => {
      const next = { ...(prev ?? { kind: "auto", bitrate_kbps: 4000, preset: "balanced" as const, keyframe_interval: 120 }), ...patch };
      api.setEncoderConfig(next).then(() => api.getEncoderConfig()).then((i) => setEncResolved(i.resolved)).catch(fail);
      return next;
    });
  };

  const toggleRecord = () => {
    if (recording) api.stopRecording().then(() => setRecording(false)).catch(fail);
    else api.startRecording(null).then((p) => { setRecording(true); setRecPath(p); }).catch(fail);
  };
  const toggleLive = () => {
    if (live) api.stopBroadcast().then(() => setLive(false)).catch(fail);
    else {
      setLiveEnded(null);
      const url = (rtmpsUrl.trim() || "rtmps://live-api-s.facebook.com:443/rtmp/") + streamKey.trim();
      api.startBroadcast(url, sandbox).then(() => setLive(true)).catch(fail);
    }
  };

  const toggleBlack = () =>
    api.applyCommand({ type: "blackScreen" }).then((d) => {
      refreshDoc(d);
      return api.setProgramBlack(d.program?.black ?? false, fadeMs);
    }).catch(fail);

  // Mixer channels = the current scene's audio-bearing layers; a fader change
  // writes the audio settings straight back to the layer (persists with the
  // scene, like the web). The engine-side per-layer routing is the A/V-mixer
  // consolidation follow-up.
  const mixerChannels = () =>
    (doc?.scenes.find((s) => s.id === doc.currentSceneId)?.layers ?? []).filter((l) => hasAudioKind(l.kind));
  const onLayerAudio = (id: string, patch: AudioPatch) => {
    const layer = doc?.scenes.find((s) => s.id === doc.currentSceneId)?.layers.find((l) => l.id === id);
    if (!layer) return;
    const next = { ...layer, ...patch };
    cmd({ type: "replaceLayer", layer: next });
    // Drive the engine bus channel live (real audio in the outputs, CHR-124).
    // No-op / caught for layers without a bus channel yet (camera/screen/video).
    api.mixerChannelSet(id, next.audioLevel ?? 80, next.audioGain ?? 0, next.audioMuted ?? false, next.audioBalance ?? 0).catch(() => {});
  };

  const currentLayer = () =>
    doc?.scenes.find((s) => s.id === doc.currentSceneId)?.layers.find((l) => l.id === selectedId) ?? null;
  // A selected overlay that's staged on the preview compositor can be dragged on
  // the Aperçu monitor.
  const draggableLayer = () => {
    const l = currentLayer();
    return !!l && OVERLAY_KINDS.includes(l.kind) && shownRef.current.has(l.id);
  };
  const sceneName = doc?.scenes.find((s) => s.id === doc.currentSceneId)?.name ?? "—";

  // Inspector edit → persist the whole layer, then re-render it on the
  // compositor if it's a currently-shown overlay (so style edits are live).
  const onLayerChange = (l: StudioLayer) =>
    api.applyCommand({ type: "replaceLayer", layer: l }).then((d) => {
      refreshDoc(d);
      if (shownRef.current.has(l.id)) api.showOverlay(l.id).catch(() => {});
    }).catch(fail);

  const encStats: EncoderStats = {
    connected: (live || recording) && !!outStats,
    codecName: encResolved ? encResolved.toUpperCase() : null,
    profile: null,
    bitrateKbps: outStats ? Math.round(outStats.kbps) : null,
    fps: outStats ? Math.round(outStats.fps) : null,
    droppedFrames: 0,
    droppedPct: 0,
    encodeLoadPct: null,
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden bg-studio-bg p-3 text-white md:p-4">
      <StudioHeader
        onAir={live}
        onRequestStop={toggleLive}
        busy={false}
        sandbox={sandbox}
        recording={recording}
        recLabel=""
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section
        className={cn(
          "grid h-[clamp(280px,36vh,400px)] flex-none gap-3",
          dualLayout ? "grid-cols-[1fr_124px_1fr]" : "grid-cols-[124px_1fr]",
        )}
      >
        {dualLayout && (
          <StageMonitor
            tone="preview"
            frame={prevFrame}
            sceneName={sceneName}
            draggable={draggableLayer()}
            overlay={draggableLayer() ? <TransformBox box={transform} onChange={applyTransform} /> : undefined}
          />
        )}
        <TransitionBar onCut={cut} onBlack={toggleBlack} black={black} busy={false} canCut={true} />
        <StageMonitor tone="program" frame={progFrame} sceneName={sceneName} black={black} />
      </section>

      <ResizableRow
        storageKey="studio-native-docks"
        resetNonce={dockResetNonce}
        className="flex min-h-0 flex-1 flex-col"
        items={[
          {
            id: "scenes",
            label: "Scènes",
            node: (
              <ScenesDock
                scenes={doc?.scenes ?? []}
                currentSceneId={doc?.currentSceneId ?? ""}
                programSceneId={doc?.program?.sceneId ?? ""}
                onSelect={(id) => cmd({ type: "selectScene", id })}
                onAdd={() => cmd({ type: "addScene", id: `scene-${Date.now().toString(36)}` })}
                onReorder={(dragId, targetId) => cmd({ type: "reorderScene", dragId, targetId })}
                onRequestDelete={(id) =>
                  askConfirm("Supprimer la scène", "Cette scène et ses sources seront supprimées.", () =>
                    cmd({ type: "deleteScene", id }),
                  )
                }
                onRename={(id, name) => cmd({ type: "renameScene", id, name })}
              />
            ),
          },
          {
            id: "sources",
            label: "Sources",
            node: (
              <SourcesDock
                layers={doc?.scenes.find((s) => s.id === doc.currentSceneId)?.layers ?? []}
                selectedLayerId={selectedId}
                onSelect={selectLayer}
                onAdd={(kind, parent) => cmd({ type: "addLayer", kind, id: genId(), parentId: parent ?? null })}
                onToggle={(id) => cmd({ type: "toggleVisible", id })}
                onMove={(id, dir) => cmd({ type: "reorderLayer", id, dir: dir === -1 ? "forward" : "backward" })}
                onReorder={(dragId, targetId) => cmd({ type: "reorderLayerTo", dragId, targetId })}
                onRequestDelete={(id) =>
                  askConfirm("Supprimer la source", "Cette source sera retirée de la scène.", () =>
                    cmd({ type: "removeLayer", id }),
                  )
                }
              />
            ),
          },
          {
            id: "mixer",
            label: "Mixage",
            node: <MixerDock channels={mixerChannels()} levels={levels} onChange={onLayerAudio} />,
          },
          {
            id: "inspector",
            label: "Style Pro",
            node: (
              <InspectorDock
                layer={currentLayer()}
                onChange={onLayerChange}
                onPlayAnim={() => {
                  const l = currentLayer();
                  if (l && shownRef.current.has(l.id)) api.showPreviewOverlay(l.id).catch(() => {});
                }}
              />
            ),
          },
          {
            id: "controls",
            label: "Commandes",
            node: (
              <ControlsDock
                liveActive={live}
                liveState={live ? "connected" : "idle"}
                liveError={liveEnded}
                onStartLive={toggleLive}
                onStopLive={toggleLive}
                sandboxRehearsal={sandbox}
                recording={recording}
                onToggleRecord={toggleRecord}
                recLabel={recPath ?? ""}
                sandbox={sandbox}
                sandboxLocked={live}
                onToggleSandbox={() => setSandbox((v) => !v)}
                dualLayout={dualLayout}
                onToggleLayout={() => setDualLayout((v) => !v)}
                onResetDockWidths={() => setDockResetNonce((n) => n + 1)}
                replayOnCut={replayOnCut}
                onToggleReplayOnCut={() => setReplayOnCut((v) => !v)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ),
          },
        ]}
      />

      <StatusBar statusRight={status} stats={encStats} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        rtmpsUrl={rtmpsUrl}
        onRtmpsUrl={setRtmpsUrl}
        streamKey={streamKey}
        onStreamKey={setStreamKey}
        encoders={encoders}
        encCfg={encCfg}
        encResolved={encResolved}
        onEncoder={setEncoder}
      />
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
      />
    </div>
  );
}

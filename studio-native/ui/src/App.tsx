import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./lib/api";
import type { Capabilities, CameraDevice, EncoderConfig, StudioDoc } from "./lib/api";
import { StageMonitor } from "./components/StageMonitor";
import { TransitionBar } from "./components/TransitionBar";
import { ResizableRow } from "./components/ResizableRow";
import { ScenesDock } from "./components/ScenesDock";
import { SourcesDock } from "./components/SourcesDock";
import { MixerDock, MixChannel } from "./components/MixerDock";
import { InspectorDock } from "./components/InspectorDock";
import { ControlsDock } from "./components/ControlsDock";
import { StatusBar } from "./components/StatusBar";
import { TransformBox } from "./components/TransformBox";
import type { StudioLayer } from "./lib/api";

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
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [doc, setDoc] = useState<StudioDoc | null>(null);
  const [running, setRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState("Prêt");

  const [screenActive, setScreenActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const shownRef = useRef<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>(FULL);

  const [audioOn, setAudioOn] = useState(false);
  const [channels, setChannels] = useState<MixChannel[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});

  const [encoders, setEncoders] = useState<string[]>([]);
  const [encCfg, setEncCfg] = useState<EncoderConfig | null>(null);
  const [encResolved, setEncResolved] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [recPath, setRecPath] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveEnded, setLiveEnded] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState("");

  const [fadeMs, setFadeMs] = useState(400);
  const [outStats, setOutStats] = useState<{ fps: number; kbps: number } | null>(null);
  const statsPrev = useRef<{ id: string; frames: number; bytes: number; elapsed_ms: number } | null>(null);
  const framePrev = useRef<{ frames: number; t: number } | null>(null);

  const fail = useCallback((e: unknown) => setStatus(String(e)), []);
  const black = doc?.program?.black ?? false;

  // ── boot: auto-start the engine + load contract/state ─────────────────────
  useEffect(() => {
    api.startPreview().catch(fail);
    api.getCapabilities().then(setCaps).catch(fail);
    api.getStudioState().then(setDoc).catch(fail);
    api.listCameras().then((l) => {
      setCameras(l);
      setCameraId((id) => id || l[0]?.id || "");
    }).catch(() => {});
    api.listEncoders().then(setEncoders).catch(() => {});
    api.getEncoderConfig().then((i) => { setEncCfg(i.config); setEncResolved(i.resolved); }).catch(() => {});
  }, [fail]);

  // ── slow poll: status + stats ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      api.mediaStatus().then((m) => {
        setRunning(m.running);
        const now = performance.now();
        const p = framePrev.current;
        if (p && now > p.t) setFps(((m.frames - p.frames) * 1000) / (now - p.t));
        framePrev.current = { frames: m.frames, t: now };
      }).catch(() => {});
      api.screenStatus().then((s) => setScreenActive(s.active)).catch(() => {});
      api.cameraStatus().then((s) => setCameraActive(s.active)).catch(() => {});
      api.broadcastStatus().then((s) => {
        setLive(s.active);
        if (s.ended_reason) setLiveEnded(s.ended_reason);
      }).catch(() => {});
      if (audioOn) api.audioLevels().then(setLevels).catch(() => {});
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
      api.previewFrame().then((u) => u && setFrame(u)).catch(() => {});
    }, 120);
    return () => { clearInterval(t); clearInterval(f); };
  }, [audioOn]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const refreshDoc = (d: StudioDoc) => setDoc(d);
  const cmd = (c: api.StudioCommand) => api.applyCommand(c).then(refreshDoc).catch(fail);

  const selectLayer = (id: string) => {
    setSelectedId(id);
    setTransform(FULL);
    cmd({ type: "selectLayer", id });
  };
  const addOverlay = (kind: string) => cmd({ type: "addLayer", kind, id: genId(), parentId: null });

  const toggleScreen = () =>
    (screenActive ? api.stopScreen() : api.startScreen()).catch(fail);
  const toggleCamera = () =>
    (cameraActive ? api.stopCamera() : api.startCamera(cameraId || null)).catch(fail);

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
    for (const id of want) if (!cur.has(id)) api.showOverlay(id).catch(() => {});
    for (const id of cur) if (!want.has(id)) api.hideOverlay(id).catch(() => {});
    shownRef.current = want;
  }, [doc]);

  const applyTransform = (t: Transform) => {
    setTransform(t);
    const layer = currentLayer();
    if (!layer) return;
    const sid = sourceIdFor(layer.kind, layer.id);
    if (!sid) return;
    const [cw, ch] = [1920, 1080];
    api.setLayerTransform(sid, Math.round(t.x * cw), Math.round(t.y * ch),
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
    else { setLiveEnded(null); api.startBroadcast(rtmpUrl, sandbox).then(() => setLive(true)).catch(fail); }
  };

  const toggleBlack = () =>
    api.applyCommand({ type: "blackScreen" }).then((d) => {
      refreshDoc(d);
      return api.setProgramBlack(d.program?.black ?? false, fadeMs);
    }).catch(fail);
  const cut = () => cmd({ type: "cut" });

  const toggleAudio = () => {
    if (audioOn) api.stopAudio().then(() => { setAudioOn(false); setChannels([]); }).catch(fail);
    else api.startAudio().then(() => setAudioOn(true)).catch(fail);
  };
  const addTone = () => {
    const id = `tone-${channels.length + 1}`;
    api.addAudioTone(id, 220 + channels.length * 110)
      .then(() => setChannels((c) => [...c, { id, gain: 1, muted: false, balance: 0 }]))
      .catch(fail);
  };
  const changeChannel = (ch: MixChannel) => {
    setChannels((cs) => cs.map((c) => (c.id === ch.id ? ch : c)));
    api.setAudioChannel(ch.id, ch.gain, ch.muted, ch.balance).catch(fail);
  };

  const currentLayer = () =>
    doc?.scenes.find((s) => s.id === doc.currentSceneId)?.layers.find((l) => l.id === selectedId) ?? null;
  // Whether the selected layer has a live compositor pad we can drag on the monitor.
  const draggableLayer = () => {
    const l = currentLayer();
    return l ? sourceIdFor(l.kind, l.id) !== null : false;
  };

  // Inspector edit → persist the whole layer, then re-render it on the
  // compositor if it's a currently-shown overlay (so style edits are live).
  const onLayerChange = (l: StudioLayer) =>
    api.applyCommand({ type: "replaceLayer", layer: l }).then((d) => {
      refreshDoc(d);
      if (shownRef.current.has(l.id)) api.showOverlay(l.id).catch(() => {});
    }).catch(fail);

  return (
    <div className="regie">
      <header className="topbar">
        <span className="brand">Studio Native</span>
        <span className="scene-name">{doc?.scenes.find((s) => s.id === doc.currentSceneId)?.name}</span>
        <span className="topbar-spacer" />
        <button className="chip" onClick={() => (running ? api.stopPreview() : api.startPreview().catch(fail))}>
          {running ? "◼ Moteur" : "▶ Moteur"}
        </button>
      </header>

      <div className="stage">
        <StageMonitor label="APERÇU" tone="preview" frame={frame} />
        <TransitionBar black={black} fadeMs={fadeMs} onFadeMs={setFadeMs} onToggleBlack={toggleBlack} onCut={cut} />
        <StageMonitor
          label="PROGRAMME"
          tone="program"
          frame={frame}
          dim={black}
          badge={live ? <span className={`onair ${sandbox ? "test" : ""}`}>{sandbox ? "TEST" : "● DIRECT"}</span> : recording ? <span className="onair rec">● REC</span> : undefined}
          overlay={draggableLayer() ? <TransformBox box={transform} onChange={applyTransform} /> : undefined}
        />
      </div>

      <section className="docks">
        <ResizableRow
          panels={[
            { id: "scenes", label: "Scènes", node: <ScenesDock doc={doc} onSelect={(id) => cmd({ type: "selectScene", id })} onAdd={() => cmd({ type: "addScene", id: `scene-${(doc?.scenes.length ?? 0) + 1}` })} /> },
            { id: "sources", label: "Sources", node: (
              <SourcesDock doc={doc} caps={caps} cameras={cameras} cameraId={cameraId} onCameraId={setCameraId}
                screenActive={screenActive} cameraActive={cameraActive} selectedId={selectedId}
                onToggleScreen={toggleScreen} onToggleCamera={toggleCamera} onAddOverlay={addOverlay}
                onSelectLayer={selectLayer} onToggleVisible={(id) => cmd({ type: "toggleVisible", id })} />
            ) },
            { id: "mixer", label: "Mixage", node: (
              <MixerDock audioOn={audioOn} channels={channels} levels={levels} onToggleAudio={toggleAudio} onAddTone={addTone} onChange={changeChannel} />
            ) },
            { id: "inspector", label: "Inspecteur", node: (
              <InspectorDock layer={currentLayer()} onChange={onLayerChange}
                onToggleVisible={() => { const l = currentLayer(); if (l) cmd({ type: "toggleVisible", id: l.id }); }} />
            ) },
            { id: "controls", label: "Commandes", node: (
              <ControlsDock caps={caps} encoders={encoders} encCfg={encCfg} encResolved={encResolved} onEncoder={setEncoder}
                recording={recording} recPath={recPath} onToggleRecord={toggleRecord}
                live={live} liveEnded={liveEnded} sandbox={sandbox} rtmpUrl={rtmpUrl}
                onSandbox={setSandbox} onRtmpUrl={setRtmpUrl} onToggleLive={toggleLive} />
            ) },
          ]}
        />
      </section>

      <StatusBar running={running} fps={fps} stats={outStats} live={live} sandbox={sandbox} recording={recording} message={status} />
    </div>
  );
}

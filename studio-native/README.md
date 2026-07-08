# studio-native

Portage **desktop natif** (Windows / macOS / Linux) de la régie de streaming
(type OBS) initialement développée en web (Next.js/React, repo `church-clone`).

**Stack cible : Tauri (Rust) + gstreamer-rs.**
Rust pour le plan de contrôle et le hot path média sans GC ; GStreamer pour la
capture / le compositing GPU / l'encodage ; le chrome React (docks, inspecteur,
kit admin) réutilisé dans une webview Tauri ; les deux moniteurs (preview /
program) rendus sur des **surfaces GPU natives** (le DOM ne peut pas afficher
1080p60).

---

## Principe directeur : modularité

> **Si on retire un module, l'app continue de fonctionner.**

Garanti par quatre mécanismes superposés :

1. **Workspace en couches.** `studio-core` (ce qui est livré ici) n'a **aucune
   dépendance média**. Il compile et ses tests tournent avec un simple toolchain
   Rust — sans GStreamer, sans Tauri, sans API de capture OS.
2. **Features Cargo par module.** Chaque `mod-*` est derrière une feature.
   `--no-default-features` retire un module de la compilation sans rien casser.
3. **Négociation de capacités.** Le frontend construit son menu « + » et ses
   sorties depuis `Capabilities` renvoyé par le backend — un module absent
   n'apparaît jamais, aucun code frontend à toucher.
4. **Isolation des pannes.** Chaque source est un `gst::Bin` séparé attaché au
   compositeur ; si une source tombe (device débranché, permission refusée), on
   la détache sans toucher au program.

## Arborescence

```
studio-native/
├── crates/
│   ├── studio-core/       ✅ LIVRÉ  — logique pure, 0 dépendance média
│   │   · easing (cubic-bézier, port 1:1 de EASING_BEZIER)
│   │   · reaction (blend de poses CHR-57, port 1:1 de blendReactionStyles)
│   │   · model (scène/calques + Capabilities pour la négociation UI)
│   ├── poc-pipeline/      ✅ LIVRÉ  — spike média headless (CHR-100)
│   ├── studio-media/      ✅ LIVRÉ  — runtime GStreamer, glib MainLoop (thread dédié)
│   │   · MediaEngine (compositor → frames comptées) + probe_encoders réel
│   ├── mod-screen-capture/⏳  Source (getDisplayMedia → WGC/SCK/PipeWire)
│   ├── mod-camera/        ⏳  Source
│   ├── mod-overlays/      ⏳  Source (image/text/bible/song, sans DOM)
│   ├── mod-audio-mixer/   ⏳  AudioNode (remplace AudioContext/mixDest)
│   ├── mod-output-record/ ⏳  Output (mp4mux/webmmux, durée écrite nativement)
│   ├── mod-output-whip/   ⏳  Output (whipclientsink → SRS → Facebook)
│   └── mod-encoder/       ⏳  NVENC/QSV/VAAPI/VideoToolbox → x264 (fallback)
├── src-tauri/             ✅ LIVRÉ  — shell Tauri v2 : fenêtre + IPC get_capabilities
└── ui/                    ✅ LIVRÉ  — frontend Vite+React (UI pilotée par Capabilities)
```

## Roadmap (branches `feature/CHR-*`)

Le projet natif vit dans le **même repo git que church-clone**, sous
`studio-native/`. CHR-62..99 étant réservées à d'autres travaux, l'épic natif
utilise **CHR-61** (kickoff, hors plage) puis **CHR-100+**.

| Branche | Livrable | Si le module est retiré |
|---|---|---|
| **CHR-61** ✅ | `studio-core` : logique pure portée + tests | — (cœur, 0 dép) |
| **CHR-100** ✅ | POC média headless (2 sources → compositor GPU → x264 → mp4mux, durée relue) | spike de dé-risquage |
| **CHR-101** ✅ | Bootstrap Tauri + `src-tauri` + `ui` + contrat IPC `get_capabilities` | — (fondation) |
| **CHR-102** ✅ | `studio-media` : compositor + glib loop + sonde encodeurs + **preview JPEG embarquée** dans le webview | feature `media` off ⇒ app tourne, 0 encodeur |
| CHR-103 | `mod-screen-capture` | source « écran » disparaît du menu |
| CHR-104 | `mod-camera` | source « caméra » disparaît |
| CHR-105 | `mod-overlays` (texte/bible/image, sans DOM) | plus d'overlays, vidéo intacte |
| CHR-106 | `mod-audio-mixer` + VU réels | diffusion muette, reste OK |
| CHR-107 | `mod-output-record` | bouton REC absent |
| CHR-108 | `mod-output-whip` → Facebook | plus de diffusion externe |
| CHR-109 | Animations + réactions sur GPU | overlays sans anim |
| CHR-110 | `mod-encoder` (sélection HW + fallback) | x264 par défaut |
| CHR-111 | Stats encodeur réelles + mode sandbox | — |
| CHR-112 | Groupes, scènes multiples, transitions | — |
| CHR-113 | Packaging, signature, CI 3-OS, notarization | — |

> `studio-core` (CHR-61) est livrable en premier parce que le cœur ne dépend ni
> du shell Tauri ni du média : il se construit et se teste seul (c'est justement
> la garantie modulaire).

## Build & test (état actuel)

```sh
# studio-core seul : rien d'autre qu'un toolchain Rust (default-members).
cargo test                       # 19 tests (easing / reaction / model)

# POC média headless (CHR-100).
cargo run -p poc-pipeline        # 2 sources → compositor → x264 → mp4mux, durée relue

# Moteur média (CHR-102) : glib loop + compositor + sonde encodeurs.
cargo test -p studio-media       # 2 tests (frames comptées, encodeurs sondés)

# Shell Tauri (CHR-101/102).
pnpm --dir ui install && pnpm --dir ui build           # frontend → ui/dist
cargo test -p studio-native-app                        # 3 tests (contrat IPC)
cargo build -p studio-native-app --no-default-features # garantie modulaire : sans média
```

### Lancer le shell (nécessite un affichage)

```sh
cargo install tauri-cli --version '^2'         # une fois
cargo tauri dev                                # depuis studio-native/
```

Le webview ne peut pas s'afficher en headless ; en CI le shell est prouvé par la
compilation + les tests du contrat IPC (et un smoke test Xvfb : le binaire démarre
la fenêtre/webview sans crash).

## Toolchain média (installée)

GStreamer 1.28 (core + base/video/app/gl/audio, plugins good/bad/ugly/libav/gl/
pipewire) et les deps Tauri Linux (gtk3, soup3, webkit2gtk-4.1, jsc-4.1) sont
installés sur la machine de dev. Rust 1.96 est en user-space (rustup).

`gstreamer1.0-plugins-rs` (le WHIP, CHR-70) n'est pas packagé sur cette distro →
build source via `cargo-c` le moment venu. `gstreamer1.0-tools` (CLI `gst-launch`)
non installé — non requis : `gstreamer-rs` lie les libs, pas le CLI ; les POC sont
prouvés par de vrais binaires Rust.

CHR-102 complet : moteur `studio-media` (glib loop + compositor + sonde
encodeurs) + **preview embarquée** — le compositor est encodé en JPEG basse-déf
(`appsink`) et poussé au webview en data-URL (`<img>`), sans chirurgie de fenêtre
native, cross-platform. Le flux *program* vers l'encodeur/WHIP restera GPU
zéro-copie (concern séparé, CHR-108). Un overlay GPU natif haute-fréquence pour la
preview reste une optimisation possible plus tard.

Prochaine étape : **CHR-103**, `mod-screen-capture` — la 1re vraie source
(getDisplayMedia → PipeWire/WGC/ScreenCaptureKit), branchée sur un request pad du
compositor.

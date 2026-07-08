# church

  1. Pourquoi ce choix est le bon (et ce qui change vs Go)

  Le raisonnement tient en trois points où Rust bat Go précisément sur le plan média, là où Go était discutable :

  ┌──────────────────────┬─────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │        Enjeu         │                             Go                              │                                    Rust (Tauri + gstreamer-rs)                                     │
  ├──────────────────────┼─────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Binding GStreamer    │ go-gst, correct mais communautaire                          │ gstreamer-rs : officiel, maintenu par les core devs GStreamer (S. Dröge). Wrappers sûrs,           │
  │                      │                                                             │ idiomatiques, à jour.                                                                              │
  ├──────────────────────┼─────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Hot path 60 fps      │ GC → jitter sous forte allocation, il faut ruser (pools,    │ Pas de GC. Ownership = zéro-copie naturel, pas de pauses. C'est le gain décisif.                   │
  │                      │ off-heap)                                                   │                                                                                                    │
  ├──────────────────────┼─────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ WHIP                 │ pion (excellent) mais 2e pile réseau à intégrer             │ gst-plugins-rs fournit whipclientsink (écrit en Rust) → WHIP dans GStreamer, une seule pile média. │
  ├──────────────────────┼─────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Interop fenêtre      │ manuel                                                      │ raw-window-handle / winit / wgpu : écosystème mûr pour poser une surface GPU.                      │
  │ native               │                                                             │                                                                                                    │
  ├──────────────────────┼─────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Frontière FFI        │ CGO (bascule thread, règles pointeurs)                      │ FFI Rust→C zéro-coût, pas de runtime intermédiaire.                                                │
  └──────────────────────┴─────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Le déclic : ton hot path (capture→composite→encode) doit rester sur le GPU, sans allocation par frame. En Rust c'est le comportement par défaut du modèle mémoire ; en Go c'était un combat
  permanent contre le GC. gstreamer-rs officiel + WHIP en plugin Rust = une seule pile média cohérente, ce qui simplifie énormément vs Go (où tu mixais go-gst + pion + cgo x264).

  Ce que Rust NE change PAS — les frictions qui restent, quel que soit le langage

  Sois lucide : passer à Rust ne fait pas disparaître les vrais murs. Ils sont structurels, pas linguistiques :

  1. Vidéo dans la webview = toujours impossible à 60 fps. Les 2 moniteurs (preview/program) restent des surfaces GPU natives posées sur/à côté de la webview Tauri. Rust facilite l'interop
  (raw-window-handle), mais le principe « le rendu n'est pas du DOM » est inchangé.
  2. Capture cross-platform = 3 mondes. DXGI/WGC (Win), ScreenCaptureKit + permissions TCC (Mac), PipeWire/portail (Wayland). GStreamer masque 80 %, tu débogues quand même sur 3 OS.
  3. Synchro A/V longue durée. Tu possèdes les horloges (capture vs audio vs encodeur dérivent) → horloge maître + rebase PTS + audioresample. Invisible en démo, mortel sur 1 h.
  4. Le compositeur animé reste le gros du budget. Tes entrances + réactions CHR-57 deviennent des automations de pads compositor / shaders. La logique se porte ; le rendu est à refaire en
  graphique.
  5. Licences encodeur. x264 = GPL, H.264/HEVC = royalties. Encodeurs matériels (NVENC/QSV/VideoToolbox) contournent x264 mais imposent un fallback logiciel → à trancher tôt.
  6. CI par OS + signature. cgo/FFI ne se cross-compile pas sereinement : runners Win/Mac/Linux réels, notarization Apple (obligatoire pour ScreenCaptureKit), code signing Windows.

  Deux frictions spécifiques Rust/Tauri à anticiper :

  7. Deux boucles d'événements à marier. GStreamer veut une glib MainLoop ; Tauri tourne sur tokio. Il faut lancer la glib MainLoop sur son propre thread dédié et faire dialoguer les deux
  mondes par channels. Point d'intégration classique mais à cadrer dès le départ.
  8. Borrow checker × callbacks GStreamer. Les pad probes, bus watches et signaux imposent Send + Sync + 'static sur les closures qui capturent ton état. On résout avec Arc<...> + canaux, mais
  ça structure ton code d'emblée (pas d'&mut qui traîne dans un callback).

  Une note de portage qui va te surprendre : abandonne Next.js pour le desktop

  Next.js n'a aucun intérêt dans Tauri (pas de serveur Node à l'exécution, SSR/RSC morts). Tu recompiles ton design system + composants React dans un shell Vite + React (SPA statique). Tu
  gardes tes docks, ton inspecteur, ton kit admin ; tu jettes la couche Next/App-Router/proxy. Le frontend parle à Rust par IPC et à ton Laravel par HTTP comme avant.

  ---
  2. Architecture cible : modulaire par construction

  Ton exigence — « si on retire un module, l'app fonctionne toujours » — devient le principe directeur n°1. On l'obtient par quatre mécanismes superposés :

  a) Workspace Cargo en couches (modularité de compilation)

  studio/                         (workspace Cargo)
  ├── crates/
  │   ├── studio-core/            ← AUCUNE dépendance média. Pur.
  │   │   · modèle scène/calque, store d'état, bus commandes/events
  │   │   · maths easing/entrance, blend réactions CHR-57, timing CUT/nonce
  │   │   · traits: Source, Output, Compositor, AudioNode  (les contrats)
  │   │
  │   ├── studio-media/           ← runtime GStreamer + glib loop, orchestrateur
  │   │   · construit le graphe, applique les commandes du core aux pads
  │   │
  │   ├── mod-screen-capture/     ← impl Source  (feature "screen")
  │   ├── mod-camera/             ← impl Source  (feature "camera")
  │   ├── mod-overlays/           ← impl Source  (image/text/bible/song)
  │   ├── mod-audio-mixer/        ← impl AudioNode (feature "audio")
  │   ├── mod-output-record/      ← impl Output  (feature "record")
  │   ├── mod-output-whip/        ← impl Output  (feature "whip")
  │   └── mod-encoder/            ← sélection NVENC/QSV/VT/x264 + fallback
  │
  └── src-tauri/                  ← shell Tauri: commands IPC, events, fenêtre
      · dépend de studio-core (toujours) + des mod-* activés par feature

  - studio-core ne dépend de RIEN de média. Il compile et tourne même sans GStreamer. C'est ta garantie ultime : l'UI + la logique de scène vivent sans le moindre module média.
  - Chaque mod-* est derrière une feature Cargo. default = ["screen","camera","overlays","audio","record","whip"]. Retirer whip de la compilation → le module n'existe plus, rien d'autre ne 
  casse.

  b) Traits + registry (modularité à l'exécution)

  Le core définit des contrats, pas des implémentations :

  // studio-core — le contrat, zéro dépendance média
  pub trait Source: Send {
      fn kind(&self) -> SourceKind;
      fn build(&self, ctx: &MediaCtx) -> Result<SourceHandle>; // crée un gst::Bin
      fn apply(&self, patch: &LayerPatch);                     // pose/alpha/visibilité
      fn teardown(self: Box<Self>);
  }
  pub trait Output: Send {
      fn id(&self) -> OutputId;
      fn attach(&self, program: &ProgramTap) -> Result<()>;    // branche sur le tee
      fn detach(&self);
      fn stats(&self) -> OutputStats;
  }

  Au démarrage, chaque module s'enregistre dans un Registry. Le core ne connaît que des Box<dyn Source> / Box<dyn Output>. Ajouter un type de source = un nouveau crate qui implémente le trait
  et s'enregistre — zéro modification du core.

  c) Négociation de capacités (l'UI ne présuppose aucun module)

  Le frontend ne code jamais en dur « il y a une source écran ». Il demande :

  IPC: get_capabilities() -> { sources: ["screen","camera",...], outputs: ["record","whip"], encoders: ["nvenc","x264"] }

  Le menu « + », la table de mixage, les boutons de sortie se construisent dynamiquement depuis cette réponse. Retirer mod-whip → l'API ne l'annonce plus → le bouton Facebook disparaît tout
  seul, aucun code frontend à toucher. Le contrat IPC est stable quels que soient les modules présents.

  d) Isolation des pannes (dégradation gracieuse à chaud)

  - Chaque source est un gst::Bin séparé ajouté au compositor par un pad request. Si une source tombe (EOS/erreur sur son bus, périphérique débranché, permission refusée), on détache son bin 
  sans toucher au reste du pipeline. Le program continue.
  - Si un élément GStreamer manque à l'exécution (NVENC absent), mod-encoder retombe sur QSV → x264, et le signale dans get_capabilities().
  - Si studio-media entier échoue à s'initialiser (pas de GStreamer sur la machine), studio-core + l'UI tournent quand même en mode « aucune capacité média » — tu peux éditer des scènes, pas
  diffuser. C'est le sens fort de ta contrainte.

  ▎ Friction à connaître (d) : ajouter/retirer un pad sur un compositor pendant que le pipeline est live (PLAYING) est la partie délicate de GStreamer — il faut bloquer le pad, drainer, puis 
  ▎ reconfigurer (pad probe + états). C'est faisable et documenté, mais c'est le point technique n°1 de la modularité à chaud. On le blinde dans le crate studio-media une bonne fois.

  La surface preview (le point dur Tauri, résolu proprement)

  Tauri expose le raw-window-handle de sa fenêtre. Deux stratégies :

  1. Sink natif dans une child window (recommandé pour démarrer) : GStreamer d3d11videosink (Win) / glimagesink (Linux) / avsamplebufferdisplaylayer (Mac) rendu dans une fenêtre enfant sans
  bordure, positionnée aux coordonnées d'un <div> trou réservé par le layout React. Simple, robuste, zéro-copie GPU.
  2. appsink GPU → wgpu (plus tard, si tu veux composer preview + overlays d'UI dans la même surface) : plus puissant, plus de code.

  On part sur (1). La seule vraie corvée : resynchroniser la position/taille de la child window quand le layout DOM bouge (resize, changement de dock) et gérer le multi-DPI.

  ---
  3. Découpage en branches — câblage de bout en bout

  Principe : squelette ambulant d'abord (une app qui tourne le plus tôt possible, même quasi vide), puis on épaissit module par module. Chaque branche = une tranche verticale livrable qui
  respecte l'invariant modulaire (si le module est absent/retiré, l'app tourne).

  ▎ Numérotation CHR-101+ en placeholder — renumérote vers ton tracker. Chaque branche a : livrable · frontière de module · comportement si retiré · critères d'acceptation.

  🧱 Fondations (squelette ambulant)

  feature/CHR-101 — Bootstrap Tauri + workspace + contrat IPC
  - Livrable : app Tauri v2 lance une fenêtre, shell Vite+React qui affiche le chrome studio (docks vides, réutilisant le design system). Workspace Cargo avec studio-core (vide mais
  compilable) + src-tauri. Contrat IPC de base (get_capabilities, bus events) + intégration glib MainLoop sur thread dédié ↔ tokio posée à blanc.
  - Si retiré : N/A (fondation).
  - Acceptation : cargo build sur les 3 OS, la fenêtre s'ouvre, get_capabilities() renvoie {sources:[], outputs:[]}, l'UI se construit dynamiquement sans planter sur une liste vide.

  feature/CHR-102 — studio-core : modèle de scène + état (logique pure portée)
  - Livrable : port en Rust pur du modèle calque/scène, du store, du bus commandes/events, de la persistance. Maths d'easing/entrance + blend réactions portés avec tests unitaires 1:1 contre
  le comportement TS. Le frontend peut ajouter/réordonner/sélectionner/masquer des calques, persistés. Zéro pixel.
  - Si retiré : N/A (cœur).
  - Acceptation : tests unitaires verts (easing, blend de poses, machine CUT/nonce/replay), CRUD calques persisté, aucune dépendance média dans Cargo.toml de studio-core.

  feature/CHR-103 — studio-media + compositeur GPU + surface preview
  - Livrable : le crate runtime GStreamer, le compositor/glvideomixer GPU rendu dans la child window Tauri. On affiche des calques triviaux (couleur/image statique) pilotés par le modèle du
  core → prouve le rendu 60 fps et le mapping calque→pad (position/alpha/z).
  - Si retiré (feature media off) : studio-core + UI tournent, get_capabilities() annonce zéro source, la preview affiche « moteur média indisponible ».
  - Acceptation : mire/couleur 1080p60 stable dans la preview, déplacer/redimensionner un calque bouge le pad en temps réel, resize fenêtre resynchronise la surface.

  🎥 Sources (chaque type = un module amovible)

  feature/CHR-104 — mod-screen-capture (Source) — la source phare (parité CHR-60)
  - Livrable : capture écran/fenêtre GStreamer (WGC/DXGI, ScreenCaptureKit, PipeWire) en gst::Bin, ajout dynamique au compositeur, gestion permissions + événement « partage arrêté » (parité de
  ta logique captureActive/ended).
  - Si retiré : la source « Capture d'écran » disparaît du menu (via capabilities), tout le reste marche.
  - Acceptation : capture visible dans preview, ajout/retrait à chaud sans casser le program, permissions gérées sur les 3 OS.

  feature/CHR-105 — mod-camera (Source) — webcam / carte de capture (parité caméra web)

  feature/CHR-106 — mod-overlays (Source) — image / texte / bible / chant
  - Livrable : rendu des overlays sans DOM (texte via pangocairo/textrender GStreamer ou texture rendue), branchés au compositeur. Porte la sémantique de tes calques texte/bible.
  - Si retiré : plus d'overlays texte, sources vidéo/écran intactes.

  🔊 Audio & sorties

  feature/CHR-107 — mod-audio-mixer (AudioNode) — remplace AudioContext/mixDest
  - Livrable : graphe audio (audiomixer + audioresample sur horloge maître), faders/mute/gain/balance par source, VU-mètres réels poussés à l'UI via un Channel Tauri (~20 Hz). Sons d'entrée
  (parité CHR-59) mixés ici.
  - Si retiré : diffusion muette (vidéo seule), le reste tourne.
  - Acceptation : mix synchro A/V sur 30 min sans dérive audible, VU réactifs, pas de jitter UI (l'audio ne passe jamais par le DOM).

  feature/CHR-108 — mod-output-record (Output) — enregistrement local
  - Livrable : tee → encodeur → mp4mux/webmmux finalisé à l'EOS → durée écrite nativement. Écriture fragmentée (fMP4) pour survivre à un crash.
  - Si retiré : bouton REC absent, diffusion live intacte.
  - Note : le fix webm-duration devient inutile dans le cas nominal (muxer finalise). On garde juste la robustesse crash via fragmentation. Si un jour muxing custom : surgery EBML en Rust
  triviale (nom/byteorder).

  feature/CHR-109 — mod-output-whip (Output) — diffusion Facebook
  - Livrable : whipclientsink (gst-plugins-rs) → ton relais SRS → RTMPS Facebook (réutilise l'infra existante). Encodeur H264 + Opus/AAC.
  - Si retiré : plus de diffusion externe, preview + record intacts.
  - Acceptation : live vérifié sur Facebook (parité de ce que tu as déjà validé côté web).

  ✨ Épaississement

  feature/CHR-110 — Animations + réactions sur GPU
  - Entrances (fade/zoom/slide/typewriter) et réactions CHR-57 comme automations de pads compositor / shaders. Logique de timing déjà dans le core (CHR-102) ; ici c'est le rendu.

  feature/CHR-111 — mod-encoder : sélection + fallback matériel/logiciel
  - NVENC/QSV/AMF/VideoToolbox → x264, exposé dans get_capabilities(), réglages bitrate/preset.

  feature/CHR-112 — Stats encodeur réelles + mode sandbox (parité CHR-59)
  - Bitrate/fps/frames droppées/charge lus depuis l'encodeur GStreamer (plus fiable que getStats). Mode Test qui ne touche ni Facebook ni /live.

  feature/CHR-113 — Groupes, scènes multiples, transitions (parité fonctionnelle restante)

  feature/CHR-114 — Packaging, signature, CI 3-OS, notarization

  Graphe de dépendances (ordre de merge)

  101 ─▶ 102 ─▶ 103 ─┬─▶ 104 (écran)
                     ├─▶ 105 (caméra)
                     ├─▶ 106 (overlays) ─▶ 110 (anim)
                     ├─▶ 107 (audio)     ─▶ 108 (record)
                     └─▶ 111 (encoder)   ─▶ 109 (whip) ─▶ 112 (stats/sandbox)

  Après CHR-103, tu as déjà une app qui affiche une preview GPU pilotée par ton modèle. Après 104 + 107 + 109, tu diffuses un écran + audio sur Facebook — MVP de bout en bout. Tout le reste
  est de l'épaississement modulaire.

  ---
  4. Ce qu'il me faut pour lancer CHR-101

  Avant de couper la première branche et d'écrire du code, trois décisions qui conditionnent le squelette :

  1. Mono-repo ou repo séparé ? Je recommande un nouveau repo (studio-native) plutôt que de greffer Rust dans church-clone — les cycles de vie et la CI n'ont rien à voir. Tu réutilises les
  composants React par copie/extraction, pas par import Next.
  2. Cible OS prioritaire pour le POC ? La capture et l'encodeur diffèrent le plus. Je propose de valider CHR-103/104 d'abord sur ta machine de dev (tu es sous Kali/Linux → PipeWire +
  VAAPI/x264), puis Windows (NVENC/WGC), puis Mac.
  3. Encodeur cible du MVP : matériel dispo sur tes machines de diffusion (NVIDIA → NVENC ? Intel → QSV ?) — ça fixe le défaut de mod-encoder et évite le piège GPL x264 en prod.

  Réponds à ces trois points et je te découpe feature/CHR-101 concrètement : arborescence du workspace Cargo, src-tauri minimal, le contrat IPC (get_capabilities + bus events), et
  l'intégration glib-MainLoop↔tokio — le tout compilant sur les 3 OS avec une fenêtre qui s'ouvre et une UI qui se construit dynamiquement à partir de zéro capacité.
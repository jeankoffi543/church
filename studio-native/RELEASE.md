# Packaging & release — Studio Native (CHR-114)

Studio Native ships as a native desktop app on **Linux, macOS and Windows**,
bundled by Tauri v2. This document covers building installers locally and the CI
release pipeline.

## Layout note (important)

The frontend (`ui/`) is a **sibling** of `src-tauri/`, not its parent. Tauri runs
`beforeDevCommand`/`beforeBuildCommand` **inside the frontend directory**
(`studio-native/ui`, derived from `frontendDist`), so the config calls the UI's
own scripts directly — `pnpm dev` / `pnpm build`, **no** `--dir`.

**Run `cargo tauri` from the project root `studio-native/`** (not from
`src-tauri/`): the CLI resolves the frontend dir from there, and the before-command
lands in `ui/`. Running from inside `src-tauri/` shifts that working directory and
breaks the before-command.

## Prerequisites

- Rust stable + the Tauri CLI: `cargo install tauri-cli` (`cargo tauri …`).
- Node 20 + **pnpm 9** (the UI lockfile is `ui/pnpm-lock.yaml`).
- Linux build/runtime libs:
  `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev`
  `libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev`
  `gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-libav`

## Build installers locally

From `studio-native/` (the project root):

```bash
cargo tauri dev                   # run the app (starts the vite dev server first)
cargo tauri build                 # all bundle targets for this OS
cargo tauri build --bundles deb   # just one target (deb / appimage / dmg / nsis / msi)
```

Artifacts land in `studio-native/target/release/bundle/`:

| OS      | Bundles                          |
| ------- | -------------------------------- |
| Linux   | `.deb`, `.rpm`, `.AppImage`      |
| macOS   | `.app`, `.dmg`                   |
| Windows | `.msi` (WiX), `.exe` (NSIS)      |

The Linux `.deb`'s runtime deps (webkit, gtk, gstreamer) are declared in
`tauri.conf.json → bundle.linux.deb.depends`.

## Icons

The full cross-platform set (`icon.icns` for macOS, `icon.ico` for Windows, PNGs
for Linux) is committed under `src-tauri/icons/`. To regenerate from a ≥512×512
source: `cargo tauri icon path/to/icon.png`.

## CI

- **`.github/workflows/studio-native-ci.yml`** — on every push/PR touching
  `studio-native/**`: rustfmt, clippy (`-D warnings`), the full `cargo test`
  suite under `xvfb`, and the UI typecheck+build. Linux-only, for fast feedback.
- **`.github/workflows/studio-native-release.yml`** — on a `studio-native-v*`
  tag (or manual dispatch): builds + bundles on Linux, macOS (arm64 **and**
  x86_64) and Windows via `tauri-action`, and attaches the installers to a
  **draft** GitHub release.

### Cutting a release

```bash
# bump version in src-tauri/tauri.conf.json (and Cargo.toml) first, then:
git tag studio-native-v0.1.0
git push origin studio-native-v0.1.0
```

Review the draft release the workflow creates, then publish it.

## Signing & notarization (optional)

Out of the box the release builds are **unsigned**. Configure these repo secrets
to get signed + notarized artifacts — the workflow passes them through only when
present, so nothing breaks while they're absent:

### macOS

| Secret                       | What it is                                        |
| ---------------------------- | ------------------------------------------------- |
| `APPLE_CERTIFICATE`          | base64 of the "Developer ID Application" `.p12`   |
| `APPLE_CERTIFICATE_PASSWORD` | password for that `.p12`                          |
| `APPLE_SIGNING_IDENTITY`     | e.g. `Developer ID Application: Name (TEAMID)`    |
| `APPLE_ID`                   | Apple ID email (for notarization)                 |
| `APPLE_PASSWORD`             | an app-specific password for that Apple ID        |
| `APPLE_TEAM_ID`              | your 10-char Apple Team ID                        |

Setting `APPLE_CERTIFICATE` flips `ENABLE_CODE_SIGNING` on in the workflow;
`tauri-action` then signs the `.app`/`.dmg` and notarizes with the `APPLE_*`
credentials.

### Windows

Code signing needs a code-signing certificate. Set
`bundle.windows.certificateThumbprint` (+ `timestampUrl`, `digestAlgorithm`) in
`tauri.conf.json` to a cert installed on the runner, or wire a custom
`signCommand`. Left unset ⇒ unsigned `.msi`/`.exe`.

> These paths can't be exercised without real Apple/Windows credentials, so they
> ship configured-but-inert; the Linux `.deb`/`.AppImage` and the unsigned
> Windows/macOS bundles build end-to-end today.

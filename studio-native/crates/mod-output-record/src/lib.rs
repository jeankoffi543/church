//! # mod-output-record (CHR-108)
//!
//! Local recording of the programme feed — the native replacement for the web
//! app's `MediaRecorder` (+ the `webm-duration-fix` hack). It builds the output
//! branch that taps [`studio_media`]'s programme `tee`:
//!
//! ```text
//!   [tee]       → queue → videoconvert → <encoder> → h264parse ┐
//!                                                              ├ mux → filesink(path)
//!   [audio-tee] → audio_sink ghost → convert → voaacenc → aacparse ┘
//! ```
//!
//! as a `gst::Bin` with ghost **sink** pads (video + `audio_sink`). The engine
//! attaches it live and, on stop, sends it EOS so the muxer writes a real trailer
//! (`moov`/duration) — the file is natively finalised, so the web's duration
//! patch is unnecessary.
//!
//! Container by extension: `.mp4`/`.m4v` → `mp4mux` (fragmented, so a crash
//! still leaves a playable file), anything else → `matroskamux` (`.mkv`, robust
//! to truncation). The `<encoder>` comes from [`mod_encoder`] (CHR-111) —
//! hardware where available, x264 fallback. **A/V (CHR-116)**: the audio comes
//! from studio-media's shared `audio-tee` via the `audio_sink` pad — one pipeline,
//! one clock, so the recorded A/V is synced by construction.
//!
//! Removable module: absent ⇒ no REC button, the live pipeline is untouched.

use anyhow::{anyhow, Context, Result};
use gst::prelude::*;
use gstreamer as gst;
use mod_encoder::EncoderConfig;
use std::path::Path;

/// Whether local recording can run here (an H.264 encoder + a muxer are present).
pub fn is_available() -> bool {
    let _ = gst::init();
    !mod_encoder::list_h264().is_empty()
        && (gst::ElementFactory::find("mp4mux").is_some()
            || gst::ElementFactory::find("matroskamux").is_some())
}

/// Pick a muxer for the target path. `.mp4`/`.m4v` → fragmented `mp4mux`; else
/// `matroskamux`. Falls back to whichever exists.
fn make_muxer(path: &Path) -> Result<gst::Element> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let want_mp4 = matches!(ext.as_str(), "mp4" | "m4v" | "mov");
    if want_mp4 && gst::ElementFactory::find("mp4mux").is_some() {
        // Fragmented MP4: survives a crash mid-recording (each fragment is
        // self-contained), and still finalises a normal moov on clean EOS.
        return gst::ElementFactory::make("mp4mux")
            .property("fragment-duration", 1000u32) // 1 s fragments
            .property_from_str("faststart", "true")
            .build()
            .context("make mp4mux");
    }
    gst::ElementFactory::make("matroskamux")
        .build()
        .context("make matroskamux")
}

/// Build the recording output bin (ghost `sink` pad) writing to `path`, encoding
/// per `cfg` (hardware where available, x264 fallback). Matches
/// [`studio_media::OutputBuilder`]; the shell hands
/// `move || build_record_bin(&path, &cfg)` to `MediaEngine::attach_output`.
pub fn build_record_bin(path: &Path, cfg: &EncoderConfig) -> Result<gst::Bin> {
    let _ = gst::init();
    let queue = gst::ElementFactory::make("queue")
        // Absorb encoder stalls without back-pressuring the shared tee.
        .property("max-size-time", 0u64)
        .property("max-size-bytes", 0u32)
        .property("max-size-buffers", 0u32)
        .build()
        .context("make queue")?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let enc = mod_encoder::build_h264(cfg).context("build encoder")?;
    // Named so studio-media can tap it for encoded-stream stats (CHR-112).
    let parse = gst::ElementFactory::make("h264parse")
        .name("stats-tap")
        .build()?;
    let mux = make_muxer(path)?;
    let sink = gst::ElementFactory::make("filesink")
        .name("record-filesink")
        .property(
            "location",
            path.to_str()
                .ok_or_else(|| anyhow!("non-UTF-8 record path"))?,
        )
        .build()
        .context("make filesink")?;

    // Audio branch (CHR-116): fed from studio-media's shared audio-tee via the
    // `audio_sink` ghost pad, muxed alongside the video (one clock ⇒ A/V synced).
    let aqueue = gst::ElementFactory::make("queue").build()?;
    let aconvert = gst::ElementFactory::make("audioconvert").build()?;
    let aresample = gst::ElementFactory::make("audioresample").build()?;
    let aenc = gst::ElementFactory::make("voaacenc")
        .property("bitrate", 128000i32)
        .build()
        .context("make voaacenc")?;
    let aparse = gst::ElementFactory::make("aacparse").build()?;

    let bin = gst::Bin::new();
    bin.add_many([&queue, &convert, &enc, &parse, &mux, &sink])
        .context("add record elements")?;
    bin.add_many([&aqueue, &aconvert, &aresample, &aenc, &aparse])
        .context("add record audio elements")?;
    gst::Element::link_many([&queue, &convert, &enc, &parse, &mux])
        .context("link record video chain")?;
    gst::Element::link_many([&mux, &sink]).context("link mux → filesink")?;
    gst::Element::link_many([&aqueue, &aconvert, &aresample, &aenc, &aparse])
        .context("link record audio chain")?;
    aparse.link(&mux).context("link aac → mux")?;

    let sink_pad = queue
        .static_pad("sink")
        .ok_or_else(|| anyhow!("queue has no sink pad"))?;
    let ghost = gst::GhostPad::with_target(&sink_pad).context("create ghost sink pad")?;
    ghost.set_active(true).context("activate ghost pad")?;
    bin.add_pad(&ghost).context("add ghost sink pad")?;

    let asink_pad = aqueue
        .static_pad("sink")
        .ok_or_else(|| anyhow!("audio queue has no sink pad"))?;
    let aghost = gst::GhostPad::builder_with_target(&asink_pad)
        .context("target audio ghost")?
        .name("audio_sink")
        .build();
    aghost
        .set_active(true)
        .context("activate audio ghost pad")?;
    bin.add_pad(&aghost).context("add audio ghost sink pad")?;
    Ok(bin)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn availability_and_bin_build_are_stable() {
        assert!(
            is_available(),
            "x264 + a muxer should be present on the dev box"
        );
        let path = std::env::temp_dir().join("chr108-build-only.mp4");
        let bin = build_record_bin(&path, &EncoderConfig::default()).expect("build record bin");
        assert!(
            bin.static_pad("sink").is_some(),
            "record bin needs a ghost sink pad"
        );
    }

    /// End-to-end: record a couple of seconds of the compositor's test pattern
    /// to a real file, stop (which finalises via EOS), and confirm a playable,
    /// non-trivial file with a real container header — headless.
    #[test]
    fn records_the_programme_to_a_finalised_file() {
        let path = std::env::temp_dir().join(format!("chr108-rec-{}.mp4", std::process::id()));
        let _ = std::fs::remove_file(&path);

        let engine = studio_media::MediaEngine::start().expect("engine");
        // Wait for the compositor to actually produce frames.
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }
        // A/V unification (CHR-116): put a real tone on the audio bus so the
        // recording carries a genuine (non-silent) audio track, synced to video
        // by the shared pipeline clock.
        engine
            .add_audio_channel("mic", Some(440.0))
            .expect("add audio channel");
        let p = path.clone();
        engine
            .attach_output(
                "record",
                Box::new(move || build_record_bin(&p, &EncoderConfig::default())),
            )
            .expect("attach record");
        assert!(engine.is_output_active("record"));

        // Record ~1.5 s of programme.
        std::thread::sleep(Duration::from_millis(1500));
        engine.detach_output("record").expect("finalise record");
        assert!(!engine.is_output_active("record"));
        engine.stop();

        let meta = std::fs::metadata(&path).expect("recording file exists");
        assert!(
            meta.len() > 2000,
            "recording is suspiciously small ({} bytes)",
            meta.len()
        );
        let head = std::fs::read(&path).expect("read file");
        // MP4 files start with an `ftyp` box: bytes 4..8 == "ftyp".
        assert_eq!(
            &head[4..8],
            b"ftyp",
            "not a valid finalised MP4 (no ftyp box)"
        );
        // A/V unification proof: the muxed file carries an AAC audio track — the
        // `mp4a` sample-description atom is present alongside the H.264 video.
        assert!(
            head.windows(4).any(|w| w == b"mp4a"),
            "recording has no audio track (CHR-116 A/V unification): no mp4a atom"
        );
        let _ = std::fs::remove_file(&path);
    }
}

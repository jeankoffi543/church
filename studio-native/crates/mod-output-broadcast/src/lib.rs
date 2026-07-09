//! # mod-output-broadcast (CHR-109)
//!
//! External live broadcast — the "Direct Facebook" Output. It taps
//! [`studio_media`]'s programme `tee` and publishes to Facebook Live over
//! **RTMPS, directly**:
//!
//! ```text
//!   [tee] → queue → videoconvert → x264enc → h264parse ┐
//!                                                       ├─ flvmux → queue → rtmp2sink(rtmps://…)
//!   audiotestsrc(silence) → aconv → voaacenc → aacparse ┘
//! ```
//!
//! ## Why RTMPS direct, not WHIP → SRS
//!
//! The web régie went WHIP → SRS → RTMPS **because a browser cannot speak
//! RTMP** — it must send WebRTC and let SRS transcode. A native GStreamer app
//! has no such limit: `rtmp2sink` speaks RTMP(S) to Facebook straight, dropping
//! the whole SRS relay hop. (`whipclientsink` from gst-plugins-rs would also
//! work but needs a plugin not shipped in the base install — RTMPS direct is
//! simpler, lower-latency, and uses stock elements.)
//!
//! Facebook Live rejects a video-only RTMP stream, so v1 muxes a **silent AAC**
//! track alongside the video. The real programme audio (from mod-audio-mixer)
//! replaces the silence once the A/V pipelines are unified on a shared clock — a
//! later step. Video codec is x264 (CHR-111 makes it hardware-selectable).
//!
//! A broadcast is an [`studio_media::OutputBuilder`]; the engine attaches it hot
//! and, crucially, **survives it dropping** — if the connection dies, the bus
//! watch tears just this output down and keeps the programme + preview running.
//!
//! Removable module: absent ⇒ no "Direct externe" button, preview + record
//! untouched.

use anyhow::{anyhow, Context, Result};
use gst::prelude::*;
use gstreamer as gst;

/// Whether external broadcast can run here — the full RTMP(S) chain is present.
pub fn is_available() -> bool {
    let _ = gst::init();
    ["x264enc", "flvmux", "rtmp2sink", "voaacenc", "h264parse"]
        .iter()
        .all(|e| gst::ElementFactory::find(e).is_some())
}

/// Build the broadcast output bin (ghost `sink` pad, video in from the tee)
/// publishing to `rtmp_url` (e.g. `rtmps://live-api-s.facebook.com:443/rtmp/KEY`).
/// Matches [`studio_media::OutputBuilder`].
pub fn build_broadcast_bin(rtmp_url: &str) -> Result<gst::Bin> {
    let _ = gst::init();
    let bin = gst::Bin::new();

    // ── video branch (from the tee) ──
    let vqueue = gst::ElementFactory::make("queue")
        .property("max-size-time", 0u64)
        .property("max-size-bytes", 0u32)
        .build()
        .context("make video queue")?;
    let vconvert = gst::ElementFactory::make("videoconvert").build()?;
    let x264 = gst::ElementFactory::make("x264enc")
        .property_from_str("tune", "zerolatency")
        .property_from_str("speed-preset", "veryfast")
        // A ~2 s keyframe interval + a sane bitrate ceiling for Facebook.
        .property("key-int-max", 120u32)
        .property("bitrate", 4000u32) // kbps
        .build()
        .context("make x264enc")?;
    let h264parse = gst::ElementFactory::make("h264parse").build()?;

    // ── silent audio branch (Facebook needs an audio track) ──
    let asrc = gst::ElementFactory::make("audiotestsrc")
        .property("is-live", true)
        .property_from_str("wave", "silence")
        .build()
        .context("make audiotestsrc (silence)")?;
    let aconvert = gst::ElementFactory::make("audioconvert").build()?;
    let aresample = gst::ElementFactory::make("audioresample").build()?;
    let aac = gst::ElementFactory::make("voaacenc")
        .property("bitrate", 128000i32)
        .build()
        .context("make voaacenc")?;
    let aacparse = gst::ElementFactory::make("aacparse").build()?;

    // ── mux + sink ──
    let flvmux = gst::ElementFactory::make("flvmux")
        .name("mux")
        .property("streamable", true)
        .build()
        .context("make flvmux")?;
    let oqueue = gst::ElementFactory::make("queue").build()?;
    let sink = gst::ElementFactory::make("rtmp2sink")
        .name("broadcast-sink")
        .property("location", rtmp_url)
        .build()
        .context("make rtmp2sink")?;

    bin.add_many([
        &vqueue, &vconvert, &x264, &h264parse, &asrc, &aconvert, &aresample, &aac, &aacparse,
        &flvmux, &oqueue, &sink,
    ])
    .context("add broadcast elements")?;

    // Linear links, then the two branches into the muxer (link auto-requests a
    // compatible flvmux pad), then mux → queue → sink.
    gst::Element::link_many([&vqueue, &vconvert, &x264, &h264parse]).context("link video chain")?;
    gst::Element::link_many([&asrc, &aconvert, &aresample, &aac, &aacparse])
        .context("link audio chain")?;
    h264parse.link(&flvmux).context("link h264 → flvmux")?;
    aacparse.link(&flvmux).context("link aac → flvmux")?;
    gst::Element::link_many([&flvmux, &oqueue, &sink]).context("link flvmux → sink")?;

    // Video-only ghost sink pad — the tap point off the programme tee.
    let sink_pad = vqueue
        .static_pad("sink")
        .ok_or_else(|| anyhow!("video queue has no sink pad"))?;
    let ghost = gst::GhostPad::with_target(&sink_pad).context("create ghost sink pad")?;
    ghost.set_active(true).context("activate ghost pad")?;
    bin.add_pad(&ghost).context("add ghost sink pad")?;
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
            "x264/flvmux/rtmp2sink/voaacenc should be present"
        );
        let bin = build_broadcast_bin("rtmp://127.0.0.1:1/live/x").expect("build broadcast bin");
        assert!(
            bin.static_pad("sink").is_some(),
            "broadcast bin needs a ghost sink pad"
        );
    }

    /// A broadcast to an unreachable server must fail *gracefully*: the output
    /// auto-detaches and the engine (preview + programme) keeps running — a
    /// Facebook drop never kills the studio. This exercises the whole path
    /// (build → attach → rtmp2sink errors → bus-watch teardown) headlessly, no
    /// real RTMP server needed — the connection error IS the test.
    #[test]
    fn a_failed_broadcast_auto_detaches_and_the_engine_survives() {
        let engine = studio_media::MediaEngine::start().expect("engine");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }
        let before = engine.frames();

        // Port 1 refuses instantly → rtmp2sink errors quickly.
        engine
            .attach_output(
                "broadcast",
                Box::new(|| build_broadcast_bin("rtmp://127.0.0.1:1/live/x")),
            )
            .expect("attach broadcast");

        // The bus watch should tear the output down on the connection error.
        let mut detached = false;
        for _ in 0..80 {
            std::thread::sleep(Duration::from_millis(50));
            if !engine.is_output_active("broadcast") {
                detached = true;
                break;
            }
        }
        assert!(detached, "a failed broadcast should auto-detach");
        assert!(
            engine.take_ended_reason("broadcast").is_some(),
            "expected an ended reason for the failed broadcast"
        );

        // The engine kept producing programme frames throughout.
        std::thread::sleep(Duration::from_millis(300));
        let after = engine.frames();
        engine.stop();
        assert!(
            after > before,
            "the programme must survive a broadcast failure"
        );
    }
}

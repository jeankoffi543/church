//! # mod-audio-mixer (CHR-107)
//!
//! The audio plane — the native replacement for the web régie's Web Audio
//! mixer (`studio-audio.ts`: `AudioContext` + per-source gain + `mixDest`). It
//! runs its own GStreamer pipeline on a dedicated glib `MainLoop` (same shape as
//! [`studio_media`]'s video engine), mixing per-channel audio into one master
//! bus:
//!
//! ```text
//!   <channel src> → audioconvert → audioresample → volume → audiopanorama ┐
//!                                                                (level)   ├─→ audiomixer → level(master) → audioconvert → sink
//!   … more channels …                                                     ┘
//! ```
//!
//! Per channel: **fader** (0–100), **mute**, **gain** (dB) and **balance**
//! (−100…+100 L/R) — set live via the `volume`/`audiopanorama` elements. Real
//! **VU meters** come from a `level` element on every channel (and the master),
//! read off the bus and exposed via [`AudioMixer::levels`] — the audio never
//! touches the DOM, so the UI VU can't jitter the sound.
//!
//! A permanent silent base channel keeps the `audiomixer` (a live aggregator)
//! producing even with no real channels — the audio twin of the video engine's
//! background layer, so the master VU always flows and channels can come and go.
//!
//! v1 output is a `fakesink` (the mix is measured, not yet routed): the real
//! sinks — local monitor, record (CHR-108), WHIP (CHR-109) — tap this master bus
//! later. Removable module: absent ⇒ silent broadcast, everything else runs.

use std::collections::HashMap;
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;

use anyhow::{anyhow, bail, Context, Result};
use gst::glib;
use gst::prelude::*;
use gstreamer as gst;

/// Builds a channel's raw audio source as a `gst::Bin` with a ghost `src` pad
/// (e.g. an audiotestsrc tone, or a decoded file). The mixer adds the
/// volume/panorama/level chain around it. Runs on the caller's thread.
pub type AudioSourceBuilder = Box<dyn FnOnce() -> Result<gst::Bin> + Send>;

/// The id of the always-present silent base channel.
const SILENCE_ID: &str = "__silence__";
/// The master bus level element name (for VU attribution on the bus).
const MASTER_LEVEL: &str = "level:master";

/// Per-channel mixer settings — mirror of the web per-source audio config.
#[derive(Clone, Copy, Debug)]
pub struct ChannelSettings {
    /// 0–100 fader (like the web `audioLevel`).
    pub fader: f64,
    pub muted: bool,
    /// −20…+20 dB gain trim.
    pub gain_db: f64,
    /// −100 (L) … +100 (R) balance.
    pub balance: f64,
}

impl Default for ChannelSettings {
    fn default() -> Self {
        ChannelSettings {
            fader: 80.0,
            muted: false,
            gain_db: 0.0,
            balance: 0.0,
        }
    }
}

impl ChannelSettings {
    /// Linear volume for the `volume` element = fader(0..1) × 10^(dB/20), 0 if muted.
    fn linear_volume(&self) -> f64 {
        if self.muted {
            return 0.0;
        }
        (self.fader / 100.0).clamp(0.0, 1.0) * 10f64.powf(self.gain_db / 20.0)
    }
    /// audiopanorama takes −1.0 (L) … +1.0 (R) as a `gfloat`.
    fn panorama(&self) -> f32 {
        (self.balance / 100.0).clamp(-1.0, 1.0) as f32
    }
}

/// A live channel: its source bin + the control/measure elements + mixer pad.
struct Channel {
    bin: gst::Bin,
    volume: gst::Element,
    panorama: gst::Element,
    mixer_pad: gst::Pad,
}

type ChannelMap = Arc<Mutex<HashMap<String, Channel>>>;
/// Latest peak level (dB, ≤ 0) per channel id (+ `"master"`), updated from the
/// bus `level` messages.
type LevelMap = Arc<Mutex<HashMap<String, f64>>>;

struct Ready {
    main_loop: glib::MainLoop,
    pipeline: gst::Pipeline,
    mixer: gst::Element,
    channels: ChannelMap,
    levels: LevelMap,
}

/// A running audio mixer. Dropping or [`AudioMixer::stop`]-ping it tears the loop
/// down.
pub struct AudioMixer {
    main_loop: glib::MainLoop,
    pipeline: gst::Pipeline,
    mixer: gst::Element,
    channels: ChannelMap,
    levels: LevelMap,
    thread: Option<JoinHandle<()>>,
}

impl AudioMixer {
    /// Start the mixer (master bus + permanent silent base channel).
    pub fn start() -> Result<AudioMixer> {
        let (ready_tx, ready_rx) = mpsc::channel::<Result<Ready, String>>();
        let thread = std::thread::Builder::new()
            .name("studio-audio".into())
            .spawn(move || {
                if let Err(e) = run_audio_thread(&ready_tx) {
                    let _ = ready_tx.send(Err(e.to_string()));
                }
            })
            .context("spawn audio thread")?;
        match ready_rx.recv() {
            Ok(Ok(r)) => Ok(AudioMixer {
                main_loop: r.main_loop,
                pipeline: r.pipeline,
                mixer: r.mixer,
                channels: r.channels,
                levels: r.levels,
                thread: Some(thread),
            }),
            Ok(Err(e)) => bail!("audio mixer setup: {e}"),
            Err(_) => bail!("audio thread died before signalling ready"),
        }
    }

    /// Attach a channel, live. `id` must be unique. Errors if already present.
    pub fn add_channel(
        &self,
        id: impl Into<String>,
        settings: ChannelSettings,
        builder: AudioSourceBuilder,
    ) -> Result<()> {
        add_channel_impl(
            &self.pipeline,
            &self.mixer,
            &self.channels,
            id.into(),
            settings,
            builder,
        )
    }

    /// Detach a channel, live, without disturbing the rest of the mix.
    pub fn remove_channel(&self, id: &str) -> Result<()> {
        let channel = self
            .channels
            .lock()
            .map_err(|_| anyhow!("channels lock poisoned"))?
            .remove(id)
            .ok_or_else(|| anyhow!("no such channel: {id}"))?;
        detach_channel(&self.pipeline, &self.mixer, channel);
        Ok(())
    }

    pub fn is_channel_active(&self, id: &str) -> bool {
        self.channels
            .lock()
            .map(|c| c.contains_key(id))
            .unwrap_or(false)
    }

    /// Apply fader/mute/gain/balance to a channel, live.
    pub fn set_channel(&self, id: &str, settings: ChannelSettings) -> Result<()> {
        let channels = self
            .channels
            .lock()
            .map_err(|_| anyhow!("channels lock poisoned"))?;
        let ch = channels
            .get(id)
            .ok_or_else(|| anyhow!("no such channel: {id}"))?;
        ch.volume.set_property("volume", settings.linear_volume());
        ch.volume.set_property("mute", settings.muted);
        ch.panorama.set_property("panorama", settings.panorama());
        Ok(())
    }

    /// Latest peak level (dB) per channel id (+ `"master"`). `-inf`/very negative
    /// = silence, 0 = full scale.
    pub fn levels(&self) -> HashMap<String, f64> {
        self.levels.lock().map(|l| l.clone()).unwrap_or_default()
    }

    pub fn stop(mut self) {
        self.shutdown();
    }

    fn shutdown(&mut self) {
        self.main_loop.quit();
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

impl Drop for AudioMixer {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// A silent audiotestsrc bin — the permanent base channel that keeps the live
/// aggregator producing when no real channel is attached.
pub fn silence_source() -> Result<gst::Bin> {
    let src = gst::ElementFactory::make("audiotestsrc")
        .property("is-live", true)
        .property_from_str("wave", "silence")
        .build()
        .context("make audiotestsrc (silence)")?;
    wrap_audio_bin(&[&src])
}

/// A test-tone bin (sine at `freq` Hz) — for demos/tests.
pub fn tone_source(freq: f64) -> Result<gst::Bin> {
    let src = gst::ElementFactory::make("audiotestsrc")
        .property("is-live", true)
        .property("freq", freq)
        .build()
        .context("make audiotestsrc (tone)")?;
    wrap_audio_bin(&[&src])
}

/// Wrap a chain into a bin with a ghost `src` pad on the last element.
fn wrap_audio_bin(chain: &[&gst::Element]) -> Result<gst::Bin> {
    let bin = gst::Bin::new();
    bin.add_many(chain.iter().copied())
        .context("add audio elements to bin")?;
    gst::Element::link_many(chain.iter().copied()).context("link audio chain")?;
    let tail = chain.last().ok_or_else(|| anyhow!("empty audio chain"))?;
    let tail_pad = tail
        .static_pad("src")
        .ok_or_else(|| anyhow!("tail has no src pad"))?;
    let ghost = gst::GhostPad::with_target(&tail_pad).context("ghost pad")?;
    ghost.set_active(true).context("activate ghost")?;
    bin.add_pad(&ghost).context("add ghost pad")?;
    Ok(bin)
}

fn add_channel_impl(
    pipeline: &gst::Pipeline,
    mixer: &gst::Element,
    channels: &ChannelMap,
    id: String,
    settings: ChannelSettings,
    builder: AudioSourceBuilder,
) -> Result<()> {
    {
        let guard = channels
            .lock()
            .map_err(|_| anyhow!("channels lock poisoned"))?;
        if guard.contains_key(&id) {
            bail!("audio channel '{id}' already active");
        }
    }

    let bin = builder().with_context(|| format!("build audio channel '{id}'"))?;
    let convert = gst::ElementFactory::make("audioconvert").build()?;
    let resample = gst::ElementFactory::make("audioresample").build()?;
    let volume = gst::ElementFactory::make("volume")
        .property("volume", settings.linear_volume())
        .property("mute", settings.muted)
        .build()
        .context("make volume")?;
    let panorama = gst::ElementFactory::make("audiopanorama")
        .property("panorama", settings.panorama())
        .build()
        .context("make audiopanorama")?;
    let level = gst::ElementFactory::make("level")
        .name(format!("level:{id}"))
        .property("post-messages", true)
        .property("interval", 50_000_000u64) // 50 ms → ~20 Hz VU
        .build()
        .context("make level")?;

    pipeline
        .add_many([
            &bin.clone().upcast::<gst::Element>(),
            &convert,
            &resample,
            &volume,
            &panorama,
            &level,
        ])
        .with_context(|| format!("add channel '{id}' elements"))?;
    gst::Element::link_many([&convert, &resample, &volume, &panorama, &level])
        .context("link channel chain")?;
    bin.static_pad("src")
        .ok_or_else(|| anyhow!("channel bin has no src pad"))?
        .link(&convert.static_pad("sink").unwrap())
        .context("link channel bin → convert")?;

    let mixer_pad = mixer
        .request_pad_simple("sink_%u")
        .ok_or_else(|| anyhow!("audiomixer request pad failed"))?;
    level
        .static_pad("src")
        .ok_or_else(|| anyhow!("level has no src pad"))?
        .link(&mixer_pad)
        .context("link level → audiomixer")?;

    for el in [&convert, &resample, &volume, &panorama, &level] {
        el.sync_state_with_parent()
            .with_context(|| format!("sync channel '{id}' element"))?;
    }
    bin.sync_state_with_parent()
        .with_context(|| format!("sync channel '{id}' bin"))?;

    channels
        .lock()
        .map_err(|_| anyhow!("channels lock poisoned"))?
        .insert(
            id,
            Channel {
                bin,
                volume,
                panorama,
                mixer_pad,
            },
        );
    Ok(())
}

/// Tear a channel out of the live graph: block its mixer pad, unlink, release it,
/// then drop the elements to `Null` off the streaming thread — the same idiom the
/// video engine uses.
fn detach_channel(pipeline: &gst::Pipeline, mixer: &gst::Element, channel: Channel) {
    let Channel {
        bin,
        volume,
        panorama,
        mixer_pad,
    } = channel;
    let pipeline = pipeline.clone();
    let mixer = mixer.clone();
    // The level element's src pad feeds the mixer pad; block there.
    let level_src = mixer_pad.peer();
    let probe_pad = level_src.clone().unwrap_or_else(|| mixer_pad.clone());
    probe_pad.add_probe(gst::PadProbeType::IDLE, move |pad, _info| {
        if let Some(peer) = pad.peer() {
            let _ = pad.unlink(&peer);
        }
        mixer.release_request_pad(&mixer_pad);
        let pipeline = pipeline.clone();
        let bin = bin.clone();
        let volume = volume.clone();
        let panorama = panorama.clone();
        // Move the teardown off the streaming thread (self-join deadlock).
        bin.call_async(move |bin| {
            for el in [
                bin.clone().upcast::<gst::Element>(),
                volume.clone(),
                panorama.clone(),
            ] {
                let _ = el.set_state(gst::State::Null);
                let _ = el.state(gst::ClockTime::from_seconds(2));
                let _ = pipeline.remove(&el);
            }
        });
        gst::PadProbeReturn::Remove
    });
}

fn run_audio_thread(ready: &mpsc::Sender<Result<Ready, String>>) -> Result<()> {
    gst::init().context("gst::init")?;
    let ctx = glib::MainContext::new();
    ctx.with_thread_default(|| -> Result<()> {
        let main_loop = glib::MainLoop::new(Some(&ctx), false);

        let pipeline = gst::Pipeline::with_name("studio-audio");
        let mixer = gst::ElementFactory::make("audiomixer")
            .build()
            .context("make audiomixer")?;
        let master_level = gst::ElementFactory::make("level")
            .name(MASTER_LEVEL)
            .property("post-messages", true)
            .property("interval", 50_000_000u64)
            .build()
            .context("make master level")?;
        let out_convert = gst::ElementFactory::make("audioconvert").build()?;
        // v1: measured, not routed. A monitor/record/whip sink taps here later.
        let sink = gst::ElementFactory::make("fakesink")
            .property("sync", true)
            .build()
            .context("make fakesink")?;
        pipeline
            .add_many([&mixer, &master_level, &out_convert, &sink])
            .context("add master chain")?;
        gst::Element::link_many([&mixer, &master_level, &out_convert, &sink])
            .context("link master chain")?;

        let channels: ChannelMap = Arc::new(Mutex::new(HashMap::new()));
        let levels: LevelMap = Arc::new(Mutex::new(HashMap::new()));

        add_channel_impl(
            &pipeline,
            &mixer,
            &channels,
            SILENCE_ID.to_string(),
            ChannelSettings {
                fader: 0.0,
                ..Default::default()
            },
            Box::new(silence_source),
        )
        .context("attach silent base channel")?;

        let bus = pipeline.bus().ok_or_else(|| anyhow!("no bus"))?;
        let loop_for_watch = main_loop.clone();
        let levels_for_watch = levels.clone();
        let _watch = bus
            .add_watch(move |_, msg| {
                use gst::MessageView;
                match msg.view() {
                    MessageView::Eos(_) | MessageView::Error(_) => {
                        loop_for_watch.quit();
                        glib::ControlFlow::Break
                    }
                    MessageView::Element(_) => {
                        if let Some(s) = msg.structure() {
                            if s.name() == "level" {
                                if let Some(peak) = read_peak_db(s) {
                                    let id =
                                        msg.src().map(|o| o.name().to_string()).unwrap_or_default();
                                    // "level:master" → "master"; "level:<id>" → "<id>".
                                    let key = id.strip_prefix("level:").unwrap_or(&id).to_string();
                                    if let Ok(mut m) = levels_for_watch.lock() {
                                        m.insert(key, peak);
                                    }
                                }
                            }
                        }
                        glib::ControlFlow::Continue
                    }
                    _ => glib::ControlFlow::Continue,
                }
            })
            .context("add bus watch")?;

        pipeline
            .set_state(gst::State::Playing)
            .context("set Playing")?;

        ready
            .send(Ok(Ready {
                main_loop: main_loop.clone(),
                pipeline: pipeline.clone(),
                mixer: mixer.clone(),
                channels: channels.clone(),
                levels: levels.clone(),
            }))
            .map_err(|_| anyhow!("mixer dropped before ready"))?;

        main_loop.run();
        pipeline.set_state(gst::State::Null).context("set Null")?;
        Ok(())
    })
    .map_err(|e| anyhow!("with_thread_default: {e}"))?
}

/// Max peak (dB) across audio channels from a `level` message structure.
fn read_peak_db(s: &gst::StructureRef) -> Option<f64> {
    let peaks = s.get::<glib::ValueArray>("peak").ok()?;
    let mut max = f64::NEG_INFINITY;
    for v in peaks.iter() {
        if let Ok(db) = v.get::<f64>() {
            if db > max {
                max = db;
            }
        }
    }
    if max.is_finite() {
        Some(max)
    } else {
        Some(f64::NEG_INFINITY)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    static AUDIO_TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn channel_settings_map_to_volume_and_panorama() {
        let s = ChannelSettings {
            fader: 100.0,
            muted: false,
            gain_db: 0.0,
            balance: 0.0,
        };
        assert!((s.linear_volume() - 1.0).abs() < 1e-9);
        assert!((s.panorama() - 0.0).abs() < 1e-9);
        assert_eq!(ChannelSettings { muted: true, ..s }.linear_volume(), 0.0);
        // +6 dB ≈ ×2.
        let g = ChannelSettings { gain_db: 6.0, ..s };
        assert!((g.linear_volume() - 1.995).abs() < 0.01);
        // Full right balance → +1.0.
        let b = ChannelSettings {
            balance: 100.0,
            ..s
        };
        assert!((b.panorama() - 1.0).abs() < 1e-9);
    }

    #[test]
    fn mixer_starts_with_a_silent_base_channel() {
        let _g = AUDIO_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let mixer = AudioMixer::start().expect("start");
        assert!(mixer.is_channel_active(SILENCE_ID));
        mixer.stop();
    }

    #[test]
    fn a_tone_channel_registers_a_vu_level() {
        let _g = AUDIO_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let mixer = AudioMixer::start().expect("start");
        mixer
            .add_channel(
                "tone",
                ChannelSettings::default(),
                Box::new(|| tone_source(440.0)),
            )
            .expect("add tone");
        assert!(mixer.is_channel_active("tone"));

        // Give the level element a few intervals to post messages.
        let mut got = false;
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            let levels = mixer.levels();
            // A 440 Hz tone at fader 80 must read well above silence on its
            // channel and on the master bus.
            if levels.get("tone").is_some_and(|&db| db > -60.0)
                && levels.get("master").is_some_and(|&db| db > -60.0)
            {
                got = true;
                break;
            }
        }
        mixer.stop();
        assert!(
            got,
            "expected a real VU level from the tone channel + master"
        );
    }

    #[test]
    fn muting_a_channel_drops_its_contribution() {
        let _g = AUDIO_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let mixer = AudioMixer::start().expect("start");
        mixer
            .add_channel(
                "tone",
                ChannelSettings::default(),
                Box::new(|| tone_source(440.0)),
            )
            .expect("add tone");
        // Let it ring, then mute and confirm the master falls quiet.
        std::thread::sleep(Duration::from_millis(300));
        mixer
            .set_channel(
                "tone",
                ChannelSettings {
                    muted: true,
                    ..Default::default()
                },
            )
            .expect("mute");
        std::thread::sleep(Duration::from_millis(400));
        let master = mixer.levels().get("master").copied().unwrap_or(0.0);
        mixer.stop();
        assert!(
            master < -40.0,
            "muted mix should be near silence, got {master} dB"
        );
    }

    #[test]
    fn hot_add_remove_channel_keeps_the_mixer_alive() {
        let _g = AUDIO_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let mixer = AudioMixer::start().expect("start");
        mixer
            .add_channel(
                "tone",
                ChannelSettings::default(),
                Box::new(|| tone_source(440.0)),
            )
            .expect("add");
        std::thread::sleep(Duration::from_millis(150));
        mixer.remove_channel("tone").expect("remove");
        assert!(!mixer.is_channel_active("tone"));
        // The mixer (silent base + master) keeps running after a hot remove.
        std::thread::sleep(Duration::from_millis(200));
        assert!(mixer.is_channel_active(SILENCE_ID));
        mixer.stop();
    }
}

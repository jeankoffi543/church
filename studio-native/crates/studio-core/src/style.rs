//! The per-layer style model — the Rust mirror of the web app's `StudioSettings`
//! (`lib/studio.ts`). This is the FULL styling surface a layer carries:
//! typography (three groups: reference / body / version), container geometry,
//! shadows, positioning (predefined presets + free custom box), animation
//! selection, and text alignment.
//!
//! Pure data. How a style is *rendered* (typography onto a GPU texture,
//! container boxes, entrance effects) is the compositor's job in later CHR
//! branches; how a reaction *blends* two styles is [`crate::reaction`]. This
//! module only owns the model and its defaults — which match
//! `DEFAULT_STUDIO_SETTINGS` value-for-value so a scene authored here looks
//! identical to one authored in the web régie.
//!
//! Discrete unions become Rust enums with serde renames matching the exact web
//! string ids (`"rounded_rectangle"`, `"ease-out"`, …) so the model stays
//! legible and 1:1 with the source. Open-ended tags the web treats as free
//! strings — `font`, `background`, and the `animation` **effect id** (whose
//! registry of behaviours lives in the compositor, CHR-110) — stay `String`.

use serde::{Deserialize, Serialize};

/// Legacy coarse layout hint (`StudioLayout`). Real placement is driven by
/// [`PositionMode`] + [`PredefinedPosition`] / the custom box; this is kept for
/// parity with the web field.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Layout {
    LowerThird,
    FullScreen,
    Sidebar,
}

/// Text slant (`fontXxxStyle`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FontStyleKind {
    Normal,
    Italic,
}

/// Letter-case transform (`fontXxxTransform`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FontTransform {
    None,
    Uppercase,
}

/// Text decoration (`fontXxxDecoration`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FontDecoration {
    None,
    Underline,
}

/// Container silhouette (`containerShape`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContainerShape {
    Rectangle,
    RoundedRectangle,
    Capsule,
    Asymmetric,
    Transparent,
}

/// Container border rendering (`containerBorderStyle`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BorderStyle {
    Solid,
    Dashed,
    Glow,
    None,
}

/// Placement mode (`positionMode`): one of the presets below, or a free box.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PositionMode {
    Predefined,
    Custom,
}

/// A named placement (`predefinedPosition`). Numeric boxes for each live in the
/// compositor (mirror of `PREDEFINED_BOX` in `program-out.ts`); the model only
/// carries the choice.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PredefinedPosition {
    LowerThirdLeft,
    LowerThirdRight,
    CenteredBottom,
    CenteredTop,
    Ticker,
    BannerTop,
    FullScreenCinema,
    FullScreen,
    PipTopLeft,
    PipTopRight,
    PipBottomLeft,
    PipBottomRight,
}

/// Entrance/transition timing curve (`animEasing`). Note the kebab-case wire ids
/// (`"ease-in-out"`) — the exact web values.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AnimEasing {
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
    Bounce,
    BackOut,
}

/// Horizontal text alignment (`textAlign`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TextAlign {
    Left,
    Center,
    Right,
}

/// Vertical text alignment (`textVerticalAlign`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TextVAlign {
    Top,
    Center,
    Bottom,
}

/// Where the frame grows when content overflows its configured height
/// (`overflowDirection`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OverflowDir {
    Down,
    Up,
    Center,
}

/// One typography group (reference / body / version). The web spreads these as
/// nine flat `fontRef*` / `fontBody*` / `fontVer*` fields per group; grouping
/// them here keeps the model DRY without changing the information.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeStyle {
    pub family: String,
    pub weight: String,
    pub style: FontStyleKind,
    pub transform: FontTransform,
    pub decoration: FontDecoration,
    pub spacing: f64,
    pub size: f64,
    pub line_height: f64,
    pub color: String,
}

/// The complete per-layer style — the Rust `StudioSettings`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Style {
    pub layout: Layout,
    /// Entrance effect id (registry of behaviours lives in the compositor,
    /// CHR-110). Free string, exactly as the web treats it.
    pub animation: String,
    pub font: String,
    pub background: String,
    /// 0 = stays until manually hidden.
    pub duration: f64,

    // Typography — three groups.
    pub font_ref: TypeStyle,
    pub font_body: TypeStyle,
    pub font_ver: TypeStyle,

    // Container & geometry.
    pub container_shape: ContainerShape,
    pub container_bg: String,
    pub container_border_radius: f64,
    pub container_border_width: f64,
    pub container_border_style: BorderStyle,
    pub container_border_color: String,
    pub container_padding_x: f64,
    pub container_padding_y: f64,

    // Drop shadow.
    pub shadow_blur: f64,
    pub shadow_spread: f64,
    pub shadow_offset_x: f64,
    pub shadow_offset_y: f64,
    pub shadow_color: String,

    // Positioning.
    pub position_mode: PositionMode,
    pub predefined_position: PredefinedPosition,
    /// Custom box, in percent of the frame.
    pub custom_x: f64,
    pub custom_y: f64,
    pub custom_width: f64,
    pub custom_height: f64,

    // Animation timing.
    pub anim_duration: f64,
    pub anim_easing: AnimEasing,

    // Alignment (web-optional; always concrete here with the web defaults).
    pub text_align: TextAlign,
    pub text_vertical_align: TextVAlign,
    pub overflow_direction: OverflowDir,
}

impl Default for Style {
    /// Value-for-value mirror of `DEFAULT_STUDIO_SETTINGS`.
    fn default() -> Self {
        Style {
            layout: Layout::LowerThird,
            animation: "fade_slide".into(),
            font: "Cormorant Garamond".into(),
            background: "gradient_purple".into(),
            duration: 0.0,

            font_ref: TypeStyle {
                family: "Plus Jakarta Sans".into(),
                weight: "700".into(),
                style: FontStyleKind::Normal,
                transform: FontTransform::Uppercase,
                decoration: FontDecoration::None,
                spacing: 7.5,
                size: 39.0,
                line_height: 1.2,
                color: "#e2b85f".into(),
            },
            font_body: TypeStyle {
                family: "Cormorant Garamond".into(),
                weight: "500".into(),
                style: FontStyleKind::Normal,
                transform: FontTransform::None,
                decoration: FontDecoration::None,
                spacing: 0.0,
                size: 84.0,
                line_height: 1.3,
                color: "#ffffff".into(),
            },
            font_ver: TypeStyle {
                family: "Plus Jakarta Sans".into(),
                weight: "600".into(),
                style: FontStyleKind::Italic,
                transform: FontTransform::Uppercase,
                decoration: FontDecoration::None,
                spacing: 3.0,
                size: 33.0,
                line_height: 1.2,
                color: "#e2b85f".into(),
            },

            container_shape: ContainerShape::RoundedRectangle,
            container_bg: "rgba(22, 15, 51, 0.95)".into(),
            container_border_radius: 48.0,
            container_border_width: 3.0,
            container_border_style: BorderStyle::Solid,
            container_border_color: "rgba(255, 255, 255, 0.1)".into(),
            container_padding_x: 84.0,
            container_padding_y: 72.0,

            shadow_blur: 90.0,
            shadow_spread: 0.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 36.0,
            shadow_color: "rgba(0, 0, 0, 0.5)".into(),

            position_mode: PositionMode::Predefined,
            predefined_position: PredefinedPosition::CenteredBottom,
            custom_x: 10.0,
            custom_y: 70.0,
            custom_width: 80.0,
            custom_height: 20.0,

            anim_duration: 500.0,
            anim_easing: AnimEasing::EaseOut,

            text_align: TextAlign::Center,
            text_vertical_align: TextVAlign::Center,
            overflow_direction: OverflowDir::Down,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_style_mirrors_web_default_settings() {
        let s = Style::default();
        // A few load-bearing values from DEFAULT_STUDIO_SETTINGS.
        assert_eq!(s.animation, "fade_slide");
        assert_eq!(s.font, "Cormorant Garamond");
        assert_eq!(s.container_shape, ContainerShape::RoundedRectangle);
        assert_eq!(s.container_border_radius, 48.0);
        assert_eq!(s.position_mode, PositionMode::Predefined);
        assert_eq!(s.predefined_position, PredefinedPosition::CenteredBottom);
        assert_eq!(s.anim_easing, AnimEasing::EaseOut);
        assert_eq!(s.font_ref.color, "#e2b85f");
        assert_eq!(s.font_body.size, 84.0);
        assert_eq!(s.font_ver.style, FontStyleKind::Italic);
    }

    #[test]
    fn discrete_enums_serialise_with_the_exact_web_string_ids() {
        assert_eq!(
            serde_json::to_string(&ContainerShape::RoundedRectangle).unwrap(),
            "\"rounded_rectangle\""
        );
        assert_eq!(
            serde_json::to_string(&AnimEasing::EaseInOut).unwrap(),
            "\"ease-in-out\""
        );
        assert_eq!(
            serde_json::to_string(&PredefinedPosition::LowerThirdLeft).unwrap(),
            "\"lower_third_left\""
        );
        assert_eq!(
            serde_json::to_string(&BorderStyle::Glow).unwrap(),
            "\"glow\""
        );
    }

    #[test]
    fn style_round_trips_through_json_unchanged() {
        let s = Style::default();
        let json = serde_json::to_string(&s).unwrap();
        let back: Style = serde_json::from_str(&json).unwrap();
        assert_eq!(s, back);
    }
}

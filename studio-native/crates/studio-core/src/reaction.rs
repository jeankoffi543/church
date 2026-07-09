//! CHR-57 inter-source reactions, ported 1:1 from `blendReactionStyles` /
//! `pickReactionStyle` / `REACTION_KEYS` / `REACTION_LERP_NUM` in the web app
//! (`studio-layers.ts`). A reaction lets a target source adopt an alternate pose
//! (geometry / container form) while a trigger source is on air, then smoothly
//! return when it leaves.
//!
//! The blend operates on the FULL [`Style`] but only ever touches the reaction
//! subset (`REACTION_KEYS`): numeric geometry keys (`REACTION_LERP_NUM`) are
//! LERPed base↔reaction by factor `b`; discrete keys (shape, border style,
//! colours, position mode) switch abruptly at the mid-point. Deliberately
//! identical to the TypeScript rule so the native compositor renders the same
//! interpolation the React DOM/canvas did — the preview/broadcast drift the web
//! carried (two implementations) is gone by construction (one).
//!
//! (This replaces CHR-102's placeholder `Pose`/`Shape`, which invented a
//! geometry subset with an enum that didn't match the real `containerShape` —
//! part of the CHR-102 backfill.)

use serde::{Deserialize, Serialize};

use crate::style::{BorderStyle, ContainerShape, PositionMode, PredefinedPosition, Style};

/// The reaction "pose": a partial [`Style`] holding only the `REACTION_KEYS`
/// subset the operator captured. `Some` overrides the base; `None` falls through
/// — exactly the `{ ...base, ...reactStyle }` spread of the TS `to`. Persisted
/// as part of a layer (`react_style`), so it is (de)serialisable; `default` lets
/// an omitted key round-trip back to `None`.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct StylePatch {
    // Discrete keys — switch at the mid-point.
    pub position_mode: Option<PositionMode>,
    pub predefined_position: Option<PredefinedPosition>,
    pub container_shape: Option<ContainerShape>,
    pub container_border_style: Option<BorderStyle>,
    pub container_border_color: Option<String>,
    pub container_bg: Option<String>,
    pub shadow_color: Option<String>,
    // Numeric keys — LERPed (`REACTION_LERP_NUM`).
    pub custom_x: Option<f64>,
    pub custom_y: Option<f64>,
    pub custom_width: Option<f64>,
    pub custom_height: Option<f64>,
    pub container_border_radius: Option<f64>,
    pub container_border_width: Option<f64>,
    pub container_padding_x: Option<f64>,
    pub container_padding_y: Option<f64>,
    pub shadow_blur: Option<f64>,
    pub shadow_spread: Option<f64>,
    pub shadow_offset_x: Option<f64>,
    pub shadow_offset_y: Option<f64>,
}

impl StylePatch {
    /// `{ ...base, ...patch }` — the reaction target style (`to` in the TS).
    /// Only `REACTION_KEYS` can be overridden; every other field stays base's.
    pub fn apply(&self, base: &Style) -> Style {
        let mut to = base.clone();
        if let Some(v) = self.position_mode {
            to.position_mode = v;
        }
        if let Some(v) = self.predefined_position {
            to.predefined_position = v;
        }
        if let Some(v) = self.container_shape {
            to.container_shape = v;
        }
        if let Some(v) = self.container_border_style {
            to.container_border_style = v;
        }
        if let Some(v) = self.container_border_color.clone() {
            to.container_border_color = v;
        }
        if let Some(v) = self.container_bg.clone() {
            to.container_bg = v;
        }
        if let Some(v) = self.shadow_color.clone() {
            to.shadow_color = v;
        }
        if let Some(v) = self.custom_x {
            to.custom_x = v;
        }
        if let Some(v) = self.custom_y {
            to.custom_y = v;
        }
        if let Some(v) = self.custom_width {
            to.custom_width = v;
        }
        if let Some(v) = self.custom_height {
            to.custom_height = v;
        }
        if let Some(v) = self.container_border_radius {
            to.container_border_radius = v;
        }
        if let Some(v) = self.container_border_width {
            to.container_border_width = v;
        }
        if let Some(v) = self.container_padding_x {
            to.container_padding_x = v;
        }
        if let Some(v) = self.container_padding_y {
            to.container_padding_y = v;
        }
        if let Some(v) = self.shadow_blur {
            to.shadow_blur = v;
        }
        if let Some(v) = self.shadow_spread {
            to.shadow_spread = v;
        }
        if let Some(v) = self.shadow_offset_x {
            to.shadow_offset_x = v;
        }
        if let Some(v) = self.shadow_offset_y {
            to.shadow_offset_y = v;
        }
        to
    }
}

/// Capture the `REACTION_KEYS` subset of a style as a full patch (every field
/// `Some`) — the mirror of `pickReactionStyle`. This is what the operator's
/// "capture current pose as the reaction" action produces.
pub fn pick_reaction_style(s: &Style) -> StylePatch {
    StylePatch {
        position_mode: Some(s.position_mode),
        predefined_position: Some(s.predefined_position),
        container_shape: Some(s.container_shape),
        container_border_style: Some(s.container_border_style),
        container_border_color: Some(s.container_border_color.clone()),
        container_bg: Some(s.container_bg.clone()),
        shadow_color: Some(s.shadow_color.clone()),
        custom_x: Some(s.custom_x),
        custom_y: Some(s.custom_y),
        custom_width: Some(s.custom_width),
        custom_height: Some(s.custom_height),
        container_border_radius: Some(s.container_border_radius),
        container_border_width: Some(s.container_border_width),
        container_padding_x: Some(s.container_padding_x),
        container_padding_y: Some(s.container_padding_y),
        shadow_blur: Some(s.shadow_blur),
        shadow_spread: Some(s.shadow_spread),
        shadow_offset_x: Some(s.shadow_offset_x),
        shadow_offset_y: Some(s.shadow_offset_y),
    }
}

#[inline]
fn lerp(a: f64, c: f64, b: f64) -> f64 {
    a + (c - a) * b
}

/// Blend `base` toward its `reaction` pose at factor `b` (0 = base, 1 = reaction).
/// Numeric `REACTION_LERP_NUM` keys interpolate continuously; discrete keys
/// switch at 0.5. Faithful port of `blendReactionStyles`, including the
/// `b < 0.5 ? base : to` discrete rule and the `b <= 0` / `b >= 1` short-circuits.
pub fn blend(base: &Style, reaction: Option<&StylePatch>, b: f64) -> Style {
    let patch = match reaction {
        Some(p) if b > 0.0 => p,
        _ => return base.clone(), // no reaction, or b <= 0 → base unchanged
    };
    let to = patch.apply(base);
    if b >= 1.0 {
        return to;
    }
    // Discrete keys take the base below the mid-point, the target at/after it.
    // (Non-reaction fields are identical in `base` and `to`, so either is fine.)
    let mut out = if b < 0.5 { base.clone() } else { to.clone() };
    // Numeric keys interpolate continuously regardless.
    out.custom_x = lerp(base.custom_x, to.custom_x, b);
    out.custom_y = lerp(base.custom_y, to.custom_y, b);
    out.custom_width = lerp(base.custom_width, to.custom_width, b);
    out.custom_height = lerp(base.custom_height, to.custom_height, b);
    out.container_border_radius = lerp(base.container_border_radius, to.container_border_radius, b);
    out.container_border_width = lerp(base.container_border_width, to.container_border_width, b);
    out.container_padding_x = lerp(base.container_padding_x, to.container_padding_x, b);
    out.container_padding_y = lerp(base.container_padding_y, to.container_padding_y, b);
    out.shadow_blur = lerp(base.shadow_blur, to.shadow_blur, b);
    out.shadow_spread = lerp(base.shadow_spread, to.shadow_spread, b);
    out.shadow_offset_x = lerp(base.shadow_offset_x, to.shadow_offset_x, b);
    out.shadow_offset_y = lerp(base.shadow_offset_y, to.shadow_offset_y, b);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A camera-like base: custom box in the corner, transparent frame.
    fn base() -> Style {
        Style {
            position_mode: PositionMode::Custom,
            container_shape: ContainerShape::Transparent,
            custom_x: 8.0,
            custom_y: 8.0,
            custom_width: 84.0,
            custom_height: 78.0,
            container_border_radius: 12.0,
            container_border_width: 0.0,
            container_padding_x: 0.0,
            container_padding_y: 0.0,
            shadow_blur: 0.0,
            shadow_spread: 0.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 0.0,
            ..Style::default()
        }
    }

    /// Pastor's camera slides aside + shrinks + rounds when a verse airs.
    fn reaction_patch() -> StylePatch {
        StylePatch {
            custom_x: Some(60.0),
            custom_width: Some(36.0),
            custom_height: Some(30.0),
            container_shape: Some(ContainerShape::RoundedRectangle),
            ..Default::default()
        }
    }

    #[test]
    fn b_zero_returns_base() {
        assert_eq!(blend(&base(), Some(&reaction_patch()), 0.0), base());
    }

    #[test]
    fn no_reaction_returns_base_regardless_of_b() {
        assert_eq!(blend(&base(), None, 0.5), base());
        assert_eq!(blend(&base(), None, 1.0), base());
    }

    #[test]
    fn b_one_returns_full_reaction() {
        let out = blend(&base(), Some(&reaction_patch()), 1.0);
        assert_eq!(out.custom_x, 60.0);
        assert_eq!(out.custom_width, 36.0);
        assert_eq!(out.custom_height, 30.0);
        assert_eq!(out.container_shape, ContainerShape::RoundedRectangle);
        // Untouched fields fall through from base.
        assert_eq!(out.custom_y, 8.0);
        assert_eq!(out.position_mode, PositionMode::Custom);
    }

    #[test]
    fn midpoint_lerps_numeric_and_takes_target_discrete() {
        let out = blend(&base(), Some(&reaction_patch()), 0.5);
        assert!((out.custom_x - 34.0).abs() < 1e-9); // (8+60)/2
        assert!((out.custom_width - 60.0).abs() < 1e-9); // (84+36)/2
                                                         // At exactly 0.5 the discrete key has SWITCHED (b < 0.5 is false).
        assert_eq!(out.container_shape, ContainerShape::RoundedRectangle);
    }

    #[test]
    fn just_below_midpoint_keeps_base_discrete() {
        let out = blend(&base(), Some(&reaction_patch()), 0.49);
        assert_eq!(out.container_shape, ContainerShape::Transparent); // still base
        assert!(out.custom_x > 8.0 && out.custom_x < 60.0); // numeric already moving
    }

    #[test]
    fn negative_b_is_treated_as_base() {
        assert_eq!(blend(&base(), Some(&reaction_patch()), -0.3), base());
    }

    #[test]
    fn pick_then_apply_at_b_one_reproduces_the_captured_pose() {
        // Capturing a pose and replaying it fully must reproduce it exactly.
        let target = Style {
            custom_x: 42.0,
            container_shape: ContainerShape::Capsule,
            ..base()
        };
        let patch = pick_reaction_style(&target);
        let out = blend(&base(), Some(&patch), 1.0);
        assert_eq!(out.custom_x, 42.0);
        assert_eq!(out.container_shape, ContainerShape::Capsule);
    }
}

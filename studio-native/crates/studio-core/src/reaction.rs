//! CHR-57 inter-source reactions, ported 1:1 from `blendReactionStyles` in the
//! web app (`studio-layers.ts`). A reaction lets a target source adopt an
//! alternate pose (geometry / shape) while a trigger source is on air. The blend
//! rule is deliberately identical to the TypeScript one so the native compositor
//! and the (future) preview render the same interpolation the React app did:
//!
//!   * numeric geometry keys are LERPed base↔reaction by factor `b`,
//!   * discrete keys (shape, position mode) SWITCH at the half-way point.
//!
//! In the web app this same rule ran twice (DOM passed 0/1, canvas passed the
//! eased progress). Here there is a single implementation — the drift risk we
//! carried in TS is gone by construction.

/// Discrete container shape. Switches abruptly at the blend mid-point, never
/// interpolated (you cannot lerp an enum without a visible morph artefact).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Shape {
    Transparent,
    Rounded,
    Pill,
    Circle,
}

/// Discrete positioning mode. Also switches at the mid-point.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PositionMode {
    Predefined,
    Custom,
}

/// The subset of a layer's style a reaction captures/overrides — the Rust mirror
/// of `REACTION_KEYS`. Geometry + form only (no typography/colour-of-text), same
/// as the web app.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Pose {
    // Numeric geometry — LERPed (mirror of REACTION_LERP_NUM).
    pub custom_x: f64,
    pub custom_y: f64,
    pub custom_width: f64,
    pub custom_height: f64,
    pub container_border_radius: f64,
    pub container_border_width: f64,
    pub container_padding_x: f64,
    pub container_padding_y: f64,
    pub shadow_blur: f64,
    pub shadow_spread: f64,
    pub shadow_offset_x: f64,
    pub shadow_offset_y: f64,
    // Discrete — switch at 0.5.
    pub shape: Shape,
    pub position_mode: PositionMode,
}

/// A partial pose (the "reaction style" overlay). Only the fields the operator
/// captured are `Some`; the rest fall through to the base pose — exactly the
/// `{ ...base, ...reactStyle }` spread semantics of the TS `to`.
#[derive(Clone, Copy, Debug, Default)]
pub struct PosePatch {
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
    pub shape: Option<Shape>,
    pub position_mode: Option<PositionMode>,
}

impl Pose {
    /// `{ ...base, ...patch }` — the reaction target pose (`to` in the TS).
    pub fn with_patch(&self, p: &PosePatch) -> Pose {
        Pose {
            custom_x: p.custom_x.unwrap_or(self.custom_x),
            custom_y: p.custom_y.unwrap_or(self.custom_y),
            custom_width: p.custom_width.unwrap_or(self.custom_width),
            custom_height: p.custom_height.unwrap_or(self.custom_height),
            container_border_radius: p
                .container_border_radius
                .unwrap_or(self.container_border_radius),
            container_border_width: p
                .container_border_width
                .unwrap_or(self.container_border_width),
            container_padding_x: p.container_padding_x.unwrap_or(self.container_padding_x),
            container_padding_y: p.container_padding_y.unwrap_or(self.container_padding_y),
            shadow_blur: p.shadow_blur.unwrap_or(self.shadow_blur),
            shadow_spread: p.shadow_spread.unwrap_or(self.shadow_spread),
            shadow_offset_x: p.shadow_offset_x.unwrap_or(self.shadow_offset_x),
            shadow_offset_y: p.shadow_offset_y.unwrap_or(self.shadow_offset_y),
            shape: p.shape.unwrap_or(self.shape),
            position_mode: p.position_mode.unwrap_or(self.position_mode),
        }
    }
}

#[inline]
fn lerp(a: f64, c: f64, b: f64) -> f64 {
    a + (c - a) * b
}

/// Blend `base` toward its `reaction` pose at factor `b` (0 = base, 1 = reaction).
/// Numeric keys are interpolated; discrete keys switch at 0.5. Faithful port of
/// `blendReactionStyles` — including the `b < 0.5 ? base : to` discrete rule and
/// the `b <= 0` / `b >= 1` short-circuits.
pub fn blend(base: &Pose, reaction: Option<&PosePatch>, b: f64) -> Pose {
    let patch = match reaction {
        Some(p) if b > 0.0 => p,
        _ => return *base, // no reaction, or b <= 0 → base unchanged
    };
    let to = base.with_patch(patch);
    if b >= 1.0 {
        return to;
    }
    // Discrete keys take the base below the mid-point, the target at/after it.
    let mut out = if b < 0.5 { *base } else { to };
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

    fn base() -> Pose {
        Pose {
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
            shape: Shape::Transparent,
            position_mode: PositionMode::Custom,
        }
    }

    fn reaction_patch() -> PosePatch {
        // Pastor's camera slides aside + shrinks when a verse airs.
        PosePatch {
            custom_x: Some(60.0),
            custom_width: Some(36.0),
            custom_height: Some(30.0),
            shape: Some(Shape::Rounded),
            ..Default::default()
        }
    }

    #[test]
    fn b_zero_returns_base() {
        let out = blend(&base(), Some(&reaction_patch()), 0.0);
        assert_eq!(out, base());
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
        assert_eq!(out.shape, Shape::Rounded);
        // Untouched fields fall through from base.
        assert_eq!(out.custom_y, 8.0);
        assert_eq!(out.position_mode, PositionMode::Custom);
    }

    #[test]
    fn midpoint_lerps_numeric_and_takes_target_discrete() {
        let out = blend(&base(), Some(&reaction_patch()), 0.5);
        // Numeric = exact average of base and target.
        assert!((out.custom_x - 34.0).abs() < 1e-9); // (8+60)/2
        assert!((out.custom_width - 60.0).abs() < 1e-9); // (84+36)/2
                                                         // At exactly 0.5 the discrete key has SWITCHED to the target (b < 0.5 false).
        assert_eq!(out.shape, Shape::Rounded);
    }

    #[test]
    fn just_below_midpoint_keeps_base_discrete() {
        let out = blend(&base(), Some(&reaction_patch()), 0.49);
        // Discrete still base…
        assert_eq!(out.shape, Shape::Transparent);
        // …but numeric already interpolating.
        assert!(out.custom_x > 8.0 && out.custom_x < 60.0);
    }

    #[test]
    fn negative_b_is_treated_as_base() {
        assert_eq!(blend(&base(), Some(&reaction_patch()), -0.3), base());
    }
}

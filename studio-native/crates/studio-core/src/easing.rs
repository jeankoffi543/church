//! Cubic-bézier easing, ported 1:1 from the web studio's `EASING_BEZIER` presets
//! (`lib/studio-animations.tsx`). The evaluator is the canonical WebKit
//! `UnitBezier` algorithm — the exact same math CSS timing functions and
//! framer-motion use — so an entrance/reaction eased here is pixel-identical to
//! what the current React app produces. This is the bedrock of preview↔canvas↔
//! live coherence, now shared by a single Rust implementation instead of the
//! DOM/canvas split we had in TypeScript.

/// Control handles `[x1, y1, x2, y2]` of a cubic bézier with fixed ends P0=(0,0),
/// P3=(1,1) — same shape as the TS `Cubic` tuple.
pub type Cubic = [f64; 4];

/// The named presets from the web app, kept byte-for-byte identical.
pub fn preset(name: &str) -> Cubic {
    match name {
        "ease-in" => [0.42, 0.0, 1.0, 1.0],
        "ease-out" => [0.0, 0.0, 0.58, 1.0],
        "ease-in-out" => [0.42, 0.0, 0.58, 1.0],
        "bounce" => [0.175, 0.885, 0.32, 1.275],
        "back-out" => [0.34, 1.56, 0.64, 1.0],
        // "linear" and any unknown name fall back to the identity ramp.
        _ => [0.0, 0.0, 1.0, 1.0],
    }
}

/// Evaluate the easing `name` at input progress `x` ∈ [0,1], returning the eased
/// output y. Values outside [0,1] are clamped (matches the DOM/canvas behaviour
/// where an entrance never over/undershoots its clamped progress).
pub fn ease(name: &str, x: f64) -> f64 {
    UnitBezier::new(preset(name)).solve(x)
}

/// A reusable solver — construct once per easing, evaluate many times per frame
/// (the reaction blend and every animated source call this on the hot path).
#[derive(Clone, Copy, Debug)]
pub struct UnitBezier {
    ax: f64,
    bx: f64,
    cx: f64,
    ay: f64,
    by: f64,
    cy: f64,
}

impl UnitBezier {
    pub fn new(c: Cubic) -> Self {
        let (x1, y1, x2, y2) = (c[0], c[1], c[2], c[3]);
        // Polynomial coefficients (WebKit UnitBezier): P(t) = ((a*t + b)*t + c)*t.
        let cx = 3.0 * x1;
        let bx = 3.0 * (x2 - x1) - cx;
        let ax = 1.0 - cx - bx;
        let cy = 3.0 * y1;
        let by = 3.0 * (y2 - y1) - cy;
        let ay = 1.0 - cy - by;
        Self {
            ax,
            bx,
            cx,
            ay,
            by,
            cy,
        }
    }

    fn sample_x(&self, t: f64) -> f64 {
        ((self.ax * t + self.bx) * t + self.cx) * t
    }
    fn sample_y(&self, t: f64) -> f64 {
        ((self.ay * t + self.by) * t + self.cy) * t
    }
    fn sample_dx(&self, t: f64) -> f64 {
        (3.0 * self.ax * t + 2.0 * self.bx) * t + self.cx
    }

    /// Invert x = X(t) for t, then return Y(t). Newton-Raphson with a bisection
    /// fallback — the standard robust WebKit approach.
    pub fn solve(&self, x: f64) -> f64 {
        let x = x.clamp(0.0, 1.0);
        let epsilon = 1e-6;

        // Newton-Raphson (few iterations converge for well-formed curves).
        let mut t = x;
        for _ in 0..8 {
            let x_est = self.sample_x(t) - x;
            if x_est.abs() < epsilon {
                return self.sample_y(t);
            }
            let d = self.sample_dx(t);
            if d.abs() < 1e-6 {
                break;
            }
            t -= x_est / d;
        }

        // Bisection fallback (bounded, always converges within [0,1]).
        let (mut lo, mut hi, mut t) = (0.0_f64, 1.0_f64, x);
        if t < lo {
            return self.sample_y(lo);
        }
        if t > hi {
            return self.sample_y(hi);
        }
        while lo < hi {
            let x_est = self.sample_x(t);
            if (x_est - x).abs() < epsilon {
                return self.sample_y(t);
            }
            if x > x_est {
                lo = t;
            } else {
                hi = t;
            }
            t = (hi - lo) * 0.5 + lo;
        }
        self.sample_y(t)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() < eps
    }

    #[test]
    fn endpoints_are_fixed_for_every_preset() {
        for name in [
            "linear",
            "ease-in",
            "ease-out",
            "ease-in-out",
            "bounce",
            "back-out",
        ] {
            assert!(approx(ease(name, 0.0), 0.0, 1e-6), "{name} @0");
            assert!(approx(ease(name, 1.0), 1.0, 1e-6), "{name} @1");
        }
    }

    #[test]
    fn linear_is_identity() {
        for i in 0..=10 {
            let x = i as f64 / 10.0;
            assert!(approx(ease("linear", x), x, 1e-6), "linear @{x}");
        }
    }

    #[test]
    fn input_is_clamped() {
        assert!(approx(ease("ease-out", -1.0), 0.0, 1e-6));
        assert!(approx(ease("ease-out", 2.0), 1.0, 1e-6));
    }

    #[test]
    fn ease_out_front_loads_progress() {
        // ease-out = cubic-bezier(0,0,0.58,1): at the midpoint of TIME it is well
        // past the midpoint of VALUE (fast start, slow finish).
        let y = ease("ease-out", 0.5);
        assert!(y > 0.5, "ease-out @0.5 should be >0.5, got {y}");
    }

    #[test]
    fn ease_in_back_loads_progress() {
        // ease-in = cubic-bezier(0.42,0,1,1): slow start → below the diagonal.
        let y = ease("ease-in", 0.5);
        assert!(y < 0.5, "ease-in @0.5 should be <0.5, got {y}");
    }

    #[test]
    fn back_out_overshoots_above_one_mid_curve() {
        // back-out has y2>1 control → the eased value exceeds 1 before settling.
        let mut overshot = false;
        for i in 1..100 {
            if ease("back-out", i as f64 / 100.0) > 1.0 {
                overshot = true;
                break;
            }
        }
        assert!(overshot, "back-out should overshoot above 1.0");
    }

    #[test]
    fn monotonic_x_inversion_is_stable() {
        // Solver must be monotonic in x for standard (non-overshooting) easings.
        let mut prev = -1.0;
        for i in 0..=100 {
            let y = ease("ease-in-out", i as f64 / 100.0);
            assert!(y + 1e-9 >= prev, "ease-in-out not monotonic at {i}");
            prev = y;
        }
    }
}

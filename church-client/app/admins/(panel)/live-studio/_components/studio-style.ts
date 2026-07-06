import type React from "react";

import type { StudioSettings } from "@/lib/studio";

/**
 * Maps `StudioSettings` to the inline CSS used to render the on-screen verse
 * overlay. These are intentionally inline styles: the values are data-driven
 * (operator-chosen fonts, colours, geometry) and cannot be static utilities.
 *
 * Extracted verbatim from the original console so the broadcast output is
 * byte-for-byte identical; shared by the Preview/Program monitors and the
 * fullscreen overlay simulator.
 */

export const getElementStyle = (
  prefix: "fontRef" | "fontBody" | "fontVer",
  s: StudioSettings,
): React.CSSProperties => {
  const colorVal = s[`${prefix}Color` as keyof StudioSettings] as string;
  const isGradient = colorVal?.includes("gradient");

  const baseStyle: React.CSSProperties = {
    fontFamily: s[`${prefix}Family` as keyof StudioSettings] as string,
    fontSize: `${s[`${prefix}Size` as keyof StudioSettings]}px`,
    fontWeight: s[`${prefix}Weight` as keyof StudioSettings] as string,
    fontStyle: s[`${prefix}Style` as keyof StudioSettings] as string,
    textTransform: s[
      `${prefix}Transform` as keyof StudioSettings
    ] as React.CSSProperties["textTransform"],
    textDecoration: s[`${prefix}Decoration` as keyof StudioSettings] as string,
    letterSpacing: `${s[`${prefix}Spacing` as keyof StudioSettings]}px`,
    lineHeight: s[`${prefix}LineHeight` as keyof StudioSettings] as number,
  };

  if (isGradient) {
    return {
      ...baseStyle,
      backgroundImage: colorVal,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      display: "inline-block",
    };
  }

  return { ...baseStyle, color: colorVal };
};

export const getContainerStyle = (s: StudioSettings): React.CSSProperties => {
  if (s.containerShape === "transparent") {
    return {
      backgroundColor: "transparent",
      backgroundImage: "none",
      borderStyle: "none",
      borderWidth: "0px",
      boxShadow: "none",
      padding: `${s.containerPaddingY}px ${s.containerPaddingX}px`,
    };
  }

  let borderRadius = `${s.containerBorderRadius}px`;
  if (s.containerShape === "rectangle") borderRadius = "0px";
  if (s.containerShape === "capsule") borderRadius = "9999px";
  if (s.containerShape === "asymmetric") {
    borderRadius = `${s.containerBorderRadius}px 6px ${s.containerBorderRadius}px 6px`;
  }

  const isGradient = s.containerBg?.includes("gradient");

  const baseStyle: React.CSSProperties = {
    backgroundColor: isGradient ? "transparent" : s.containerBg,
    backgroundImage: isGradient ? s.containerBg : "none",
    borderRadius,
    padding: `${s.containerPaddingY}px ${s.containerPaddingX}px`,
  };

  const borderW = s.containerBorderWidth;
  const borderCol = s.containerBorderColor || "rgba(255, 255, 255, 0.15)";

  if (s.containerBorderStyle === "none") {
    baseStyle.borderStyle = "none";
    baseStyle.borderWidth = "0px";
  } else if (s.containerBorderStyle === "glow") {
    baseStyle.borderStyle = "solid";
    baseStyle.borderWidth = `${borderW}px`;
    baseStyle.borderColor = borderCol;
    baseStyle.boxShadow = `0 0 20px ${borderCol}, inset 0 0 10px ${borderCol}`;
  } else {
    baseStyle.borderStyle = s.containerBorderStyle;
    baseStyle.borderWidth = `${borderW}px`;
    baseStyle.borderColor = borderCol;
  }

  const shadowStr = `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowSpread}px ${s.shadowColor}`;
  baseStyle.boxShadow = baseStyle.boxShadow ? `${baseStyle.boxShadow}, ${shadowStr}` : shadowStr;

  return baseStyle;
};

export const getPredefinedAbsolutePosition = (pos: string): React.CSSProperties => {
  switch (pos) {
    case "lower_third_left":
      return { left: "6%", top: "72%", width: "40%", height: "20%" };
    case "lower_third_right":
      return { right: "6%", top: "72%", width: "40%", height: "20%" };
    case "centered_top":
      return { left: "10%", top: "8%", width: "80%", height: "20%" };
    case "ticker":
      return { left: "0%", top: "86%", width: "100%", height: "14%" };
    case "banner_top":
      return { left: "0%", top: "0%", width: "100%", height: "14%" };
    case "full_screen_cinema":
      return { left: "10%", top: "10%", width: "80%", height: "80%" };
    case "full_screen":
      return { left: "0%", top: "0%", width: "100%", height: "100%" };
    case "pip_top_left":
      return { left: "4%", top: "5%", width: "34%", height: "34%" };
    case "pip_top_right":
      return { right: "4%", top: "5%", width: "34%", height: "34%" };
    case "pip_bottom_left":
      return { left: "4%", top: "61%", width: "34%", height: "34%" };
    case "pip_bottom_right":
      return { right: "4%", top: "61%", width: "34%", height: "34%" };
    case "centered_bottom":
    default:
      return { left: "10%", top: "72%", width: "80%", height: "20%" };
  }
};

/**
 * Parse an OBS-like "1920x1080" resolution string; falls back to the given
 * defaults on anything malformed, and sanity-caps at 3840×2160 (fitted, ratio
 * kept) so a corrupt persisted value can never lay out an absurd stage. 4K/60
 * are legitimate choices for a powerful régie machine — the settings UI warns
 * about their cost.
 */
export const parseResolution = (
  value: string | undefined,
  defaultWidth: number,
  defaultHeight: number,
): { width: number; height: number } => {
  const m = /^(\d{3,5})\s*[x×]\s*(\d{3,5})$/.exec((value ?? "").trim());
  let width = defaultWidth;
  let height = defaultHeight;
  if (m) {
    width = parseInt(m[1], 10);
    height = parseInt(m[2], 10);
  }
  const fit = Math.min(1, 3840 / width, 2160 / height);
  return { width: Math.round(width * fit), height: Math.round(height * fit) };
};

/** Absolute position CSS for the overlay box (custom geometry or a preset). */
export const getOverlayBoxStyle = (s: StudioSettings): React.CSSProperties =>
  s.positionMode === "custom"
    ? {
        left: `${s.customX}%`,
        top: `${s.customY}%`,
        width: `${s.customWidth}%`,
        height: `${s.customHeight}%`,
      }
    : getPredefinedAbsolutePosition(s.predefinedPosition || "centered_bottom");

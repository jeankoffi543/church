"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * `next/image` (fill) with graceful fallback + an animated skeleton while the
 * source loads. Use for remote/persisted images; not for `blob:` previews.
 */
export function SmartImage({
  src,
  alt,
  fallback,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  skeletonClassName = "bg-foreground/5",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallback: string;
  className?: string;
  sizes?: string;
  skeletonClassName?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const resolved = !src || errored ? fallback : src;

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {!loaded && <span className={cn("absolute inset-0 animate-pulse", skeletonClassName)} aria-hidden />}
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
      />
    </span>
  );
}

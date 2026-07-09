import { ReactNode } from "react";

/**
 * Interim panel chrome (bg-studio-panel + header) wrapping a dock's content,
 * matching the console's panel look. The exact per-dock ports (scenes, sources,
 * mixer, inspector, controls) bring their own headers and replace this.
 */
export function DockShell({
  label,
  right,
  children,
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center justify-between border-b border-white/6 px-3.5 py-2.5">
        <span className="text-[10px] font-extrabold tracking-[1.6px] text-white/45 uppercase">
          {label}
        </span>
        {right}
      </div>
      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

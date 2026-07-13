import type { ReactNode } from "react";
import { CentralChrome } from "./central-chrome";

/**
 * CHR-146 — chrome for the SaaS marketing site (the church chrome is suppressed
 * by the root layout via `x-app-zone: central`). The marketing header/footer is
 * itself suppressed on the platform console + central login (CHR-182).
 */
export default function CentralLayout({ children }: { children: ReactNode }) {
  return <CentralChrome>{children}</CentralChrome>;
}

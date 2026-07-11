// CHR-143 — Studio Live activation. Thin wrappers over the Rust commands that
// exchange a `chr_live_*` key for a short session + the tenant's stream creds,
// and re-check it on a heartbeat. The key itself never leaves the Rust side
// after entry.
import { invoke } from "@tauri-apps/api/core";

export type StreamCreds = { whip_url: string | null; stream_key: string | null };
export type TenantInfo = { id: string; domain: string | null };
export type StudioSession = {
  session_token: string | null;
  expires_at: string | null;
  tenant: TenantInfo;
  stream: StreamCreds;
};

/** The current session if the app is already activated, else `null`. */
export const activationStatus = () => invoke<StudioSession | null>("activation_status");

/** Exchange a key (against the central platform at `baseUrl`) for a session. */
export const activate = (baseUrl: string, key: string) =>
  invoke<StudioSession>("activate", { baseUrl, key });

/** Re-check the activation and refresh the session token. Rejects if revoked/lapsed. */
export const heartbeat = () => invoke<StudioSession>("heartbeat");

/** Forget the activation (the device id is kept so re-activation reuses the seat). */
export const deactivate = () => invoke<void>("deactivate");

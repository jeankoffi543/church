// CHR-202 — the session-verification verdict used by lib/auth/session.
//   node --experimental-strip-types --test tests/unit/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyVerification } from "../../lib/auth/verify-status.ts";

test("200 is a valid session", () => {
  assert.equal(classifyVerification(200), "valid");
});

test("401/403 revoke the session (token gone or forbidden)", () => {
  assert.equal(classifyVerification(401), "revoked");
  assert.equal(classifyVerification(403), "revoked");
});

test("everything else is degraded — keep the token, don't sign out on a blip", () => {
  for (const status of [0, 429, 500, 502, 503, 504]) {
    assert.equal(classifyVerification(status), "degraded");
  }
});

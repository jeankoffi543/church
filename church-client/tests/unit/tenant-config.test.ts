// CHR-195 — pure routing classifier for the proxy. Runs under Node's built-in
// test runner with native TS type-stripping (no bundler):
//   node --experimental-strip-types --test tests/unit/*.test.ts
// Env is unset here, so CENTRAL_DOMAINS falls back to "localhost,127.0.0.1".

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isCentralHost,
  servesCentralAtRoot,
  decideCentralRequest,
} from "../../lib/tenant/config.ts";

test("isCentralHost: owner/dev hosts are central, church hosts are not", () => {
  assert.equal(isCentralHost("localhost"), true);
  assert.equal(isCentralHost("127.0.0.1"), true);
  assert.equal(isCentralHost(""), true); // missing Host header → treat as central
  assert.equal(isCentralHost("demo.churchapp.io"), false);
  assert.equal(isCentralHost("myparish.org"), false);
});

test("servesCentralAtRoot: church paths yes, internals/back-office no", () => {
  assert.equal(servesCentralAtRoot("/"), true);
  assert.equal(servesCentralAtRoot("/live"), true);
  assert.equal(servesCentralAtRoot("/mediatheque"), true);
  assert.equal(servesCentralAtRoot("/central"), false);
  assert.equal(servesCentralAtRoot("/central/admin"), false);
  assert.equal(servesCentralAtRoot("/_next/static/x.js"), false);
  assert.equal(servesCentralAtRoot("/api/anything"), false);
  assert.equal(servesCentralAtRoot("/admins/login"), false);
});

test("decideCentralRequest: `/` and church paths rewrite into the /central tree", () => {
  assert.deepEqual(decideCentralRequest("/"), { serve: "central-root", target: "/central" });
  assert.deepEqual(decideCentralRequest("/live"), {
    serve: "central-root",
    target: "/central/live",
  });
});

test("decideCentralRequest: /central passes through as central (no double prefix)", () => {
  assert.deepEqual(decideCentralRequest("/central"), { serve: "central-tree" });
  assert.deepEqual(decideCentralRequest("/central/admin/plans"), { serve: "central-tree" });
});

test("decideCentralRequest: internals and the church back-office stay app-served", () => {
  assert.deepEqual(decideCentralRequest("/admins/login"), { serve: "app" });
  assert.deepEqual(decideCentralRequest("/api/platform/resolve"), { serve: "app" });
  assert.deepEqual(decideCentralRequest("/_next/static/chunk.js"), { serve: "app" });
});

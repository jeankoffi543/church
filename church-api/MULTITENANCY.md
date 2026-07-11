# Multi-tenant runbook

Operations guide for the Church SaaS multi-tenant platform (CHR-133 → CHR-151).

## Architecture at a glance

- **Isolation model:** one physical database **per tenant** (church), plus one central
  ("landlord") database. Business data carries **no `tenant_id`** — isolation is at
  the connection level (`stancl/tenancy`, multi-DB mode).
- **Central DB** (connection `central`): `tenants`, `domains`, `plans`,
  `subscriptions`, `studio_activations`, `tenant_audit`, `central_users`,
  `push_subscriptions`, and the central app's own `cache`/`jobs`/`sessions`.
- **Tenant DB** (one per church): the whole church schema (`users`, `settings`,
  spatie roles/permissions, all business tables) + `personal_access_tokens`.
- **Resolution:** by request **`Host`**. `InitializeTenancyByDomain` switches the
  connection, storage and cache to the tenant. The Next.js `proxy.ts` resolves the
  same host for the marketing/church split and theming. **The backend never trusts a
  header for tenancy — only the Host.**

## Migrations

| Scope   | Path                          | Command                                                                     |
|---------|-------------------------------|-----------------------------------------------------------------------------|
| Central | `database/migrations/central` | `php artisan migrate --database=central --path=database/migrations/central` |
| Tenant  | `database/migrations/tenant`  | `php artisan tenants:migrate` (all tenants) / `--tenants=<id>`              |

`php artisan migrate` (root) is a **no-op** — the root migration dir is empty by design.

## Provisioning a church (tenant)

Three paths, all running the pipeline `CreateDatabase → MigrateDatabase → SeedDatabase`
(baseline seed = access-control roles, currencies, bible):

1. **Self-service signup:** `POST /api/platform/signup` (public, throttled). Creates the
   tenant, its subdomain `{slug}.{CENTRAL_ROOT_DOMAIN}`, and the first Super Admin.
2. **Platform back-office:** `POST /api/platform/tenants` (central super-admin).
3. **Adopt an existing DB** (e.g. the legacy single-church DB):
   `php artisan tenants:adopt {database} {domain} [--migrate]` — registers it **without**
   creating/wiping it (uses `create_database=false`).

## Custom domains

The church adds its own domain from its back-office (`/api/v1/admin/domains`, feature
`custom_domain`): it publishes a `TXT _churchapp-verify.<domain>` record, then `verify`
marks it `verified` + `ssl_status=issued`. On-demand TLS (Caddy ACME) issues the cert at
the edge on first request.

## Studio Live activation

Platform super-admin mints a per-seat `chr_live_*` key (`POST /api/platform/tenants/{id}/studio/keys`,
respecting `studio_seats`). The desktop app exchanges it for a short (15-min) scoped
session + the tenant's WHIP/RTMP creds via `POST /api/platform/studio/activate`. Revoke
with `POST /api/platform/studio/keys/{id}/revoke`.

## Billing lifecycle

Paystack subscription webhooks (`POST /api/platform/webhooks/paystack`, HMAC-verified)
drive `subscription_status`: `charge.success`→active, `invoice.payment_failed`→past_due
(grace, still served), `subscription.disable`→suspended. A **suspended** or **canceled**
subscription makes `EnsureTenantIsActive` return **403** on the whole church API.

## Backups & lifecycle ops

```
php artisan tenants:backup [--tenant=<id>]     # copies each tenant DB (sqlite); prints mysqldump guidance otherwise
php artisan tenants:purge  <id> [--force]      # audits, then deletes the tenant + drops its DB (irreversible)
```
Suspend/restore a tenant from the back-office: `POST /api/platform/tenants/{id}/{suspend,restore}`.

## Isolation guarantees (verified by tests)

- **Database:** data in tenant A's DB is unreachable from tenant B (physical DBs) —
  `tests/Tenancy/CrossTenantIsolationTest.php`.
- **Tokens:** a Sanctum token minted in tenant A resolves to nothing in tenant B (the
  token row lives only in A's `personal_access_tokens`) — same test.
- **Storage:** the same logical path holds each tenant's own bytes
  (`FilesystemTenancyBootstrapper`; S3 prefixed `tenants/{id}/`) —
  `tests/Tenancy/TenantStorageTest.php`.
- **Central vs tenant auth:** a tenant user's token is rejected on the `central` guard
  (Sanctum provider check) — `tests/Feature/PlatformAuthTest.php`.
- **Host, not header:** tenancy is resolved from the request Host; a forged `x-tenant-*`
  header cannot switch the backend tenant.

## Incident response

- **Suspected cross-tenant leak:** confirm the tenant's `Host` resolves to the correct
  `domains` row; check `tenant_audit` for impersonation.
- **Payment lapse locks a church out unfairly:** restore via
  `POST /api/platform/tenants/{id}/restore` (sets status Active); reconcile Paystack.
- **Corrupt tenant DB:** restore the latest `storage/app/backups/tenants/{id}/*.sqlite`
  (or the mysqldump) over the tenant database.

## Deferred / follow-ups

Async provisioning (queued), automated `mysqldump` + scheduled backups, per-tenant local
`/storage/{path}` serving in dev (prod = S3 absolute URLs), a background re-check job for
pending custom domains, and paid-plan signup chaining into the Paystack subscribe.

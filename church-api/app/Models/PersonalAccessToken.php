<?php

declare(strict_types=1);

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Connection-aware Sanctum token (CHR-165). Tokens must be looked up in the same
 * database their owner lives in:
 *
 *  - TENANT context — stancl has already switched the default connection to the
 *    tenant's own DB, so the default is correct (tenant users' tokens).
 *  - CENTRAL context (no tenancy) — platform staff and global identities live in
 *    the landlord DB, so their tokens do too.
 *
 * Without this, central-realm tokens were written to `central` but Sanctum's
 * `findToken` searched the default connection → authentication always failed
 * once central and default are different databases (production).
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    public function getConnectionName(): ?string
    {
        if (tenancy()->initialized) {
            return parent::getConnectionName();
        }

        return config('tenancy.database.central_connection');
    }
}

<?php

namespace App\Enums;

/**
 * Certificate state for a custom domain, driven by the on-demand TLS flow
 * (CHR-148). Subdomains are covered by the platform wildcard and stay null.
 */
enum SslStatus: string
{
    case Pending = 'pending';
    case Issued = 'issued';
    case Failed = 'failed';
}

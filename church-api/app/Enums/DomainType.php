<?php

namespace App\Enums;

/**
 * How a hostname maps to the tenant: a reserved subdomain on the platform
 * ({slug}.churchapp.io) or a church-owned custom domain (www.eglise-xyz.org).
 */
enum DomainType: string
{
    case Subdomain = 'subdomain';
    case Custom = 'custom';
}

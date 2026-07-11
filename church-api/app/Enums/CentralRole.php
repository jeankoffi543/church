<?php

namespace App\Enums;

use App\Support\AccessControl;

/**
 * Role of a platform staff member (central DB). Distinct from the tenant RBAC
 * catalogue in {@see AccessControl} — platform roles govern the
 * SaaS back-office, never a church's data.
 */
enum CentralRole: string
{
    case SuperAdmin = 'super_admin';
    case Support = 'support';
    case Billing = 'billing';
}

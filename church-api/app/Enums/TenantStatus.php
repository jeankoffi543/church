<?php

namespace App\Enums;

/**
 * Infrastructure lifecycle of a tenant, independent of billing.
 */
enum TenantStatus: string
{
    case Provisioning = 'provisioning';
    case Active = 'active';
    case Suspended = 'suspended';
    case Deleting = 'deleting';
}

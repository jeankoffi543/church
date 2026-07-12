<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Workload queues (CHR-159). Jobs are split by workload so a burst of heavy work
 * (media transcoding, video) never blocks latency-sensitive work (broadcasts,
 * push, mail). One GLOBAL worker fleet drains them — never per-tenant — with the
 * tenant restored per job by stancl's QueueTenancyBootstrapper. Workers pull the
 * queues in priority order (see deploy/supervisor/church-api.conf), heavy `media`
 * running on its own dedicated worker so it can't starve the rest.
 */
enum QueueName: string
{
    case Default = 'default';
    case Mail = 'mail';
    case Media = 'media';
    case Push = 'push';
    case Broadcast = 'broadcast';
}

<?php

declare(strict_types=1);

namespace App\Services\Push;

/**
 * The outcome of a push send (CHR-169): which device tokens were accepted by the
 * provider and which failed (e.g. unregistered — the caller prunes those).
 */
final class PushResult
{
    /**
     * @param  list<string>  $delivered
     * @param  list<string>  $failed
     */
    public function __construct(
        public array $delivered = [],
        public array $failed = [],
    ) {}

    public function successCount(): int
    {
        return count($this->delivered);
    }

    public function failureCount(): int
    {
        return count($this->failed);
    }

    public function merge(self $other): self
    {
        return new self(
            [...$this->delivered, ...$other->delivered],
            [...$this->failed, ...$other->failed],
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Support\Domains;

/**
 * Outcome of a domain registration attempt (CHR-206).
 */
final readonly class DomainRegistrationResult
{
    private function __construct(
        public bool $successful,
        public ?string $reference,
        public ?string $message,
    ) {}

    public static function success(?string $reference = null): self
    {
        return new self(true, $reference, null);
    }

    public static function failure(string $message): self
    {
        return new self(false, null, $message);
    }
}

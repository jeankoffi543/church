<?php

declare(strict_types=1);

namespace App\Support\Domains;

/**
 * The registrant (owner) contact a registrar needs to create a domain (CHR-206).
 * The platform acts as reseller/registrant on the church's behalf, so this is a
 * single platform-wide contact from config — not per-church data collection.
 */
final readonly class RegistrantContact
{
    public function __construct(
        public string $given,
        public string $family,
        public string $email,
        public string $streetaddr,
        public string $city,
        public string $zip,
        public string $country, // ISO 3166-1 alpha-2
        public string $phone,   // e.g. +33.123456789
        public ?string $orgname = null,
        public int $type = 0,   // Gandi: 0 person · 1 company · 2 association · 3 public body · 4 reseller
    ) {}

    /**
     * Build from `config('domains.registrar.owner')`, or `null` when it is
     * missing a required field (so an unconfigured platform simply can't buy).
     *
     * @param  mixed  $config
     */
    public static function fromConfig($config): ?self
    {
        if (! is_array($config)) {
            return null;
        }

        foreach (['given', 'family', 'email', 'streetaddr', 'city', 'zip', 'country', 'phone'] as $required) {
            if (empty($config[$required])) {
                return null;
            }
        }

        return new self(
            (string) $config['given'],
            (string) $config['family'],
            (string) $config['email'],
            (string) $config['streetaddr'],
            (string) $config['city'],
            (string) $config['zip'],
            (string) $config['country'],
            (string) $config['phone'],
            isset($config['orgname']) && $config['orgname'] !== '' ? (string) $config['orgname'] : null,
            (int) ($config['type'] ?? 0),
        );
    }

    /**
     * @return array<string, mixed> Gandi API v5 contact shape.
     */
    public function toGandi(): array
    {
        $contact = [
            'given' => $this->given,
            'family' => $this->family,
            'email' => $this->email,
            'streetaddr' => $this->streetaddr,
            'city' => $this->city,
            'zip' => $this->zip,
            'country' => $this->country,
            'phone' => $this->phone,
            'type' => $this->type,
        ];

        if ($this->orgname !== null) {
            $contact['orgname'] = $this->orgname;
        }

        return $contact;
    }
}

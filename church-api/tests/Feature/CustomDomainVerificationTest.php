<?php

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Jobs\VerifyCustomDomain;
use App\Models\Domain;
use App\Models\Tenant;
use App\Services\DomainVerificationService;
use Illuminate\Support\Facades\Bus;

/*
| CHR-176 — the DNS-verify poller: a background job re-checks a custom domain's
| ownership TXT record and walks it through the activation state machine, and a
| central command sweeps every pending domain onto the queue.
*/

function pendingCustomDomain(array $overrides = []): Domain
{
    return Domain::query()->create(array_merge([
        'tenant_id' => Tenant::query()->value('id'),
        'domain' => 'www.'.fake()->unique()->domainName(),
        'type' => DomainType::Custom,
        'status' => DomainStatus::Pending,
        'ssl_status' => SslStatus::Pending,
        'verification_token' => 'chr_token',
    ], $overrides));
}

it('verifies a pending domain when its TXT record appears', function () {
    $domain = pendingCustomDomain();
    $verifier = mock(DomainVerificationService::class);
    $verifier->shouldReceive('verify')->once()->andReturnTrue();

    (new VerifyCustomDomain($domain))->handle($verifier);

    expect($domain->refresh()->status)->toBe(DomainStatus::Verified)
        ->and($domain->verified_at)->not->toBeNull()
        ->and($domain->ssl_status)->toBe(SslStatus::Issued);
});

it('only records the probe while still within the propagation window', function () {
    $domain = pendingCustomDomain();
    $verifier = mock(DomainVerificationService::class);
    $verifier->shouldReceive('verify')->once()->andReturnFalse();

    (new VerifyCustomDomain($domain))->handle($verifier);

    expect($domain->refresh()->status)->toBe(DomainStatus::Pending)
        ->and($domain->last_checked_at)->not->toBeNull()
        ->and($domain->verified_at)->toBeNull();
});

it('fails a domain that never verifies before the deadline', function () {
    $domain = pendingCustomDomain(['created_at' => now()->subDays(5)]);
    $verifier = mock(DomainVerificationService::class);
    $verifier->shouldReceive('verify')->once()->andReturnFalse();

    (new VerifyCustomDomain($domain))->handle($verifier);

    expect($domain->refresh()->status)->toBe(DomainStatus::Failed)
        ->and($domain->ssl_status)->toBe(SslStatus::Failed);
});

it('leaves an already-resolved domain untouched', function () {
    $domain = pendingCustomDomain(['status' => DomainStatus::Verified, 'verified_at' => now()]);
    $verifier = mock(DomainVerificationService::class);
    $verifier->shouldReceive('verify')->never();

    (new VerifyCustomDomain($domain))->handle($verifier);

    expect($domain->refresh()->status)->toBe(DomainStatus::Verified);
});

it('dispatches verification only for pending custom domains', function () {
    Bus::fake([VerifyCustomDomain::class]);

    $pending = pendingCustomDomain(['domain' => 'pending.example.org']);
    pendingCustomDomain(['domain' => 'verified.example.org', 'status' => DomainStatus::Verified]);

    $this->artisan('domains:verify-pending')->assertSuccessful();

    Bus::assertDispatched(VerifyCustomDomain::class, fn (VerifyCustomDomain $job) => $job->domain->is($pending));
    Bus::assertDispatchedTimes(VerifyCustomDomain::class, 1);
});

<?php

use App\Enums\DonationStatus;
use App\Models\Donation;
use App\Models\OfferingCollection;
use App\Models\Service;

it('combines online donations and in-person collections by nature and period', function () {
    actingAsAdminWith(['view_finances']);

    // Online gifts (Donation ledger).
    Donation::factory()->create([
        'purpose_key' => 'dime', 'amount' => 20000, 'status' => DonationStatus::Success, 'created_at' => '2026-06-15',
    ]);
    Donation::factory()->create([
        'purpose_key' => 'dime', 'amount' => 5000, 'status' => DonationStatus::Pending, 'created_at' => '2026-06-15',
    ]); // excluded: not successful
    Donation::factory()->create([
        'purpose_key' => 'offrande', 'amount' => 8000, 'status' => DonationStatus::Success, 'created_at' => '2026-05-01',
    ]); // excluded: outside the requested period

    // In-person collections (OfferingCollection), attributed to a Service by date.
    $juneService = Service::factory()->create(['date' => '2026-06-20']);
    OfferingCollection::factory()->create(['service_id' => $juneService->id, 'nature' => 'dime', 'amount' => 30000]);
    OfferingCollection::factory()->create(['service_id' => $juneService->id, 'nature' => 'offrande', 'amount' => 12000]);

    $mayService = Service::factory()->create(['date' => '2026-05-10']);
    OfferingCollection::factory()->create(['service_id' => $mayService->id, 'nature' => 'dime', 'amount' => 99999]); // excluded: outside period

    $this->getJson('/api/v1/admin/giving/stats?from=2026-06-01&to=2026-06-30')
        ->assertOk()
        ->assertJsonPath('data.by_nature.dime.en_ligne', 20000)
        ->assertJsonPath('data.by_nature.dime.especes', 30000)
        ->assertJsonPath('data.by_nature.dime.total', 50000)
        ->assertJsonPath('data.by_nature.offrande.en_ligne', 0)
        ->assertJsonPath('data.by_nature.offrande.especes', 12000)
        ->assertJsonPath('data.by_channel.en_ligne', 20000)
        ->assertJsonPath('data.by_channel.especes', 42000)
        ->assertJsonPath('data.total', 62000);
});

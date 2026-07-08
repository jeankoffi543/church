<?php

use App\Models\Convert;
use App\Models\EvangelismCampaign;
use App\Models\Service;
use App\Models\User;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/converts')->assertStatus(401);
});

it('creates a convert attributed to an evangelism campaign', function () {
    actingAsAdminWith(['manage_evangelism']);
    $campaign = EvangelismCampaign::factory()->create(['title' => 'Sortie Yopougon']);

    $this->postJson('/api/v1/admin/converts', [
        'name' => 'Aya Konan',
        'phone' => '+225 07 00 00 00 00',
        'decision_date' => '2026-07-08',
        'evangelism_campaign_id' => $campaign->id,
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Aya Konan')
        ->assertJsonPath('data.evangelism_campaign_title', 'Sortie Yopougon')
        ->assertJsonPath('data.status', 'nouveau');
});

it('creates a convert attributed to a culte instead of a campaign', function () {
    actingAsAdminWith(['manage_evangelism']);
    $service = Service::factory()->create();

    $this->postJson('/api/v1/admin/converts', [
        'name' => 'Kouassi Jean',
        'decision_date' => '2026-07-08',
        'service_id' => $service->id,
    ])->assertCreated()
        ->assertJsonPath('data.service_id', $service->id)
        ->assertJsonPath('data.evangelism_campaign_id', null);
});

it('rejects creation without the manage_evangelism permission', function () {
    actingAsAdminWith(['view_evangelism']);

    $this->postJson('/api/v1/admin/converts', [
        'name' => 'Aya Konan',
        'decision_date' => '2026-07-08',
    ])->assertStatus(403);
});

it('validates decision_type and status against their allowed values', function () {
    actingAsAdminWith(['manage_evangelism']);

    $this->postJson('/api/v1/admin/converts', [
        'name' => 'Aya Konan',
        'decision_date' => '2026-07-08',
        'decision_type' => 'inconnu',
        'status' => 'parti',
    ])->assertStatus(422)->assertJsonValidationErrors(['decision_type', 'status']);
});

it('filters converts by status and assigns a counselor', function () {
    actingAsAdminWith(['view_evangelism', 'manage_evangelism']);
    $counselor = User::factory()->create();

    Convert::factory()->create(['name' => 'Suivi Actif', 'status' => 'en_cours_de_suivi']);
    $fresh = Convert::factory()->create(['name' => 'Tout Nouveau', 'status' => 'nouveau']);

    $this->putJson("/api/v1/admin/converts/{$fresh->id}", ['assigned_counselor_id' => $counselor->id])
        ->assertOk()
        ->assertJsonPath('data.assigned_counselor_name', $counselor->name);

    $this->getJson('/api/v1/admin/converts?status__eq=nouveau')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Tout Nouveau');
});

it('deletes a convert', function () {
    actingAsAdminWith(['manage_evangelism']);
    $convert = Convert::factory()->create();

    $this->deleteJson("/api/v1/admin/converts/{$convert->id}")->assertStatus(204);
    expect(Convert::find($convert->id))->toBeNull();
});

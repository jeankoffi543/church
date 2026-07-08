<?php

use App\Models\Convert;
use App\Models\EvangelismCampaign;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/evangelism-campaigns')->assertStatus(401);
});

it('lists campaigns newest first with their convert count', function () {
    actingAsAdminWith(['view_evangelism']);

    $old = EvangelismCampaign::factory()->create(['date' => '2026-05-01']);
    $recent = EvangelismCampaign::factory()->create(['date' => '2026-07-01']);
    Convert::factory()->count(2)->create(['evangelism_campaign_id' => $recent->id]);

    $this->getJson('/api/v1/admin/evangelism-campaigns')
        ->assertOk()
        ->assertJsonPath('data.0.id', $recent->id)
        ->assertJsonPath('data.0.converts_count', 2);
});

it('creates, updates and deletes a campaign', function () {
    actingAsAdminWith(['manage_evangelism']);

    $response = $this->postJson('/api/v1/admin/evangelism-campaigns', [
        'title' => 'Sortie Yopougon',
        'date' => '2026-08-01',
        'location' => 'Marché de Yopougon',
    ])->assertCreated()->assertJsonPath('data.title', 'Sortie Yopougon');

    $id = $response->json('data.id');

    $this->putJson("/api/v1/admin/evangelism-campaigns/{$id}", ['location' => 'Gare de Yopougon'])
        ->assertOk()
        ->assertJsonPath('data.location', 'Gare de Yopougon');

    $this->deleteJson("/api/v1/admin/evangelism-campaigns/{$id}")->assertStatus(204);
    expect(EvangelismCampaign::find($id))->toBeNull();
});

it('rejects creation without the manage_evangelism permission', function () {
    actingAsAdminWith(['view_evangelism']);

    $this->postJson('/api/v1/admin/evangelism-campaigns', [
        'title' => 'Sortie Yopougon',
        'date' => '2026-08-01',
    ])->assertStatus(403);
});

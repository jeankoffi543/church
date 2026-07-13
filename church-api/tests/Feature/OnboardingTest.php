<?php

use App\Models\Setting;
use App\Models\User;

/*
| CHR-178 — first-run onboarding checklist. Each step is derived from the
| church's own data and the whole card can be dismissed. Runs in tenant context.
*/

it('returns the onboarding checklist for a fresh church', function () {
    actingAsSuperAdmin();

    $this->getJson('http://localhost/api/v1/admin/onboarding')
        ->assertOk()
        ->assertJsonPath('data.total', 5)
        ->assertJsonPath('data.completed', 1)
        ->assertJsonPath('data.dismissed', false)
        ->assertJsonPath('data.steps.0.key', 'account')
        ->assertJsonPath('data.steps.0.done', true)
        ->assertJsonPath('data.steps.1.key', 'profile')
        ->assertJsonPath('data.steps.1.done', false);
});

it('ticks the profile step once a general setting is saved', function () {
    actingAsSuperAdmin();
    Setting::set('church_name', 'Grace Chapel', 'general');

    $this->getJson('http://localhost/api/v1/admin/onboarding')
        ->assertOk()
        ->assertJsonPath('data.steps.1.done', true)
        ->assertJsonPath('data.completed', 2);
});

it('ticks the team step once another servant is invited', function () {
    actingAsSuperAdmin();
    User::factory()->create();

    $this->getJson('http://localhost/api/v1/admin/onboarding')
        ->assertOk()
        ->assertJsonPath('data.steps.4.key', 'team')
        ->assertJsonPath('data.steps.4.done', true);
});

it('dismisses the checklist', function () {
    actingAsSuperAdmin();

    $this->postJson('http://localhost/api/v1/admin/onboarding/dismiss')
        ->assertOk()
        ->assertJsonPath('data.dismissed', true);

    $this->getJson('http://localhost/api/v1/admin/onboarding')
        ->assertJsonPath('data.dismissed', true);
});

it('gates the checklist behind manage_settings', function () {
    actingAsAdminWith([]);

    $this->getJson('http://localhost/api/v1/admin/onboarding')->assertForbidden();
});

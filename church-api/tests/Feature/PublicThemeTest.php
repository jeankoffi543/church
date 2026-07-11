<?php

use App\Models\Setting;

/*
| CHR-145 — the tenant's `theme` group is exposed on the public settings API so
| the Next.js server layout can recolor the site per church.
*/

it('exposes the theme group publicly for SSR theming', function () {
    Setting::set('primary', '#0c8794', 'theme');
    Setting::set('secondary', '#a9741f', 'theme');
    Setting::set('site_name', 'Grace Chapel', 'theme');

    $this->getJson('http://localhost/api/v1/public/settings?group=theme')
        ->assertOk()
        ->assertJsonPath('data.primary', '#0c8794')
        ->assertJsonPath('data.secondary', '#a9741f')
        ->assertJsonPath('data.site_name', 'Grace Chapel');
});

it('never leaks the stream key through the theme/public settings', function () {
    Setting::set('live_stream_key', 'sk_secret', 'live');

    $response = $this->getJson('http://localhost/api/v1/public/settings')->assertOk();

    expect(json_encode($response->json()))->not->toContain('sk_secret');
});

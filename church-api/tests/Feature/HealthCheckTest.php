<?php

// CHR-194 — readiness + capacity endpoint for load balancers / autoscalers.

it('reports readiness and tenant capacity', function () {
    $this->getJson('/api/platform/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('checks.database', true)
        ->assertJsonPath('checks.cache', true)
        ->assertJsonStructure(['status', 'checks' => ['database', 'cache'], 'capacity' => ['tenants', 'active_tenants'], 'time']);

    expect($this->getJson('/api/platform/health')->json('capacity.tenants'))->toBeGreaterThan(0);
});

it('needs no authentication (load balancers poll it)', function () {
    $this->getJson('/api/platform/health')->assertOk();
});

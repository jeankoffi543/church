<?php

use App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Api\V1\Public;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Public routes are read-only and open (consumed by the Next.js front-end
| and the mobile app). Admin routes are write/CRUD and gated by Sanctum.
*/

Route::prefix('v1')->group(function (): void {

    // ── Public (read-only) ────────────────────────────────────────────
    Route::prefix('public')->name('api.v1.public.')->group(function (): void {
        // Settings: hero texts, weekly schedule, offerings, footer/contact, live…
        Route::get('settings', [Public\SettingController::class, 'index'])->name('settings.index');
        Route::get('settings/{key}', [Public\SettingController::class, 'show'])->name('settings.show');

        // Ministries (Phase 1 & 2)
        Route::get('ministries', [Public\MinistryController::class, 'index'])->name('ministries.index');

        // Sermons (Phase 1) — `latest` before `{sermon}` to avoid clashing.
        Route::get('sermons/latest', [Public\SermonController::class, 'latest'])->name('sermons.latest');
        Route::get('sermons', [Public\SermonController::class, 'index'])->name('sermons.index');
        Route::get('sermons/{sermon}', [Public\SermonController::class, 'show'])->name('sermons.show');

        // Events (Phase 3)
        Route::get('events', [Public\EventController::class, 'index'])->name('events.index');
        Route::get('events/{event}', [Public\EventController::class, 'show'])->name('events.show');

        // Home groups (Phase 2)
        Route::get('home-groups', [Public\HomeGroupController::class, 'index'])->name('home-groups.index');
    });

    // ── Admin authentication ──────────────────────────────────────────
    Route::prefix('admin')->name('api.v1.admin.')->group(function (): void {
        Route::post('login', [Admin\AuthController::class, 'login'])->name('login');

        // ── Admin (write / CRUD) — requires a valid Sanctum token ──────
        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('me', [Admin\AuthController::class, 'me'])->name('me');
            Route::post('logout', [Admin\AuthController::class, 'logout'])->name('logout');

            // Settings configuration (Phases 1, 4, 5, 6)
            Route::get('settings', [Admin\SettingController::class, 'index'])->name('settings.index');
            Route::match(['put', 'patch'], 'settings', [Admin\SettingController::class, 'update'])->name('settings.update');
            Route::delete('settings/{key}', [Admin\SettingController::class, 'destroy'])->name('settings.destroy');

            // Structured resources
            Route::apiResource('ministries', Admin\MinistryController::class);
            Route::apiResource('sermons', Admin\SermonController::class);
            Route::apiResource('events', Admin\EventController::class);
            Route::apiResource('home-groups', Admin\HomeGroupController::class)->parameter('home-groups', 'homeGroup');
        });
    });
});

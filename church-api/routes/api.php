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

        // Ministry recruitment (public application submission + status lookup)
        Route::post('ministries/applications', [Public\MinistryApplicationController::class, 'store'])->name('ministries.applications.store');
        Route::post('ministries/applications/status', [Public\MinistryApplicationController::class, 'status'])->name('ministries.applications.status');

        // Sermons (Phase 1) — `latest` before `{sermon}` to avoid clashing.
        Route::get('sermons/latest', [Public\SermonController::class, 'latest'])->name('sermons.latest');
        Route::get('sermons', [Public\SermonController::class, 'index'])->name('sermons.index');
        Route::get('sermons/{sermon}', [Public\SermonController::class, 'show'])->name('sermons.show');

        // Events (Phase 3)
        Route::get('events', [Public\EventController::class, 'index'])->name('events.index');
        Route::get('events/{event}', [Public\EventController::class, 'show'])->name('events.show');

        // Home groups (Phase 2)
        Route::get('home-groups', [Public\HomeGroupController::class, 'index'])->name('home-groups.index');

        // Prayer requests (public submission)
        Route::post('prayer-requests', [Public\PrayerRequestController::class, 'store'])->name('prayer-requests.store');
    });

    // ── Admin authentication ──────────────────────────────────────────
    Route::prefix('admin')->name('api.v1.admin.')->group(function (): void {
        Route::post('login', [Admin\AuthController::class, 'login'])->name('login');

        // ── Admin (write / CRUD) — requires a valid Sanctum token ──────
        Route::middleware('auth:sanctum')->group(function (): void {
            // Identity & session — available to every authenticated servant.
            Route::get('me', [Admin\AuthController::class, 'me'])->name('me');
            Route::post('logout', [Admin\AuthController::class, 'logout'])->name('logout');
            Route::get('users', [Admin\AuthController::class, 'users'])->name('users');

            // Settings: readable by any authenticated admin (most pages need the
            // config to render); writes are gated by the relevant privileges.
            Route::get('settings', [Admin\SettingController::class, 'index'])->name('settings.index');
            Route::match(['put', 'patch'], 'settings', [Admin\SettingController::class, 'update'])
                ->middleware('permission:manage_settings|manage_live|manage_prayer_settings')
                ->name('settings.update');
            Route::delete('settings/{key}', [Admin\SettingController::class, 'destroy'])
                ->middleware('permission:manage_settings|manage_live|manage_prayer_settings')
                ->name('settings.destroy');

            // Médiathèque / messages
            Route::apiResource('sermons', Admin\SermonController::class)
                ->middleware('permission:manage_sermons');

            // Agenda / événements
            Route::apiResource('events', Admin\EventController::class)
                ->middleware('permission:manage_events');

            // Cellules / groupes de maison
            Route::apiResource('home-groups', Admin\HomeGroupController::class)
                ->parameter('home-groups', 'homeGroup')
                ->middleware('permission:view_cells|process_cells');

            // Ministères — structural site content, gated with general settings.
            Route::apiResource('ministries', Admin\MinistryController::class)
                ->middleware('permission:manage_settings');

            // Recrutement — candidatures aux ministères (contextual chief rule
            // is enforced inside the controller for non-global validators).
            Route::middleware('permission:validate_ministry_applications')->group(function (): void {
                Route::get('ministry-applications', [Admin\MinistryApplicationController::class, 'index'])
                    ->name('ministry-applications.index');
                Route::post('ministry-applications/{application}/approve', [Admin\MinistryApplicationController::class, 'approve'])
                    ->name('ministry-applications.approve');
                Route::post('ministry-applications/{application}/reject', [Admin\MinistryApplicationController::class, 'reject'])
                    ->name('ministry-applications.reject');
            });

            // Prayer requests (admin CRUD + quick actions)
            Route::apiResource('prayers', Admin\PrayerRequestController::class)
                ->parameter('prayers', 'prayer')
                ->middleware('permission:view_prayers|process_prayers');
            Route::patch('prayers/{prayer}/status', [Admin\PrayerRequestController::class, 'updateStatus'])
                ->middleware('permission:process_prayers')
                ->name('prayers.status');
            Route::patch('prayers/{prayer}/assign', [Admin\PrayerRequestController::class, 'assign'])
                ->middleware('permission:process_prayers')
                ->name('prayers.assign');

            // ── Access management (Groups, Users, Permissions) ─────────
            Route::middleware('permission:manage_access')->group(function (): void {
                Route::get('permissions', [Admin\PermissionController::class, 'index'])->name('permissions.index');

                // `admin-users` avoids clashing with the lightweight `users`
                // lookup above; the route parameter stays `{user}`.
                Route::apiResource('admin-users', Admin\UserController::class)
                    ->parameter('admin-users', 'user')
                    ->names('admin-users');

                Route::put('roles/{role}/permissions', [Admin\RoleController::class, 'syncPermissions'])
                    ->name('roles.permissions.sync');
                Route::apiResource('roles', Admin\RoleController::class);
            });
        });
    });
});

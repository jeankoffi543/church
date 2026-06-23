<?php

use App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Api\V1\Public;
use App\Http\Controllers\Api\V1\Webhooks;
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
        // Range-capable media stream (HTTP 206) so browsers can play/seek uploaded files.
        Route::get('sermons/{sermon}/stream', [Public\SermonController::class, 'stream'])->name('sermons.stream');
        Route::get('sermons/{sermon}', [Public\SermonController::class, 'show'])->name('sermons.show');

        // Events (Phase 3)
        Route::get('events', [Public\EventController::class, 'index'])->name('events.index');
        Route::get('events/{event}', [Public\EventController::class, 'show'])->name('events.show');

        Route::get('home-groups', [Public\HomeGroupController::class, 'index'])->name('home-groups.index');
        Route::get('branches', [Public\BranchController::class, 'index'])->name('branches.index');
        Route::get('branches/{branch}', [Public\BranchController::class, 'show'])->name('branches.show');
        Route::post('home-groups/applications', [Public\HomeGroupApplicationController::class, 'store'])->name('home-groups.applications.store');
        Route::post('home-groups/applications/verify', [Public\HomeGroupApplicationController::class, 'verify'])->name('home-groups.applications.verify');
        Route::post('home-groups/applications/status', [Public\HomeGroupApplicationController::class, 'status'])->name('home-groups.applications.status');

        // Prayer requests (public submission)
        Route::post('prayer-requests', [Public\PrayerRequestController::class, 'store'])->name('prayer-requests.store');

        // Contact messages (public submission)
        Route::post('contact', [Public\ContactController::class, 'store'])->name('contact.store');

        // Galerie / Portfolio (albums + photos)
        Route::get('albums', [Public\AlbumController::class, 'index'])->name('albums.index');
        Route::get('albums/{album:slug}', [Public\AlbumController::class, 'show'])->name('albums.show');

        // Archives des lives (VOD) — `latest` & `stream` before the slug route.
        Route::get('past-lives', [Public\PastLiveController::class, 'index'])->name('past-lives.index');
        Route::get('past-lives/latest', [Public\PastLiveController::class, 'latest'])->name('past-lives.latest');
        Route::get('past-lives/{pastLive}/stream', [Public\PastLiveController::class, 'stream'])->name('past-lives.stream');
        Route::get('past-lives/{pastLive:slug}', [Public\PastLiveController::class, 'show'])->name('past-lives.show');

        // Dons (Paystack) — open a transaction & poll its accounting status.
        Route::post('donations/initialize', [Public\DonationController::class, 'initialize'])->name('donations.initialize');
        Route::get('donations/{reference}/status', [Public\DonationController::class, 'status'])->name('donations.status');

        // Live engine (Reverb realtime) — audience, chat & reactions.
        Route::get('live/chat', [Public\LiveController::class, 'messages'])->name('live.messages');
        Route::post('live/chat', [Public\LiveController::class, 'chat'])->name('live.chat');
        Route::post('live/react', [Public\LiveController::class, 'react'])->name('live.react');
        Route::post('live/presence', [Public\LiveController::class, 'presence'])->name('live.presence');
        Route::post('live/leave', [Public\LiveController::class, 'leave'])->name('live.leave');
        // Time-synced chat replay for an archived broadcast.
        Route::get('past-lives/{pastLive:slug}/chat', [Public\LiveController::class, 'archivedChat'])->name('past-lives.chat');
    });

    // ── Webhooks (stateless, signature-verified — no CSRF, no auth) ────
    Route::post('webhooks/paystack', [Webhooks\PaystackWebhookController::class, 'handle'])->name('webhooks.paystack');

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
            Route::get('settings/pastor-word', [Admin\SettingController::class, 'getPastorWord'])
                ->middleware('permission:manage_pastor_word')
                ->name('settings.pastor-word.get');
            Route::match(['put', 'post'], 'settings/pastor-word', [Admin\SettingController::class, 'updatePastorWord'])
                ->middleware('permission:manage_pastor_word')
                ->name('settings.pastor-word.update');
            Route::get('settings/church-vision', [Admin\SettingController::class, 'getChurchVision'])
                ->middleware('permission:manage_church_vision')
                ->name('settings.church-vision.get');
            Route::match(['put', 'post'], 'settings/church-vision', [Admin\SettingController::class, 'updateChurchVision'])
                ->middleware('permission:manage_church_vision')
                ->name('settings.church-vision.update');
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

            // Galerie & archives des lives — read gated by view_gallery,
            // writes by manage_gallery.
            Route::middleware('permission:view_gallery')->group(function (): void {
                Route::get('albums', [Admin\AlbumController::class, 'index'])->name('albums.index');
                Route::get('albums/{album}', [Admin\AlbumController::class, 'show'])->name('albums.show');
                Route::get('past-lives', [Admin\PastLiveController::class, 'index'])->name('past-lives.index');
                Route::get('past-lives/{pastLive}', [Admin\PastLiveController::class, 'show'])->name('past-lives.show');
            });
            Route::middleware('permission:manage_gallery')->group(function (): void {
                Route::post('albums', [Admin\AlbumController::class, 'store'])->name('albums.store');
                Route::match(['put', 'patch'], 'albums/{album}', [Admin\AlbumController::class, 'update'])->name('albums.update');
                Route::delete('albums/{album}', [Admin\AlbumController::class, 'destroy'])->name('albums.destroy');

                Route::post('albums/{album}/photos', [Admin\AlbumPhotoController::class, 'store'])->name('albums.photos.store');
                Route::post('albums/{album}/photos/reorder', [Admin\AlbumPhotoController::class, 'reorder'])->name('albums.photos.reorder');
                Route::delete('album-photos/{albumPhoto}', [Admin\AlbumPhotoController::class, 'destroy'])->name('album-photos.destroy');

                Route::post('past-lives', [Admin\PastLiveController::class, 'store'])->name('past-lives.store');
                Route::match(['put', 'patch'], 'past-lives/{pastLive}', [Admin\PastLiveController::class, 'update'])->name('past-lives.update');
                Route::delete('past-lives/{pastLive}', [Admin\PastLiveController::class, 'destroy'])->name('past-lives.destroy');
            });

            // Finances — livre de caisse des dons + journal des webhooks.
            Route::middleware('permission:view_finances')->group(function (): void {
                Route::get('donations', [Admin\DonationController::class, 'index'])->name('donations.index');
                Route::get('donations/stats', [Admin\DonationController::class, 'stats'])->name('donations.stats');
                Route::get('donations/export', [Admin\DonationController::class, 'export'])->name('donations.export');
                Route::post('donations/sync', [Admin\DonationController::class, 'sync'])->name('donations.sync');
                Route::patch('donations/{donation}/status', [Admin\DonationController::class, 'updateStatus'])->name('donations.status');

                Route::get('webhook-events', [Admin\WebhookEventController::class, 'index'])->name('webhook-events.index');
                Route::post('webhook-events/{webhookEvent}/replay', [Admin\WebhookEventController::class, 'replay'])->name('webhook-events.replay');
            });

            // Agenda / événements
            Route::get('events/check-slug', [Admin\EventController::class, 'checkSlug'])
                ->middleware('permission:manage_events');
            Route::apiResource('events', Admin\EventController::class)
                ->middleware('permission:manage_events');

            // Applications des groupes de maison
            Route::prefix('home-groups/applications')->name('home-groups.applications.')->group(function (): void {
                Route::get('/', [Admin\HomeGroupApplicationController::class, 'index'])
                    ->middleware('permission:validate_home_group_applications')
                    ->name('index');
                Route::post('{application}/approve', [Admin\HomeGroupApplicationController::class, 'approve'])
                    ->middleware('permission:validate_home_group_applications')
                    ->name('approve');
                Route::post('{application}/reject', [Admin\HomeGroupApplicationController::class, 'reject'])
                    ->middleware('permission:validate_home_group_applications')
                    ->name('reject');
            });

            // Branches / campus
            Route::apiResource('branches', Admin\BranchController::class)
                ->middleware('permission:manage_branches');

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

            // ── Contact messages management ─────────────────────────────
            Route::middleware('permission:view_contacts')->group(function (): void {
                Route::get('contacts', [Admin\ContactController::class, 'index'])->name('contacts.index');
            });
            Route::middleware('permission:manage_contacts')->group(function (): void {
                Route::match(['put', 'patch'], 'contacts/{contact}', [Admin\ContactController::class, 'update'])->name('contacts.update');
                Route::post('contacts/{contact}/archive', [Admin\ContactController::class, 'archive'])->name('contacts.archive');
                Route::post('contacts/{contact}/reply', [Admin\ContactController::class, 'reply'])->name('contacts.reply');
            });

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

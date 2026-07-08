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

        // Live Studio local video — Range-capable playback of operator uploads.
        Route::get('studio/media/{file}', [Public\StudioMediaController::class, 'stream'])
            ->where('file', '[A-Za-z0-9._-]+')
            ->name('studio.media.stream');
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
        Route::post('past-lives/{pastLive}/view', [Public\PastLiveController::class, 'recordView'])->name('past-lives.view');
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
        // Scripture overlay: current state (catch-up) + the express Bible engine.
        Route::get('live/scripture', [Public\LiveController::class, 'scripture'])->name('live.scripture');
        Route::get('bible/search', [Public\BibleController::class, 'search'])->name('bible.search');
        Route::get('bible/navigate', [Public\BibleController::class, 'navigate'])->name('bible.navigate');
        Route::get('bible/translations', [Public\BibleController::class, 'translations'])->name('bible.translations');
        // Time-synced chat replay for an archived broadcast.
        Route::get('past-lives/{pastLive:slug}/chat', [Public\LiveController::class, 'archivedChat'])->name('past-lives.chat');

        // Self-hosted RTMP→HLS: Nginx `on_publish` stream-key authorization, and
        // `on_publish_done` end-of-stream auto-archival.
        Route::post('rtmp/auth', [Public\RtmpController::class, 'authorizePublish'])->name('rtmp.auth');
        Route::post('rtmp/done', [Public\RtmpController::class, 'publishDone'])->name('rtmp.done');
        Route::post('rtmp/recorded', [Public\RtmpController::class, 'recorded'])->name('rtmp.recorded');

        // SRS (studio WHIP→Facebook): publish authorization + relay lifecycle.
        Route::post('srs/on_publish', [Public\SrsController::class, 'onPublish'])->name('srs.on_publish');
        Route::post('srs/on_unpublish', [Public\SrsController::class, 'onUnpublish'])->name('srs.on_unpublish');

        // Storefront
        Route::get('store/products', [Public\ProductController::class, 'index'])->name('store.products.index')->middleware('set.currency');
        Route::get('store/products/{id}', [Public\ProductController::class, 'show'])->name('store.products.show')->middleware('set.currency');
        Route::get('store/currencies', [Public\CurrencyController::class, 'index'])->name('store.currencies.index');
        Route::post('store/orders', [Public\OrderController::class, 'store'])->name('store.orders.store');
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

            // Live Studio régie — push scripture overlays + prepared-verses deck.
            Route::middleware('permission:manage_live')->group(function (): void {
                Route::post('live/scripture', [Admin\LiveScriptureController::class, 'broadcast'])->name('live.scripture.broadcast');
                Route::get('live/scripture/prepared', [Admin\LiveScriptureController::class, 'prepared'])->name('live.scripture.prepared');
                Route::put('live/scripture/prepared', [Admin\LiveScriptureController::class, 'updatePrepared'])->name('live.scripture.prepared.update');
                Route::post('studio/media', [Admin\StudioMediaController::class, 'store'])->name('studio.media.store');
                Route::post('studio/media/from-url', [Admin\StudioMediaController::class, 'storeFromUrl'])->name('studio.media.from-url');
                // Studio → Facebook broadcast (own SRS + ffmpeg relay).
                Route::post('studio/broadcast/facebook/start', [Admin\StudioBroadcastController::class, 'startFacebook'])->name('studio.broadcast.facebook.start');
                Route::post('studio/broadcast/facebook/stop', [Admin\StudioBroadcastController::class, 'stopFacebook'])->name('studio.broadcast.facebook.stop');
            });

            // Médiathèque / messages
            Route::apiResource('sermons', Admin\SermonController::class)
                ->middleware('permission:manage_sermons');

            // Galerie & archives des lives — read gated by view_gallery,
            // writes by manage_gallery.
            Route::middleware('permission:view_gallery')->group(function (): void {
                Route::get('albums', [Admin\AlbumController::class, 'index'])->name('albums.index');
                Route::get('albums/{album}', [Admin\AlbumController::class, 'show'])->name('albums.show');
                Route::get('past-lives', [Admin\PastLiveController::class, 'index'])->name('past-lives.index');
                Route::get('past-lives/{pastLive}/analytics', [Admin\PastLiveController::class, 'analytics'])->name('past-lives.analytics');
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

                // Générosité combinée (en ligne + espèces collectées en culte) — KPI par période.
                Route::get('giving/stats', [Admin\GivingController::class, 'stats'])->name('giving.stats');
                // Collecte en espèces d'un culte donné (dîme/offrande/... comptées sur place).
                Route::post('services/{service}/offering-collections', [Admin\OfferingCollectionController::class, 'upsert'])->name('services.offering-collections.upsert');
            });

            // Cultes — planification des occurrences (culte dominical, veillée, étude biblique…).
            Route::middleware('permission:view_services|manage_services')->group(function (): void {
                Route::get('services', [Admin\ServiceController::class, 'index'])->name('services.index');
                Route::get('services/{service}', [Admin\ServiceController::class, 'show'])->name('services.show');
            });
            Route::middleware('permission:manage_services')->group(function (): void {
                Route::post('services', [Admin\ServiceController::class, 'store'])->name('services.store');
                Route::match(['put', 'patch'], 'services/{service}', [Admin\ServiceController::class, 'update'])->name('services.update');
                Route::delete('services/{service}', [Admin\ServiceController::class, 'destroy'])->name('services.destroy');
            });

            // Présences — comptage agrégé par catégorie pour un culte donné.
            Route::post('services/{service}/attendances', [Admin\AttendanceController::class, 'upsert'])
                ->middleware('permission:manage_attendance')
                ->name('services.attendances.upsert');

            // Équipes de service — planning des équipes (roster complet par culte).
            Route::middleware('permission:view_teams|manage_teams')->group(function (): void {
                Route::get('teams', [Admin\TeamController::class, 'index'])->name('teams.index');
                Route::get('teams/{team}', [Admin\TeamController::class, 'show'])->name('teams.show');
            });
            Route::middleware('permission:manage_teams')->group(function (): void {
                Route::post('teams', [Admin\TeamController::class, 'store'])->name('teams.store');
                Route::match(['put', 'patch'], 'teams/{team}', [Admin\TeamController::class, 'update'])->name('teams.update');
                Route::delete('teams/{team}', [Admin\TeamController::class, 'destroy'])->name('teams.destroy');
                Route::post('services/{service}/assignments', [Admin\ServiceAssignmentController::class, 'upsert'])->name('services.assignments.upsert');
            });

            // Fidèles — registre de la congrégation.
            Route::middleware('permission:view_members|manage_members')->group(function (): void {
                Route::get('members', [Admin\MemberController::class, 'index'])->name('members.index');
                Route::get('members/{member}', [Admin\MemberController::class, 'show'])->name('members.show');
            });
            Route::middleware('permission:manage_members')->group(function (): void {
                Route::post('members', [Admin\MemberController::class, 'store'])->name('members.store');
                Route::match(['put', 'patch'], 'members/{member}', [Admin\MemberController::class, 'update'])->name('members.update');
                Route::delete('members/{member}', [Admin\MemberController::class, 'destroy'])->name('members.destroy');
            });

            // Évangélisation — campagnes de sortie + nouvelles âmes.
            Route::middleware('permission:view_evangelism|manage_evangelism')->group(function (): void {
                Route::get('evangelism-campaigns', [Admin\EvangelismCampaignController::class, 'index'])->name('evangelism-campaigns.index');
                Route::get('evangelism-campaigns/{evangelismCampaign}', [Admin\EvangelismCampaignController::class, 'show'])->name('evangelism-campaigns.show');
                Route::get('converts', [Admin\ConvertController::class, 'index'])->name('converts.index');
                Route::get('converts/{convert}', [Admin\ConvertController::class, 'show'])->name('converts.show');
            });
            Route::middleware('permission:manage_evangelism')->group(function (): void {
                Route::post('evangelism-campaigns', [Admin\EvangelismCampaignController::class, 'store'])->name('evangelism-campaigns.store');
                Route::match(['put', 'patch'], 'evangelism-campaigns/{evangelismCampaign}', [Admin\EvangelismCampaignController::class, 'update'])->name('evangelism-campaigns.update');
                Route::delete('evangelism-campaigns/{evangelismCampaign}', [Admin\EvangelismCampaignController::class, 'destroy'])->name('evangelism-campaigns.destroy');

                Route::post('converts', [Admin\ConvertController::class, 'store'])->name('converts.store');
                Route::match(['put', 'patch'], 'converts/{convert}', [Admin\ConvertController::class, 'update'])->name('converts.update');
                Route::delete('converts/{convert}', [Admin\ConvertController::class, 'destroy'])->name('converts.destroy');
            });

            // Suivi des âmes — dossiers de discipulat (données pastorales sensibles,
            // scopées au conseiller assigné à l'intérieur des contrôleurs).
            Route::middleware('permission:view_followups|manage_followups')->group(function (): void {
                Route::get('follow-ups', [Admin\FollowUpController::class, 'index'])->name('follow-ups.index');
                Route::get('follow-ups/{followUp}', [Admin\FollowUpController::class, 'show'])->name('follow-ups.show');
            });
            Route::middleware('permission:manage_followups')->group(function (): void {
                Route::post('follow-ups', [Admin\FollowUpController::class, 'store'])->name('follow-ups.store');
                Route::match(['put', 'patch'], 'follow-ups/{followUp}', [Admin\FollowUpController::class, 'update'])->name('follow-ups.update');
                Route::delete('follow-ups/{followUp}', [Admin\FollowUpController::class, 'destroy'])->name('follow-ups.destroy');
                Route::post('follow-ups/{followUp}/notes', [Admin\FollowUpNoteController::class, 'store'])->name('follow-ups.notes.store');
            });

            // Logistique — inventaire des ressources (salles, véhicules, matériel) + réservations.
            Route::middleware('permission:view_resources|manage_resources')->group(function (): void {
                Route::get('resources', [Admin\ResourceController::class, 'index'])->name('resources.index');
                Route::get('resources/{resource}', [Admin\ResourceController::class, 'show'])->name('resources.show');
                Route::get('resource-bookings', [Admin\ResourceBookingController::class, 'index'])->name('resource-bookings.index');
            });
            Route::middleware('permission:manage_resources')->group(function (): void {
                Route::post('resources', [Admin\ResourceController::class, 'store'])->name('resources.store');
                Route::match(['put', 'patch'], 'resources/{resource}', [Admin\ResourceController::class, 'update'])->name('resources.update');
                Route::delete('resources/{resource}', [Admin\ResourceController::class, 'destroy'])->name('resources.destroy');

                Route::post('resource-bookings', [Admin\ResourceBookingController::class, 'store'])->name('resource-bookings.store');
                Route::match(['put', 'patch'], 'resource-bookings/{resourceBooking}', [Admin\ResourceBookingController::class, 'update'])->name('resource-bookings.update');
                Route::delete('resource-bookings/{resourceBooking}', [Admin\ResourceBookingController::class, 'destroy'])->name('resource-bookings.destroy');
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

            // ── Store / Boutique Admin ─────────────────────────────────
            Route::middleware('permission:manage_store')->group(function (): void {
                Route::get('store/products/categories', [Admin\ProductController::class, 'categories'])->name('store.products.categories');
                Route::apiResource('store/products', Admin\ProductController::class)
                    ->parameter('products', 'product')
                    ->names('store.products');

                Route::get('store/orders', [Admin\OrderController::class, 'index'])->name('store.orders.index');
                Route::patch('store/orders/{order}/status', [Admin\OrderController::class, 'updateStatus'])->name('store.orders.status');
                Route::get('store/clients', [Admin\OrderController::class, 'clients'])->name('store.clients');
                Route::get('store/analytics', [Admin\OrderController::class, 'analytics'])->name('store.analytics');
                Route::get('store/analytics/export', [Admin\OrderController::class, 'exportAnalytics'])->name('store.analytics.export');

                // Currencies management
                Route::get('store/currencies', [Admin\CurrencyController::class, 'index'])->name('store.currencies.index');
                Route::patch('store/currencies/{currency}', [Admin\CurrencyController::class, 'update'])->name('store.currencies.update');
                Route::post('store/currencies/{currency}/set-default', [Admin\CurrencyController::class, 'setDefault'])->name('store.currencies.set-default');
            });
        });
    });
});

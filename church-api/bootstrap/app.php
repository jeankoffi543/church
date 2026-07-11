<?php

use App\Http\Middleware\EnsureTenantHasFeature;
use App\Http\Middleware\SetCurrencyMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Stancl\Tenancy\Contracts\TenantCouldNotBeIdentifiedException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API-only app: never redirect unauthenticated requests to a web
        // "login" page — let the AuthenticationException surface as JSON 401.
        $middleware->redirectGuestsTo(fn (Request $request) => null);

        // Spatie permission middleware aliases used to gate the admin routes.
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'set.currency' => SetCurrencyMiddleware::class,
            'feature' => EnsureTenantHasFeature::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Always answer unauthenticated API calls with a 401 JSON body
        // instead of attempting a redirect to the (non-existent) login route.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => $e->getMessage()], 401);
            }

            return null;
        });

        // A missing role/permission surfaces as a clean JSON 403 the front-end
        // can present as the "Accès restreint" department screen.
        $exceptions->render(function (UnauthorizedException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => "Accès restreint : Vous n'avez pas les privilèges requis pour accéder à ce département.",
                ], 403);
            }

            return null;
        });

        // No tenant maps to the request Host (unknown/central domain): answer a
        // clean JSON 404 the front-end shows as an "église introuvable" screen.
        $exceptions->render(function (TenantCouldNotBeIdentifiedException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Aucune église ne correspond à cette adresse.',
                ], 404);
            }

            return null;
        });
    })->create();

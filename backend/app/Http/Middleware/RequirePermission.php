<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('permission:cms.pages.manage') — checked against the user's roles in the current tenant.
 * Use "a|b" to allow any one of several permissions.
 */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $tenant = $request->attributes->get('tenant');
        $held = $tenant && $request->user() ? $request->user()->permissionsIn($tenant) : [];

        if (!array_intersect(explode('|', $permission), $held)) {
            return response()->json(['success' => false, 'message' => 'You do not have permission to do this.'], 403);
        }

        return $next($request);
    }
}

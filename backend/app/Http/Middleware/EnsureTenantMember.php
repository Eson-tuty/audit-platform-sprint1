<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Requires an authenticated, active user with an active membership in the resolved tenant. */
class EnsureTenantMember
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $tenant = $request->attributes->get('tenant');

        if (!$user || !$tenant || !$user->is_active || !$user->isActiveMemberOf($tenant)) {
            return response()->json(['success' => false, 'message' => 'You do not have access to this workspace.'], 403);
        }

        return $next($request);
    }
}

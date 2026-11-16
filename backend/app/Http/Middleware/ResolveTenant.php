<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        // Resolve only from a verified host-to-tenant mapping.
        // Do not accept an arbitrary tenant_id header/query parameter as authority.
        $host = strtolower($request->getHost());

        $domain = DB::table('tenant_domains')
            ->where('host', $host)
            ->where('is_verified', true)
            ->first();

        if (!$domain) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant could not be resolved for this domain.',
            ], 404);
        }

        $tenant = Tenant::query()
            ->whereKey($domain->tenant_id)
            ->where('status', 'active')
            ->first();

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant is unavailable.',
            ], 404);
        }

        app()->instance('currentTenant', $tenant);
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }
}

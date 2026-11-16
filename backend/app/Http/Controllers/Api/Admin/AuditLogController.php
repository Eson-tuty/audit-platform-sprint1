<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $logs = AuditLog::query()
            ->where('tenant_id', $tenant->id)
            ->when($request->query('event'), fn ($q, $e) => $q->where('event', 'like', "$e%"))
            ->with('user:id,name,email')
            ->latest('created_at')->latest('id')
            ->paginate(30);

        return response()->json($logs->toArray() + [
            'events' => AuditLog::where('tenant_id', $tenant->id)->distinct()->orderBy('event')->pluck('event'),
        ]);
    }
}

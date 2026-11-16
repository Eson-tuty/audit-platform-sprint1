<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CmsLead;
use App\Models\CmsPage;
use App\Models\UniversityResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $leadsByDay = CmsLead::query()
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->get(['created_at'])
            ->groupBy(fn ($l) => $l->created_at->toDateString())
            ->map->count();

        $series = collect(range(29, 0))->map(function ($d) use ($leadsByDay) {
            $date = now()->subDays($d)->toDateString();

            return ['date' => $date, 'leads' => $leadsByDay[$date] ?? 0];
        });

        return response()->json(['data' => [
            'counts' => [
                'leads_total' => CmsLead::count(),
                'leads_new' => CmsLead::where('status', 'new')->count(),
                'pages_published' => CmsPage::where('status', 'published')->count(),
                'pages_total' => CmsPage::count(),
                'resources_published' => UniversityResource::where('status', 'published')->count(),
                'resources_total' => UniversityResource::count(),
            ],
            'leads_series' => $series,
            'recent_leads' => CmsLead::latest()->limit(5)->get(['id', 'name', 'company', 'email', 'status', 'source', 'created_at']),
            'recent_activity' => AuditLog::where('tenant_id', $tenant->id)->with('user:id,name')
                ->latest('created_at')->limit(8)->get(['id', 'user_id', 'event', 'auditable_type', 'auditable_id', 'created_at']),
        ]]);
    }
}

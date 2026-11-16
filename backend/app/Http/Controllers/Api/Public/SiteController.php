<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CmsLead;
use App\Models\CmsPage;
use App\Models\UniversityResource;
use App\Services\AuditLogger;
use App\Support\SiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    public function settings(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $navPages = CmsPage::query()
            ->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))
            ->orderBy('title')
            ->get(['title', 'slug']);

        return response()->json([
            'data' => SiteSettings::for($tenant) + ['pages' => $navPages],
        ]);
    }

    public function page(string $slug): JsonResponse
    {
        $page = CmsPage::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))
            ->with('latestVersion')
            ->firstOrFail();

        return response()->json(['data' => [
            'title' => $page->title,
            'slug' => $page->slug,
            'template' => $page->template,
            'sections' => $page->latestVersion?->content ?? [],
            'seo' => $page->latestVersion?->seo ?? [],
            'published_at' => $page->published_at,
        ]]);
    }

    public function university(): JsonResponse
    {
        $items = UniversityResource::query()
            ->where('status', 'published')
            ->orderBy('category')->orderBy('sort_order')->orderBy('title')
            ->get(['id', 'title', 'slug', 'category', 'type', 'tool_key', 'summary', 'reviewed_at']);

        return response()->json(['data' => $items]);
    }

    public function universityResource(string $slug): JsonResponse
    {
        $item = UniversityResource::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();

        $related = UniversityResource::query()
            ->where('status', 'published')
            ->whereKeyNot($item->id)
            ->orderByRaw('CASE WHEN category = ? THEN 0 ELSE 1 END', [$item->category])
            ->orderBy('sort_order')
            ->limit(4)
            ->get(['title', 'slug', 'category', 'type', 'summary']);

        return response()->json(['data' => $item->makeHidden(['tenant_id', 'created_by', 'deleted_at']), 'related' => $related]);
    }

    public function storeLead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company' => ['nullable', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:5000'],
            'source' => ['nullable', 'string', 'max:60'],
            'website' => ['prohibited'], // honeypot — bots fill every field
        ]);

        $lead = CmsLead::create([
            ...$data,
            'source' => $data['source'] ?? 'website',
            'status' => 'new',
            'metadata' => ['referrer' => substr((string) $request->headers->get('referer'), 0, 500)],
        ]);

        AuditLogger::record('lead.created', $lead, null, ['source' => $lead->source]);

        return response()->json(['success' => true, 'message' => 'Thanks — we will be in touch shortly.'], 201);
    }
}

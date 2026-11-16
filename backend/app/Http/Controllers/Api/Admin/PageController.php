<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Models\CmsPageVersion;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PageController extends Controller
{
    public const SECTION_TYPES = ['hero', 'rich_text', 'features', 'stats', 'faq', 'cta'];

    public function index(Request $request): JsonResponse
    {
        $pages = CmsPage::query()
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($q) => $q->where('title', 'like', "%$s%")->orWhere('slug', 'like', "%$s%")))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->withCount('versions')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $pages]);
    }

    public function show(CmsPage $page): JsonResponse
    {
        $page->load('latestVersion');
        $versions = $page->versions()->get(['id', 'version', 'created_by', 'created_at']);

        return response()->json(['data' => $page, 'versions' => $versions]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $page = DB::transaction(function () use ($data, $request) {
            $page = CmsPage::create([
                ...collect($data)->only(['title', 'slug', 'status', 'template'])->all(),
                'published_at' => $data['status'] === 'published' ? ($data['published_at'] ?? now()) : ($data['published_at'] ?? null),
                'created_by' => $request->user()->id,
            ]);
            $this->addVersion($page, $data, $request->user()->id);

            return $page;
        });

        AuditLogger::record('cms.page.created', $page, null, $page->only(['title', 'slug', 'status']));

        return response()->json(['data' => $page->load('latestVersion')], 201);
    }

    public function update(Request $request, CmsPage $page): JsonResponse
    {
        $data = $this->validated($request, $page);
        $before = $page->only(['title', 'slug', 'status', 'template', 'published_at']);

        DB::transaction(function () use ($page, $data, $request) {
            $publishedAt = $data['published_at'] ?? $page->published_at;
            if ($data['status'] === 'published' && !$publishedAt) {
                $publishedAt = now();
            }

            $page->update([
                ...collect($data)->only(['title', 'slug', 'status', 'template'])->all(),
                'published_at' => $publishedAt,
            ]);

            $latest = $page->latestVersion;
            if (!$latest || $latest->content != $data['sections'] || $latest->seo != ($data['seo'] ?? [])) {
                $this->addVersion($page, $data, $request->user()->id);
            }
        });

        [$b, $a] = AuditLogger::diff($before, $page->fresh()->only(array_keys($before)));
        AuditLogger::record('cms.page.updated', $page, $b, $a);

        return response()->json(['data' => $page->fresh('latestVersion')]);
    }

    public function restoreVersion(Request $request, CmsPage $page, int $version): JsonResponse
    {
        $old = $page->versions()->where('version', $version)->firstOrFail();
        $this->addVersion($page, ['sections' => $old->content, 'seo' => $old->seo], $request->user()->id);
        AuditLogger::record('cms.page.version_restored', $page, null, null, ['restored_version' => $version]);

        return response()->json(['data' => $page->fresh('latestVersion')]);
    }

    public function destroy(CmsPage $page): JsonResponse
    {
        $page->delete();
        AuditLogger::record('cms.page.deleted', $page, $page->only(['title', 'slug']));

        return response()->json(['success' => true]);
    }

    private function addVersion(CmsPage $page, array $data, int $userId): void
    {
        CmsPageVersion::create([
            'tenant_id' => $page->tenant_id,
            'cms_page_id' => $page->id,
            'version' => (int) $page->versions()->max('version') + 1,
            'content' => array_values($data['sections'] ?? []),
            'seo' => $data['seo'] ?? [],
            'created_by' => $userId,
        ]);
    }

    private function validated(Request $request, ?CmsPage $page = null): array
    {
        $tenantId = $request->attributes->get('tenant')->id;

        return $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'slug' => [
                'required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(['admin', 'university', 'contact', 'login', 'api']),
                Rule::unique('cms_pages')->where('tenant_id', $tenantId)->whereNull('deleted_at')->ignore($page?->id),
            ],
            'status' => ['required', Rule::in(CmsPage::STATUSES)],
            'template' => ['nullable', 'string', 'max:40'],
            'published_at' => ['nullable', 'date'],
            'sections' => ['present', 'array', 'max:40'],
            'sections.*.type' => ['required', Rule::in(self::SECTION_TYPES)],
            'seo' => ['nullable', 'array'],
            'seo.title' => ['nullable', 'string', 'max:190'],
            'seo.description' => ['nullable', 'string', 'max:300'],
        ]) + ['template' => 'default'];
    }
}

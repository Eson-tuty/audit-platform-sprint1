<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UniversityResource;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UniversityController extends Controller
{
    /** Interactive tools the frontend knows how to render. */
    public const TOOL_KEYS = ['fieldwork-tracker', 'sample-size-calculator', 'materiality-calculator'];

    public function index(Request $request): JsonResponse
    {
        $items = UniversityResource::query()
            ->when($request->query('search'), fn ($q, $s) => $q->where('title', 'like', "%$s%"))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('category'), fn ($q, $s) => $q->where('category', $s))
            ->orderBy('category')->orderBy('sort_order')
            ->get(['id', 'title', 'slug', 'category', 'type', 'tool_key', 'status', 'sort_order', 'reviewed_at', 'updated_at']);

        return response()->json([
            'data' => $items,
            'meta' => [
                'categories' => UniversityResource::query()->distinct()->orderBy('category')->pluck('category'),
                'types' => UniversityResource::TYPES,
                'tool_keys' => self::TOOL_KEYS,
            ],
        ]);
    }

    public function show(UniversityResource $resource): JsonResponse
    {
        return response()->json(['data' => $resource]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $resource = UniversityResource::create($data + [
            'created_by' => $request->user()->id,
            'published_at' => $data['status'] === 'published' ? now() : null,
        ]);
        AuditLogger::record('university.created', $resource, null, $resource->only(['title', 'slug', 'status']));

        return response()->json(['data' => $resource], 201);
    }

    public function update(Request $request, UniversityResource $resource): JsonResponse
    {
        $data = $this->validated($request, $resource);
        $before = $resource->only(array_keys($data));

        if ($data['status'] === 'published' && !$resource->published_at) {
            $data['published_at'] = now();
        }
        $resource->update($data);

        [$b, $a] = AuditLogger::diff($before, $resource->only(array_keys($before)));
        AuditLogger::record('university.updated', $resource, $b, $a);

        return response()->json(['data' => $resource]);
    }

    public function destroy(UniversityResource $resource): JsonResponse
    {
        $resource->delete();
        AuditLogger::record('university.deleted', $resource, $resource->only(['title', 'slug']));

        return response()->json(['success' => true]);
    }

    private function validated(Request $request, ?UniversityResource $resource = null): array
    {
        $tenantId = $request->attributes->get('tenant')->id;

        return $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'slug' => [
                'required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('university_resources')->where('tenant_id', $tenantId)->whereNull('deleted_at')->ignore($resource?->id),
            ],
            'category' => ['required', 'string', 'max:60'],
            'type' => ['required', Rule::in(UniversityResource::TYPES)],
            'tool_key' => ['nullable', Rule::in(self::TOOL_KEYS)],
            'summary' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:100000'],
            'faqs' => ['nullable', 'array', 'max:30'],
            'faqs.*.q' => ['required', 'string', 'max:300'],
            'faqs.*.a' => ['required', 'string', 'max:3000'],
            'sources' => ['nullable', 'array', 'max:20'],
            'sources.*.label' => ['required', 'string', 'max:300'],
            'sources.*.url' => ['nullable', 'url', 'max:500'],
            'seo' => ['nullable', 'array'],
            'seo.title' => ['nullable', 'string', 'max:190'],
            'seo.description' => ['nullable', 'string', 'max:300'],
            'status' => ['required', Rule::in(UniversityResource::STATUSES)],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'reviewed_at' => ['nullable', 'date'],
        ]);
    }
}

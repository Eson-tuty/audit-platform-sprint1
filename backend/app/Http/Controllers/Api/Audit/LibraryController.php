<?php

namespace App\Http\Controllers\Api\Audit;

use App\Http\Controllers\Controller;
use App\Models\AuditControl;
use App\Models\AuditProcess;
use App\Models\AuditRisk;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Risk & control matrix (RCM) library: process → risks → controls → checks.
 * Engagements copy from this library when a process is added, so edits here affect future engagements only.
 */
class LibraryController extends Controller
{
    public function index(): JsonResponse
    {
        $processes = AuditProcess::with('risks.controls.checks')->orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['data' => $processes]);
    }

    // ---- Processes -----------------------------------------------------------

    public function storeProcess(Request $request): JsonResponse
    {
        $process = AuditProcess::create($this->processData($request) + ['sort_order' => (int) AuditProcess::max('sort_order') + 1]);
        AuditLogger::record('rcm.process_created', $process, null, $process->only(['code', 'name']));

        return response()->json(['data' => $process], 201);
    }

    public function updateProcess(Request $request, AuditProcess $process): JsonResponse
    {
        $data = $this->processData($request);
        $before = $process->only(array_keys($data));
        $process->update($data);
        [$b, $a] = AuditLogger::diff($before, $process->only(array_keys($before)));
        AuditLogger::record('rcm.process_updated', $process, $b, $a);

        return response()->json(['data' => $process]);
    }

    public function destroyProcess(AuditProcess $process): JsonResponse
    {
        $process->delete();
        AuditLogger::record('rcm.process_deleted', $process, $process->only(['code', 'name']));

        return response()->json(['success' => true]);
    }

    // ---- Risks ---------------------------------------------------------------

    public function storeRisk(Request $request, AuditProcess $process): JsonResponse
    {
        $risk = $process->risks()->create($this->riskData($request) + [
            'tenant_id' => $process->tenant_id,
            'sort_order' => (int) $process->risks()->max('sort_order') + 1,
        ]);
        AuditLogger::record('rcm.risk_created', $risk, null, $risk->only(['code', 'title', 'rating']), ['process' => $process->name]);

        return response()->json(['data' => $risk], 201);
    }

    public function updateRisk(Request $request, AuditRisk $risk): JsonResponse
    {
        $data = $this->riskData($request);
        $before = $risk->only(array_keys($data));
        $risk->update($data);
        [$b, $a] = AuditLogger::diff($before, $risk->only(array_keys($before)));
        AuditLogger::record('rcm.risk_updated', $risk, $b, $a);

        return response()->json(['data' => $risk]);
    }

    public function destroyRisk(AuditRisk $risk): JsonResponse
    {
        $risk->delete();
        AuditLogger::record('rcm.risk_deleted', $risk, $risk->only(['code', 'title']));

        return response()->json(['success' => true]);
    }

    // ---- Controls (with their checks) ----------------------------------------

    public function storeControl(Request $request, AuditRisk $risk): JsonResponse
    {
        $data = $this->controlData($request);
        $control = DB::transaction(function () use ($risk, $data) {
            $control = $risk->controls()->create(collect($data)->except('checks')->all() + [
                'tenant_id' => $risk->tenant_id,
                'sort_order' => (int) $risk->controls()->max('sort_order') + 1,
            ]);
            $this->syncChecks($control, $data['checks'] ?? []);

            return $control;
        });
        AuditLogger::record('rcm.control_created', $control, null, $control->only(['code', 'title']) + ['checks' => count($data['checks'] ?? [])]);

        return response()->json(['data' => $control->load('checks')], 201);
    }

    public function updateControl(Request $request, AuditControl $control): JsonResponse
    {
        $data = $this->controlData($request);
        $fields = collect($data)->except('checks')->all();
        $before = $control->only(array_keys($fields)) + ['checks' => $control->checks->pluck('description')->all()];

        DB::transaction(function () use ($control, $fields, $data) {
            $control->update($fields);
            $this->syncChecks($control, $data['checks'] ?? []);
        });

        $control->load('checks');
        $after = $control->only(array_keys($fields)) + ['checks' => $control->checks->pluck('description')->all()];
        [$b, $a] = AuditLogger::diff($before, $after);
        AuditLogger::record('rcm.control_updated', $control, $b, $a);

        return response()->json(['data' => $control]);
    }

    public function destroyControl(AuditControl $control): JsonResponse
    {
        $control->delete();
        AuditLogger::record('rcm.control_deleted', $control, $control->only(['code', 'title']));

        return response()->json(['success' => true]);
    }

    /** Replace the control's checklist with the submitted ordered list (existing ids are kept). */
    private function syncChecks(AuditControl $control, array $checks): void
    {
        $keep = [];
        foreach (array_values($checks) as $i => $check) {
            $row = !empty($check['id']) ? $control->checks()->whereKey($check['id'])->first() : null;
            if ($row) {
                $row->update(['description' => $check['description'], 'sort_order' => $i]);
            } else {
                $row = $control->checks()->create(['tenant_id' => $control->tenant_id, 'description' => $check['description'], 'sort_order' => $i]);
            }
            $keep[] = $row->id;
        }
        $control->checks()->whereNotIn('id', $keep)->delete();
    }

    private function processData(Request $request): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function riskData(Request $request): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'title' => ['required', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'rating' => ['required', Rule::in(AuditRisk::RATINGS)],
        ]);
    }

    private function controlData(Request $request): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'title' => ['required', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'nature' => ['nullable', Rule::in(AuditControl::NATURES)],
            'control_type' => ['nullable', Rule::in(AuditControl::TYPES)],
            'frequency' => ['nullable', Rule::in(AuditControl::FREQUENCIES)],
            'owner' => ['nullable', 'string', 'max:120'],
            'is_key' => ['boolean'],
            'checks' => ['array', 'max:50'],
            'checks.*.id' => ['nullable', 'integer'],
            'checks.*.description' => ['required', 'string', 'max:1000'],
        ]);
    }
}

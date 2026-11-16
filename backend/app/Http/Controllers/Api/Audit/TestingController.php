<?php

namespace App\Http\Controllers\Api\Audit;

use App\Http\Controllers\Controller;
use App\Models\ControlTest;
use App\Models\EngagementProcess;
use App\Services\AuditLogger;
use App\Services\AuditWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Step III — the assigned resource tests each control of a process. */
class TestingController extends Controller
{
    /** Processes assigned to the signed-in user, newest period first. */
    public function myWork(Request $request): JsonResponse
    {
        $eps = EngagementProcess::with(['engagement.client:id,name', 'assignee:id,name'])
            ->where('assigned_to', $request->user()->id)
            ->whereHas('engagement')
            ->get()
            ->sortBy([fn ($a, $b) => strcmp((string) $b->engagement->period_start, (string) $a->engagement->period_start)]);
        $counts = AuditWorkflow::processCounts($eps->pluck('id')->all());

        return response()->json(['data' => $eps->map(fn ($ep) => AuditWorkflow::presentProcess($ep, $counts[$ep->id] ?? []) + [
            'client' => $ep->engagement->client?->name,
            'engagement_label' => $ep->engagement->label,
        ])->values()]);
    }

    /** Testing workspace: process → risks → controls (with checks and results). */
    public function showProcess(Request $request, EngagementProcess $engagementProcess): JsonResponse
    {
        $ep = $engagementProcess->load(['engagement.client:id,name', 'assignee:id,name', 'tests.tester:id,name']);
        $counts = AuditWorkflow::processCounts([$ep->id]);

        $risks = $ep->tests->groupBy(fn ($t) => $t->snapshot['risk_id'])->map(function ($group) {
            $s = $group->first()->snapshot;

            return [
                'risk_id' => $s['risk_id'],
                'code' => $s['risk_code'],
                'title' => $s['risk_title'],
                'description' => $s['risk_description'] ?? null,
                'rating' => $s['risk_rating'],
                'order' => $s['risk_order'] ?? 0,
                'controls' => $group->map(fn ($t) => AuditWorkflow::presentTest($t))->values(),
            ];
        })->sortBy('order')->values();

        return response()->json(['data' => [
            'process' => AuditWorkflow::presentProcess($ep, $counts[$ep->id] ?? []),
            'engagement' => $ep->engagement->only(['id', 'label', 'fy_label', 'period', 'audit_type', 'status', 'period_start', 'period_end']) + ['client' => $ep->engagement->client?->name],
            'risks' => $risks,
            'can_test' => AuditWorkflow::canTest($request, $ep),
        ]]);
    }

    /** Record population, sample, checks and pass/fail; a failure raises a query. */
    public function update(Request $request, ControlTest $controlTest): JsonResponse
    {
        $ep = $controlTest->engagementProcess;
        if (!AuditWorkflow::canTest($request, $ep)) {
            return response()->json(['message' => 'Only the person assigned to this process (or a manager) can record testing.'], 403);
        }
        if (!empty($controlTest->retests)) {
            return response()->json(['message' => 'This query already has retest history. Record a retest instead of changing the original result.'], 422);
        }

        $checkIds = collect($controlTest->snapshot['checks'] ?? [])->pluck('id')->map(fn ($id) => (string) $id)->all();
        $data = $request->validate([
            'population' => ['nullable', 'integer', 'min:0', 'max:1000000000', 'required_with:result'],
            'sample_size' => ['nullable', 'integer', 'min:0', 'max:1000000000', 'required_with:result'],
            'result' => ['nullable', Rule::in(ControlTest::RESULTS)],
            'check_results' => ['nullable', 'array'],
            'check_results.*' => ['boolean'],
            'test_notes' => ['nullable', 'string', 'max:5000'],
            'failure_reason' => ['nullable', 'required_if:result,fail', 'string', 'max:5000'],
            'failed_samples' => ['nullable', 'required_if:result,fail', 'integer', 'min:1'],
            'management_response' => ['nullable', 'required_if:result,fail', 'string', 'max:5000'],
            'target_date' => ['nullable', 'required_if:result,fail', 'date'],
            'responsible_person' => ['nullable', 'required_if:result,fail', 'string', 'max:150'],
        ], [
            'population.required_with' => 'Enter the total population before recording a result.',
            'sample_size.required_with' => 'Enter how many samples were tested.',
            '*.required_if' => 'Required when the control fails.',
        ]);

        if (isset($data['population'], $data['sample_size']) && $data['sample_size'] > $data['population']) {
            throw ValidationException::withMessages(['sample_size' => 'The sample cannot be larger than the population.']);
        }
        if (($data['result'] ?? null) === 'fail' && $data['failed_samples'] > ($data['sample_size'] ?? 0)) {
            throw ValidationException::withMessages(['failed_samples' => 'Failed samples cannot exceed the samples tested.']);
        }
        $data['check_results'] = collect($data['check_results'] ?? [])->only($checkIds)->map(fn ($v) => (bool) $v)->all();

        if (($data['result'] ?? null) !== 'fail') {
            // Passing (or untested) controls carry no query.
            $data = array_merge($data, array_fill_keys(['failure_reason', 'failed_samples', 'management_response', 'target_date', 'responsible_person'], null));
        }

        $before = $controlTest->only(['population', 'sample_size', 'result', 'failure_reason', 'failed_samples', 'management_response', 'target_date', 'responsible_person']);
        $before['target_date'] = $controlTest->target_date?->format('Y-m-d');

        $controlTest->fill($data);
        if ($controlTest->isDirty('result')) {
            $controlTest->tested_by = $controlTest->result ? $request->user()->id : null;
            $controlTest->tested_at = $controlTest->result ? now() : null;
        }
        $controlTest->query_status = $controlTest->result === 'fail' ? 'open' : null;
        $controlTest->save();

        AuditWorkflow::refreshProcess($ep);
        AuditWorkflow::refreshEngagement($ep->engagement);

        $after = $controlTest->only(array_keys($before));
        $after['target_date'] = $controlTest->target_date?->format('Y-m-d');
        [$b, $a] = AuditLogger::diff($before, $after);
        if ($b || $a) {
            AuditLogger::record(
                $before['result'] !== 'fail' && $controlTest->result === 'fail' ? 'testing.query_raised' : 'testing.recorded',
                $controlTest, $b, $a,
                ['control' => $controlTest->snapshot['control_code'] ?? null, 'process' => $ep->process_name],
            );
        }

        return response()->json(['data' => [
            'test' => AuditWorkflow::presentTest($controlTest->load('tester:id,name')),
            'process_status' => $ep->fresh()->status,
        ]]);
    }

    /** Retest an open query on/after its closure date. Pass closes it; fail keeps it open with a new date. */
    public function retest(Request $request, ControlTest $controlTest): JsonResponse
    {
        if (!AuditWorkflow::canTest($request, $controlTest->engagementProcess)) {
            return response()->json(['message' => 'Only the person assigned to this process (or a manager) can retest it.'], 403);
        }
        if ($controlTest->query_status !== 'open') {
            return response()->json(['message' => 'Only open queries can be retested.'], 422);
        }

        $data = $request->validate([
            'result' => ['required', Rule::in(ControlTest::RESULTS)],
            'sample_size' => ['nullable', 'integer', 'min:0'],
            'notes' => ['required', 'string', 'max:5000'],
            'new_target_date' => ['nullable', 'required_if:result,fail', 'date', 'after:today'],
        ], ['new_target_date.required_if' => 'Set a new closure date when the retest fails.']);

        $entry = [
            'at' => now()->toIso8601String(),
            'by' => $request->user()->name,
            'by_id' => $request->user()->id,
            'result' => $data['result'],
            'sample_size' => $data['sample_size'] ?? null,
            'notes' => $data['notes'],
            'previous_target_date' => $controlTest->target_date?->format('Y-m-d'),
        ];
        $controlTest->retests = [...($controlTest->retests ?? []), $entry];

        if ($data['result'] === 'pass') {
            $controlTest->query_status = 'closed';
            $controlTest->closed_at = now();
        } else {
            $controlTest->target_date = $data['new_target_date'];
        }
        $controlTest->save();

        AuditLogger::record(
            $data['result'] === 'pass' ? 'testing.query_closed' : 'testing.retest_failed',
            $controlTest,
            ['query_status' => 'open', 'target_date' => $entry['previous_target_date']],
            ['query_status' => $controlTest->query_status, 'target_date' => $controlTest->target_date?->format('Y-m-d')],
            ['reference' => $controlTest->reference()],
        );

        return response()->json(['data' => AuditWorkflow::presentTest($controlTest->load('tester:id,name'))]);
    }
}

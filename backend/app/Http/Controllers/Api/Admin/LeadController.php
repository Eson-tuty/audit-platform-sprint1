<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsLead;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $leads = $this->filtered($request)->orderByDesc('created_at')->paginate(25);

        return response()->json($leads->toArray() + [
            'statuses' => CmsLead::STATUSES,
            'counts' => CmsLead::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function update(Request $request, CmsLead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(CmsLead::STATUSES)],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $before = $lead->only(['status']);
        $metadata = $lead->metadata ?? [];
        if (!empty($data['note'])) {
            $metadata['notes'][] = ['by' => $request->user()->name, 'at' => now()->toIso8601String(), 'text' => $data['note']];
        }
        $lead->update(['status' => $data['status'], 'metadata' => $metadata]);
        AuditLogger::record('lead.updated', $lead, $before, $lead->only(['status']));

        return response()->json(['data' => $lead]);
    }

    public function destroy(CmsLead $lead): JsonResponse
    {
        $lead->delete();
        AuditLogger::record('lead.deleted', $lead, $lead->only(['name', 'email', 'status']));

        return response()->json(['success' => true]);
    }

    public function export(Request $request): StreamedResponse
    {
        $leads = $this->filtered($request)->orderByDesc('created_at')->get();
        AuditLogger::record('lead.exported', null, null, null, ['count' => $leads->count()]);

        return response()->streamDownload(function () use ($leads) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Message']);
            foreach ($leads as $l) {
                fputcsv($out, array_map([$this, 'csvSafe'], [
                    $l->created_at->toDateTimeString(), $l->name, $l->email, $l->phone, $l->company, $l->source, $l->status, $l->message,
                ]));
            }
            fclose($out);
        }, 'leads-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** Prevent CSV/formula injection when the export is opened in a spreadsheet. */
    private function csvSafe(?string $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }

    private function filtered(Request $request)
    {
        return CmsLead::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('company', 'like', "%$s%")));
    }
}

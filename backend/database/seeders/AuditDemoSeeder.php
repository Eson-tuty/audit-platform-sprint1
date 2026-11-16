<?php

namespace Database\Seeders;

use App\Models\AuditProcess;
use App\Models\Client;
use App\Models\ControlTest;
use App\Models\Engagement;
use App\Models\EngagementProcess;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditWorkflow;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Starter RCM library, two demo clients, three team members and three engagements
 * in different states (completed + report-ready, in progress, just started).
 * Skips everything if the tenant already has an RCM library.
 */
class AuditDemoSeeder extends Seeder
{
    public function run(Tenant $tenant, User $owner): void
    {
        if (AuditProcess::where('tenant_id', $tenant->id)->exists()) {
            return;
        }

        $this->seedLibrary($tenant);
        $team = $this->seedTeam($tenant);

        $northwind = Client::create([
            'tenant_id' => $tenant->id, 'name' => 'Northwind Manufacturing Ltd', 'code' => 'NWM', 'industry' => 'Manufacturing',
            'contact_name' => 'Finance Controller', 'contact_email' => 'finance@northwind.example', 'status' => 'active', 'created_by' => $owner->id,
        ]);
        $bluepeak = Client::create([
            'tenant_id' => $tenant->id, 'name' => 'Bluepeak Retail Pvt Ltd', 'code' => 'BPR', 'industry' => 'Retail',
            'contact_name' => 'CFO Office', 'contact_email' => 'cfo@bluepeak.example', 'status' => 'active', 'created_by' => $owner->id,
        ]);

        $fy = Engagement::fiscalYearOf(now());
        $proc = fn (string $code) => AuditProcess::where('tenant_id', $tenant->id)->where('code', $code)->value('id');

        // 1) Last quarter — fully tested, report ready, with open and closed queries.
        $q2 = $this->engagement($tenant, $owner, $northwind, 'internal', 'quarterly', $fy, 'Q2');
        $this->assign($q2, $proc('P2P'), $team['auditor1'], '2026-10-15');
        $this->assign($q2, $proc('PAY'), $team['auditor2'], '2026-10-15');
        $this->assign($q2, $proc('ITGC'), $team['auditor1'], '2026-10-20');
        $this->record($q2, 1.0, [
            'P2P-C2' => ['closed', '2026-10-31', 'Vendor master change log for August was not reviewed; 2 of 6 changes (bank detail updates) lacked independent review.', 2, 'Review will be performed monthly by the Procurement Head with sign-off evidence retained.', 'Procurement Head'],
            'PAY-C2' => ['open', '2026-11-10', 'Headcount reconciliation for July not prepared; 1 exit employee was paid salary for August.', 1, 'Recovery initiated; reconciliation checklist added to the monthly payroll calendar.', 'HR Operations Manager'],
            'ITGC-C2' => ['open', '2026-11-20', 'Quarterly user access review not completed for the ERP; 4 users with access after leaving.', 4, 'Access revoked immediately; IT will complete the review by the next quarter end.', 'IT Manager'],
        ]);

        // 2) Current quarter — in progress.
        $q3 = $this->engagement($tenant, $owner, $northwind, 'internal', 'quarterly', $fy, 'Q3');
        $this->assign($q3, $proc('P2P'), $team['auditor1'], '2027-01-15');
        $this->assign($q3, $proc('O2C'), $team['auditor2'], '2027-01-15');
        $this->assign($q3, $proc('INV'), $team['auditor1'], '2027-01-20');
        $this->record($q3, 0.5, [
            'INV-C1' => ['open', '2026-12-31', 'Physical verification differences at the Pune warehouse were not reconciled; 3 of 10 SKUs had unexplained shortages.', 3, 'Stores and finance will reconcile differences and write off approved shortages before year end.', 'Warehouse Manager'],
        ]);

        // 3) Statutory annual audit for the previous fiscal year — just started.
        $fy25 = $this->engagement($tenant, $owner, $bluepeak, 'statutory', 'annual', $fy - 1, 'FY');
        $this->assign($fy25, $proc('FIN'), $team['manager'], '2026-12-15');
        $this->assign($fy25, $proc('O2C'), $team['auditor2'], '2026-12-15');
        $this->record($fy25, 0.3, []);
    }

    private function seedTeam(Tenant $tenant): array
    {
        $people = [
            'manager' => ['Riya Sharma', 'manager@example.test', 'manager'],
            'auditor1' => ['Arjun Mehta', 'auditor@example.test', 'auditor'],
            'auditor2' => ['Neha Iyer', 'auditor2@example.test', 'auditor'],
        ];
        $out = [];
        foreach ($people as $key => [$name, $email, $role]) {
            $user = User::firstOrCreate(['email' => $email], [
                'name' => $name, 'password' => Hash::make('ChangeMe-Immediately-123!'), 'is_active' => true,
            ]);
            DB::table('tenant_user')->updateOrInsert(
                ['tenant_id' => $tenant->id, 'user_id' => $user->id],
                ['status' => 'active', 'joined_at' => now(), 'created_at' => now(), 'updated_at' => now()]
            );
            DB::table('tenant_user_roles')->updateOrInsert(
                ['tenant_id' => $tenant->id, 'user_id' => $user->id, 'role_id' => DB::table('roles')->where('tenant_id', $tenant->id)->where('slug', $role)->value('id')],
                ['created_at' => now(), 'updated_at' => now()]
            );
            $out[$key] = $user;
        }

        return $out;
    }

    private function engagement(Tenant $tenant, User $owner, Client $client, string $type, string $frequency, int $fy, string $period): Engagement
    {
        [$start, $end] = Engagement::periodDates($fy, $period);

        return Engagement::create([
            'tenant_id' => $tenant->id, 'client_id' => $client->id, 'audit_type' => $type, 'frequency' => $frequency,
            'fiscal_year' => $fy, 'period' => $period, 'period_start' => $start, 'period_end' => $end,
            'status' => 'planning', 'created_by' => $owner->id,
        ]);
    }

    private function assign(Engagement $e, int $processId, User $user, string $due): void
    {
        AuditWorkflow::addProcesses($e, [$processId], $user->id, $due);
    }

    /**
     * Record results on a share of each process's controls (1.0 = all).
     * $failures: control code => [query status, closure date, reason, failed samples, management response, responsible person].
     */
    private function record(Engagement $e, float $share, array $failures): void
    {
        $samples = ['daily' => 25, 'weekly' => 10, 'monthly' => 2, 'quarterly' => 1, 'half_yearly' => 1, 'annual' => 1, 'ad_hoc' => 15];
        $populations = ['daily' => 90, 'weekly' => 13, 'monthly' => 3, 'quarterly' => 1, 'half_yearly' => 1, 'annual' => 1, 'ad_hoc' => 120];
        $testedAt = CarbonImmutable::parse($e->period_end)->addDays(10);
        if ($testedAt->isFuture()) {
            $testedAt = CarbonImmutable::now()->subDays(3);
        }

        foreach ($e->processes()->with('tests')->get() as $ep) {
            $tests = $ep->tests;
            $take = (int) round($tests->count() * $share);
            foreach ($tests->take($take) as $t) {
                $s = $t->snapshot;
                $freq = $s['frequency'] ?? 'ad_hoc';
                $fail = $failures[$s['control_code']] ?? null;
                $sample = $samples[$freq] ?? 10;
                $checks = collect($s['checks'])->mapWithKeys(fn ($c) => [(string) $c['id'] => true])->all();

                $data = [
                    'population' => $populations[$freq] ?? 50,
                    'sample_size' => $sample,
                    'result' => $fail ? 'fail' : 'pass',
                    'check_results' => $checks,
                    'test_notes' => $fail ? null : 'Tested sample without exception.',
                    'tested_by' => $ep->assigned_to,
                    'tested_at' => $testedAt,
                ];
                if ($fail) {
                    [$status, $target, $reason, $failed, $response, $person] = $fail;
                    $data += [
                        'failure_reason' => $reason, 'failed_samples' => min($failed, $sample) ?: 1, 'management_response' => $response,
                        'target_date' => $target, 'responsible_person' => $person, 'query_status' => $status,
                    ];
                    if ($status === 'closed') {
                        $data['closed_at'] = CarbonImmutable::parse($target)->addDays(2);
                        $data['retests'] = [[
                            'at' => CarbonImmutable::parse($target)->addDays(2)->toIso8601String(),
                            'by' => $ep->assignee?->name, 'by_id' => $ep->assigned_to, 'result' => 'pass', 'sample_size' => $sample,
                            'notes' => 'Monthly review evidence for September and October inspected; no exceptions.',
                            'previous_target_date' => $target,
                        ]];
                    }
                }
                $t->update($data);
            }
            AuditWorkflow::refreshProcess($ep);
        }
        AuditWorkflow::refreshEngagement($e);
    }

    private function seedLibrary(Tenant $tenant): void
    {
        $library = [
            ['P2P', 'Procure to Pay', 'Vendor onboarding, purchasing, receipt of goods and payment.', [
                ['P2P-R1', 'Unauthorised or fictitious vendors are added to the vendor master', 'high', [
                    ['P2P-C1', 'New vendors are created only after approval by the Procurement Head with KYC documents on file', 'preventive', 'manual', 'ad_hoc', 'Procurement Head', [
                        'Obtain the list of vendors created during the period from the ERP',
                        'For each sample, inspect the approved vendor creation form',
                        'Verify PAN, GST and bank account proof are on file',
                        'Confirm the approver is authorised under the delegation of authority',
                    ]],
                    ['P2P-C2', 'Changes to vendor master data (especially bank details) are reviewed independently every month', 'detective', 'manual', 'monthly', 'Procurement Head', [
                        'Obtain the vendor master change log for the period',
                        'Check evidence of review and sign-off for each month',
                        'For bank detail changes, verify call-back confirmation with the vendor',
                    ]],
                ]],
                ['P2P-R2', 'Payments are made for goods not received or invoices are paid twice', 'high', [
                    ['P2P-C3', 'ERP enforces a three-way match (PO, goods receipt, invoice) before payment', 'preventive', 'automated', 'daily', 'Accounts Payable', [
                        'Inspect ERP configuration for three-way match and price/quantity tolerances',
                        'For a sample of payments, agree invoice quantity and price to PO and GRN',
                        'Confirm no manual override was used without approval',
                    ]],
                    ['P2P-C4', 'Duplicate invoice report is reviewed before each payment run', 'detective', 'it_dependent', 'weekly', 'AP Lead', [
                        'Re-run duplicate analysis on vendor, invoice number and amount',
                        'Investigate each flagged pair and confirm it was resolved before payment',
                    ]],
                ]],
                ['P2P-R3', 'Purchases are made without an approved purchase order', 'medium', [
                    ['P2P-C5', 'Purchase orders are approved according to the delegation of authority', 'preventive', 'manual', 'daily', 'Procurement', [
                        'Select a sample of POs across value bands',
                        'Verify the approver against the DoA matrix',
                        'Check the PO date precedes the invoice date',
                    ]],
                ]],
            ]],
            ['O2C', 'Order to Cash', 'Customer onboarding, pricing, invoicing, collections and receivables.', [
                ['O2C-R1', 'Revenue is recorded in the wrong period', 'high', [
                    ['O2C-C1', 'Period-end cut-off review of dispatches and invoices', 'detective', 'manual', 'quarterly', 'Financial Controller', [
                        'List dispatches 7 days either side of period end',
                        'Agree invoice dates to delivery proof',
                        'Confirm reversals for goods in transit',
                    ]],
                ]],
                ['O2C-R2', 'Sales are made at unauthorised prices or beyond credit limits', 'medium', [
                    ['O2C-C2', 'Changes to the price master are approved by the Sales Head', 'preventive', 'manual', 'ad_hoc', 'Sales Head', [
                        'Obtain price master change log',
                        'Inspect approval for a sample of changes',
                    ]],
                    ['O2C-C3', 'ERP blocks sales orders that exceed the customer credit limit', 'preventive', 'automated', 'daily', 'Credit Controller', [
                        'Inspect credit limit configuration',
                        'Attempt a test order above the limit or inspect the block log',
                        'Verify overrides were approved',
                    ]],
                ]],
                ['O2C-R3', 'Receivables are not recovered or not provided for', 'medium', [
                    ['O2C-C4', 'Monthly receivables ageing review with provisioning decisions', 'detective', 'manual', 'monthly', 'Financial Controller', [
                        'Obtain monthly ageing reports and review minutes',
                        'Verify provisioning follows policy for balances over 180 days',
                    ]],
                ]],
            ]],
            ['PAY', 'Payroll', 'Employee master, attendance, salary processing and disbursement.', [
                ['PAY-R1', 'Ghost employees are paid', 'high', [
                    ['PAY-C1', 'New joiners are added to payroll only with an HR-approved offer and identity verification', 'preventive', 'manual', 'ad_hoc', 'HR Operations', [
                        'Obtain the list of joiners for the period',
                        'Inspect approved offer letter and ID proof for each sample',
                    ]],
                    ['PAY-C2', 'Monthly headcount reconciliation between HR records and payroll', 'detective', 'manual', 'monthly', 'HR Operations', [
                        'Obtain reconciliations for each month in the period',
                        'Verify differences were investigated',
                        'Check leavers were removed from payroll on time',
                    ]],
                ]],
                ['PAY-R2', 'Salaries are paid incorrectly', 'medium', [
                    ['PAY-C3', 'Payroll variance report reviewed and approved before disbursement', 'detective', 'manual', 'monthly', 'Finance Manager', [
                        'Inspect variance reports and approval evidence',
                        'Re-perform the variance for one month',
                    ]],
                ]],
            ]],
            ['INV', 'Inventory', 'Stock movements, physical verification and valuation.', [
                ['INV-R1', 'Inventory is lost or misappropriated', 'high', [
                    ['INV-C1', 'Periodic physical verification with reconciliation of differences', 'detective', 'manual', 'quarterly', 'Warehouse Manager', [
                        'Attend or inspect the physical count sheets',
                        'Trace a sample of counts to the ERP',
                        'Verify differences were investigated and approved',
                    ]],
                ]],
                ['INV-R2', 'Slow-moving or obsolete stock is not provided for', 'medium', [
                    ['INV-C2', 'Quarterly slow-moving inventory analysis and provisioning', 'detective', 'manual', 'quarterly', 'Financial Controller', [
                        'Obtain the ageing analysis',
                        'Verify the provision follows the approved policy',
                    ]],
                ]],
            ]],
            ['FIN', 'Financial Close & Reporting', 'Journal entries, reconciliations and the month-end close.', [
                ['FIN-R1', 'Erroneous or unauthorised journal entries are posted', 'high', [
                    ['FIN-C1', 'Manual journal entries are approved by someone other than the preparer', 'preventive', 'manual', 'daily', 'Financial Controller', [
                        'Extract manual journals for the period',
                        'For a sample, verify supporting documents and independent approval',
                        'Check for journals posted by the approver themselves',
                    ]],
                ]],
                ['FIN-R2', 'Balances are not reconciled', 'medium', [
                    ['FIN-C2', 'Bank reconciliations are prepared and reviewed monthly', 'detective', 'manual', 'monthly', 'Treasury', [
                        'Obtain reconciliations for each bank account',
                        'Verify review sign-off and timely clearance of reconciling items',
                    ]],
                ]],
            ]],
            ['ITGC', 'IT General Controls', 'Access management, change management and operations for financial systems.', [
                ['ITGC-R1', 'Unauthorised users access financial systems', 'high', [
                    ['ITGC-C1', 'User access is granted only with an approved access request', 'preventive', 'manual', 'ad_hoc', 'IT Manager', [
                        'Obtain new user list from the ERP',
                        'Inspect approved access request for each sample',
                    ]],
                    ['ITGC-C2', 'Quarterly user access review by business owners', 'detective', 'manual', 'quarterly', 'IT Manager', [
                        'Obtain the review evidence',
                        'Verify leavers and role changes were actioned',
                    ]],
                ]],
                ['ITGC-R2', 'Unauthorised changes are made to systems', 'medium', [
                    ['ITGC-C3', 'Changes are tested and approved before moving to production', 'preventive', 'manual', 'ad_hoc', 'IT Manager', [
                        'Obtain the change log from the ticketing system',
                        'For a sample, inspect testing evidence and approval before deployment',
                    ]],
                ]],
            ]],
        ];

        foreach ($library as $pi => [$pCode, $pName, $pDesc, $risks]) {
            $process = AuditProcess::create(['tenant_id' => $tenant->id, 'code' => $pCode, 'name' => $pName, 'description' => $pDesc, 'sort_order' => $pi]);
            foreach ($risks as $ri => [$rCode, $rTitle, $rating, $controls]) {
                $risk = $process->risks()->create(['tenant_id' => $tenant->id, 'code' => $rCode, 'title' => $rTitle, 'rating' => $rating, 'sort_order' => $ri]);
                foreach ($controls as $ci => [$cCode, $cTitle, $nature, $type, $freq, $owner, $checks]) {
                    $control = $risk->controls()->create([
                        'tenant_id' => $tenant->id, 'code' => $cCode, 'title' => $cTitle, 'nature' => $nature, 'control_type' => $type,
                        'frequency' => $freq, 'owner' => $owner, 'is_key' => true, 'sort_order' => $ci,
                    ]);
                    foreach ($checks as $ki => $check) {
                        $control->checks()->create(['tenant_id' => $tenant->id, 'description' => $check, 'sort_order' => $ki]);
                    }
                }
            }
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\CmsLead;
use App\Models\CmsPage;
use App\Models\CmsPageVersion;
use App\Models\Tenant;
use App\Models\UniversityResource;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Sample website content so the public site and admin panel have something to show. Safe to re-run. */
class DemoContentSeeder extends Seeder
{
    public function run(Tenant $tenant, User $user): void
    {
        $this->pages($tenant, $user);
        $this->university($tenant, $user);
        $this->leads($tenant);
    }

    private function pages(Tenant $tenant, User $user): void
    {
        $pages = [
            'about' => ['About us', [
                ['type' => 'hero', 'eyebrow' => 'Company', 'title' => 'Built by auditors, for auditors', 'subtitle' => 'We spent a decade in audit fieldwork before writing a line of code. This platform is the workspace we wished we had.'],
                ['type' => 'rich_text', 'body' => "## Our approach\n\nAudit quality comes from judgment. Our job is to take the repetitive work — reconciliations, tick-marks, cross-references, chasing evidence — off your team's plate so they can spend their time on judgment.\n\n## Where we are\n\nWe are a small team based in Bengaluru, working with audit firms and internal audit functions across India."],
                ['type' => 'stats', 'items' => [['label' => 'Firms onboarded', 'value' => '120+'], ['label' => 'Engagements run', 'value' => '3,400'], ['label' => 'Working papers filed', 'value' => '210k']]],
                ['type' => 'cta', 'title' => 'See it on your own engagement', 'body' => 'Bring a trial balance; leave with a working-paper file.', 'button_label' => 'Book a demo', 'button_url' => '/contact'],
            ]],
            'security' => ['Trust & security', [
                ['type' => 'hero', 'eyebrow' => 'Trust', 'title' => 'Your client data stays your client data', 'subtitle' => 'Tenant isolation, role-based access and an immutable audit trail by default.'],
                ['type' => 'features', 'title' => 'Controls we operate', 'items' => [
                    ['title' => 'Tenant isolation', 'body' => 'Every record carries a tenant identifier and every query is scoped to your workspace.'],
                    ['title' => 'Role-based access', 'body' => 'Partners, managers, auditors and editors each see only what their role allows.'],
                    ['title' => 'Audit trail', 'body' => 'Sign-ins, edits, exports and permission changes are logged and cannot be edited.'],
                    ['title' => 'Encryption', 'body' => 'TLS in transit and encryption at rest for evidence and working papers.'],
                ]],
                ['type' => 'faq', 'title' => 'Common questions', 'items' => [
                    ['q' => 'Is our data used to train models?', 'a' => 'No. Client data is never used for training.'],
                    ['q' => 'Where is data hosted?', 'a' => 'In-region data centres. Contact us for residency requirements.'],
                ]],
            ]],
            'privacy' => ['Privacy policy', [
                ['type' => 'rich_text', 'body' => "# Privacy policy\n\n*Placeholder — replace with your reviewed policy before launch.*\n\nThis page explains what personal data we collect through this website, why, and how long we keep it."],
            ]],
            'terms' => ['Terms of service', [
                ['type' => 'rich_text', 'body' => "# Terms of service\n\n*Placeholder — replace with your reviewed terms before launch.*"],
            ]],
        ];

        foreach ($pages as $slug => [$title, $sections]) {
            $page = CmsPage::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $slug],
                ['title' => $title, 'status' => 'published', 'published_at' => now(), 'created_by' => $user->id]
            );
            if (!$page->versions()->exists()) {
                CmsPageVersion::create([
                    'tenant_id' => $tenant->id, 'cms_page_id' => $page->id, 'version' => 1,
                    'content' => $sections, 'seo' => ['title' => $title], 'created_by' => $user->id,
                ]);
            }
        }
    }

    private function university(Tenant $tenant, User $user): void
    {
        $items = [
            [
                'slug' => 'internal-audit-fieldwork-testing-tracker',
                'title' => 'Internal audit fieldwork testing tracker',
                'category' => 'Fieldwork', 'type' => 'tool', 'tool_key' => 'fieldwork-tracker', 'sort_order' => 1,
                'summary' => 'Track RCM tests, samples, evidence, exceptions, reviewer progress and report readiness — cycle by cycle. Export to Excel or PDF.',
                'body' => "## How the tracker works\n\nEach row is one control test from your risk and control matrix (RCM). Record the population, the sample you selected, who owes you evidence and where it stands, the result, and the reviewer's sign-off. The summary tiles and cycle cards recalculate as you go.\n\n## Worked example: procure-to-pay\n\nFor a vendor-master change control, the population is every vendor master change in the period (say 412). You select 25 using the sampling plan, request change tickets from the AP lead, and mark evidence *Received* as they arrive. One change lacks secondary approval — record it as an exception, rate it, and the cycle card flags it for the observation report.\n\n## Common mistakes\n\n- Marking a test *Complete* before evidence is fully received.\n- Recording exceptions in review notes instead of the exception column.\n- Leaving the reviewer blank until the end of fieldwork.\n- Testing a sample size that doesn't match the sampling plan.",
                'faqs' => [
                    ['q' => 'Is my data saved?', 'a' => 'The tracker runs in your browser and saves to your browser only. Export to Excel or PDF to keep a copy.'],
                    ['q' => 'Can I add my own cycles?', 'a' => 'Use any of the ten standard cycles; custom cycles are available in the full platform.'],
                    ['q' => 'Does this replace working papers?', 'a' => 'No — it is a status tracker. Your working papers still hold the testing detail.'],
                    ['q' => 'Is this professional advice?', 'a' => 'No. It is an informational tool; apply your own professional judgment.'],
                ],
                'sources' => [
                    ['label' => 'ICAI — Standards on Internal Audit', 'url' => 'https://www.icai.org/'],
                    ['label' => 'MCA — Companies (Accounts) Rules, 2014, Rule 13', 'url' => 'https://www.mca.gov.in/'],
                ],
            ],
            [
                'slug' => 'audit-sample-size-calculator',
                'title' => 'Audit sample size calculator',
                'category' => 'Planning', 'type' => 'tool', 'tool_key' => 'sample-size-calculator', 'sort_order' => 2,
                'summary' => 'Attribute-sampling sample sizes from confidence level, tolerable deviation rate and expected deviations.',
                'body' => "## When to use it\n\nUse attribute sampling for tests of controls, where each item either passes or fails. Pick the confidence you need, the deviation rate you can tolerate, and how many deviations you expect.\n\n## How it is calculated\n\nThe calculator uses the Poisson approximation to find the smallest sample in which the stated number of deviations still supports the conclusion at your chosen confidence.",
                'faqs' => [['q' => 'Can I use this for substantive testing?', 'a' => 'Not directly — monetary unit sampling suits substantive tests of balances better.']],
            ],
            [
                'slug' => 'materiality-calculator',
                'title' => 'Materiality calculator',
                'category' => 'Planning', 'type' => 'tool', 'tool_key' => 'materiality-calculator', 'sort_order' => 3,
                'summary' => 'Overall, performance and trivial thresholds from a benchmark and percentage, with common benchmark ranges.',
                'body' => "## Choosing a benchmark\n\nProfit before tax suits stable profit-oriented entities; revenue or total assets suit loss-making or asset-heavy entities. Document why the benchmark fits the users of the financial statements.",
            ],
            [
                'slug' => 'how-to-build-a-risk-control-matrix',
                'title' => 'How to build a risk & control matrix',
                'category' => 'Planning', 'type' => 'guide', 'sort_order' => 4,
                'summary' => 'A step-by-step guide to mapping process risks to key controls, assertions and test procedures.',
                'body' => "## 1. Walk the process\n\nStart from the process narrative or flowchart. Identify each point where something can go wrong.\n\n## 2. Write the risk\n\nPhrase each risk as *what could go wrong*, tied to an assertion.\n\n## 3. Map the control\n\nFor each risk, identify the control that prevents or detects it: owner, frequency, type (manual / automated), and nature (preventive / detective).\n\n## 4. Design the test\n\nDescribe the test of design and the test of operating effectiveness, and link the population you will sample from.",
            ],
            [
                'slug' => 'audit-observation-report-template',
                'title' => 'Audit observation report template',
                'category' => 'Reporting', 'type' => 'template', 'sort_order' => 5,
                'summary' => 'Condition, criteria, cause, effect and recommendation — a clean structure for every finding, with management response.',
                'body' => "## Structure\n\n- **Condition** — what you found.\n- **Criteria** — what should have happened.\n- **Cause** — why the gap exists.\n- **Effect** — the risk or impact.\n- **Recommendation** — what to change.\n- **Management response** — owner, action and target date.",
            ],
            [
                'slug' => 'p2p-audit-checklist',
                'title' => 'Procure-to-pay audit checklist',
                'category' => 'Fieldwork', 'type' => 'checklist', 'sort_order' => 6,
                'summary' => 'Key controls and tests across vendor master, purchase orders, GRN, three-way match and payments.',
                'body' => "## Vendor master\n\n- [ ] Changes require secondary approval\n- [ ] Duplicate vendor check run periodically\n\n## Purchasing\n\n- [ ] POs approved within delegation of authority\n- [ ] No split POs below approval thresholds\n\n## Payments\n\n- [ ] Three-way match enforced before payment\n- [ ] Bank detail changes verified by call-back",
            ],
        ];

        foreach ($items as $item) {
            UniversityResource::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $item['slug']],
                $item + ['status' => 'published', 'published_at' => now(), 'reviewed_at' => now()->toDateString(), 'created_by' => $user->id]
            );
        }
    }

    private function leads(Tenant $tenant): void
    {
        if (CmsLead::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists()) {
            return;
        }

        $samples = [
            ['Priya Nair', 'priya@example.com', 'Nair & Associates', 'demo', 'new', 'Looking to move 40 statutory audits off spreadsheets.'],
            ['Arjun Mehta', 'arjun@example.com', 'Mehta Advisory', 'website', 'contacted', 'Interested in the internal audit module.'],
            ['Sara Thomas', 'sara@example.com', 'Bluepeak Advisory', 'university', 'qualified', 'Used the fieldwork tracker — want to see the full product.'],
            ['Rahul Iyer', 'rahul@example.com', 'Iyer & Co', 'pricing', 'new', 'Pricing for 15 entities?'],
            ['Neha Gupta', 'neha@example.com', 'Harbor Risk', 'website', 'won', null],
        ];
        foreach ($samples as $i => [$name, $email, $company, $source, $status, $message]) {
            $lead = CmsLead::withoutGlobalScopes()->create(compact('name', 'email', 'company', 'source', 'status', 'message') + ['tenant_id' => $tenant->id]);
            $lead->forceFill(['created_at' => now()->subDays($i * 3 + 1)])->save();
        }
    }
}

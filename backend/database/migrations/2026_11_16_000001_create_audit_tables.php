<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit workflow:
 *   clients → engagements (type, frequency, period)
 *   RCM library: audit_processes → audit_risks → audit_controls → audit_control_checks
 *   engagement_processes (process chosen for the period + assigned resource)
 *   control_tests (one per control in an engagement process; failed tests are "queries")
 *
 * control_tests.snapshot freezes the risk/control/checks wording at the time the
 * process was added, so later library edits never rewrite past results or reports.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('code', 30)->nullable();
            $t->string('industry', 100)->nullable();
            $t->string('contact_name', 120)->nullable();
            $t->string('contact_email', 190)->nullable();
            $t->string('contact_phone', 40)->nullable();
            $t->text('address')->nullable();
            $t->string('status', 20)->default('active');
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['tenant_id', 'status']);
        });

        Schema::create('audit_processes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('code', 20)->nullable();
            $t->string('name');
            $t->text('description')->nullable();
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('audit_risks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('process_id')->constrained('audit_processes')->cascadeOnDelete();
            $t->string('code', 20)->nullable();
            $t->string('title', 500);
            $t->text('description')->nullable();
            $t->string('rating', 10)->default('medium');
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('audit_controls', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('risk_id')->constrained('audit_risks')->cascadeOnDelete();
            $t->string('code', 20)->nullable();
            $t->string('title', 500);
            $t->text('description')->nullable();
            $t->string('nature', 20)->nullable();        // preventive | detective
            $t->string('control_type', 20)->nullable();  // manual | automated | it_dependent
            $t->string('frequency', 20)->nullable();     // daily … annual | ad_hoc
            $t->string('owner', 120)->nullable();
            $t->boolean('is_key')->default(true);
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('audit_control_checks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('control_id')->constrained('audit_controls')->cascadeOnDelete();
            $t->string('description', 1000);
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('engagements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('client_id')->constrained()->cascadeOnDelete();
            $t->string('audit_type', 20);      // statutory | internal
            $t->string('frequency', 20);       // quarterly | annual
            $t->unsignedSmallInteger('fiscal_year');
            $t->string('period', 5);           // Q1..Q4 | FY
            $t->date('period_start');
            $t->date('period_end');
            $t->string('status', 20)->default('planning'); // planning | in_progress | completed
            $t->text('notes')->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('completed_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['tenant_id', 'fiscal_year', 'period']);
            $t->index(['tenant_id', 'client_id']);
        });

        Schema::create('engagement_processes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('engagement_id')->constrained()->cascadeOnDelete();
            $t->foreignId('process_id')->constrained('audit_processes');
            $t->string('process_code', 20)->nullable();
            $t->string('process_name');
            $t->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $t->date('due_date')->nullable();
            $t->string('status', 20)->default('not_started'); // not_started | in_progress | completed
            $t->timestamp('started_at')->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->timestamps();
            $t->unique(['engagement_id', 'process_id']);
            $t->index(['tenant_id', 'assigned_to']);
        });

        Schema::create('control_tests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('engagement_id')->constrained()->cascadeOnDelete();
            $t->foreignId('engagement_process_id')->constrained()->cascadeOnDelete();
            $t->foreignId('control_id')->constrained('audit_controls');
            $t->json('snapshot');
            $t->unsignedInteger('sort_order')->default(0);

            // Step III — test
            $t->unsignedInteger('population')->nullable();
            $t->unsignedInteger('sample_size')->nullable();
            $t->string('result', 10)->nullable(); // pass | fail
            $t->json('check_results')->nullable();
            $t->text('test_notes')->nullable();
            $t->foreignId('tested_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('tested_at')->nullable();

            // Step III — failure / query
            $t->text('failure_reason')->nullable();
            $t->unsignedInteger('failed_samples')->nullable();
            $t->text('management_response')->nullable();
            $t->date('target_date')->nullable();
            $t->string('responsible_person', 150)->nullable();
            $t->string('query_status', 20)->nullable(); // open | closed
            $t->json('retests')->nullable();
            $t->timestamp('closed_at')->nullable();

            $t->timestamps();
            $t->unique(['engagement_process_id', 'control_id']);
            $t->index(['tenant_id', 'query_status', 'target_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('control_tests');
        Schema::dropIfExists('engagement_processes');
        Schema::dropIfExists('engagements');
        Schema::dropIfExists('audit_control_checks');
        Schema::dropIfExists('audit_controls');
        Schema::dropIfExists('audit_risks');
        Schema::dropIfExists('audit_processes');
        Schema::dropIfExists('clients');
    }
};

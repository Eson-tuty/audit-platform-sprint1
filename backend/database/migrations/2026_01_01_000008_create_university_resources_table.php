<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Free tools, guides and templates published under /university.
        Schema::create('university_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');
            $table->string('category');            // e.g. Fieldwork, Planning, Reporting
            $table->string('type')->default('guide'); // tool, guide, template, checklist
            $table->string('tool_key')->nullable(); // binds a built-in interactive tool, e.g. fieldwork-tracker
            $table->text('summary')->nullable();
            $table->longText('body')->nullable();   // markdown
            $table->json('faqs')->nullable();       // [{q, a}]
            $table->json('sources')->nullable();    // [{label, url}]
            $table->json('seo')->nullable();        // {title, description}
            $table->string('status')->default('draft'); // draft, published, archived
            $table->unsignedInteger('sort_order')->default(0);
            $table->date('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'status', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_resources');
    }
};

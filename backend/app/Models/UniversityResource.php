<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UniversityResource extends Model
{
    use BelongsToTenant, SoftDeletes;

    public const TYPES = ['tool', 'guide', 'template', 'checklist'];
    public const STATUSES = ['draft', 'published', 'archived'];

    protected $fillable = [
        'tenant_id', 'title', 'slug', 'category', 'type', 'tool_key', 'summary', 'body',
        'faqs', 'sources', 'seo', 'status', 'sort_order', 'reviewed_at', 'published_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'faqs' => 'array',
            'sources' => 'array',
            'seo' => 'array',
            'reviewed_at' => 'date:Y-m-d',
            'published_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }
}

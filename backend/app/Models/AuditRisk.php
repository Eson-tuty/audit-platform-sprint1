<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditRisk extends Model
{
    use BelongsToTenant, SoftDeletes;

    public const RATINGS = ['high', 'medium', 'low'];

    protected $fillable = ['tenant_id', 'process_id', 'code', 'title', 'description', 'rating', 'sort_order'];

    public function process(): BelongsTo
    {
        return $this->belongsTo(AuditProcess::class, 'process_id');
    }

    public function controls(): HasMany
    {
        return $this->hasMany(AuditControl::class, 'risk_id')->orderBy('sort_order')->orderBy('id');
    }
}

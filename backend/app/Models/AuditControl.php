<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditControl extends Model
{
    use BelongsToTenant, SoftDeletes;

    public const NATURES = ['preventive', 'detective'];
    public const TYPES = ['manual', 'automated', 'it_dependent'];
    public const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'annual', 'ad_hoc'];

    protected $fillable = [
        'tenant_id', 'risk_id', 'code', 'title', 'description', 'nature', 'control_type', 'frequency', 'owner', 'is_key', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_key' => 'boolean'];
    }

    public function risk(): BelongsTo
    {
        return $this->belongsTo(AuditRisk::class, 'risk_id');
    }

    public function checks(): HasMany
    {
        return $this->hasMany(AuditControlCheck::class, 'control_id')->orderBy('sort_order')->orderBy('id');
    }
}

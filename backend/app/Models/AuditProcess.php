<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/** RCM library: a business process (e.g. Procure to Pay). */
class AuditProcess extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = ['tenant_id', 'code', 'name', 'description', 'sort_order'];

    public function risks(): HasMany
    {
        return $this->hasMany(AuditRisk::class, 'process_id')->orderBy('sort_order')->orderBy('id');
    }

    public function controls(): HasManyThrough
    {
        return $this->hasManyThrough(AuditControl::class, AuditRisk::class, 'process_id', 'risk_id');
    }
}

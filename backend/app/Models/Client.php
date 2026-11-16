<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'code', 'industry', 'contact_name', 'contact_email', 'contact_phone', 'address', 'status', 'created_by',
    ];

    public function engagements(): HasMany
    {
        return $this->hasMany(Engagement::class);
    }
}

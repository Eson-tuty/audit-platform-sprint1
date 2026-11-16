<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class CmsLead extends Model
{
    use BelongsToTenant;

    public const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

    protected $fillable = ['tenant_id', 'name', 'email', 'phone', 'company', 'source', 'status', 'message', 'metadata'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EngagementProcess extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'engagement_id', 'process_id', 'process_code', 'process_name', 'assigned_to', 'due_date', 'status', 'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function engagement(): BelongsTo
    {
        return $this->belongsTo(Engagement::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to')->withTrashed();
    }

    public function tests(): HasMany
    {
        return $this->hasMany(ControlTest::class)->orderBy('sort_order')->orderBy('id');
    }
}

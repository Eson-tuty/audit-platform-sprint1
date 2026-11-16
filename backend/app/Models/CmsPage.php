<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CmsPage extends Model
{
    use BelongsToTenant, SoftDeletes;

    public const STATUSES = ['draft', 'published', 'archived'];

    protected $fillable = ['tenant_id', 'title', 'slug', 'status', 'template', 'published_at', 'created_by'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(CmsPageVersion::class)->orderByDesc('version');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(CmsPageVersion::class)->ofMany('version', 'max');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPageVersion extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['tenant_id', 'cms_page_id', 'version', 'content', 'seo', 'created_by'];

    protected function casts(): array
    {
        return ['content' => 'array', 'seo' => 'array'];
    }
}

<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;

/**
 * Scopes every query to the tenant resolved for the current request
 * (bound as `currentTenant` by the ResolveTenant middleware) and stamps
 * tenant_id on create. Outside a request (seeders, console) no scope applies.
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (app()->bound('currentTenant')) {
                $builder->where($builder->getModel()->getTable().'.tenant_id', app('currentTenant')->id);
            }
        });

        static::creating(function ($model) {
            if (empty($model->tenant_id) && app()->bound('currentTenant')) {
                $model->tenant_id = app('currentTenant')->id;
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}

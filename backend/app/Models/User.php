<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'email', 'password', 'phone', 'is_active'];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_platform_admin' => 'boolean',
        ];
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class)->withPivot(['status', 'invited_by', 'joined_at'])->withTimestamps();
    }

    public function isActiveMemberOf(Tenant $tenant): bool
    {
        return DB::table('tenant_user')
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $this->id)
            ->where('status', 'active')
            ->exists();
    }

    /** Roles held by this user inside one tenant. */
    public function rolesIn(Tenant $tenant)
    {
        return Role::query()
            ->join('tenant_user_roles', 'tenant_user_roles.role_id', '=', 'roles.id')
            ->where('tenant_user_roles.tenant_id', $tenant->id)
            ->where('tenant_user_roles.user_id', $this->id)
            ->where('roles.tenant_id', $tenant->id)
            ->select('roles.*')
            ->get();
    }

    /** Permission names granted to this user inside one tenant. */
    public function permissionsIn(Tenant $tenant): array
    {
        return DB::table('permissions')
            ->join('role_permissions', 'role_permissions.permission_id', '=', 'permissions.id')
            ->join('roles', 'roles.id', '=', 'role_permissions.role_id')
            ->join('tenant_user_roles', 'tenant_user_roles.role_id', '=', 'roles.id')
            ->where('roles.tenant_id', $tenant->id)
            ->where('tenant_user_roles.tenant_id', $tenant->id)
            ->where('tenant_user_roles.user_id', $this->id)
            ->distinct()
            ->pluck('permissions.name')
            ->all();
    }

    public function hasPermissionIn(Tenant $tenant, string $permission): bool
    {
        return in_array($permission, $this->permissionsIn($tenant), true);
    }
}

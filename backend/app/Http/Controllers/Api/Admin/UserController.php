<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Members of the current tenant and their tenant-scoped roles. */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $users = User::query()
            ->join('tenant_user', 'tenant_user.user_id', '=', 'users.id')
            ->where('tenant_user.tenant_id', $tenant->id)
            ->select('users.id', 'users.name', 'users.email', 'users.is_active', 'users.last_login_at', 'tenant_user.status as membership_status')
            ->orderBy('users.name')
            ->get();

        $roleMap = DB::table('tenant_user_roles')
            ->where('tenant_id', $tenant->id)
            ->get(['user_id', 'role_id'])
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('role_id')->all());

        $users->each(fn ($u) => $u->role_ids = $roleMap[$u->id] ?? []);

        return response()->json([
            'data' => $users,
            'roles' => Role::where('tenant_id', $tenant->id)->with('permissions:id,name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'password' => ['nullable', Password::min(12)->mixedCase()->numbers()],
            'role_ids' => ['array'],
            'role_ids.*' => [Rule::exists('roles', 'id')->where('tenant_id', $tenant->id)],
        ]);

        $user = DB::transaction(function () use ($data, $tenant, $request) {
            $user = User::where('email', $data['email'])->first();
            if (!$user) {
                if (empty($data['password'])) {
                    abort(response()->json(['message' => 'A password is required for a new user.', 'errors' => ['password' => ['A password is required for a new user.']]], 422));
                }
                $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'], 'is_active' => true]);
            }

            DB::table('tenant_user')->updateOrInsert(
                ['tenant_id' => $tenant->id, 'user_id' => $user->id],
                ['status' => 'active', 'invited_by' => $request->user()->id, 'joined_at' => now(), 'created_at' => now(), 'updated_at' => now()]
            );
            $this->syncRoles($tenant->id, $user->id, $data['role_ids'] ?? []);

            return $user;
        });

        AuditLogger::record('tenant.member_added', $user, null, ['email' => $user->email, 'role_ids' => $data['role_ids'] ?? []]);

        return response()->json(['data' => $user], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        abort_unless(DB::table('tenant_user')->where(['tenant_id' => $tenant->id, 'user_id' => $user->id])->exists(), 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'membership_status' => ['required', Rule::in(['active', 'suspended'])],
            'role_ids' => ['array'],
            'role_ids.*' => [Rule::exists('roles', 'id')->where('tenant_id', $tenant->id)],
        ]);

        if ($user->id === $request->user()->id && $data['membership_status'] !== 'active') {
            return response()->json(['message' => 'You cannot suspend your own access.'], 422);
        }

        $beforeRoles = DB::table('tenant_user_roles')->where(['tenant_id' => $tenant->id, 'user_id' => $user->id])->pluck('role_id')->all();

        DB::transaction(function () use ($user, $tenant, $data) {
            $user->update(['name' => $data['name']]);
            DB::table('tenant_user')->where(['tenant_id' => $tenant->id, 'user_id' => $user->id])
                ->update(['status' => $data['membership_status'], 'updated_at' => now()]);
            $this->syncRoles($tenant->id, $user->id, $data['role_ids'] ?? []);
        });

        AuditLogger::record('tenant.member_updated', $user,
            ['role_ids' => $beforeRoles],
            ['role_ids' => $data['role_ids'] ?? [], 'membership_status' => $data['membership_status']]);

        return response()->json(['success' => true]);
    }

    private function syncRoles(int $tenantId, int $userId, array $roleIds): void
    {
        DB::table('tenant_user_roles')->where(['tenant_id' => $tenantId, 'user_id' => $userId])->delete();
        foreach (array_unique($roleIds) as $roleId) {
            DB::table('tenant_user_roles')->insert([
                'tenant_id' => $tenantId, 'user_id' => $userId, 'role_id' => $roleId, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}

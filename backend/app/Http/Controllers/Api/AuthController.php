<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Session (Sanctum SPA cookie) authentication.
 * TODO (Sprint 1 item 4): add TOTP MFA challenge via Laravel Fortify before granting the session.
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $tenant = $request->attributes->get('tenant');
        $user = User::where('email', $credentials['email'])->first();

        $valid = $user
            && Hash::check($credentials['password'], $user->password)
            && $user->is_active
            && $user->isActiveMemberOf($tenant);

        if (!$valid) {
            AuditLogger::record('auth.login_failed', null, null, null, ['email' => $credentials['email']], $user?->id);
            throw ValidationException::withMessages(['email' => 'These credentials do not match an active account in this workspace.']);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        AuditLogger::record('auth.login', $user, null, null, [], $user->id);

        return $this->me($request);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLogger::record('auth.logout', $request->user());
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();

        return response()->json(['data' => [
            'user' => $user->only(['id', 'name', 'email', 'last_login_at']),
            'tenant' => $tenant->only(['id', 'name', 'slug']),
            'roles' => $user->rolesIn($tenant)->pluck('name'),
            'permissions' => $user->permissionsIn($tenant),
        ]]);
    }
}

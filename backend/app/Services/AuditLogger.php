<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    private const REDACT = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    public static function record(
        string $event,
        ?Model $subject = null,
        ?array $before = null,
        ?array $after = null,
        array $metadata = [],
        ?int $userId = null,
    ): void {
        $request = request();
        $tenant = app()->bound('currentTenant') ? app('currentTenant') : null;

        AuditLog::create([
            'tenant_id' => $tenant?->id,
            'user_id' => $userId ?? $request?->user()?->id,
            'event' => $event,
            'auditable_type' => $subject ? $subject->getMorphClass() : null,
            'auditable_id' => $subject?->getKey(),
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 1000) : null,
            'before_values' => $before ? self::clean($before) : null,
            'after_values' => $after ? self::clean($after) : null,
            'metadata' => $metadata ?: null,
        ]);
    }

    /** Only the attributes that changed, before and after. */
    public static function diff(array $before, array $after): array
    {
        $changedKeys = array_keys(array_filter(
            $after,
            fn ($v, $k) => $k !== 'updated_at' && ($before[$k] ?? null) != $v,
            ARRAY_FILTER_USE_BOTH,
        ));

        return [
            array_intersect_key($before, array_flip($changedKeys)),
            array_intersect_key($after, array_flip($changedKeys)),
        ];
    }

    private static function clean(array $values): array
    {
        foreach (self::REDACT as $key) {
            if (array_key_exists($key, $values)) {
                $values[$key] = '[redacted]';
            }
        }

        return $values;
    }
}

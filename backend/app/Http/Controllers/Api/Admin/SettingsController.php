<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Support\SiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => SiteSettings::for($request->attributes->get('tenant'))]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $data = $request->validate([
            'brand.name' => ['required', 'string', 'max:60'],
            'brand.tagline' => ['nullable', 'string', 'max:160'],
            'banner.enabled' => ['boolean'],
            'banner.text' => ['nullable', 'string', 'max:240'],
            'banner.link_label' => ['nullable', 'string', 'max:40'],
            'banner.link_url' => ['nullable', 'string', 'max:300'],
            'hero' => ['required', 'array'],
            'hero.eyebrow' => ['nullable', 'string', 'max:80'],
            'hero.title' => ['required', 'string', 'max:160'],
            'hero.title_accent' => ['nullable', 'string', 'max:160'],
            'hero.subtitle' => ['nullable', 'string', 'max:600'],
            'hero.cta_label' => ['nullable', 'string', 'max:40'],
            'hero.cta_url' => ['nullable', 'string', 'max:300'],
            'hero.secondary_label' => ['nullable', 'string', 'max:40'],
            'hero.secondary_url' => ['nullable', 'string', 'max:300'],
            'hero.trust' => ['nullable', 'array', 'max:8'],
            'hero.trust.*' => ['string', 'max:60'],
            'stats' => ['nullable', 'array', 'max:8'],
            'stats.*.label' => ['required', 'string', 'max:60'],
            'stats.*.value' => ['required', 'string', 'max:20'],
            'logos' => ['nullable', 'array', 'max:24'],
            'logos.*' => ['string', 'max:60'],
            'pricing.currency' => ['nullable', 'string', 'max:5'],
            'pricing.plans' => ['nullable', 'array', 'max:6'],
            'pricing.plans.*.name' => ['required', 'string', 'max:40'],
            'pricing.plans.*.price' => ['required', 'string', 'max:20'],
            'pricing.plans.*.period' => ['nullable', 'string', 'max:40'],
            'pricing.plans.*.description' => ['nullable', 'string', 'max:300'],
            'pricing.plans.*.features' => ['nullable', 'array', 'max:12'],
            'pricing.plans.*.features.*' => ['string', 'max:80'],
            'pricing.plans.*.cta_label' => ['nullable', 'string', 'max:40'],
            'pricing.plans.*.highlighted' => ['boolean'],
            'contact.email' => ['nullable', 'email', 'max:190'],
            'contact.phone' => ['nullable', 'string', 'max:40'],
            'contact.address' => ['nullable', 'string', 'max:300'],
            'social.linkedin' => ['nullable', 'url', 'max:300'],
            'social.x' => ['nullable', 'url', 'max:300'],
            'social.youtube' => ['nullable', 'url', 'max:300'],
            'footer.note' => ['nullable', 'string', 'max:300'],
        ]);

        $before = $tenant->settings['site'] ?? [];
        $settings = $tenant->settings ?? [];
        $settings['site'] = $data;
        $tenant->update(['settings' => $settings]);

        AuditLogger::record('site.settings_updated', $tenant, $before, $data);

        return response()->json(['data' => SiteSettings::for($tenant)]);
    }
}

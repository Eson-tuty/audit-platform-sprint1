<?php

namespace App\Support;

use App\Models\Tenant;

/** Website settings stored in tenants.settings['site'], merged over these defaults. */
class SiteSettings
{
    public static function defaults(): array
    {
        return [
            'brand' => [
                'name' => 'Auditline',
                'tagline' => 'Audit workflow software for modern firms',
            ],
            'banner' => [
                'enabled' => true,
                'text' => 'New: free fieldwork testing tracker in Auditline University.',
                'link_label' => 'Try it',
                'link_url' => '/university/internal-audit-fieldwork-testing-tracker',
            ],
            'hero' => [
                'eyebrow' => 'Audit management platform',
                'title' => 'Take on more engagements.',
                'title_accent' => 'Not more headcount.',
                'subtitle' => 'Plan, test, review and report from one workspace. Working papers, samples, evidence and findings stay connected from the trial balance to the signed report.',
                'cta_label' => 'Book a demo',
                'cta_url' => '/contact',
                'secondary_label' => 'Explore free tools',
                'secondary_url' => '/university',
                'trust' => ['Data hosted in-region', 'Role-based access', 'Full audit trail', 'MFA-ready sign-in'],
            ],
            'stats' => [
                ['label' => 'Working paper templates', 'value' => '60+'],
                ['label' => 'Lifecycle stages covered', 'value' => '7'],
                ['label' => 'Average setup time', 'value' => '1 day'],
                ['label' => 'Seats included', 'value' => 'Unlimited'],
            ],
            'logos' => ['Northwind Assurance', 'Kessler & Rao', 'Bluepeak Advisory', 'Meridian CA', 'Harbor Risk', 'Lumen Partners'],
            'pricing' => [
                'currency' => '₹',
                'plans' => [
                    [
                        'name' => 'Starter',
                        'price' => '0',
                        'period' => 'first engagement',
                        'description' => 'Run one live engagement end to end before you pay anything.',
                        'features' => ['1 engagement', 'All working papers', 'Client portal', 'Email support'],
                        'cta_label' => 'Start free',
                        'highlighted' => false,
                    ],
                    [
                        'name' => 'Practice',
                        'price' => '30,000',
                        'period' => 'per 10 engagements',
                        'description' => 'For firms running a steady book of statutory and internal audits.',
                        'features' => ['10 engagements', 'Unlimited users', 'Sampling & materiality', 'Review workflow', 'Priority support'],
                        'cta_label' => 'Book a demo',
                        'highlighted' => true,
                    ],
                    [
                        'name' => 'Enterprise',
                        'price' => 'Custom',
                        'period' => '50+ entities',
                        'description' => 'Group audits, internal audit functions and custom controls libraries.',
                        'features' => ['Volume pricing', 'SSO & custom roles', 'Dedicated success manager', 'Data residency options'],
                        'cta_label' => 'Talk to sales',
                        'highlighted' => false,
                    ],
                ],
            ],
            'contact' => [
                'email' => 'hello@example.com',
                'phone' => '+91 00000 00000',
                'address' => 'Bengaluru, India',
            ],
            'social' => [
                'linkedin' => '',
                'x' => '',
                'youtube' => '',
            ],
            'footer' => [
                'note' => 'Built for audit, risk and compliance teams.',
            ],
        ];
    }

    public static function for(Tenant $tenant): array
    {
        return self::merge(self::defaults(), $tenant->settings['site'] ?? []);
    }

    /** Deep-merge maps; lists (plans, logos, features) are replaced wholesale. */
    public static function merge(array $base, array $override): array
    {
        foreach ($override as $key => $value) {
            if (is_array($value) && isset($base[$key]) && is_array($base[$key])
                && !array_is_list($value) && !array_is_list($base[$key])) {
                $base[$key] = self::merge($base[$key], $value);
            } else {
                $base[$key] = $value;
            }
        }

        return $base;
    }
}

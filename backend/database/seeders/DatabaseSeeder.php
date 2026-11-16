<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'demo-firm'],
            ['name' => 'Demo Audit Firm', 'status' => 'active']
        );

        $user = User::firstOrCreate(
            ['email' => 'owner@example.test'],
            [
                'name' => 'Development Owner',
                'password' => Hash::make('ChangeMe-Immediately-123!'),
                'is_active' => true,
            ]
        );

        DB::table('tenant_user')->updateOrInsert(
            ['tenant_id' => $tenant->id, 'user_id' => $user->id],
            ['status' => 'active', 'joined_at' => now(), 'created_at' => now(), 'updated_at' => now()]
        );

        // Development-only hostnames. Replace with verified local/prod domains.
        foreach (['demo.localhost', 'localhost', '127.0.0.1'] as $i => $host) {
            DB::table('tenant_domains')->updateOrInsert(
                ['host' => $host],
                ['tenant_id' => $tenant->id, 'is_primary' => $i === 0, 'is_verified' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $permissions = [
            'cms.pages.manage' => ['cms', 'Create, edit and publish website pages'],
            'cms.university.manage' => ['cms', 'Manage University tools, guides and templates'],
            'cms.leads.manage' => ['cms', 'View, update and export website leads'],
            'cms.settings.manage' => ['cms', 'Edit site-wide settings (brand, hero, pricing, banner)'],
            'users.manage' => ['admin', 'Add members and assign roles'],
            'audit_logs.view' => ['admin', 'View the audit trail'],
            'audit.view' => ['audit', 'View engagements, testing status, queries and the dashboard'],
            'audit.test' => ['audit', 'Record control testing and retests on processes assigned to you'],
            'audit.manage' => ['audit', 'Manage clients, RCM library and engagements; assign work; generate reports'],
        ];
        foreach ($permissions as $name => [$module, $description]) {
            DB::table('permissions')->updateOrInsert(['name' => $name], [
                'module' => $module, 'description' => $description, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $roles = [
            ['name' => 'Admin', 'slug' => 'admin', 'grants' => array_keys($permissions)],
            ['name' => 'Partner', 'slug' => 'partner', 'grants' => ['cms.leads.manage', 'audit_logs.view', 'audit.view', 'audit.manage']],
            ['name' => 'Manager', 'slug' => 'manager', 'grants' => ['audit.view', 'audit.test', 'audit.manage']],
            ['name' => 'Auditor', 'slug' => 'auditor', 'grants' => ['audit.view', 'audit.test']],
            ['name' => 'Website Editor', 'slug' => 'website-editor', 'grants' => ['cms.pages.manage', 'cms.university.manage', 'cms.settings.manage', 'cms.leads.manage']],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['tenant_id' => $tenant->id, 'slug' => $role['slug']],
                ['name' => $role['name'], 'is_system' => true, 'created_at' => now(), 'updated_at' => now()]
            );
            $roleId = DB::table('roles')->where('tenant_id', $tenant->id)->where('slug', $role['slug'])->value('id');
            foreach ($role['grants'] as $perm) {
                DB::table('role_permissions')->updateOrInsert([
                    'role_id' => $roleId,
                    'permission_id' => DB::table('permissions')->where('name', $perm)->value('id'),
                ]);
            }
        }

        $adminRoleId = DB::table('roles')
            ->where('tenant_id', $tenant->id)->where('slug', 'admin')->value('id');

        DB::table('tenant_user_roles')->updateOrInsert(
            ['tenant_id' => $tenant->id, 'user_id' => $user->id, 'role_id' => $adminRoleId],
            ['created_at' => now(), 'updated_at' => now()]
        );

        $this->call(DemoContentSeeder::class, false, ['tenant' => $tenant, 'user' => $user]);
        $this->call(AuditDemoSeeder::class, false, ['tenant' => $tenant, 'owner' => $user]);
    }
}

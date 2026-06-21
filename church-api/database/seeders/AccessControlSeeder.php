<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AccessControlSeeder extends Seeder
{
    /**
     * Seed the granular permissions, the default Groups / Departments and grant
     * the bootstrap administrator the Super Admin role.
     */
    public function run(): void
    {
        foreach (AccessControl::permissions() as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // Reset Spatie's cached permission map *after* creating the rows so the
        // role -> permission sync below resolves the freshly seeded names.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // The Super Admin group: kept empty on purpose — the Gate grants it
        // everything. It still exists so it can be assigned to users.
        Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web');

        foreach (AccessControl::defaultRoles() as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($permissions);
        }

        $this->assignSuperAdminToBootstrapUser();
    }

    /**
     * Promote the seeded bootstrap administrator to Super Admin so the first
     * account is never locked out once routes become permission-gated.
     */
    private function assignSuperAdminToBootstrapUser(): void
    {
        $admin = User::query()->where('email', 'admin@mfm-ficgayo.ci')->first();

        if ($admin !== null && ! $admin->hasRole(AccessControl::SUPER_ADMIN)) {
            $admin->assignRole(AccessControl::SUPER_ADMIN);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Demo dataset: a large, varied set of Groups / Departments and ~200 servant
 * accounts so the paginated admin screens and the security matrix can be
 * exercised realistically. Idempotent — re-running updates rather than
 * duplicates (demo users use deterministic @demo.mfm-ficgayo.ci emails).
 */
class DemoSeeder extends Seeder
{
    private const int DEMO_USERS = 200;

    private const string DEMO_DOMAIN = 'demo.mfm-ficgayo.ci';

    /**
     * Extra departments beyond the structural defaults, kept varied so the
     * matrix shows a wide spread of granted / denied privileges.
     */
    private const array EXTRA_GROUPS = [
        'Louange & Adoration', 'Protocole', 'École du dimanche', 'Jeunesse Embrasée',
        'Femmes de Feu', 'Hommes Forts', 'Évangelisation', 'Accueil & Hospitalité',
        'Sonorisation', 'Décoration', 'Trésorerie', 'Communication & Réseaux',
        'Transport & Logistique', 'Sécurité', 'Enfants (Garderie)', 'Couples',
    ];

    public function run(): void
    {
        $permissions = AccessControl::permissions();

        $this->seedGroups($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->seedUsers();
    }

    /**
     * Create the extra departments, each with a pseudo-random but deterministic
     * permission subset so the matrix is visibly heterogeneous.
     *
     * @param  list<string>  $permissions
     */
    private function seedGroups(array $permissions): void
    {
        foreach (self::EXTRA_GROUPS as $index => $name) {
            $role = Role::findOrCreate($name, 'web');

            // Deterministic subset: ~30%-70% of permissions per group.
            $subset = collect($permissions)
                ->filter(fn (string $p, int $i): bool => (($index + 1) * ($i + 3)) % 10 < 4)
                ->values()
                ->all();

            $role->syncPermissions($subset);
        }
    }

    /**
     * Seed ~200 servants spread across scenarios: unassigned, single-group,
     * multi-group, a few extra Super Admins and a slice of suspended accounts.
     */
    private function seedUsers(): void
    {
        $roleNames = Role::query()->pluck('name')->all();
        $assignable = array_values(array_filter(
            $roleNames,
            fn (string $name): bool => $name !== AccessControl::SUPER_ADMIN,
        ));

        for ($i = 1; $i <= self::DEMO_USERS; $i++) {
            $user = User::updateOrCreate(
                ['email' => "serviteur{$i}@".self::DEMO_DOMAIN],
                [
                    'name' => fake()->name(),
                    'password' => Hash::make('password'),
                    // Roughly 15% of accounts are suspended.
                    'is_active' => $i % 7 !== 0,
                ],
            );

            $user->syncRoles($this->rolesForIndex($i, $assignable));
        }
    }

    /**
     * Pick the Groups for a given demo user index, covering every scenario.
     *
     * @param  list<string>  $assignable
     * @return list<string>
     */
    private function rolesForIndex(int $index, array $assignable): array
    {
        // Every 25th servant is an extra Super Admin.
        if ($index % 25 === 0) {
            return [AccessControl::SUPER_ADMIN];
        }

        $total = count($assignable);

        return match ($index % 5) {
            0 => [],                                                  // unassigned
            1, 2 => [$assignable[$index % $total]],                   // single group
            default => $this->pickDistinct($assignable, $index, 2 + ($index % 2)),
        };
    }

    /**
     * Deterministically pick `$count` distinct groups using coprime stepping so
     * the selection varies per index without random shuffling.
     *
     * @param  list<string>  $assignable
     * @return list<string>
     */
    private function pickDistinct(array $assignable, int $index, int $count): array
    {
        $total = count($assignable);
        $count = min($count, $total);
        $picked = [];

        for ($k = 0; $k < $count; $k++) {
            $picked[] = $assignable[($index + $k * 7) % $total];
        }

        return array_values(array_unique($picked));
    }
}

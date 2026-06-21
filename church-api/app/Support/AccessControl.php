<?php

namespace App\Support;

/**
 * Single source of truth for the access-control model of the backoffice.
 *
 * The granular permissions, the categories used to render the security matrix
 * in the Next.js admin, and the default "Groups / Departments" shipped by the
 * seeder are all declared here so the API, the seeder and the front-end stay in
 * perfect sync.
 */
final class AccessControl
{
    /**
     * The omnipotent role. Granted every ability automatically through the
     * `Gate::before` hook — its permissions are never read from the database.
     */
    public const string SUPER_ADMIN = 'Super Admin';

    /**
     * The full permission catalogue, grouped by functional category. The keys
     * are the category labels rendered as columns groups in the security
     * matrix; each entry is the permission name plus a human description.
     *
     * @return array<string, array<int, array{name: string, label: string}>>
     */
    public static function catalog(): array
    {
        return [
            'Général' => [
                ['name' => 'manage_settings', 'label' => 'Gérer les paramètres (nom, footer, contact)'],
                ['name' => 'manage_sermons', 'label' => 'Gérer les messages et la médiathèque'],
                ['name' => 'manage_events', 'label' => "Gérer l'agenda et les événements"],
                ['name' => 'manage_access', 'label' => 'Gérer les accès, groupes et permissions'],
            ],
            'Live' => [
                ['name' => 'manage_live', 'label' => 'Activer/configurer le live et le serveur RTMP'],
            ],
            'Prières' => [
                ['name' => 'view_prayers', 'label' => 'Consulter les requêtes de prière'],
                ['name' => 'process_prayers', 'label' => 'Traiter et assigner les requêtes de prière'],
                ['name' => 'manage_prayer_settings', 'label' => 'Configurer les réponses et catégories de prière'],
            ],
            'Cellules' => [
                ['name' => 'view_cells', 'label' => 'Consulter les groupes de maison / cellules'],
                ['name' => 'process_cells', 'label' => 'Traiter et gérer les groupes de maison / cellules'],
            ],
        ];
    }

    /**
     * Flat list of every permission name in the catalogue.
     *
     * @return list<string>
     */
    public static function permissions(): array
    {
        $names = [];

        foreach (self::catalog() as $permissions) {
            foreach ($permissions as $permission) {
                $names[] = $permission['name'];
            }
        }

        return $names;
    }

    /**
     * The default Groups / Departments shipped with the application, mapped to
     * the permissions they receive. `Super Admin` is intentionally absent: it
     * owns everything via the Gate and needs no explicit permissions.
     *
     * @return array<string, list<string>>
     */
    public static function defaultRoles(): array
    {
        return [
            'Pasteurs' => [
                'manage_settings', 'manage_sermons', 'manage_events',
                'view_prayers', 'process_prayers', 'manage_prayer_settings',
                'view_cells', 'process_cells', 'manage_live',
            ],
            'Intercesseurs' => [
                'view_prayers', 'process_prayers',
            ],
            'Média/Régie' => [
                'manage_live', 'manage_sermons',
            ],
            'Huissiers' => [
                'view_cells',
            ],
            'Responsables de cellule' => [
                'view_cells', 'process_cells',
            ],
        ];
    }
}

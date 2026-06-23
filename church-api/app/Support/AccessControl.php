<?php

namespace App\Support;

use App\Models\User;

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

    /** Pastoral oversight — validates recruitment for every ministry. */
    public const string PASTEUR = 'Pasteur';

    /** Ministry leader — validates recruitment only for the ministry they lead. */
    public const string MINISTRY_CHIEF = 'Chef de Ministère';

    /**
     * Whether the user may validate recruitment for *any* ministry. Super
     * Admins and Pasteurs are global validators; everyone else (e.g. a ministry
     * chief) is restricted to the ministry they personally lead.
     */
    public static function validatesMinistriesGlobally(User $user): bool
    {
        return $user->hasRole(self::SUPER_ADMIN) || $user->hasRole(self::PASTEUR);
    }

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
                ['name' => 'manage_access', 'label' => 'Gérer les accès, groupes et permissions'],
                ['name' => 'manage_ministries', 'label' => 'Créer et configurer les ministères et assigner les chefs'],
            ],
            'Tableau de bord' => [
                ['name' => 'view_dashboard', 'label' => 'Accéder au tableau de bord'],
                ['name' => 'view_statistics', 'label' => 'Consulter les statistiques et rapports'],
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
                ['name' => 'validate_home_group_applications', 'label' => "Valider les demandes d'adhésion aux cellules"],
            ],
            'Recrutement' => [
                ['name' => 'validate_ministry_applications', 'label' => 'Voir et valider/rejeter les candidatures aux ministères'],
            ],
            'Finances' => [
                ['name' => 'view_offerings', 'label' => 'Consulter les dons et offrandes'],
                ['name' => 'manage_offerings', 'label' => 'Gérer les dons, dîmes et reçus'],
            ],
            'Communication' => [
                ['name' => 'send_notifications', 'label' => 'Envoyer des notifications et SMS'],
                ['name' => 'manage_announcements', 'label' => 'Gérer les annonces et le bulletin'],
            ],
            'Modération' => [
                ['name' => 'moderate_comments', 'label' => 'Modérer les commentaires du live'],
                ['name' => 'manage_testimonies', 'label' => 'Publier et gérer les témoignages'],
            ],
            'Contacts' => [
                ['name' => 'view_contacts', 'label' => 'Consulter les messages de contact et retours'],
                ['name' => 'manage_contacts', 'label' => 'Traiter, archiver ou répondre aux messages de contact'],
            ],
            'Événements' => [
                ['name' => 'view_events', 'label' => "Consulter l'agenda et la liste des événements"],
                ['name' => 'manage_events', 'label' => 'Créer, modifier, planifier et supprimer des événements'],
            ],
            'Médiathèque & Visuels' => [
                ['name' => 'view_gallery', 'label' => 'Consulter les albums photos et les archives des lives'],
                ['name' => 'manage_gallery', 'label' => 'Créer des albums, uploader des photos/rediffusions et organiser le portfolio'],
            ],
            'Configuration & Vision' => [
                ['name' => 'manage_pastor_word', 'label' => 'Gérer le mot du pasteur (Le Mot du Pasteur)'],
                ['name' => 'manage_church_vision', 'label' => 'Modifier la vision, les piliers de foi et la composition de l’équipe pastorale'],

            ],
            'Gestion Territoriale' => [
                ['name' => 'view_branches', 'label' => 'Consulter la liste des campus et branches annexes'],
                ['name' => 'manage_branches', 'label' => 'Créer, modifier et supprimer les branches et affecter les pasteurs'],
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
            self::PASTEUR => [
                'manage_settings',
                'manage_sermons',
                'manage_events',
                'view_prayers',
                'process_prayers',
                'manage_prayer_settings',
                'view_cells',
                'process_cells',
                'validate_home_group_applications',
                'manage_live',
                'view_dashboard',
                'view_statistics',
                'view_offerings',
                'manage_offerings',
                'send_notifications',
                'manage_announcements',
                'moderate_comments',
                'manage_testimonies',
                'manage_ministries',
                'validate_ministry_applications',
                'view_contacts',
                'manage_contacts',
                'view_events',
                'view_gallery',
                'manage_gallery',
                'manage_pastor_word',
                'manage_church_vision',
                'view_branches',
                'manage_branches',
            ],
            // Ministry leader: may validate recruitment, but only for the
            // ministry they actually lead (enforced contextually in the
            // controller, since a single permission cannot scope to a row).
            self::MINISTRY_CHIEF => [
                'view_dashboard',
                'validate_ministry_applications',
            ],
            'Intercesseur' => [
                'view_prayers',
                'process_prayers',
                'view_dashboard',
                'manage_testimonies',
            ],
            'Média/Régie' => [
                'manage_live',
                'manage_sermons',
                'moderate_comments',
                'send_notifications',
                'view_dashboard',
            ],
            'Huissier' => [
                'view_cells',
                'view_dashboard',
            ],
            'Responsables de cellule' => [
                'view_cells',
                'process_cells',
                'validate_home_group_applications',
                'view_dashboard',
            ],
            'Secrétariat' => [
                'view_contacts',
                'manage_contacts',
                'view_dashboard',
            ],
            'Média/Régie' => [
                'view_gallery',
                'manage_gallery',
                'view_dashboard',
            ],
        ];
    }
}

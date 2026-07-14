<?php

namespace Database\Seeders;

use App\Enums\ContactMessageStatus;
use App\Models\ContactMessage;
use App\Models\PrayerRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class PrayerAndContactSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Prayer Requests
        $categories = ['spiritual', 'health', 'family', 'financial', 'work', 'other'];
        $statuses = ['new', 'praying', 'answered', 'archived'];

        $firstNames = ['Marc', 'Jean', 'Sophie', 'Marie', 'Pierre', 'Julie', 'Christian', 'Emmanuel', 'David', 'Sarah', 'Paul', 'Rachael', 'Mathieu', 'Awa', 'Koffi', 'Yao', 'Adama', 'Mariam', 'Alain', 'Grace'];
        $lastNames = ['Kouadio', 'Koné', 'Diallo', 'Diarrassouba', 'Gervais', 'Bamba', 'Traoré', 'Sidibé', 'Cissé', 'N\'guessan', 'Yao', 'Ouattara', 'Coulibaly', 'Touré', 'Soro', 'Meité', 'Gbagbo', 'Drogba', 'Zaha', 'Kessié'];

        $subjects = [
            'Prière pour la santé de ma mère qui souffre d\'hypertension',
            'Demande de prière pour la recherche d\'emploi après 6 mois de chômage',
            'Soutien spirituel pour ma famille dans une situation conflictuelle',
            'Prière d\'action de grâce pour la naissance de notre premier enfant',
            'Délivrance spirituelle et restauration de mon entreprise',
            'Prière pour la réussite de mes examens universitaires',
            'Besoin de force et de paix spirituelle face à une épreuve personnelle',
            'Prière de protection pour un voyage à l\'étranger la semaine prochaine',
            'Demande d\'intercession pour mon mariage qui traverse des turbulences',
            'Soutien dans la prière pour vaincre une addiction tenace',
        ];

        $pastors = User::query()->limit(5)->get();

        for ($i = 0; $i < 60; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $name = $firstName.' '.$lastName;
            $email = strtolower($firstName.'.'.$lastName.$i.'@example.com');

            $status = $statuses[array_rand($statuses)];
            $assignedTo = null;
            $pastoralNotes = null;

            if ($status === 'praying' || $status === 'answered' || $status === 'archived') {
                if ($pastors->isNotEmpty()) {
                    $assignedTo = $pastors->random()->id;
                }
            }

            if ($status === 'answered') {
                $pastoralNotes = 'Prière effectuée le '.date('d/m/Y').'. Suivi régulier en cours.';
            }

            PrayerRequest::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => '+225 07 '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99),
                    'category' => $categories[array_rand($categories)],
                    'message' => $subjects[array_rand($subjects)].'. Merci pour votre dévouement et vos prières de feu.',
                    'status' => $status,
                    'assigned_to' => $assignedTo,
                    'pastoral_notes' => $pastoralNotes,
                ]
            );
        }

        // 2. Seed Contact Messages
        $contactSubjects = [
            'Renseignement sur les horaires de culte de dimanche',
            'Demande d\'informations sur les cours de baptême',
            'Problème de connexion à l\'espace membre',
            'Comment faire un don ou payer ma dîme en ligne ?',
            'Partenariat ou invitation pour une conférence spirituelle',
            'Demande de rendez-vous pastoral avec le Pasteur Principal',
            'Rejoindre le ministère de la louange',
            'Signaler un lien mort sur le site web',
        ];

        $contactMessages = [
            'Bonjour, je souhaiterais savoir s\'il y a un culte spécial ce dimanche et à quelle heure débutent les enseignements. Merci.',
            'Je désire m\'inscrire aux prochains cours de baptême. Pouvez-vous m\'indiquer la démarche à suivre ainsi que les dates de rentrée ?',
            'Je n\'arrive plus à réinitialiser mon mot de passe sur le portail administrateur. Pouvez-vous m\'aider à débloquer mon compte ?',
            'Je voudrais faire un don par Mobile Money pour l\'achat du matériel de sonorisation. Avez-vous un numéro officiel ?',
            'Nous organisons un séminaire de jeunesse le mois prochain et aimerions inviter la chorale de votre église à y participer.',
            'Je traverse des moments d\'incertitude et je voudrais solliciter un entretien physique ou téléphonique avec un pasteur.',
            'Je chante et joue du piano depuis 5 ans et j\'aimerais savoir comment intégrer le groupe de louange de l\'église.',
            'Le lien vers les archives vidéo sur la page principale affiche une erreur 404. Merci de vérifier.',
        ];

        $contactStatuses = [ContactMessageStatus::Pending, ContactMessageStatus::Read, ContactMessageStatus::Archived];

        for ($i = 0; $i < 40; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $name = $firstName.' '.$lastName;
            $email = strtolower($firstName.'.'.$lastName.$i.'@example.com');

            $msgIdx = array_rand($contactSubjects);

            ContactMessage::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => '+225 05 '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99),
                    'subject' => $contactSubjects[$msgIdx],
                    'message' => $contactMessages[$msgIdx],
                    'status' => $contactStatuses[array_rand($contactStatuses)],
                ]
            );
        }
    }
}

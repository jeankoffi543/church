<?php

namespace App\Services;

use App\Models\PrayerRequest;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

/**
 * Handles automated notifications when a prayer request is submitted.
 * Currently logs the notification message. Can be extended with
 * Mail, SMS (Twilio/AfricasTalking), or WhatsApp Business API.
 */
class PrayerNotificationService
{
    /**
     * Send automated confirmation to the person who submitted a prayer request.
     */
    public function sendConfirmation(PrayerRequest$prayer): void
    {
        $template = Setting::get('prayer_automated_notification_message',
            'Bonjour [Nom], l\'équipe d\'intercession de MFM Ficgayo a bien reçu votre demande de prière. Nous prions pour vous.'
        );

        // Handle both raw string and JSON-encoded string from settings
        if (is_array($template)) {
            $template = $template[0] ?? (string) $template;
        }
        $template = (string) $template;

        $message = str_replace(
            [
                '{{name}}',
                '{{email}}',
                '{{message}}',
                '{{category}}',
                '{{phone}}',
                '{{pastor_name}}',
                '[Nom]',
                '[Catégorie]',
                '[Message]',
            ],
            [
                $prayer->name ?? '',
                $prayer->email ?? '',
                $prayer->message ?? '',
                $prayer->category ?? '',
                $prayer->phone ?? '',
                $prayer->assignee ? $prayer->assignee->name : '',
                $prayer->name ?? 'frère/sœur',
                $prayer->category ?? '',
                $prayer->message ?? '',
            ],
            $template
        );

        // Log the notification (production: replace with Mail/SMS/WhatsApp)
        Log::info('Prayer notification sent', [
            'to_email' => $prayer->email,
            'to_phone' => $prayer->phone,
            'message' => $message,
        ]);

        // Future: Mail::raw($message, fn($m) => $m->to($prayer->email)->subject('Votre demande de prière – MFM Ficgayo'));
    }

    /**
     * Get the success message to display to the user after submission.
     */
    public static function getSuccessMessage(): string
    {
        $msg = Setting::get('prayer_success_ui_message',
            'Ta demande a été transmise. Tu n\'es pas seul(e) — la Maison se tient avec toi dans la prière.'
        );

        if (is_array($msg)) {
            return (string) ($msg[0] ?? '');
        }

        return (string) $msg;
    }
}

<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to a church's first admin once its database is provisioned and ready
 * (CHR-178). Plain strings only — it is dispatched from the central context by
 * ProvisionTenant, after the tenant's admin has been seeded.
 */
class ChurchWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $churchName,
        public string $adminName,
        public string $loginUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bienvenue sur ChurchApp · {$this->churchName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.church-welcome',
            with: [
                'churchName' => $this->churchName,
                'adminName' => $this->adminName,
                'loginUrl' => $this->loginUrl,
            ],
        );
    }
}

@php
    use App\Enums\DonationFrequency;
    $amount = number_format($donation->amount, 0, ',', ' ').' '.$donation->currency;
    $freq = $donation->frequency === DonationFrequency::Mensuel ? 'Mensuel' : 'Unique';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reçu de don</title>
</head>
<body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#211648;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
        <div style="background:#161033;border-radius:18px 18px 0 0;padding:28px 32px;color:#fff;">
            <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e2b85f;font-weight:700;">MFM Ficgayo · Reçu officiel</p>
            <h1 style="margin:8px 0 0;font-size:24px;font-style:italic;font-weight:600;">Merci pour votre générosité 🙏</h1>
        </div>

        <div style="background:#fff;border-radius:0 0 18px 18px;padding:28px 32px;box-shadow:0 10px 40px rgba(22,15,51,.08);">
            <p style="margin:0 0 18px;font-size:15px;color:#5b5470;">
                Bonjour {{ $donation->donor_name }}, nous confirmons la bonne réception de votre don.
                Que le Seigneur vous le rende au centuple.
            </p>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:9px 0;color:#8a82a6;">Référence</td><td style="padding:9px 0;text-align:right;font-weight:700;">{{ $donation->reference }}</td></tr>
                <tr><td style="padding:9px 0;color:#8a82a6;">Affectation</td><td style="padding:9px 0;text-align:right;font-weight:700;text-transform:capitalize;">{{ $donation->purpose_key }}</td></tr>
                <tr><td style="padding:9px 0;color:#8a82a6;">Fréquence</td><td style="padding:9px 0;text-align:right;font-weight:700;">{{ $freq }}</td></tr>
                @if ($donation->channel)
                    <tr><td style="padding:9px 0;color:#8a82a6;">Moyen</td><td style="padding:9px 0;text-align:right;font-weight:700;text-transform:capitalize;">{{ str_replace('_', ' ', $donation->channel) }}</td></tr>
                @endif
                <tr><td style="padding:9px 0;color:#8a82a6;">Date</td><td style="padding:9px 0;text-align:right;font-weight:700;">{{ $donation->created_at?->locale('fr')->translatedFormat('d F Y · H:i') }}</td></tr>
            </table>

            <div style="margin-top:18px;background:linear-gradient(135deg,#e2b85f,#c8902e);border-radius:14px;padding:18px 22px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#161033;font-weight:700;">Montant du don</p>
                <p style="margin:4px 0 0;font-size:30px;font-weight:800;color:#161033;">{{ $amount }}</p>
            </div>

            <p style="margin:22px 0 0;font-size:12px;color:#8a82a6;text-align:center;">
                Ce reçu fait foi de votre contribution. Conservez-le pour vos archives.
            </p>
        </div>
    </div>
</body>
</html>

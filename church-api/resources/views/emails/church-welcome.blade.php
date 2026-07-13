<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenue sur ChurchApp</title>
</head>
<body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#211648;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
        <div style="background:#161033;border-radius:18px 18px 0 0;padding:28px 32px;color:#fff;">
            <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e2b85f;font-weight:700;">ChurchApp</p>
            <h1 style="margin:8px 0 0;font-size:24px;font-style:italic;font-weight:600;">Votre église est en ligne 🎉</h1>
        </div>

        <div style="background:#fff;border-radius:0 0 18px 18px;padding:28px 32px;box-shadow:0 10px 40px rgba(22,15,51,.08);">
            <p style="margin:0 0 16px;font-size:15px;color:#5b5470;">
                Bonjour {{ $adminName }},
            </p>
            <p style="margin:0 0 18px;font-size:15px;color:#5b5470;">
                Le site de <strong style="color:#211648;">{{ $churchName }}</strong> est prêt. Votre espace
                d'administration vous attend pour personnaliser votre site, ajouter vos fidèles et publier
                votre premier contenu.
            </p>

            <p style="margin:0 0 28px;text-align:center;">
                <a href="{{ $loginUrl }}" style="display:inline-block;background:#e2b85f;color:#211648;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;">
                    Accéder à mon administration
                </a>
            </p>

            <p style="margin:0 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#8a82a6;font-weight:700;">Vos prochaines étapes</p>
            <ul style="margin:0 0 18px;padding-left:18px;font-size:14px;color:#5b5470;line-height:1.7;">
                <li>Personnalisez le nom, le logo et les couleurs de votre église.</li>
                <li>Ajoutez vos premiers fidèles et invitez vos serviteurs.</li>
                <li>Publiez une prédication ou un événement à venir.</li>
            </ul>

            <p style="margin:18px 0 0;font-size:13px;color:#8a82a6;">
                Si le bouton ne fonctionne pas, copiez ce lien&nbsp;: <br>
                <span style="color:#5b5470;word-break:break-all;">{{ $loginUrl }}</span>
            </p>
        </div>

        <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#8a82a6;">
            ChurchApp — Le site de votre église, clé en main.
        </p>
    </div>
</body>
</html>

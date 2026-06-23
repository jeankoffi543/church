# Serveur de streaming souverain (RTMP → HLS)

Diffuse les cultes depuis **OBS** sur notre propre infrastructure, sans dépendre de
YouTube/Facebook. Le moteur réactif (chat, réactions, audience — Laravel Reverb) et
le lecteur `/live` (hls.js, déjà intégré) fonctionnent à l'identique : il suffit de
coller l'URL `.m3u8` du flux dans l'admin.

```
OBS ──RTMP──▶ Nginx-RTMP ──HLS(.m3u8/.ts)──▶ [CDN] ──▶ /live (hls.js)
```

## 1. Démarrer le serveur

```bash
cd streaming
docker compose up -d
docker compose logs -f rtmp   # vérifier le démarrage
```

- Ingest RTMP : `rtmp://<serveur>:1935/live`
- Livraison HLS : `http://<serveur>:8088/hls/<clé>.m3u8`

> Le port hôte est **8088** (et non 8080, déjà pris par Laravel Reverb). À l'intérieur
> du conteneur, Nginx écoute toujours sur 8080 — ne touche pas à `nginx.conf`.

## 2. Authentification de la clé de stream

Nginx appelle l'API Laravel (`on_publish`) avant d'autoriser une diffusion : seule la
clé secrète configurée peut publier.

- Définir la clé dans `church-api/.env` :
  ```
  RTMP_PUBLISH_KEY=culte-secret-2026
  ```
- Vérifier l'URL de callback dans `nginx.conf` (`on_publish …/api/v1/public/rtmp/auth`)
  pour qu'elle pointe vers l'API (par défaut `host.docker.internal:8001`).

Une clé absente/incorrecte → `403`, la diffusion est refusée.

## 3. Configurer OBS

**Paramètres → Stream**
- Service : `Personnalisé`
- Serveur : `rtmp://<serveur>:1935/live`
- Clé de stream : `culte-secret-2026` (= `RTMP_PUBLISH_KEY`)

**Paramètres → Sortie** (Avancé)
- Encodeur x264, débit **CBR ~4500 kbps** (1080p)
- **Intervalle d'images-clés = 1 s** ⚠️ levier #1 de la latence : doit égaler `hls_fragment`
  (en « auto », OBS produit des segments de 8–10 s → ~30 s de retard). Préréglage
  d'usage `tune=zerolatency` recommandé.

## 4. Brancher dans l'application

`/admins/settings → Direct → URL du flux vidéo` :

```
http://<serveur>:8088/hls/culte-secret-2026.m3u8      # dev
https://stream.mfmficgayo.ci/hls/culte-secret-2026.m3u8   # prod (CDN + HTTPS)
```

Passe le statut **En direct**, enregistre → `/live` joue le flux via hls.js.

## 5. Production

- **HTTPS + CDN** : place Cloudflare devant l'endpoint `:8088` (sous-domaine
  `stream.mfmficgayo.ci`). Le CDN absorbe la bande passante (≈ 2000 fidèles) ; le serveur
  ne sert chaque segment qu'une fois. hls.js exige HTTPS si l'app est en HTTPS.
- **Rediffusion (VOD) — automatique** : chaque diffusion est enregistrée (FLV),
  remuxée en MP4 par ffmpeg à l'arrêt d'OBS, puis l'API est notifiée
  (`rtmp/recorded`) et **rattache le MP4 à l'archive du live** créée juste avant. Le
  fichier atterrit dans `church-api/storage/app/public/lives/recordings/` (volume
  partagé) → la rediffusion d'un live OBS devient pleinement lisible, chat synchronisé.
- **Latence** :
  - **HLS réglé** (cette config : fragments 1 s, playlist 6 s, OBS keyframe 1 s,
    hls.js qui vise le bord + rattrape) ≈ **6–8 s**. C'est le plancher réaliste du HLS.
  - **Quasi temps réel (~1–3 s)** : passe à **MediaMTX** (RTMP in → **LL-HLS / WebRTC** out).
    Pour LL-HLS, même URL `.m3u8` → le lecteur actuel suffit (`lowLatencyMode` déjà actif).
    Pour WebRTC (le plus bas), il faudrait un lecteur WebRTC dédié.
  - Ne descends pas les fragments sous 1 s sur réseau grand public : risque de buffering.
- **Souveraineté** : ici « Arrêter le direct » coupe réellement le flux (contrairement
  à YouTube/Facebook).

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: query-master.spec.ts >> QueryMaster Front-End E2E Tests >> Médiathèque (/mediatheque) >> performs text search, handles spaces, and displays no-results UI
- Location: tests/e2e/query-master.spec.ts:37:9

# Error details

```
Error: apiRequestContext._wrapApiCall: file data stream has unexpected number of bytes
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "MFM Ficgayo — Accueil" [ref=e5] [cursor=pointer]:
          - /url: /
          - img "Logo Ministères de la Montagne du Feu et des Miracles" [ref=e6]
          - generic [ref=e7]:
            - generic [ref=e8]: MFM Ficgayo
            - generic [ref=e9]: Maison du Feu
        - navigation [ref=e10]:
          - navigation "Main" [ref=e11]:
            - list [ref=e13]:
              - listitem [ref=e14]:
                - button "L'Église" [ref=e15]:
                  - text: L'Église
                  - img [ref=e16]
              - listitem [ref=e18]:
                - button "Communauté" [ref=e19]:
                  - text: Communauté
                  - img [ref=e20]
              - listitem [ref=e22]:
                - button "Médiathèque" [ref=e23]:
                  - text: Médiathèque
                  - img [ref=e24]
              - listitem [ref=e26]:
                - link "Agenda" [ref=e27] [cursor=pointer]:
                  - /url: /agenda
                  - img [ref=e28]
                  - text: Agenda
              - listitem [ref=e30]:
                - link "Contact" [ref=e31] [cursor=pointer]:
                  - /url: /contact
                  - img [ref=e32]
                  - text: Contact
        - generic [ref=e34]:
          - link "HORS LIGNE" [ref=e35] [cursor=pointer]:
            - /url: /live
            - text: HORS LIGNE
          - link "Donner" [ref=e37] [cursor=pointer]:
            - /url: /dons
    - main [ref=e38]:
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42]: Médiathèque
          - heading "Enseignements & rediffusions" [level=1] [ref=e43]
          - paragraph [ref=e44]: Réécoute chaque message, filtre par série, par orateur ou par livre de la Bible.
        - generic [ref=e45]:
          - generic [ref=e46]:
            - img [ref=e47]
            - textbox "Rechercher par titre, orateur, série…" [active] [ref=e50]: nonexistentqueryterm12345
          - button "Plus de Filtres" [ref=e51] [cursor=pointer]:
            - img [ref=e52]
            - text: Plus de Filtres
        - generic [ref=e53]: 0 message(s)
        - generic [ref=e54]:
          - paragraph [ref=e55]: Aucun message trouvé
          - paragraph [ref=e56]: Essayez d’ajuster votre recherche ou vos filtres.
    - contentinfo [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - link "MFM Ficgayo — Accueil" [ref=e60] [cursor=pointer]:
            - /url: /
            - img "Logo Ministères de la Montagne du Feu et des Miracles" [ref=e61]
            - generic [ref=e62]:
              - generic [ref=e63]: MFM Ficgayo
              - generic [ref=e64]: Maison du Feu
          - paragraph [ref=e65]: Une église chrétienne évangélique de grâce, de feu et de miracles, au cœur d'Abidjan.
          - generic [ref=e66]:
            - link "Facebook" [ref=e67] [cursor=pointer]:
              - /url: https://facebook.com/mfmficgayo
              - text: f
            - link "YouTube" [ref=e68] [cursor=pointer]:
              - /url: https://youtube.com/@mfmficgayo
              - text: ▶
            - link "Instagram" [ref=e69] [cursor=pointer]:
              - /url: https://instagram.com/mfmficgayo
              - text: "@"
        - generic [ref=e70]:
          - generic [ref=e71]: Navigation
          - generic [ref=e72]:
            - link "Accueil" [ref=e73] [cursor=pointer]:
              - /url: /
            - link "Culte en direct" [ref=e74] [cursor=pointer]:
              - /url: /live
            - link "Médiathèque" [ref=e75] [cursor=pointer]:
              - /url: /mediatheque
            - link "Ministères" [ref=e76] [cursor=pointer]:
              - /url: /ministeres
            - link "L'Église" [ref=e77] [cursor=pointer]:
              - /url: /eglise
            - link "Agenda" [ref=e78] [cursor=pointer]:
              - /url: /agenda
            - link "Contact" [ref=e79] [cursor=pointer]:
              - /url: /contact
        - generic [ref=e80]:
          - generic [ref=e81]: Nous trouver
          - generic [ref=e82]:
            - generic [ref=e83]: Yopougon Ficgayo
            - generic [ref=e84]: Abidjan, Côte d'Ivoire
            - text: +225 07 00 00 00 00
            - text: bonjour@mfm-ficgayo.ci
          - generic [ref=e85]:
            - strong [ref=e86]: Cultes
            - text: · Dim 9h · Mar 18h30 · Ven 22h
        - generic [ref=e87]:
          - generic [ref=e88]: Reste connecté
          - paragraph [ref=e89]: Reçois les actus et les méditations de la semaine.
          - generic [ref=e90]:
            - textbox "Ton e-mail" [ref=e91]
            - button "S'abonner" [ref=e92]: →
      - generic [ref=e93]:
        - generic [ref=e94]: © 2026 Église MFM Ficgayo. Tous droits réservés.
        - generic [ref=e95]: Bâti avec foi · « À Dieu seul la gloire »
  - button "Open Next.js Dev Tools" [ref=e101] [cursor=pointer]:
    - img [ref=e102]
  - alert [ref=e105]
```
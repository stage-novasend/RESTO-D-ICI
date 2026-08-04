# 🎓 Démonstration soutenance — Cycle commande + paiement (local)

Ce guide permet de dérouler **en local**, sans NovaSend réel, tout le cycle :
**commande → paiement → cuisine (temps réel) → suivi client → reçu**.

> ✅ **Ce guide a été vérifié de bout en bout** (inscription, connexion, panier,
> paiement, KDS temps réel) juste avant la rédaction de cette version — pas
> seulement relu. Un bug bloquant a été trouvé et corrigé au passage (§9), et
> trois pièges d'environnement qui cassaient silencieusement la démo ont été
> identifiés (§2bis). Suivez ce guide tel quel plutôt que l'ancienne version.

---

## 1. Prérequis

- Node.js (version du `.nvmrc` si présent), Docker + Docker Compose.
- Deux terminaux (backend + frontend).

---

## 2. Configuration (une seule fois)

### Backend — `restodici-backend/.env`
Copier l'exemple puis renseigner au minimum :
```bash
cp restodici-backend/.env.example restodici-backend/.env
```
```env
JWT_SECRET=un-secret-long-et-aleatoire     # OBLIGATOIRE (le serveur refuse de démarrer sans)
DB_HOST=localhost
DB_PORT=5433                                # le docker-compose expose Postgres sur 5433
DB_USERNAME=restodici_user
DB_PASSWORD=restodici_pass
DB_DATABASE=restodici_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change-me                    # doit correspondre au docker-compose
CORS_ORIGINS=http://localhost:5173
# NOVASEND_* : laisser VIDE en démo — voir §2bis, c'est important.
```

### Frontend — `restodici-frontend/.env`
```bash
cp restodici-frontend/.env.example restodici-frontend/.env
```
```env
VITE_API_URL=http://localhost:3000/api
VITE_BACKEND_ORIGIN=http://localhost:3000
# VITE_SIMULATE_PAYMENT vide → simulation ACTIVE automatiquement en dev
```

---

## 2bis. ⚠️ Variables à vérifier AVANT la soutenance (piège découvert en test)

Si votre `.env` backend contient déjà des **vraies clés NovaSend** (utilisées pour
d'autres tests d'intégration), la démo casse silencieusement : l'app tente de
vrais appels API au lieu de simuler, ce qui provoque soit une redirection vers
une vraie page de paiement externe (Wave), soit un blocage sur « En attente de
confirmation » qui ne se résout jamais (MTN/Orange/Moov — en attente d'un vrai
webhook qui n'arrivera jamais en local).

**Juste avant la présentation**, vérifiez/videz ces 4 lignes dans
`restodici-backend/.env` :

```env
NOVASEND_API_KEY=
NOVASEND_API_SECRET=
PUBLIC_FRONTEND_URL=
PAYMENT_RETURN_URL=
```

Sans clé API, le paiement bascule automatiquement en simulation locale
(`/paiement/preview` sur `http://localhost:5173`, confirmation en ~2,5 s,
aucune redirection externe) — c'est exactement le comportement décrit au §6.
**Redémarrez le backend après avoir modifié `.env`** (les variables d'env ne
sont lues qu'au démarrage, pas à chaud).

> Si vous avez besoin de conserver ces clés pour d'autres tests après la
> soutenance, faites une copie de `.env` avant de les vider, et restaurez-la
> ensuite.

---

## 3. Démarrage (dans l'ordre)

```bash
# 1) Infrastructure (Postgres + Redis)
docker compose up -d          # (REDIS_PASSWORD doit être exporté ou dans un .env à la racine)

# 2) Backend
cd restodici-backend
npm install
npm run seed:demo             # crée les 5 comptes + restaurant + menu — voir §4
npm run start:dev             # API sur http://localhost:3000/api  (Swagger : /api/docs)

# 3) Frontend (autre terminal)
cd restodici-frontend
npm install
npm run dev                   # http://localhost:5173
```

En dev, TypeORM crée le schéma automatiquement (`synchronize`) — aucune migration à lancer.

---

## 4. Comptes de démonstration

**Utilisez `npm run seed:demo` (pas l'inscription manuelle depuis l'app).**

L'inscription manuelle (`/register`) exige une **vérification d'email** avant
la première connexion — testé et confirmé : un compte fraîchement inscrit ne
peut pas se connecter tant que le lien reçu par email n'a pas été cliqué.
`seed:demo` crée directement des comptes déjà vérifiés, avec un restaurant et
un menu déjà remplis — c'est la voie rapide et fiable pour une démo.

```bash
cd restodici-backend
npm run seed:demo
```

Mot de passe **unique pour les 5 comptes** : `RestoDici2026!`

| Rôle | Email |
|---|---|
| Admin | `admin@restodici.ci` |
| Gérant | `gerant@restodici.ci` |
| Staff | `staff@restodici.ci` |
| Client | `client@restodici.ci` |
| B2B | `b2b@restodici.ci` |

Le script crée aussi le restaurant **« Resto D'ICI Plateau »** avec 4
catégories et 6 articles déjà en stock (Garba, poulet braisé, poisson
capitaine, jus locaux…) — rien à saisir en direct.

> Astuce soutenance : relancez `npm run seed:demo` juste avant la présentation
> si vous voulez repartir sur des données fraîches (le script est idempotent,
> il met à jour plutôt que dupliquer).

---

## 5. Le scénario à dérouler (≈ 3 min)

1. **Côté client** — se connecter (`client@restodici.ci`), ouvrir le **menu**
   d'un restaurant, ajouter des plats au **panier**.
2. **Checkout** — choisir un mode (sur place / à emporter / livraison), puis
   un moyen de paiement mobile.
   **Recommandé : MTN Mobile Money**, avec un numéro `05XXXXXXXX` (ex.
   `0554123456`) — c'est le seul moyen sans complication en démo (voir §5bis).
3. **Payer** — l'écran de paiement s'affiche ; **la confirmation arrive
   automatiquement au bout de ~2,5 s** (simulation, si §2bis est bien
   appliqué). La commande passe à **payée**.
4. **Temps réel** — ouvrir en parallèle l'espace **Staff/KDS** (cuisine) :
   la commande y **apparaît instantanément** (WebSocket). Faire avancer les
   statuts : *Reçue → Confirmée → En préparation → Prête → Livrée*.
5. **Côté client** — le **suivi de commande** se met à jour en direct à
   chaque changement de statut.
6. **Reçu** — télécharger le **reçu PDF** depuis l'historique du client.

Points à souligner devant le jury :
- Mise à jour **temps réel** (Socket.IO, rooms par rôle/restaurant).
- **Sécurité** : JWT + 2FA, rôles, en-têtes Helmet, signature de webhook,
  throttling, access token en mémoire (jamais en `localStorage`, protection
  XSS) avec refresh via cookie HttpOnly.
- **Paiement** : architecture *Strategy* (NovaSend/Wave/OM/MTN) extensible ;
  la démo simule le webhook fournisseur.

---

## 5bis. ⚠️ Quel moyen de paiement choisir en démo — testé un par un

| Moyen | Verdict démo | Pourquoi |
|---|---|---|
| **MTN Mobile Money** | ✅ **Recommandé** | Pas d'OTP, reste dans l'app, confirmation simulée fluide. Utiliser un numéro `04`/`05`/`06`. |
| **Moov Money** | ✅ Bon second choix | Même comportement que MTN. Numéro `01`/`02`/`03`. |
| **Orange Money** | ❌ À éviter en démo | Exige un **vrai code OTP** (composer `#144*82#` sur un vrai téléphone Orange) — non simulable localement. C'est un comportement volontaire, pas un bug, mais inutilisable devant un jury sans téléphone Orange sous la main. |
| **Wave** | ⚠️ À éviter si NovaSend est configuré avec de vraies clés | Redirige vers une vraie page `pay.wave.com` si `NOVASEND_API_KEY` est renseignée (§2bis). Fonctionne en simulation propre une fois les clés vidées, mais MTN reste plus prévisible pour une démo live. |
| **Carte bancaire** | ⚠️ Non testé dans cette vérification | Flux différent (pas de numéro mobile) — à tester vous-même avant si vous comptez l'utiliser. |

**Numéros valides par opérateur (format `0X XX XX XX XX`)** — préfixes
Côte d'Ivoire utilisés par la validation : Orange `07`/`08`/`09`, MTN
`04`/`05`/`06`, Moov `01`/`02`/`03`. Un numéro avec le mauvais préfixe pour
l'opérateur choisi bloque le bouton Payer (validation correcte, pas un bug —
juste utiliser le bon préfixe).

**Point de vigilance non résolu** : dans nos tests, la redirection automatique
post-paiement vers `/paiement/preview` a parfois renvoyé vers l'écran de
connexion (perte de session sur rechargement complet de page). Si ça arrive
pendant la démo : reconnectez-vous avec le même compte, la commande est déjà
enregistrée côté serveur, rien n'est perdu. Recommandé de **tester ce point
précis vous-même** avant la soutenance pour savoir à quoi vous attendre.

---

## 6. Comment fonctionne la simulation (à expliquer si on vous le demande)

- Le front appelle `POST /api/paiements/initier` (crée la session de paiement).
- Sans clé NovaSend configurée (§2bis), le backend bascule automatiquement en
  simulation et renvoie une URL locale `/paiement/preview?ref=...`.
- Cette page appelle **automatiquement** `POST /api/paiements/simuler` à son
  montage, ce qui déclenche en interne le **même code que le webhook NovaSend
  réel** (`handleNovasendWebhook`) — le chemin de confirmation est donc
  **identique** à la production, seule la source de l'événement change.
- Avec de vraies clés NovaSend configurées, ce mécanisme est court-circuité :
  le backend tente un vrai appel API, d'où les comportements du tableau §5bis.

---

## 7. Dépannage

| Symptôme | Cause / solution |
|---|---|
| Le serveur refuse de démarrer | `JWT_SECRET` manquant dans `.env` (volontaire, sécurité). |
| `ECONNREFUSED` Redis | `REDIS_PASSWORD` du `.env` ≠ celui du `docker-compose`. |
| « Email non vérifié » au login | Vous avez utilisé `/register` au lieu de `npm run seed:demo` (§4). |
| Paiement redirige vers une vraie page externe (Wave) ou reste bloqué en attente | `NOVASEND_API_KEY`/`SECRET` sont renseignées dans `.env` — les vider (§2bis) et redémarrer le backend. |
| « Le restaurant est fermé » alors qu'il ne devrait pas l'être | Bug corrigé (§9) si vous êtes à jour. Sinon, vérifiez `git log` sur `horaires.guard.ts`. |
| Bouton Payer désactivé | Numéro de téléphone au mauvais préfixe pour l'opérateur choisi (§5bis). |
| CORS bloqué | Ajouter l'origine du front dans `CORS_ORIGINS`. |
| Commande absente du KDS | Vérifier que le WebSocket est connecté (onglet Réseau → `socket.io`). |
| Renvoyé sur `/login` juste après avoir payé | Point de vigilance connu (§5bis) — reconnectez-vous, la commande n'est pas perdue. |

---

## 8. Passage en production (rappel)

- `VITE_SIMULATE_PAYMENT=false` (ou build prod) + clés **NovaSend** réelles + `NOVASEND_WEBHOOK_SECRET`.
- `NODE_ENV=production`, `synchronize: false` + migrations, `CORS_ORIGINS` = domaine réel, HTTPS.

---

## 9. Bug corrigé pendant cette vérification

**Horaires traversant minuit toujours « fermé ».** `horaires.guard.ts`
calculait l'heure de fermeture en minutes depuis minuit (`closeH*60+closeM`)
et comparait directement à l'heure courante. Pour un restaurant fermant à
`00:00` (très courant), cela donnait `closeMinutes = 0` : n'importe quelle
heure de la journée devenait alors « après la fermeture », et **le paiement
échouait systématiquement avec « Le restaurant est fermé »**, quelle que soit
l'heure réelle. Reproduit en direct sur le restaurant « Afro Fusion Kitchen »
(horaires 11:00–00:00) à 18h — devrait être ouvert, refusait pourtant tout
paiement. Corrigé pour gérer les créneaux traversant minuit (11:00–00:00,
18:00–02:00, etc.) correctement.

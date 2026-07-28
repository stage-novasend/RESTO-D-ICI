# 🎓 Démonstration soutenance — Cycle commande + paiement (local)

Ce guide permet de dérouler **en local**, sans NovaSend réel, tout le cycle :
**commande → paiement → cuisine (temps réel) → suivi client → reçu**.

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
# NOVASEND_* : inutile en démo (paiement simulé)
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

> ℹ️ **Simulation de paiement** : active par défaut en `npm run dev`, **désactivée** dans un build de production. Aucune clé NovaSend requise pour la démo.

---

## 3. Démarrage (dans l'ordre)

```bash
# 1) Infrastructure (Postgres + Redis)
docker compose up -d          # (REDIS_PASSWORD doit être exporté ou dans un .env à la racine)

# 2) Backend
cd restodici-backend
npm install
npm run seed:admin            # crée l'admin — voir §4
npm run start:dev             # API sur http://localhost:3000/api  (Swagger : /api/docs)

# 3) Frontend (autre terminal)
cd restodici-frontend
npm install
npm run dev                   # http://localhost:5173
```

En dev, TypeORM crée le schéma automatiquement (`synchronize`) — aucune migration à lancer.

---

## 4. Comptes de démonstration

**Admin** (via le script de seed) :
```bash
cd restodici-backend
npx ts-node -r tsconfig-paths/register src/admin/seed-admin.ts
```
→ `admin@restodici.ci` / `Admin@2025!`

**Gérant + restaurant + menu** : s'inscrire depuis l'app (`/register` → *Restaurant*),
l'assistant d'onboarding crée le restaurant et permet d'ajouter des articles au menu.

**Client** : s'inscrire depuis l'app (`/register` → *Client*).

> Astuce soutenance : préparez ces 3 comptes **avant** la présentation pour ne pas
> saisir de formulaires en direct.

---

## 5. Le scénario à dérouler (≈ 3 min)

1. **Côté client** — se connecter, ouvrir le **menu** d'un restaurant, ajouter des plats au **panier**.
2. **Checkout** — choisir un mode (sur place / livraison), un moyen de paiement mobile
   (Orange Money / MTN / Wave…), saisir le numéro au format `+225 07 12 34 56 78`.
3. **Payer** — l'écran de paiement s'affiche ; **la confirmation arrive automatiquement au bout de ~2,5 s** (simulation).
   La commande passe à **payée**.
4. **Temps réel** — ouvrir en parallèle l'espace **Staff/KDS** (cuisine) : la commande y **apparaît instantanément** (WebSocket).
   Faire avancer les statuts : *Reçue → Confirmée → En préparation → Prête → Livrée*.
5. **Côté client** — le **suivi de commande** se met à jour en direct à chaque changement de statut.
6. **Reçu** — télécharger le **reçu PDF** depuis l'historique du client.

Points à souligner devant le jury :
- Mise à jour **temps réel** (Socket.IO, rooms par rôle/restaurant).
- **Sécurité** : JWT + 2FA, rôles, en-têtes Helmet, signature de webhook, throttling.
- **Paiement** : architecture *Strategy* (NovaSend/Wave/OM/MTN) extensible ; la démo simule le webhook fournisseur.

---

## 6. Comment fonctionne la simulation (à expliquer si on vous le demande)

- Le front appelle `POST /api/paiements/initier` (crée la session de paiement).
- En dev, il appelle ensuite `POST /api/paiements/simuler { commandeId, provider }`.
- Cet endpoint est **authentifié** et **désactivé en production** (`NODE_ENV=production` → 403).
- Il déclenche en interne le **même code que le webhook NovaSend réel** (`handleNovasendWebhook`),
  donc le chemin de confirmation est **identique** à la production.

---

## 7. Dépannage

| Symptôme | Cause / solution |
|---|---|
| Le serveur refuse de démarrer | `JWT_SECRET` manquant dans `.env` (volontaire, sécurité). |
| `ECONNREFUSED` Redis | `REDIS_PASSWORD` du `.env` ≠ celui du `docker-compose`. |
| Le paiement ne se confirme pas | Vérifier qu'on est bien en `npm run dev` (simulation active) et connecté. |
| CORS bloqué | Ajouter l'origine du front dans `CORS_ORIGINS`. |
| Commande absente du KDS | Vérifier que le WebSocket est connecté (onglet Réseau → `socket.io`). |

---

## 8. Passage en production (rappel)

- `VITE_SIMULATE_PAYMENT=false` (ou build prod) + clés **NovaSend** réelles + `NOVASEND_WEBHOOK_SECRET`.
- `NODE_ENV=production`, `synchronize: false` + migrations, `CORS_ORIGINS` = domaine réel, HTTPS.

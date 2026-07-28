# RESTODICI

Plateforme digitale de restauration développée dans le cadre d'un mémoire de licence L3 à l'ESATIC (Côte d'Ivoire), en collaboration avec **Sankofa Lab**.

RESTODICI permet à des restaurants d'accepter des commandes en ligne, de gérer leur cuisine en temps réel et de proposer un espace entreprise (B2B) pour les commandes groupées.

---

## Table des matières

1. [Aperçu fonctionnel](#aperçu-fonctionnel)
2. [Architecture technique](#architecture-technique)
3. [Structure du projet](#structure-du-projet)
4. [Prérequis](#prérequis)
5. [Installation et démarrage](#installation-et-démarrage)
6. [Variables d'environnement](#variables-denvironnement)
7. [Rôles utilisateurs](#rôles-utilisateurs)
8. [Modules backend](#modules-backend)
9. [Pages frontend](#pages-frontend)
10. [Paiements (NovaSend)](#paiements-novasend)
11. [WebSocket & temps réel](#websocket--temps-réel)
12. [Build de production](#build-de-production)
13. [Docker](#docker)

---

## Aperçu fonctionnel

| Fonctionnalité | Description |
|---|---|
| Commande en ligne | Parcourir le menu, ajouter au panier, payer |
| Suivi en temps réel | Statut de commande mis à jour via WebSocket |
| KDS (Kitchen Display System) | Écran cuisine pour les commandes en attente |
| Caisse | Interface de prise de commande pour le staff |
| Commandes groupées B2B | Entreprises commandent pour leurs équipes |
| Facturation mensuelle B2B | Factures PDF générées automatiquement |
| Codes promo | Visibilité configurable (tous / connectés / nouveaux) |
| Gestion des stocks | Suivi par article, alertes seuil |
| Paiements mobiles | Wave, Orange Money, MTN MoMo via NovaSend |
| Notifications | Email (Resend), SMS et push navigateur |

---

## Architecture technique

```
RESTODICI
├── restodici-backend      NestJS 11 — API REST + WebSocket
└── restodici-frontend     React 18 + Vite 8 — SPA multi-rôles
```

**Stack backend**
- **NestJS 11** avec TypeScript
- **TypeORM 0.3** + **PostgreSQL 15** (migrations auto hors production)
- **BullMQ** + **Redis 7** — file de tâches asynchrones (queue reçus PDF)
- **Socket.IO 4** — Gateway WebSocket pour le suivi des commandes
- **Passport JWT** — authentification par token Bearer
- **Resend** — envoi d'emails transactionnels
- **AWS S3** — stockage des photos d'articles
- **PDFKit** — génération de factures et reçus
- **@nestjs/schedule** — tâches CRON (facturation mensuelle B2B)
- **@nestjs/throttler** — protection rate-limit

**Stack frontend**
- **React 18** + **React Router 7**
- **Vite 8** — bundler avec lazy loading par route
- **TanStack Query v5** — cache des requêtes API
- **Socket.IO Client 4** — connexion temps réel
- **Chart.js 4** — graphiques dans les dashboards
- **Leaflet 4** — cartes de livraison
- **Lucide React** — icônes
- **Zustand 5** — état global léger
- **jsPDF** — export PDF côté client

---

## Structure du projet

```
RESTODICI/
├── docker-compose.yml             PostgreSQL + Redis en conteneurs
├── restodici-backend/
│   └── src/
│       ├── app.module.ts          Module racine NestJS
│       ├── main.ts                Bootstrap (port 3000, CORS, validation)
│       ├── auth/                  JWT, login, register, Google OAuth
│       ├── menu/                  Articles, catégories, restaurants
│       ├── commandes/             Commandes + Gateway WebSocket
│       ├── paiements/             Intégration NovaSend (Wave, OM, MTN)
│       ├── b2b/                   Commandes groupées, équipes, facturation
│       ├── promos/                Codes promo (visibilité configurable)
│       ├── stocks/                Gestion des stocks par article
│       ├── restaurants/           Entités restaurants, notes, avis
│       ├── notifications/         Email, SMS, push
│       ├── receipt-queue/         Queue BullMQ pour génération PDF reçus
│       ├── tresorerie/            Rapports financiers gérant
│       ├── fournisseurs/          Gestion des fournisseurs
│       ├── newsletter/            Abonnements et envois newsletter
│       ├── storage/               Upload vers S3
│       └── admin/                 Routes d'administration système
└── restodici-frontend/
    └── src/
        ├── App.jsx                Routage (lazy loading par page)
        ├── hooks/
        │   ├── useAuth.jsx        Contexte auth + décodage JWT
        │   └── useCart.jsx        Panier (Context API)
        ├── services/
        │   ├── api.js             Instance Axios + menuAPI, commandeAPI…
        │   └── backend-endpoints.js  Résolution dynamique URL backend
        ├── layouts/               GerantLayout, ClientLayout, B2BLayout…
        ├── pages/
        │   ├── Home.jsx           Accueil public
        │   ├── Menu.jsx           Menu restaurant + codes promo
        │   ├── Cart.jsx           Panier
        │   ├── Checkout.jsx       Paiement
        │   ├── admin/             Dashboard administrateur
        │   ├── gerant/            Dashboard gérant + KDS
        │   ├── staff/             KDS staff, caisse, serveur
        │   ├── b2b/               Commandes groupées, équipes, rapports
        │   └── client/            Compte client, historique
        ├── components/
        │   ├── wizard/            OnboardingWizard (par rôle)
        │   ├── menu/              Cards articles, catégories
        │   ├── notifications/     Centre de notifications
        │   └── ui/                Composants réutilisables
        └── utils/
            └── articleImage.js    Images Unsplash fallback (plats africains)
```

---

## Prérequis

- **Node.js 20+**
- **npm 10+**
- **PostgreSQL 15+** (ou Docker)
- **Redis 7+** (ou Docker)
- Un compte **NovaSend** pour les paiements mobiles (optionnel en dev)

---

## Installation et démarrage

### Option A — Avec Docker (recommandé)

Lance PostgreSQL et Redis en une commande :

```bash
docker-compose up -d
```

Vérifie que les conteneurs tournent :

```bash
docker ps
# restodici-db    → port 5433
# restodici-redis → port 6379
```

### Option B — Services locaux

Installe et démarre PostgreSQL 15 et Redis 7 manuellement, puis crée la base :

```sql
CREATE DATABASE restodici_db;
CREATE USER restodici_user WITH PASSWORD 'restodici_pass';
GRANT ALL PRIVILEGES ON DATABASE restodici_db TO restodici_user;
```

---

### 1. Backend

```bash
cd restodici-backend

# Installer les dépendances
npm install

# Copier et remplir le fichier d'environnement
cp .env.example .env   # (ou créer manuellement, voir section Variables)

# Lancer en mode développement (hot reload)
npm run start:dev
```

L'API démarre sur **http://localhost:3000/api**

---

### 2. Frontend

```bash
cd restodici-frontend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer en mode développement
npm run dev
```

Le frontend démarre sur **http://localhost:5173**

---

## Variables d'environnement

Les variables requises sont listées dans les fichiers d'exemple fournis :

- Backend : `restodici-backend/.env.example`
- Frontend : `restodici-frontend/.env.example`

```bash
cp restodici-backend/.env.example  restodici-backend/.env
cp restodici-frontend/.env.example restodici-frontend/.env
```

Remplissez ensuite chaque valeur dans vos fichiers `.env` locaux (ne les commitez jamais).

---

## Rôles utilisateurs

| Rôle | Espace | Description |
|---|---|---|
| `CLIENT` | `/account`, `/menu`, `/cart` | Commande en ligne, suivi, historique |
| `GERANT` | `/gerant` | Gestion du restaurant, KDS, trésorerie, stocks, codes promo |
| `STAFF` | `/staff` | KDS cuisine, caisse, prise de commande en salle |
| `B2B` | `/b2b` | Commandes groupées pour entreprises, équipes, facturation |
| `ADMIN` | `/admin` | Gestion globale de la plateforme, utilisateurs, restaurants |

Chaque rôle dispose d'un **wizard d'onboarding** affiché une seule fois (stocké dans `localStorage`).

---

## Modules backend

| Module | Endpoints principaux |
|---|---|
| `auth` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| `menu` | `GET /api/menu/restaurants`, `GET /api/menu/articles`, `GET /api/menu/promos-actives` |
| `commandes` | `POST /api/commandes`, `GET /api/commandes/:id`, `PATCH /api/commandes/:id/statut` |
| `paiements` | `POST /api/paiements/initier`, `POST /api/paiements/webhook` |
| `b2b` | `POST /api/b2b/commandes`, `GET /api/b2b/factures`, `POST /api/b2b/equipes` |
| `promos` | `POST /api/promos`, `GET /api/promos`, `POST /api/promos/valider` |
| `stocks` | `GET /api/stocks`, `PATCH /api/stocks/:id` |
| `restaurants` | `GET /api/restaurants`, `POST /api/restaurants/avis` |
| `tresorerie` | `GET /api/tresorerie/resume`, `GET /api/tresorerie/transactions` |
| `admin` | `GET /api/admin/utilisateurs`, `GET /api/admin/restaurants` |

---

## Pages frontend

| URL | Rôle | Description |
|---|---|---|
| `/` | Public | Accueil — liste des restaurants et plats |
| `/menu` | Public | Menu complet d'un restaurant |
| `/cart` | Public | Panier |
| `/checkout` | CLIENT / B2B | Paiement |
| `/account` | CLIENT | Tableau de bord client |
| `/gerant` | GERANT | Dashboard gérant |
| `/gerant/kds` | GERANT | Kitchen Display System |
| `/staff/kds` | STAFF | KDS cuisine |
| `/staff/caisse` | STAFF | Caisse enregistreuse |
| `/b2b` | B2B | Dashboard entreprise |
| `/b2b/bulk-order` | B2B | Commander pour l'équipe |
| `/b2b/teams` | B2B | Gestion des équipes |
| `/b2b/reports` | B2B | Rapports de consommation |
| `/admin` | ADMIN | Administration système |

---

## Paiements (NovaSend)

Les paiements mobiles passent par **NovaSend** :

- **Providers supportés** : Wave CI, Orange Money CI, MTN MoMo
- **Endpoint** : `POST /v1/payin/sessions`
- **Flow** : création de session → QR code ou lien de paiement → webhook de confirmation
- **Webhook** : `POST /api/paiements/webhook` — met à jour le statut de la commande en base

Pour tester sans compte NovaSend, les paiements peuvent être simulés en passant `mode: 'test'` dans la requête.

---

## WebSocket & temps réel

Le backend expose une **Gateway Socket.IO** sur le namespace `/commandes`.

| Événement | Direction | Description |
|---|---|---|
| `rejoindre-commande` | Client → Serveur | S'abonner au suivi d'une commande |
| `statut-mis-a-jour` | Serveur → Client | Nouveau statut de la commande |
| `nouvelle-commande` | Serveur → Staff/Gérant | Alerte nouvelle commande |
| `commande-prete` | Serveur → Client | Commande prête à être servie |

---

## Build de production

### Backend

```bash
cd restodici-backend
npm run build
# Génère le bundle dans dist/
node dist/main
```

### Frontend

```bash
cd restodici-frontend
npm run build
# Génère les fichiers statiques dans dist/
# Chunks automatiques : vendor-react, vendor-lucide, vendor-charts, vendor-leaflet
npm run preview   # prévisualise le build en local
```

Le build Vite découpe automatiquement le bundle en chunks par route (lazy loading) et par librairie (manualChunks), réduisant le chargement initial de ~2 Mo à quelques dizaines de kilo-octets.

---

## Docker

Le fichier `docker-compose.yml` à la racine lance uniquement les services d'infrastructure :

```bash
# Démarrer PostgreSQL (port 5433) et Redis (port 6379)
docker-compose up -d

# Arrêter
docker-compose down

# Supprimer les données (reset complet)
docker-compose down -v
```

> Le backend et le frontend s'exécutent en dehors de Docker en développement.
> Pour un déploiement complet en conteneurs, adapter le docker-compose pour inclure les services `backend` et `frontend`.

---

## Auteur

Développé par **BLE GAYE MARC-DAVID** — Étudiant L3 ESATIC, Abidjan, Côte d'Ivoire.  
Projet réalisé pour  **Sankofa Lab**.

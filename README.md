# RESTODICI

Ce dépôt contient deux applications distinctes :

- `restodici-backend` : API NestJS + TypeORM
- `restodici-frontend` : interface client/gestionnaire React + Vite

## Prérequis

- Node.js 20+ (ou version compatible avec les dépendances du projet)
- npm
- PostgreSQL ou la base de données configurée dans `restodici-backend` si nécessaire
- Un terminal PowerShell ou Bash

## Installation

1. Ouvrir le dossier racine du projet : `c:\PROJECT\RESTODICI`
2. Installer les dépendances backend :

```bash
cd restodici-backend
npm install
```

3. Installer les dépendances frontend :

```bash
cd ../restodici-frontend
npm install
```

## Lancement du projet

### 1. Lancer le backend

Dans un terminal, exécuter :

```bash
cd c:\PROJECT\RESTODICI\restodici-backend
npm run start:dev
```

Le serveur backend démarre en mode développement et expose l’API sur :

- `http://localhost:3000/api`

### 2. Lancer le frontend

Dans un autre terminal, exécuter :

```bash
cd c:\PROJECT\RESTODICI\restodici-frontend
npm run dev
```

Le frontend Vite démarre normalement sur :

- `http://localhost:5173`

Si le port `5173` est déjà utilisé, Vite choisira automatiquement un autre port disponible, par exemple :

- `http://localhost:5174`

## Build de production

### Backend

```bash
cd c:\PROJECT\RESTODICI\restodici-backend
npm run build
```

### Frontend

```bash
cd c:\PROJECT\RESTODICI\restodici-frontend
npm run build
```

## Notes

- Assure-toi que le backend et le frontend utilisent le même préfixe d’API (`/api`).
- Si le frontend ne se connecte pas au backend, vérifie l’URL API dans `restodici-frontend/src/services/api.js`.
- Pour un démarrage rapide, lance d’abord le backend puis le frontend.

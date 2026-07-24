# Audit du code — RESTODICI (mise à jour du 24 juillet 2026)

**Périmètre :** Backend NestJS (`restodici-backend`, ~16 800 LOC) + Frontend React/Vite (`restodici-frontend`, ~35 800 LOC)
**Contexte :** Ré-audit après application des correctifs de l'audit du 9 juillet. État vérifié sur `HEAD 4843c79`, axes : **Sécurité · Performance · Qualité · Tests/CI**.
**Méthode :** lecture du code + exécution réelle de la suite de tests backend et frontend.

---

## Note globale : 8,3 / 10 ▲ (précédent : 7,5)

Progression nette sur la **sécurité** (toutes les brèches critiques/élevées de juillet sont refermées) et sur les **tests backend** (suite passée du rouge au vert). La dette restante est structurelle et front : God Components, absence de type-checking réel, et tests **frontend** rouges et non branchés en CI.

| Domaine | Score | Évolution |
|---|---|---|
| Architecture | 8/10 | → |
| Sécurité | 9/10 | ▲ (7→9) |
| Performance | 8/10 | ▲ (7→8) |
| Qualité du code | 7/10 | → |
| Tests | 6,5/10 | ▲ backend / ▼ frontend |
| Infrastructure | 7/10 | ▲ (6→7) |

---

## 1. Corrigé depuis le 9 juillet ✅ (vérifié dans le code)

- **Fallbacks JWT `dev-secret-change-me` : 0 restant** (`grep` à blanc sur tout `src/`).
- **`helmet()` actif** (`main.ts:26`) — en-têtes HTTP durcis.
- **`rawBody: true` activé** (`main.ts:20`) + signature webhook vérifiée sur les **octets bruts** avec `crypto.timingSafeEqual` et **fail-closed** (NovaSend + CinetPay legacy, `paiements.controller.ts`).
- **Secret 2FA chiffré au repos** (AES-256-GCM, clé dédiée `TOTP_ENCRYPTION_KEY`, migration sans perte des anciens secrets — `common/crypto/field-encryption.ts`).
- **Refresh token en cookie `HttpOnly`** + **access token en mémoire** (plus dans `localStorage` ; seul le profil d'affichage y reste — `token-store.js`, `useAuth.jsx`, `withCredentials: true`).
- **Migrations TypeORM en place** : `synchronize: false` en prod, `migrationsRun` au boot prod (`app.module.ts`, `data-source.ts`, 3 migrations).
- **Garde d'authentification globale** : `JwtAuthGuard` en `APP_GUARD` (**deny-by-default**), opt-out explicite via `@Public()` ; `ThrottlerGuard` global (100 req/min).
- **Suite de tests backend VERTE** : **266 tests / 22 suites** (était rouge, ~22 échecs le 9 juillet).
- **God Component `GerantDashboard` découpé** : 4 712 → **95 lignes** (extraction dans `components/gerant/`).

---

## 2. 🟠 Élevé — reste à traiter

### 2.1 Tests frontend rouges et non exécutés en CI — ✅ CORRIGÉ (24/07)
La suite unitaire frontend utilisait le runner natif `node:test` sans aucun script pour la lancer, et deux fichiers étaient cassés (dérive test↔code sur l'heuristique nom de plat → image Unsplash).
**Fait :**
- Scripts branchés dans le `package.json` frontend : `"test": "node --test 'src/**/*.test.js'"` + `"test:e2e": "playwright test"`.
- 11 assertions d'IDs Unsplash périmées de `articleImage.test.js` réalignées sur l'implémentation courante.
- Bug de code corrigé au passage dans `formatFCFA` : `null`/`undefined`/`''` renvoient désormais le placeholder `—` (au lieu de `"0 FCFA"` pour `null`, `Number(null) === 0` masquant une donnée manquante).
- **Résultat : `npm test` → 71 tests, 0 échec.**

### 2.2 God Components frontend subsistants
| Fichier | Lignes |
|---|---|
| `AdminDashboard.jsx` | 3 342 |
| `B2BDashboard.jsx` | 3 173 |
| `clientDashboard.jsx` | 1 909 |
| `StaffDashboard.jsx` | 1 738 |
| `Checkout.jsx` | 1 434 |
| `Home.jsx` | 1 392 |
| `BulkOrder.jsx` | 1 292 |

Le patron de découpage validé sur `GerantDashboard` (4 712 → 95) est à répliquer. Prio : Admin et B2B.

### 2.3 N+1 dans la création de commande groupée B2B — ✅ CORRIGÉ (24/07)
`b2b/services/b2b.service.ts` faisait, par ligne, un `findOne(collaborateur)` **puis** une requête d'agrégation (2N requêtes pour N lignes).
**Fait :** totaux agrégés en mémoire par collaborateur, puis **2 requêtes au total** — un `find({ id: In([...]) })` pour les collaborateurs et une requête `GROUP BY collaborateurB2BId` (`getDepensesMensuellesCollaborateurs`) pour les dépenses du mois. Correction annexe : la validation est désormais **cumulative** par collaborateur sur la commande (deux lignes séparées ne peuvent plus contourner la limite de budget). Suite backend toujours verte (266 tests).

---

## 3. 🟡 Moyen

- **Typage faible backend** : ~89 `: any` explicites (webhooks `@Body() body: any`, `@Req() req: any`…). Introduire des DTO/interfaces sur les charges entrantes.
- **Frontend non typé en pratique** : 77 `.jsx` / 21 `.js` contre **1 `.tsx` / 1 `.ts`** — aucun type-checking réel. Migration TS progressive (commencer par `services/` et `hooks/`).
- **47 `window.confirm/alert`** côté frontend — UX non stylable ; le composant `Modal` existe, à généraliser.
- **Doublon `uploads/` + `storage/`** — deux modules d'upload S3 coexistent, à consolider.
- **`b2b.service.ts` = 1 647 lignes** (−30 % depuis les 2 363 de juillet, 6 sous-services extraits) : cœur Compte/Collab/Commandes groupées gardé ensemble volontairement, acceptable mais à surveiller.

---

## 4. 🟢 Points positifs confirmés

- Sécurité de bout en bout cohérente : deny-by-default, throttling, validation DTO globale (`whitelist` + `forbidNonWhitelisted`), Swagger coupé en prod, CORS piloté par l'env, webhooks signés fail-closed, secrets chiffrés au repos.
- Requêtes de liste **bornées** : plafond `take: 500` (dump restaurants admin) ou `WHERE` étroit (validations en attente, commandes actives) — pas de dump illimité constaté.
- Architecture modulaire NestJS propre ; Strategy pattern sur les paiements (registry extensible) ; notifications B2B centralisées.
- Migrations DB versionnées ; suite backend rapide (~4 s) et verte.

---

## 5. Plan d'action priorisé

| # | Action | Effort | Prio |
|---|---|---|---|
| ~~1~~ | ~~Brancher un runner de test frontend + remettre les tests au vert~~ | — | ✅ Fait 24/07 |
| ~~2~~ | ~~Corriger le N+1 de la commande groupée B2B~~ | — | ✅ Fait 24/07 |
| 3 | Découper `AdminDashboard` puis `B2BDashboard` (patron `GerantDashboard`) | 3–4 j | 🟠 |
| 4 | Ajouter des tests de contrôle d'accès (rôle interdit → 403) et un test webhook signature valide/invalide | 1 j | 🟡 |
| 5 | Réduire les `: any` backend (DTO webhooks) ; généraliser `Modal` à la place de `confirm()` | 1–2 j | 🟡 |
| 6 | Migration TypeScript progressive du frontend ; consolider `uploads/`+`storage/` | 3–5 j | 🟢 |

---

*Bilan : les items critiques et élevés de l'audit du 9 juillet sont tous refermés et vérifiés. Le risque résiduel est désormais de la dette de maintenabilité (front) et de fiabilité CI (tests frontend), sans brèche de sécurité concrète ouverte en production.*

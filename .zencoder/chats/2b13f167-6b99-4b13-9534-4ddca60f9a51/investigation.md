# Investigation — Dynamic dashboards and linked profile updates

## Bug summary
The current implementation does not guarantee fully dynamic updates for:
- manager dashboards (orders of the day, active orders, and related metrics),
- client and staff profile data linked to orders,
- staff-side validation flow for order + profile information,
- receipt/related views that should reflect the same order lifecycle state.

Backend and frontend each implement partial realtime behavior, but coverage is inconsistent across modules (client orders vs B2B orders vs restaurant/profile updates), and some screens do not have fallback refresh logic. The resulting information flow is not shared end-to-end, so emitted order events are not consistently visible across dashboards, receipts, and related views.

## Root cause analysis
1. **Realtime events are emitted only for client order lifecycle in `CommandesService`**
   - `./restodici-backend/src/commandes/commandes.service.ts` emits `commande.nouvelle`, `commande.statut`, and `commande.paiement`.
   - B2B order lifecycle (`createBulkOrder`, `updateBulkOrderStatus`) in `./restodici-backend/src/b2b/services/b2b.service.ts` has no WebSocket emission.
   - Result: manager views that merge client + B2B orders are not fully dynamic for B2B updates.

2. **WebSocket subscription auth path is fragile and trusts client payload**
   - `./restodici-backend/src/commandes/commandes.gateway.ts` uses `@UseGuards(AuthGuard('jwt'))` on `subscribe`, but room join data (`userId`, `roles`, `restaurantId`) is taken from message body.
   - `./restodici-backend/src/auth/strategies/jwt.strategy.ts` only extracts JWT from HTTP Authorization header (`ExtractJwt.fromAuthHeaderAsBearerToken()`), while frontend sockets send token in `socket.auth` (`./restodici-frontend/src/services/commandes.service.ts`).
   - This can break/limit reliable subscription behavior and introduces trust on client-provided identifiers.

3. **No realtime broadcast for restaurant/profile updates**
   - `./restodici-backend/src/restaurants/restaurants.service.ts` updates profile data but does not emit websocket events.
   - Frontend manager overview relies on local refresh + local browser event (`gerant-restaurant-updated`) and periodic polling in some places, not true cross-session realtime updates.

4. **Staff KDS data lacks client profile relation**
   - `getKDS` in `./restodici-backend/src/commandes/commandes.service.ts` loads `lignes` and `article` but not `client`.
   - `./restodici-frontend/src/pages/staff/StaffDashboard.jsx` therefore cannot reliably display/validate linked client profile details dynamically.

5. **Frontend realtime coverage is inconsistent by screen**
   - Manager overview (`./restodici-frontend/src/pages/gerant/GerantDashboard.jsx`, overview section) has socket listeners + 30s polling fallback.
   - Manager orders tab (`OrdersTab` in same file) uses socket listeners but no polling fallback for order list refresh.
   - Staff dashboard listens to client-order events only; no B2B/profile event channel.

6. **Tests do not validate realtime contract for this bug scope**
   - Existing tests (e.g. `./restodici-backend/test/commandes.e2e-spec.ts`) focus on REST flows and do not validate websocket propagation or dynamic dashboard/profile synchronization.

7. **No explicit shared event-to-view contract across dashboards and receipts**
   - The system lacks a normalized backend-to-frontend projection contract that guarantees each order emission updates all dependent UI projections (manager dashboard, staff board, client tracking/profile-linked views, receipt-related screens).
   - Result: different views can diverge in freshness and state visibility.

## Affected components
- **Backend**
  - `./restodici-backend/src/commandes/commandes.gateway.ts`
  - `./restodici-backend/src/commandes/commandes.service.ts`
  - `./restodici-backend/src/b2b/services/b2b.service.ts`
  - `./restodici-backend/src/restaurants/restaurants.service.ts`
  - `./restodici-backend/src/auth/strategies/jwt.strategy.ts`
- **Frontend**
  - `./restodici-frontend/src/services/commandes.service.ts`
  - `./restodici-frontend/src/pages/gerant/GerantDashboard.jsx`
  - `./restodici-frontend/src/pages/staff/StaffDashboard.jsx`

## Proposed solution
1. **Harden and normalize websocket auth/subscription (backend + frontend)**
   - Add a WS-compatible JWT extraction path (handshake auth/header) and validate user identity server-side.
   - Stop trusting `userId/roles/restaurantId` from client message body; derive room membership from validated token payload/user record.

2. **Emit unified realtime events for all order sources**
   - Add websocket emissions for B2B order create/status updates in `B2BService`.
   - Use a normalized payload contract for manager/staff dashboards (source, status, amounts, timestamps, restaurant scope).

3. **Propagate profile updates in realtime**
   - Emit `restaurant.profile.updated` (or equivalent) after `updateRestaurant`.
   - Frontend manager/staff dashboards subscribe and refresh profile-linked UI state when received.

4. **Expose profile data needed for staff validation**
   - Include `client` relation in `getKDS` and return safe fields (e.g. `id`, `nom`, `prenom`, `telephone`, `email` as needed).
   - Update staff UI to show/validate linked profile details in realtime.

5. **Close frontend refresh gaps**
   - Add polling fallback to manager orders tab (similar to overview) and keep socket-driven immediate refresh.
   - Keep reconnect-safe socket handlers and re-subscribe logic.

6. **Add regression tests for dynamic behavior and cross-view consistency**
   - Backend: websocket event emission tests for client/B2B status changes and restaurant profile updates.
   - Backend: authorization/room-join tests to ensure tenant isolation.
   - Frontend: dashboard refresh behavior tests on socket events + polling fallback.
   - Integration/contract tests: verify a single order event propagates consistent data to dashboards, profile-linked views, and receipt-related views.

7. **Define a shared/common information flow contract (backend ↔ frontend)**
   - Standardize event payload and projection mapping so every order emission carries enough data/versioning metadata for all consumers.
   - Ensure traces are visible across manager/staff/client dashboards, receipts, and related views with deterministic refresh behavior (socket-first, polling fallback).

## Edge cases and side effects to account for
- Reconnect/resubscribe behavior after token refresh.
- Multi-tenant isolation (`restaurantId`) for all emitted events.
- Missing optional client/staff profile fields (graceful UI rendering).
- Status transition correctness remains enforced (no regression in command state machine).
- Prevent event storms: debounce/throttle refresh where needed on frontend.
- Receipt consistency under late events/retries (idempotent projection updates).
- Version/timestamp ordering to avoid stale overwrites across dashboards and related views.

## Implementation notes (Step 2)
Implemented and validated the dynamic update fixes across backend/frontend paths identified in this investigation:

1. **WebSocket auth/subscription hardening**
   - `./restodici-backend/src/auth/strategies/jwt.strategy.ts` now supports JWT extraction from both HTTP Authorization headers and Socket.IO handshake auth/header.
   - `./restodici-backend/src/commandes/commandes.gateway.ts` resolves the user from validated JWT and repository lookup, then joins rooms from server-side identity (no trust on client payload fields).
   - Regression coverage: `./restodici-backend/src/commandes/commandes.gateway.spec.ts` validates successful secure room join and unauthorized disconnect path.

2. **Realtime emissions for B2B order lifecycle**
   - `./restodici-backend/src/b2b/services/b2b.service.ts` emits:
     - `commande.nouvelle` on B2B order creation,
     - `commande.statut` on B2B status updates,
     both with normalized payload fields (`source`, `statut`, amounts, timestamps).
   - Regression coverage: `./restodici-backend/src/b2b/services/b2b.service.spec.ts` validates both emissions.

3. **Realtime propagation for restaurant profile updates**
   - `./restodici-backend/src/restaurants/restaurants.service.ts` emits `restaurant.profile.updated` after successful restaurant profile updates with hydrated data.
   - Regression coverage: `./restodici-backend/src/restaurants/restaurants.service.spec.ts` validates emission payload.

4. **Staff KDS profile linkage and data safety**
   - `./restodici-backend/src/commandes/commandes.service.ts#getKDS` includes `client` relation and now sanitizes returned client profile to safe fields (`id`, `nom`, `prenom`, `telephone`, `email`) before returning KDS data.
   - Regression coverage: `./restodici-backend/src/commandes/commandes.service.spec.ts` validates client sanitization and absence of password in KDS response.

5. **Frontend realtime/polling coverage confirmation**
   - Existing implementation confirms socket subscriptions + reconnect handling in `./restodici-frontend/src/services/commandes.service.ts`.
   - Existing implementation confirms manager Orders tab socket refresh + polling fallback and manager overview profile event handling in `./restodici-frontend/src/pages/gerant/GerantDashboard.jsx`.
   - Existing implementation confirms staff dashboard listens to `restaurant.profile.updated` in `./restodici-frontend/src/pages/staff/StaffDashboard.jsx`.

## Test results
Executed commands and outcomes:

- `npm test -- --runInBand src/commandes/commandes.gateway.spec.ts src/commandes/commandes.service.spec.ts src/b2b/services/b2b.service.spec.ts src/restaurants/restaurants.service.spec.ts` (backend)
  - ✅ 4/4 suites passed, 6/6 tests passed.

- `npm run lint` (backend)
  - ✅ Completed with warnings only (no errors).

- `npm run build` (backend)
  - ✅ Completed successfully.

- `npm run lint` (frontend)
  - ✅ Completed with warnings only (no errors).

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle size warning only).

---

## Investigation addendum — Vite proxy `/socket.io` AggregateError ECONNREFUSED

### Bug summary
When running `npm run dev` in `./restodici-frontend`, Vite reports proxy failures for `/socket.io` with `AggregateError ECONNREFUSED`, and the issue is especially visible in the enterprise/B2B parcours because those views share the same backend origin.

### Reproduction and observations
1. Frontend socket client connects to `${socketBase}/commandes` from `./restodici-frontend/src/services/commandes.service.ts`.
   - Without `VITE_API_URL`, `socketBase` resolves to `window.location.origin` (Vite host), so Socket.IO handshake goes through Vite proxy path `/socket.io`.
2. Vite proxy forwards `/socket.io` to `http://localhost:3000` in `./restodici-frontend/vite.config.js`.
3. Backend Socket.IO namespace is available at `/commandes` in `./restodici-backend/src/commandes/commandes.gateway.ts`; backend listens on `process.env.PORT || 3000` in `./restodici-backend/src/main.ts`.
4. Connectivity check confirms proxy works when backend is reachable:
   - `curl http://localhost:5173/socket.io/?EIO=4&transport=polling` returned HTTP 200 with Socket.IO handshake payload.

### Root-cause hypothesis
Primary hypothesis: **the proxy error is environmental availability/target mismatch rather than Socket.IO namespace logic**.

Most likely conditions that trigger the observed `ECONNREFUSED`:
- Backend is not running or not yet ready while frontend starts.
- Backend is running on a non-`3000` port, while Vite proxy target is hardcoded to `http://localhost:3000`.
- Frontend is on an alternate Vite port (5174/5175), but proxy still depends on backend availability at the hardcoded 3000 target.

Because Vite proxy and Socket.IO handshake are functioning when backend is reachable, this signal points to **startup/order/config drift** (service readiness + fixed proxy target) as the root issue.

### Affected components
- `./restodici-frontend/vite.config.js`
- `./restodici-frontend/src/services/commandes.service.ts`
- `./restodici-frontend/src/services/api.js`
- `./restodici-frontend/src/pages/gerant/GerantDashboard.jsx`
- `./restodici-frontend/src/pages/b2b/B2BDashboard.jsx`
- `./restodici-frontend/src/pages/b2b/B2BOrders.jsx`
- `./restodici-backend/src/main.ts`
- Local runtime environment/process startup order

### B2B enterprise-flow relevance
- The B2B pages and the manager enterprise dashboard use the same backend origin as the Socket.IO client.
- Even though the visible error is on `/socket.io`, a backend availability or port mismatch also impacts B2B REST loading and the manager orders view that aggregates enterprise data.
- This makes the proxy issue show up during the enterprise/B2B parcours, not only on the staff/client realtime screens.

### Proposed solution (for implementation step)
1. Make Vite proxy target configurable via env (e.g., `VITE_BACKEND_ORIGIN`) instead of hardcoded `http://localhost:3000`.
2. Align frontend `VITE_API_URL`, socket base resolution, and Vite proxy target to one source of truth.
3. Add startup/readiness guard in frontend socket initialization (defer/retry with controlled backoff and clearer user-facing state).
4. Optionally add a dev health-check hint (`/api` ping) to fail fast with actionable message when backend is unreachable.

### Edge cases to validate during implementation
- Backend running on custom port.
- Backend restart while frontend remains open (recover without noisy repeated proxy errors).
- `VITE_API_URL` set to absolute origin (proxy bypass path still works correctly).
- IPv4/IPv6 `localhost` resolution differences on macOS.

### Implementation notes (Step 2 addendum)
1. **Configurable Vite proxy target implemented**
   - `./restodici-frontend/vite.config.js` now uses `loadEnv` and computes a dynamic backend target instead of hardcoding `http://localhost:3000`.
   - New resolution priority for proxy target:
     1) absolute `VITE_API_URL` origin,
     2) `VITE_BACKEND_ORIGIN`,
     3) fallback `http://localhost:3000`.

2. **Frontend API/socket base alignment implemented**
   - Added shared resolver utility: `./restodici-frontend/src/services/backend-endpoints.js`.
   - `./restodici-frontend/src/services/api.js` now derives `API_URL` from the shared resolver, so REST calls and socket connections share the same backend-origin rules.
   - `./restodici-frontend/src/services/commandes.service.ts` now derives `apiBaseUrl` and `socketBase` from the shared resolver.
   - Behavior:
     - no `VITE_API_URL` => `apiBaseUrl=/api` + socket uses `window.location.origin` (proxy path),
     - absolute `VITE_API_URL` => socket base derives from the same backend origin (proxy bypass),
     - relative `VITE_API_URL` => stays proxy-based.

3. **Regression tests added**
   - Added `./restodici-frontend/src/services/backend-endpoints.test.js` (Node test runner).
   - Covers backend origin resolution precedence and frontend API/socket derivation across relative/absolute env cases.

### Test results (Step 2 addendum)
- `node --test src/services/backend-endpoints.test.js` (frontend)
  - ✅ 6/6 tests passed.

- `npm run lint` (frontend)
  - ✅ Completed successfully with existing warnings only (0 errors).

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle size warning only).

- Revalidation after `./restodici-frontend/src/services/api.js` moved to the shared resolver.
  - ✅ `node --test src/services/backend-endpoints.test.js` still passed: 6/6 tests.
  - ✅ `npm run lint` still completed with warnings only (0 errors).
  - ✅ `npm run build` still completed successfully (bundle size warning only).

## Investigation addendum — Vérification de conformité du cycle "commande client final"

### Synthèse de conformité
Le cycle décrit dans `20260519105635-xnlqk0.txt` est **partiellement implémenté**. Plusieurs briques existent (création commande, transitions de statuts, websocket, suivi client, polling de secours sur certaines vues), mais le flux complet "catalogue → paiement externe validé → orchestration staff/KDS → clôture financière" n’est pas aligné de bout en bout.

### Mismatches / gaps identifiés
1. **Checkout client principal non branché au backend de commandes**
   - Le parcours actif `./restodici-frontend/src/pages/Cart.jsx` → `./restodici-frontend/src/pages/Checkout.jsx` simule le paiement et écrit en `localStorage` (`pendingOrder`, `userOrders_*`) sans créer d’entité `Commande` backend.
   - Impact: pas de commande réelle, pas d’émission websocket backend, pas de traçabilité serveur de bout en bout.

2. **Paiement digital + webhook prestataire (Novasend) non implémentés**
   - Aucun endpoint/service Novasend/webhook détecté dans `./restodici-backend/src`.
   - Le paiement réel côté backend passe par `PATCH /commandes/:id/paiement` (staff/gerant/admin), pas par callback prestataire client.

3. **Création commande et paiement dissociés du cycle attendu**
   - `./restodici-backend/src/commandes/commandes.service.ts#createCommande` crée directement une commande `RECUE`.
   - `registerPayment` marque `estPaye=true` mais ne fait pas automatiquement basculer vers `CONFIRMEE`.
   - Le CDC décrit au contraire "paiement validé → commande confirmée".

4. **Déduction stock effectuée au moment de la création, pas au passage EN_PREP**
   - Le stock est décrémenté dans `createCommande` avant exécution cuisine.
   - Le cycle cible exige la déduction atomique lors du passage en préparation.

5. **Annulation/remboursement partiellement couverts**
   - Règle des 5 minutes partiellement présente (`updateStatut`), mais:
     - pas de workflow explicite de remboursement,
     - pas de réintégration compensatoire de stock,
     - annulation non restreinte au gérant (STAFF/ADMIN possibles selon endpoint).

6. **Incohérences payloads de lignes de commande selon parcours frontend**
   - DTO backend attend `quantite` (`./restodici-backend/src/commandes/dto/create-commande.dto.ts`).
   - Un flux frontend envoie `quantity` (`./restodici-frontend/src/components/cart/CartDrawer.jsx`), un autre envoie `quantite` (`./restodici-frontend/src/pages/paiement.jsx`).
   - Risque de rejet/erreur silencieuse selon parcours utilisé.

7. **Contrat paiement front/back non cohérent sur les modes**
   - Backend `ModePaiementCommande` ne supporte que `ESPECES | LIVRAISON`.
   - Frontend expose `orange_money`, `mtn_money`, `moov_money`, `card`, `MOMO`, `CARD` selon pages.
   - Les choix affichés côté client ne correspondent pas au modèle backend actuel.

8. **Synchronisation menu/cache stock incomplète au moment critique**
   - Le texte exige invalidation Redis immédiate quand stock atteint zéro.
   - `MenuService` invalide le cache sur opérations menu, mais la baisse de stock en commande (`createCommande`) ne déclenche pas d’invalidation explicite du cache menu.

9. **Convergence des vues opérationnelles encore hétérogène**
   - Bon point: websocket + polling existent sur plusieurs vues (ex: suivi client 5s, gérant 30s).
   - Gap: cadence/périmètre non uniformes et dépendants de pages; le contrat de propagation transversal (dashboard gérant, staff, reçu, suivi) reste implicite.

10. **Paiement/reçu/trésorerie en mode simplifié**
   - `./restodici-backend/src/tresorerie/tresorerie.service.ts` contient de la logique de simulation (stats aléatoires, enregistrements simplifiés).
   - Aucune émission SMS/email observable à la validation paiement.

### Risques principaux
- **Risque fonctionnel majeur**: parcours client principal qui "réussit" sans créer de commande serveur.
- **Risque métier**: statuts/paiement/stock non strictement alignés avec le cycle métier contractuel.
- **Risque de cohérence UX**: ce que le client voit au checkout ne reflète pas forcément les capacités backend effectives.
- **Risque d’exploitation**: annulation/remboursement incomplets (financier + stock).

### Direction de correction proposée (Step 2)
1. **Unifier le parcours client**
   - Faire du flux `cart -> checkout` un flux backend-first (création commande réelle, id backend, statut traçable), supprimer la simulation locale comme chemin principal.

2. **Aligner le domaine paiement**
   - Étendre le modèle backend des moyens de paiement (Mobile Money / Carte / Espèces) et normaliser les enums front/back.
   - Introduire un adaptateur prestataire + webhook sécurisé (idempotence, signature, retries).

3. **Rendre la machine d’état conforme au CDC**
   - Lier confirmation commande à l’événement de paiement validé.
   - Repositionner la logique de déduction stock sur transition `CONFIRMEE -> EN_PREP` (transaction atomique).

4. **Implémenter annulation/remboursement complet**
   - Endpoint de demande client (fenêtre 5 min), validation gérant, remboursement, réintégration stock, émission d’événements.

5. **Normaliser contrat temps réel + fallback**
   - Spécifier un contrat d’événements unique (payload/version/source/timestamp) et appliquer socket-first + polling fallback cohérent sur toutes les vues concernées.

6. **Sécuriser et fiabiliser l’input commande frontend**
   - Uniformiser `quantite` sur tous les clients.
   - Ajouter validation E2E pour empêcher tout payload divergent.

7. **Compléter la traçabilité opérationnelle**
   - Ajouter journalisation/audit des transitions critiques (paiement, annulation, remboursement, livraison) et vérifier la disponibilité des reçus post-paiement.

## Implementation notes (Step 2) — Checkout backend-first + payload compatibility
1. **Checkout now creates real backend orders**
   - Updated `./restodici-frontend/src/pages/Checkout.jsx` to stop simulated local-only order confirmation.
   - Checkout now calls `commandesService.create(...)` with `restaurantId`, `modeLivraison`, optional `adresseLivraison`, and normalized `lignes` payload.
   - Success state now tracks backend order id and routes "Suivre ma commande" to `/suivi/:id`.

2. **Order line payload normalized to backend contract on frontend**
   - Updated `./restodici-frontend/src/components/cart/CartDrawer.jsx` to send `quantite` (instead of `quantity`) when creating orders.

3. **Backend compatibility hardening for legacy `quantity` payloads**
   - Updated `./restodici-backend/src/commandes/dto/create-commande.dto.ts` to accept either `quantite` or `quantity` per line.
   - Updated `./restodici-backend/src/commandes/commandes.controller.ts` to normalize incoming lines and always forward `quantite` to service layer.

4. **Regression tests added**
   - Added `./restodici-backend/src/commandes/commandes.controller.spec.ts` covering:
     - `quantity` input normalization to `quantite`,
     - unchanged behavior when `quantite` is already provided.

## Test results (Step 2)
- `npm test -- --runInBand src/commandes/commandes.controller.spec.ts src/commandes/commandes.service.spec.ts` (backend)
  - ✅ 2/2 suites passed, 3/3 tests passed.

- `npm run lint` (backend)
  - ✅ Completed with warnings only (0 errors).

- `npm run build` (backend)
  - ✅ Completed successfully.

- `npm run lint` (frontend)
  - ✅ Completed with warnings only (0 errors).

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle size warning only).

## Step 2 execution rerun (current)
- Revalidated the Step 2 implementation scope with the full regression set referenced by the investigation addenda.

### Commands and outcomes
- `npm test -- --runInBand src/commandes/commandes.controller.spec.ts src/commandes/commandes.service.spec.ts src/commandes/commandes.gateway.spec.ts src/b2b/services/b2b.service.spec.ts src/restaurants/restaurants.service.spec.ts` (backend)
  - ✅ 5/5 suites passed, 8/8 tests passed.

- `npm run lint` (backend)
  - ✅ Completed with warnings only (0 errors).

- `npm run build` (backend)
  - ✅ Completed successfully.

- `node --test src/services/backend-endpoints.test.js` (frontend)
  - ✅ 6/6 tests passed.

- `npm run lint` (frontend)
  - ✅ Completed with warnings only (0 errors).

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle size warning only).

## Step 1 reassessment (current) — Frontend/Backend dashboard sync

### Verdict
**Partial** — communication is significantly improved and functional for key flows, but not yet fully reliable end-to-end across all dashboard scenarios.

### What works now
1. **Realtime transport/auth is operational and hardened for socket usage**
   - Backend socket auth resolves JWT from handshake auth/header and server-side user lookup.
   - Frontend socket client sends token in handshake auth and resubscribes on reconnect.

2. **Manager dashboard receives dynamic updates for both client and B2B order events**
   - Backend emits `commande.nouvelle` / `commande.statut` for client and B2B updates.
   - Manager overview and orders modules subscribe to these events and refresh data.

3. **Restaurant profile updates propagate to operational views**
   - Backend emits `restaurant.profile.updated` on profile updates.
   - Manager overview and staff dashboard react to this event.

4. **Fallback refresh exists in manager views**
   - Manager overview and manager orders tab both include 30s polling fallback in addition to socket-driven refresh.

### Remaining gaps blocking full reliability
1. **No polling fallback in some dashboards (socket-only paths)**
   - `./restodici-frontend/src/pages/staff/StaffDashboard.jsx` has realtime listeners but no periodic fallback refresh.
   - `./restodici-frontend/src/pages/client/clientDashboard.jsx` has realtime listeners but no periodic fallback refresh.
   - Impact: stale dashboards if socket connection is degraded for extended periods.

2. **Manager Orders tab load is all-or-nothing across data sources**
   - `OrdersTab` uses `Promise.all` between client orders and B2B orders.
   - If either endpoint fails, full refresh fails instead of partial rendering with degraded state.

3. **Cross-tenant manager event scoping remains broad**
   - Manager role rooms are global (`role:GERANT`, `role:ADMIN`) and receive emitted order events before local filtering/refresh.
   - This does not block UI refresh but remains a reliability/security concern for strict tenant isolation guarantees.

4. **No explicit contract test for end-to-end dashboard convergence**
   - Current tests validate key backend emissions and selected units, but do not yet enforce one event → all dependent dashboards converge within expected time/fallback behavior.

### Assessment against user focus
For "Do frontend and backend communicate well to update dashboards?":
- **Yes, for core realtime flows (manager/staff/client) under normal socket connectivity.**
- **Not fully for reliability guarantees**, due to missing fallback on some dashboards and lack of comprehensive convergence/tenant-scope contract validation.

## Step 2 implementation notes (current) — Dashboard sync reliability gaps
1. **Polling fallback added to staff dashboard**
   - Updated `./restodici-frontend/src/pages/staff/StaffDashboard.jsx`.
   - `refreshDashboard` now supports silent refresh mode.
   - Added 30s polling fallback (`setInterval`) alongside existing socket listeners.
   - Socket-triggered refresh now uses silent mode to avoid full loading spinner churn.

2. **Polling fallback added to client dashboard**
   - Updated `./restodici-frontend/src/pages/client/clientDashboard.jsx`.
   - Added 30s polling fallback (`setInterval`) in the same effect as socket subscriptions.
   - Cleanup now clears polling interval and disconnects socket.

3. **Manager Orders tab made resilient to partial data-source failures**
   - Added shared merge helper `./restodici-frontend/src/services/orders-merge.js`.
   - Updated `./restodici-frontend/src/pages/gerant/GerantDashboard.jsx` (`OrdersTab`) to use `Promise.allSettled` instead of `Promise.all`.
   - Orders list now renders available source(s) even if one endpoint fails, with degraded-state error messaging:
     - client unavailable → show B2B orders,
     - B2B unavailable → show client orders,
     - both unavailable → show full error.

4. **Regression tests added**
   - Added `./restodici-frontend/src/services/orders-merge.test.js`.
   - Covers:
     - successful merge/sort and normalization across client + B2B,
     - partial failure behavior (one source rejected),
     - full failure behavior (both sources rejected).

## Test results (Step 2 current)
- `node --test src/services/orders-merge.test.js src/services/backend-endpoints.test.js` (frontend)
  - ✅ 9/9 tests passed.

- `npm run lint` (frontend)
  - ✅ Completed with warnings only (0 errors).

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle size warning only).

## Step 1 deliverable (current) — Manual test plan for dashboard sync reliability

### Objective
Validate end-to-end reliability of dashboard synchronization across manager/staff/client views for order lifecycle and restaurant profile updates, including reconnect and degraded-network behavior.

### Scope
- Realtime propagation (`commande.nouvelle`, `commande.statut`, `restaurant.profile.updated`).
- Polling fallback behavior on manager/staff/client dashboards.
- Data convergence across manager overview, manager orders tab, staff dashboard, and client tracking view.
- Resilience when one manager orders data source fails.
- Tenant isolation checks under multi-restaurant sessions.

### Out of scope
- Payment provider/webhook integrations.
- Full financial reconciliation workflows.

### Test environment and prerequisites
1. Run backend and frontend in dev mode with known environment values (`VITE_API_URL`, backend port).
2. Prepare at least two restaurants: **R1** and **R2**.
3. Prepare accounts:
   - manager R1, manager R2,
   - staff R1,
   - client C1 (R1), client C2 (R2).
4. Open sessions in separate browser profiles/incognito windows to avoid token/session overlap.
5. Open browser devtools on each session:
   - Network tab for REST refresh calls,
   - Console tab for socket disconnect/reconnect signals.

### Observability checklist per scenario
- Timestamp of action (T0).
- First visible update time per dashboard (Tupdate).
- Whether update came via socket (near-immediate) or polling fallback (<= 30s target).
- Any error banner/degraded-state message shown.

### Manual scenarios

#### MTP-01 — Baseline realtime propagation (client order create)
1. From client C1, create a new order for restaurant R1.
2. Observe manager R1 overview and orders tab.
3. Observe staff R1 dashboard.
4. Observe client C1 tracking/dashboard.

Expected:
- Manager and staff views show the new order without manual refresh.
- Client tracking shows corresponding order state.
- Propagation occurs near-immediately (socket-first).

#### MTP-02 — Realtime propagation for status transitions
1. On staff/manager R1 session, progress one R1 order through status transitions supported by the app.
2. Observe manager orders, manager overview metrics, staff board state, and client tracking state after each transition.

Expected:
- All views converge to the same status sequence.
- No dashboard remains on a stale previous status after fallback window.

#### MTP-03 — B2B lifecycle visibility in manager dashboard
1. Create a B2B order for R1.
2. Change B2B order status.
3. Observe manager R1 orders and overview.

Expected:
- B2B create/status changes appear dynamically on manager dashboard.
- Ordering/merge in manager orders remains coherent with client orders.

#### MTP-04 — Restaurant profile update propagation
1. Update restaurant R1 profile fields from a manager/admin-capable session.
2. Observe manager R1 overview/profile-linked widgets.
3. Observe staff R1 dashboard profile-linked fields.

Expected:
- Both manager and staff views reflect profile changes without hard reload.
- No profile regression to stale values after polling cycle.

#### MTP-05 — Polling fallback under socket interruption (staff)
1. In staff R1 session, force socket interruption (offline mode or block WS/polling handshake temporarily).
2. Trigger an order/status update from another R1 session.
3. Keep staff session open for >30s.

Expected:
- Staff dashboard eventually reflects updates via polling fallback within polling interval target.
- UI does not stay permanently stale when socket is unavailable.

#### MTP-06 — Polling fallback under socket interruption (client)
1. In client C1 session, force socket interruption.
2. Progress C1 order status from staff/manager session.
3. Keep client dashboard/tracking page open for >30s.

Expected:
- Client view catches up via polling fallback within polling interval target.

#### MTP-07 — Manager orders partial-source failure resilience
1. Temporarily induce failure for one manager orders source endpoint (client orders API or B2B orders API) while keeping the other source healthy.
2. Load/refresh manager R1 orders tab.

Expected:
- Orders tab still renders available source data.
- Degraded-state message indicates partial unavailability.
- App does not fail closed when one source is down.

#### MTP-08 — Full-source failure behavior (manager orders)
1. Induce failure for both client orders and B2B orders endpoints.
2. Refresh manager orders tab.

Expected:
- Clear full-error state is shown.
- No misleading partial data is presented as fresh.

#### MTP-09 — Reconnect and resubscribe reliability
1. Keep manager/staff/client sessions connected.
2. Restart backend or expire/refresh auth token flow if available.
3. Trigger new order/status changes after reconnect.

Expected:
- Sessions recover socket connection and continue receiving updates.
- No duplicate subscriptions causing repeated duplicate updates.

#### MTP-10 — Multi-tenant isolation sanity check
1. In parallel, trigger order/profile updates in R1 and R2.
2. Observe manager R1/staff R1/client C1 and manager R2/client C2.

Expected:
- Each tenant sees only relevant data for its restaurant context.
- No cross-restaurant order/profile leakage in UI.

### Pass/fail criteria
- **Pass**: All critical scenarios (MTP-01/02/04/05/06/07/10) meet expected outcomes; propagation is immediate via socket or converges within polling target when socket path fails.
- **Fail**: Any persistent stale state beyond polling target, cross-tenant leakage, or full manager orders failure when only one source is down.

### Execution sheet template
For each scenario, record:
- Build/version hash
- Environment values used (`VITE_API_URL`, backend origin/port)
- Scenario ID
- Result (PASS/FAIL)
- Time-to-update per dashboard
- Evidence links/screenshots/log excerpts
- Notes and follow-up bug IDs

## Investigation addendum — New requirements (Step 1)

### Requirements assessed
1. Client confirmation happens AFTER delivery (confirmation de réception après livraison).
2. Staff profile must keep functional traces/history like client profile does.
3. "Voir commande" button on client side must allow user to see their orders.
4. For each role, logout button must ask for confirmation.

### Current implementation assessment & gaps

**1. Client confirmation after delivery**
- Current status machine in `./restodici-backend/src/commandes/commandes.service.ts` (lines 265-276) ends at `LIVREE`; no post-delivery confirmation transition or status (e.g. `CONFIRMEE_RECEPTION`).
- No client-facing UI or endpoint to confirm receipt after `LIVREE`.
- Root cause: state machine and client tracking views (`OrderTracking.jsx`, `clientDashboard.jsx`) do not model receipt confirmation.
- Gap: violates requirement; confirmation must be explicit post-livraison step.

**2. Staff profile functional traces/history**
- User entity (`./restodici-backend/src/auth/entities/user.entity.ts`) has no history/trace relation for STAFF (unlike CLIENT which links to commandes via queries).
- Staff dashboard (`./restodici-frontend/src/pages/staff/StaffDashboard.jsx`) shows current KDS/orders but no historical actions or profile-linked traces.
- Root cause: no audit/history fields or service methods exposing staff-performed actions (status changes, etc.).
- Gap: staff lacks equivalent history view to client profile.

**3. "Voir commande" button**
- Client dashboard (`./restodici-frontend/src/pages/client/clientDashboard.jsx`) already has 'orders' tab and loads via `commandesService.getMyOrders()`.
- No explicit "Voir commande" button visible in overview or other client flows (e.g. after checkout or in tracking).
- Root cause: button absent from UI surfaces outside the orders tab.
- Gap: requirement not met for discoverability.

**4. Logout confirmation per role**
- Logout handlers in layouts (`ClientLayout.jsx`, `GerantLayout.jsx`) and `useAuth.jsx` call `logout()` directly without `window.confirm` or modal.
- Affects all roles (client, staff, gerant, admin).
- Root cause: no confirmation dialog in any logout path.
- Gap: direct logout without user confirmation.

### Proposed fix direction
- Extend `StatutCommande` enum + transitions to support `LIVREE → CONFIRMEE_RECEPTION` (client-triggered).
- Add history/audit logging for staff actions (new relation or activity log entity) and expose in staff profile.
- Add prominent "Voir mes commandes" button in client overview/tracking that navigates to orders tab or `/orders`.
- Wrap all logout calls with confirmation dialog (reuse component across layouts/roles).

### Affected components (new)
- Backend: `commandes.service.ts`, `commandes.entity.ts`, user-related services.
- Frontend: `clientDashboard.jsx`, `OrderTracking.jsx`, layouts (Client/Gerant/Staff/Admin), `useAuth.jsx`.

### Edge cases
- Confirmation window after delivery (time limits?).
- History privacy for staff actions.
- Button visibility on mobile/responsive.
- Confirmation UX consistency across roles.

Investigation.md updated: yes.

## Step 2 implementation notes — delivery feedback, orders access, staff history, logout confirmation

1. **Client order access made explicit**
   - Added a shared route helper and explicit client orders entry path: `./restodici-frontend/src/utils/order-ux.js`.
   - Wired `./restodici-frontend/src/layouts/ClientLayout.jsx` to expose a visible `Voir commande` action in the header and mobile menu.
   - Added the `/client/orders` route alias in `./restodici-frontend/src/App.jsx`.
   - Updated `./restodici-frontend/src/pages/client/clientDashboard.jsx` so `/client/orders?tab=orders` opens the orders tab directly.

2. **Post-delivery feedback prompt without status mutation**
   - Added a client-side feedback prompt for delivered orders in both `./restodici-frontend/src/pages/order/OrderTracking.jsx` and `./restodici-frontend/src/pages/client/clientDashboard.jsx`.
   - The prompt stores a local receipt feedback response (`Oui` / `Non`) and does not change the order status.
   - Reused shared storage helpers from `./restodici-frontend/src/utils/order-ux.js`.

3. **Staff action history / traces**
   - Extended `./restodici-frontend/src/pages/staff/StaffDashboard.jsx` with a persisted action history list.
   - History entries are appended for socket-received events and staff-triggered actions, giving staff an operational trace similar to client order visibility.

4. **Logout confirmation for client, staff, manager, and admin**
   - Kept the client/staff confirmation modal in `./restodici-frontend/src/layouts/ClientLayout.jsx`.
   - Added confirmation modals to `./restodici-frontend/src/layouts/GerantLayout.jsx` and `./restodici-frontend/src/pages/AdminDashboard.jsx`.
   - All role-specific logout paths now require explicit confirmation before clearing session state.

5. **Regression tests added**
   - Added `./restodici-frontend/src/utils/order-ux.test.js`.
   - Covers the explicit client orders path plus delivery-feedback storage/readback helpers.

### Test / lint / build results (Step 2 current)
- `node --test src/utils/order-ux.test.js src/services/backend-endpoints.test.js` (frontend)
  - ✅ 9/9 tests passed.

- `npm run lint` (frontend)
  - ✅ Completed with warnings only, no errors.

- `npm run build` (frontend)
  - ✅ Completed successfully (bundle-size warning only).

### Files changed in this Step 2 pass
- `./restodici-frontend/src/App.jsx`
- `./restodici-frontend/src/layouts/ClientLayout.jsx`
- `./restodici-frontend/src/layouts/GerantLayout.jsx`
- `./restodici-frontend/src/pages/AdminDashboard.jsx`
- `./restodici-frontend/src/pages/client/clientDashboard.jsx`
- `./restodici-frontend/src/pages/order/OrderTracking.jsx`
- `./restodici-frontend/src/pages/staff/StaffDashboard.jsx`
- `./restodici-frontend/src/utils/order-ux.js`
- `./restodici-frontend/src/utils/order-ux.test.js`

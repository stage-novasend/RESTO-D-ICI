/* ═══════════════════════════════════════════════════════════════
   useAdminRealtime — flux temps réel du dashboard administrateur.

   Le backend diffuse déjà vers la room `role:ADMIN` (CommandesGateway) :
     · événements métier   : commande.nouvelle, commande.statut,
                             commande.paiement, commande.paiement.echec,
                             commande:remboursee, commande.b2b.*
     · événements admin    : admin.data.changed (config, comptes,
                             restaurants, moyens de paiement, intégrations)

   Ce module ouvre une seule connexion pour tout le dashboard et expose un
   compteur `revision`. Chaque onglet ajoute `revision` aux dépendances de son
   chargement : quand le compteur bouge, l'onglet monté se recharge. Comme un
   seul onglet est monté à la fois, le coût reste d'une requête par événement.

   Les rafales (une commande génère souvent statut + paiement coup sur coup)
   sont regroupées par une fenêtre de debounce pour éviter un orage de requêtes.
   ═══════════════════════════════════════════════════════════════ */
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createCommandesSocket } from '../services/commandes.service';
import { useAuth } from './useAuth';

/* Événements qui rendent obsolètes les données affichées à l'admin. */
const REFRESH_EVENTS = [
  'commande.nouvelle',
  'commande.statut',
  'commande.paiement',
  'commande.paiement.echec',
  'commande:remboursee',
  'commande.b2b.nouvelle',
  'commande.b2b.statut',
  'commande.b2b.rappel',
  'admin.data.changed',
];

/* Fenêtre de regroupement des rafales, en millisecondes. */
const BURST_WINDOW_MS = 700;

const AdminRealtimeContext = createContext({
  revision: 0,
  connected: false,
  lastEvent: null,
});

export function AdminRealtimeProvider({ children }) {
  const { user } = useAuth();
  const [revision, setRevision]   = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const burstTimer = useRef(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return undefined;

    const socket = createCommandesSocket(user);

    const bumpRevision = (event) => {
      setLastEvent({ event, at: Date.now() });
      clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setRevision(r => r + 1), BURST_WINDOW_MS);
    };

    const handlers = REFRESH_EVENTS.map(event => {
      const handler = () => bumpRevision(event);
      socket.on(event, handler);
      return [event, handler];
    });

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      clearTimeout(burstTimer.current);
      handlers.forEach(([event, handler]) => socket.off(event, handler));
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [user]);

  const value = useMemo(
    () => ({ revision, connected, lastEvent }),
    [revision, connected, lastEvent],
  );

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

/** Compteur à ajouter aux dépendances d'un chargement d'onglet. */
export function useAdminRevision() {
  return useContext(AdminRealtimeContext).revision;
}

/** État de la connexion temps réel, pour l'indicateur d'en-tête. */
export function useAdminRealtimeStatus() {
  const { connected, lastEvent } = useContext(AdminRealtimeContext);
  return { connected, lastEvent };
}

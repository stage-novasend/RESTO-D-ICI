import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';

/**
 * Catalogue des moyens de paiement par défaut. Auparavant codé en dur dans un
 * switch de PaiementsService — désormais semé en base pour être piloté par
 * l'admin (activation/désactivation).
 */
export const PAYMENT_METHOD_DEFAULTS: Array<
  Pick<
    PaymentMethod,
    | 'code'
    | 'label'
    | 'provider'
    | 'gateway'
    | 'needsPhone'
    | 'ordre'
    | 'enabled'
  >
> = [
  { code: 'orange_money', label: 'Orange Money',   provider: 'ORANGE', gateway: 'novasend', needsPhone: true,  ordre: 1, enabled: true  },
  { code: 'mtn_momo',     label: 'MTN MoMo',        provider: 'MOMO',   gateway: 'novasend', needsPhone: true,  ordre: 2, enabled: true  },
  { code: 'moov_money',   label: 'Moov Money',      provider: 'MOOV',   gateway: 'novasend', needsPhone: true,  ordre: 3, enabled: true  },
  { code: 'wave',         label: 'Wave',            provider: 'WAVE',   gateway: 'novasend', needsPhone: true,  ordre: 4, enabled: true  },
  // Désactivé : l'API NovaSend n'accepte que WAVE | ORANGE | MOMO | MOOV
  // (cf. docs.novasend.app/fr/docs/api/direct/payment). Envoyer 'CARTE'
  // déclenche un 404 `provider_not_found`.
  { code: 'card',         label: 'Carte Bancaire',  provider: 'CARTE',  gateway: 'novasend', needsPhone: false, ordre: 5, enabled: false },
  // NB : provider 'NOVASEND' (wallet) pas encore implémenté côté API NovaSend
  // (« Processor novasend is not implemented yet ») → non proposé pour l'instant.
];

/**
 * Insère les moyens manquants (idempotent). Les moyens déjà présents ne sont
 * pas touchés — on préserve les choix d'activation de l'admin.
 *
 * Utilise `INSERT ... ON CONFLICT (code) DO NOTHING` : sûr même sous concurrence
 * (plusieurs requêtes/instances au démarrage) — jamais de violation de contrainte
 * unique, une seule requête.
 */
export async function ensurePaymentMethodsSeeded(
  repo: Repository<PaymentMethod>,
): Promise<void> {
  await repo
    .createQueryBuilder()
    .insert()
    .into(PaymentMethod)
    .values(PAYMENT_METHOD_DEFAULTS.map((d) => ({ ...d })))
    .orIgnore()
    .execute();
}

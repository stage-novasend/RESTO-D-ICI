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
    'code' | 'label' | 'provider' | 'gateway' | 'needsPhone' | 'ordre'
  >
> = [
  { code: 'orange_money', label: 'Orange Money',   provider: 'ORANGE', gateway: 'novasend', needsPhone: true,  ordre: 1 },
  { code: 'mtn_momo',     label: 'MTN MoMo',        provider: 'MOMO',   gateway: 'novasend', needsPhone: true,  ordre: 2 },
  { code: 'moov_money',   label: 'Moov Money',      provider: 'MOOV',   gateway: 'novasend', needsPhone: true,  ordre: 3 },
  { code: 'wave',         label: 'Wave',            provider: 'WAVE',   gateway: 'novasend', needsPhone: false, ordre: 4 },
  { code: 'card',         label: 'Carte Bancaire',  provider: 'CARTE',  gateway: 'novasend', needsPhone: false, ordre: 5 },
];

/**
 * Insère les moyens manquants (idempotent). Les moyens déjà présents ne sont
 * pas touchés — on préserve les choix d'activation de l'admin.
 */
export async function ensurePaymentMethodsSeeded(
  repo: Repository<PaymentMethod>,
): Promise<void> {
  const existing = await repo.find();
  const existingCodes = new Set(existing.map((m) => m.code));
  const toInsert = PAYMENT_METHOD_DEFAULTS.filter(
    (d) => !existingCodes.has(d.code),
  );
  if (toInsert.length > 0) {
    await repo.save(toInsert.map((d) => repo.create({ ...d, enabled: true })));
  }
}

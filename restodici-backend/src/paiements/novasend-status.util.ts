/**
 * Normalisation des statuts de transaction NovaSend.
 *
 * Statuts documentés (docs.novasend.app/fr/docs/api/direct/payment) :
 *   `processing` · `processed` · `failed` · `expired`
 *
 * ⚠️ Le succès est **`processed`**, PAS `successful`. Les autres libellés ci-dessous
 * sont conservés pour le webhook CinetPay (legacy) et la simulation interne.
 */
const SUCCESS_STATUSES = [
  'processed', // NovaSend — paiement encaissé
  'successful',
  'success',
  'succeeded',
  'completed',
];

const FAILED_STATUSES = [
  'failed', // NovaSend — paiement refusé
  'expired', // NovaSend — délai d'approbation dépassé
  'cancelled',
  'canceled',
  'declined',
];

/** `processing` = demande d'approbation USSD envoyée, en attente du client. */
const PENDING_STATUSES = ['processing', 'pending'];

const normalize = (status: unknown): string =>
  (typeof status === 'string' || typeof status === 'number'
    ? String(status)
    : ''
  )
    .trim()
    .toLowerCase();

export const isSuccessStatus = (status: unknown): boolean =>
  SUCCESS_STATUSES.includes(normalize(status));

export const isFailedStatus = (status: unknown): boolean =>
  FAILED_STATUSES.includes(normalize(status));

export const isPendingStatus = (status: unknown): boolean =>
  PENDING_STATUSES.includes(normalize(status));

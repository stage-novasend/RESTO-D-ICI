import * as crypto from 'crypto';

/**
 * Chiffrement de champ au repos (AES-256-GCM).
 * Utilisé pour les secrets sensibles stockés en base (ex. secret TOTP 2FA).
 *
 * Clé : TOTP_ENCRYPTION_KEY, dédiée et découplée du JWT_SECRET (obligatoire en
 * production — cf. validateEnv). Le JWT_SECRET n'est plus qu'un fallback de
 * LECTURE, pour déchiffrer les anciens secrets créés avant l'introduction d'une
 * clé dédiée (dev / migration). On ne dérive JAMAIS d'une chaîne vide : ça
 * produirait une clé prévisible (sha256("")).
 *
 * Format stocké : "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>".
 * Rétrocompatible : une valeur non préfixée est considérée déjà en clair
 * (secrets créés avant la mise en place du chiffrement).
 */

const PREFIX = 'enc:v1:';

function deriveKey(secret: string): Buffer {
  // Dérive une clé de 32 octets (sha256) quelle que soit la longueur de la source.
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Clés candidates par ordre de préférence : la clé dédiée d'abord, puis le
 * JWT_SECRET (héritage). Jamais de chaîne vide. Sert au chiffrement (première
 * clé) et au déchiffrement (essai de toutes les clés → migration sans perte).
 */
function keyCandidates(): Buffer[] {
  const secrets: string[] = [];
  const dedicated = process.env.TOTP_ENCRYPTION_KEY;
  if (dedicated && dedicated.trim()) secrets.push(dedicated);
  const jwt = process.env.JWT_SECRET; // fallback héritage/dev uniquement
  if (jwt && jwt.trim()) secrets.push(jwt);
  if (!secrets.length) {
    throw new Error(
      '[FATAL] Aucune clé de chiffrement disponible (TOTP_ENCRYPTION_KEY ou JWT_SECRET).',
    );
  }
  return secrets.map(deriveKey);
}

/** Chiffre une valeur en clair. Renvoie la chaîne préfixée à stocker. */
export function encryptField(plaintext: string): string {
  if (plaintext == null) return plaintext;
  const key = keyCandidates()[0]; // clé dédiée si présente, sinon JWT_SECRET (dev)
  const iv = crypto.randomBytes(12); // 96 bits recommandés pour GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/** Déchiffre une valeur stockée. Passe-plat si la valeur est déjà en clair. */
export function decryptField(stored?: string | null): string | undefined {
  if (stored == null) return undefined;
  if (!stored.startsWith(PREFIX)) return stored; // ancien secret en clair
  const [ivHex, tagHex, dataHex] = stored.slice(PREFIX.length).split(':');
  // Essaie chaque clé candidate : couvre la rotation clé dédiée ↔ ancien JWT_SECRET.
  for (const key of keyCandidates()) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const dec = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]);
      return dec.toString('utf8');
    } catch {
      // Mauvaise clé → on tente la suivante.
    }
  }
  // Aucune clé ne convient (données corrompues) → 2FA échouera proprement.
  return undefined;
}

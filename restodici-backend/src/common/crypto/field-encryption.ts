import * as crypto from 'crypto';

/**
 * Chiffrement de champ au repos (AES-256-GCM).
 * Utilisé pour les secrets sensibles stockés en base (ex. secret TOTP 2FA).
 *
 * Clé : dérivée de TOTP_ENCRYPTION_KEY (recommandé, dédié) ou, à défaut,
 * de JWT_SECRET (déjà garanti au démarrage) → fonctionne sans config
 * supplémentaire en dev, tout en permettant une clé dédiée en production.
 *
 * Format stocké : "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>".
 * Rétrocompatible : une valeur non préfixée est considérée déjà en clair
 * (secrets créés avant la mise en place du chiffrement).
 */

const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const secret =
    process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  // Dérive une clé de 32 octets (sha256) quelle que soit la longueur de la source.
  return crypto.createHash('sha256').update(secret).digest();
}

/** Chiffre une valeur en clair. Renvoie la chaîne préfixée à stocker. */
export function encryptField(plaintext: string): string {
  if (plaintext == null) return plaintext;
  const iv = crypto.randomBytes(12); // 96 bits recommandés pour GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
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
  try {
    const [ivHex, tagHex, dataHex] = stored.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    // Clé invalide / données corrompues → on ne renvoie rien (2FA échouera proprement).
    return undefined;
  }
}

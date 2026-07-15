import { encryptField, decryptField } from './field-encryption';

describe('field-encryption (AES-256-GCM)', () => {
  beforeAll(() => {
    process.env.TOTP_ENCRYPTION_KEY =
      process.env.TOTP_ENCRYPTION_KEY || 'test-encryption-key';
  });

  it('chiffre puis déchiffre (aller-retour)', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const enc = encryptField(secret);
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain(secret);
    expect(decryptField(enc)).toBe(secret);
  });

  it('produit un chiffré différent à chaque fois (IV aléatoire)', () => {
    const a = encryptField('same');
    const b = encryptField('same');
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe('same');
    expect(decryptField(b)).toBe('same');
  });

  it('rétrocompat : une valeur en clair (non préfixée) est renvoyée telle quelle', () => {
    expect(decryptField('ANCIEN_SECRET_EN_CLAIR')).toBe('ANCIEN_SECRET_EN_CLAIR');
  });

  it('null/undefined gérés', () => {
    expect(decryptField(undefined)).toBeUndefined();
    expect(decryptField(null)).toBeUndefined();
  });

  it('détecte une altération (auth tag GCM)', () => {
    const enc = encryptField('secret');
    const tampered = enc.slice(0, -2) + (enc.endsWith('00') ? 'ff' : '00');
    expect(decryptField(tampered)).toBeUndefined();
  });
});

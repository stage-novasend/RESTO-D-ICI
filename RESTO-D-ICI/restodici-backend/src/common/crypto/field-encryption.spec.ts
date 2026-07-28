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

describe('field-encryption — découplage de la clé', () => {
  const OLD_TOTP = process.env.TOTP_ENCRYPTION_KEY;
  const OLD_JWT = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.TOTP_ENCRYPTION_KEY = OLD_TOTP;
    process.env.JWT_SECRET = OLD_JWT;
  });

  it('migration : un secret chiffré sous JWT_SECRET reste lisible après ajout d’une clé dédiée', () => {
    // Ancien monde : pas de clé dédiée, chiffré avec JWT_SECRET.
    delete process.env.TOTP_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'ancien-jwt-secret';
    const legacy = encryptField('JBSWY3DPEHPK3PXP');

    // Nouveau monde : clé dédiée introduite, JWT_SECRET conservé (fallback lecture).
    process.env.TOTP_ENCRYPTION_KEY = 'nouvelle-cle-dediee';
    expect(decryptField(legacy)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('ne dérive jamais d’une chaîne vide : sans aucune clé → lève', () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    expect(() => encryptField('x')).toThrow(/clé de chiffrement/i);
  });

  it('un secret chiffré avec la clé dédiée n’est PAS déchiffrable avec le seul JWT_SECRET', () => {
    process.env.TOTP_ENCRYPTION_KEY = 'cle-dediee-forte';
    process.env.JWT_SECRET = 'un-autre-secret';
    const enc = encryptField('TOPSECRET');
    // On retire la clé dédiée : seul JWT_SECRET reste → doit échouer (découplage réel).
    delete process.env.TOTP_ENCRYPTION_KEY;
    expect(decryptField(enc)).toBeUndefined();
  });
});

import * as crypto from 'crypto';
import {
  extractSignature,
  verifyNovaSendSignature,
} from './webhook-signature.util';

const SECRET = 'whsec_test';
const sign = (body: string, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');

describe('verifyNovaSendSignature()', () => {
  const raw = '{"reference":"cmd-1","status":"processed"}';

  it('accepte une signature HMAC-SHA256 valide du corps brut', () => {
    expect(verifyNovaSendSignature(raw, sign(raw), SECRET)).toBe(true);
  });

  it('accepte une signature en majuscules ou préfixée `sha256=`', () => {
    expect(verifyNovaSendSignature(raw, sign(raw).toUpperCase(), SECRET)).toBe(
      true,
    );
    expect(verifyNovaSendSignature(raw, `sha256=${sign(raw)}`, SECRET)).toBe(
      true,
    );
  });

  it('rejette une signature calculée avec un autre secret', () => {
    expect(verifyNovaSendSignature(raw, sign(raw, 'autre'), SECRET)).toBe(
      false,
    );
  });

  it('rejette un corps altéré (montant/statut modifié en transit)', () => {
    const falsifie = '{"reference":"cmd-1","status":"failed"}';
    expect(verifyNovaSendSignature(falsifie, sign(raw), SECRET)).toBe(false);
  });

  it('rejette une signature absente ou un secret absent (fail-closed)', () => {
    expect(verifyNovaSendSignature(raw, undefined, SECRET)).toBe(false);
    expect(verifyNovaSendSignature(raw, sign(raw), undefined)).toBe(false);
  });

  // Le corps re-sérialisé diffère du corps brut dès que l'émetteur indente ou
  // espace son JSON — d'où l'obligation de signer sur `req.rawBody`.
  it('échoue si on signe un JSON re-sérialisé au lieu du corps brut', () => {
    const brut = '{\n  "status": "processed",\n  "reference": "cmd-1"\n}';
    const reserialise = JSON.stringify(JSON.parse(brut));
    expect(reserialise).not.toBe(brut);
    expect(verifyNovaSendSignature(reserialise, sign(brut), SECRET)).toBe(
      false,
    );
  });
});

describe('extractSignature()', () => {
  it('lit `x-signature-value` (en-tête officiel NovaSend)', () => {
    expect(extractSignature({ 'x-signature-value': 'abc' })).toBe('abc');
  });

  it('accepte `x-webhook-signature` en repli', () => {
    expect(extractSignature({ 'x-webhook-signature': 'def' })).toBe('def');
  });

  it('donne la priorité à `x-signature-value` si les deux sont présents', () => {
    expect(
      extractSignature({
        'x-webhook-signature': 'def',
        'x-signature-value': 'abc',
      }),
    ).toBe('abc');
  });

  it('retourne undefined si aucun en-tête connu', () => {
    expect(extractSignature({ 'x-autre': 'zzz' })).toBeUndefined();
    expect(extractSignature({ 'x-signature-value': '  ' })).toBeUndefined();
  });
});

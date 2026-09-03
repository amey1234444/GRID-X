import {
  TOTP_PERIOD_SECONDS,
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateSecret,
  generateTotp,
  normaliseRecoveryCode,
  otpauthUri,
  verifyTotp,
} from './totp';

/**
 * The RFC 4226 appendix D test vectors. If these pass, any authenticator app will agree with us —
 * which is the whole point of replacing the previous hand-rolled scheme.
 */
const RFC4226_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

describe('base32', () => {
  it('round-trips a buffer', () => {
    const original = Buffer.from('12345678901234567890', 'ascii');
    expect(base32Decode(base32Encode(original)).equals(original)).toBe(true);
  });

  it('matches the known encoding of the RFC test key', () => {
    expect(RFC4226_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('tolerates lowercase, spaces and padding, as typed by hand', () => {
    const secret = generateSecret();
    const messy = `${secret.toLowerCase().slice(0, 8)} ${secret.toLowerCase().slice(8)}==`;
    expect(base32Decode(messy).equals(base32Decode(secret))).toBe(true);
  });

  it('rejects a character outside the alphabet', () => {
    expect(() => base32Decode('ABC1')).toThrow(/Invalid base32/);
  });
});

describe('generateTotp', () => {
  // RFC 6238 appendix B, SHA-1 column, converted from its 8-digit values to our 6.
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at t=%i', (seconds, expected) => {
    expect(generateTotp(RFC4226_SECRET, new Date(seconds * 1000))).toBe(expected);
  });

  it('produces a new code each period', () => {
    const secret = generateSecret();
    const now = new Date('2026-08-20T10:00:00Z');
    const next = new Date(now.getTime() + TOTP_PERIOD_SECONDS * 1000);
    expect(generateTotp(secret, now)).not.toBe(generateTotp(secret, next));
  });
});

describe('verifyTotp', () => {
  const secret = generateSecret();
  const now = new Date('2026-08-20T10:00:00Z');

  it('accepts the current code', () => {
    expect(verifyTotp(secret, generateTotp(secret, now), now)).toBe(true);
  });

  it('accepts one step of drift either side, for a phone with a slow clock', () => {
    const before = new Date(now.getTime() - TOTP_PERIOD_SECONDS * 1000);
    const after = new Date(now.getTime() + TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotp(secret, generateTotp(secret, before), now)).toBe(true);
    expect(verifyTotp(secret, generateTotp(secret, after), now)).toBe(true);
  });

  it('rejects a code two steps out', () => {
    const stale = new Date(now.getTime() - 3 * TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotp(secret, generateTotp(secret, stale), now)).toBe(false);
  });

  it('rejects a code from another secret', () => {
    expect(verifyTotp(secret, generateTotp(generateSecret(), now), now)).toBe(false);
  });

  it.each(['', '12345', '1234567', 'abcdef', '12 34 56'])(
    'rejects malformed input %p without throwing',
    (code) => {
      expect(verifyTotp(secret, code, now)).toBe(false);
    },
  );

  it('ignores spaces a user might paste in', () => {
    const code = generateTotp(secret, now);
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, now)).toBe(true);
  });
});

describe('otpauthUri', () => {
  it('builds a URI an authenticator app can read', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'head@oswar.example');
    expect(uri).toContain('otpauth://totp/GRID-X%3Ahead%40oswar.example');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=GRID-X');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

describe('recovery codes', () => {
  it('issues ten distinct codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it('formats them in readable halves', () => {
    for (const code of generateRecoveryCodes(3)) {
      expect(code).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    }
  });

  it('normalises however the user types one back', () => {
    const code = generateRecoveryCodes(1)[0];
    const bare = code.replace('-', '');
    expect(normaliseRecoveryCode(code.toLowerCase())).toBe(bare);
    expect(normaliseRecoveryCode(` ${code} `)).toBe(bare);
  });
});

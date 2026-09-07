import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * RFC 6238 time-based one-time passwords, on RFC 4226 HOTP.
 *
 * Written out rather than pulled from a package because it is thirty lines of well-specified
 * arithmetic and the alternative is another dependency in the auth path. The output is the
 * standard 6-digit / 30-second / SHA-1 construction every authenticator app expects, so a user
 * can enrol with Google Authenticator, Authy, 1Password or any other.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** One step either side of now, to tolerate clock drift on the user's phone. */
export const TOTP_WINDOW = 1;

/** A new secret, base32-encoded as authenticator apps expect. 20 bytes = 160 bits, per RFC 4226. */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/** The HOTP code for one counter value (RFC 4226 section 5.3). */
function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer; JavaScript numbers cover the high half safely here
  // because a 30-second step will not exceed 2^53 for the lifetime of anything we build.
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter % 0x100000000, 4);

  const digest = createHmac('sha1', secret).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/** The code that should be showing on the user's phone right now. */
export function generateTotp(secret: string, at: Date = new Date()): string {
  const counter = Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/**
 * Checks a submitted code against the steps within the drift window. Comparison is constant-time
 * so a wrong code cannot be narrowed down by timing it.
 */
export function verifyTotp(
  secret: string,
  code: string,
  at: Date = new Date(),
  window = TOTP_WINDOW,
): boolean {
  const submitted = code.replace(/\s/g, '');
  if (!/^\d+$/.test(submitted) || submitted.length !== TOTP_DIGITS) return false;

  const key = base32Decode(secret);
  const counter = Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS);
  const submittedBuffer = Buffer.from(submitted);

  let matched = false;
  for (let drift = -window; drift <= window; drift += 1) {
    const candidate = Buffer.from(hotp(key, counter + drift));
    // No early exit: every step is compared so the loop takes the same time either way.
    if (
      candidate.length === submittedBuffer.length &&
      timingSafeEqual(candidate, submittedBuffer)
    ) {
      matched = true;
    }
  }
  return matched;
}

/**
 * The otpauth:// URI an authenticator app reads from a QR code.
 * See github.com/google/google-authenticator/wiki/Key-Uri-Format.
 */
export function otpauthUri(secret: string, account: string, issuer = 'GRID-X'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Single-use recovery codes for a lost device. Returned in plain text once, at enrolment, and
 * stored only as hashes.
 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

/** Recovery codes are compared without their dash and case, so they can be typed either way. */
export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

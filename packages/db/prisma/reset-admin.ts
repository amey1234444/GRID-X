/**
 * Recovers access to a GRID-X environment when nobody can sign in.
 *
 * The seed is the normal way accounts get their passwords, but it only runs when `RUN_SEED=true`
 * on a deploy that actually succeeds. When it has not run — or has run against a different
 * database, or failed partway — every internal account is unreachable, and the password reset flow
 * cannot help because requesting a link needs a mailbox and issuing one needs an admin session.
 *
 * This talks to the database directly. Run it with DATABASE_URL pointing at the environment you
 * need to get into:
 *
 *   DATABASE_URL="postgres://..." pnpm --filter @gridx/db reset-admin
 *   DATABASE_URL="postgres://..." pnpm --filter @gridx/db reset-admin -- --email me@oswar.example
 *
 * It reports what it finds before changing anything, so a run against an empty or unseeded
 * database tells you that rather than silently appearing to work.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** Readable, unambiguous characters — this gets typed by hand or read out over a phone. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(14);
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `Gx-${body}`;
}

async function main(): Promise<void> {
  const email = (readFlag('email') ?? 'admin@oswar.example').toLowerCase();
  const password = readFlag('password') ?? process.env.SEED_PASSWORD ?? generatePassword();
  const generated = !readFlag('password') && !process.env.SEED_PASSWORD;

  // Diagnosis first: an unseeded database is a different problem from a wrong password, and the
  // login screen deliberately cannot tell you which one you have.
  const [userCount, roleCount, partnerCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.partner.count(),
  ]);

  console.log('Database contents');
  console.log(`  users:    ${userCount}`);
  console.log(`  roles:    ${roleCount}`);
  console.log(`  partners: ${partnerCount}`);

  if (roleCount === 0) {
    console.error(
      '\nNo roles exist, so this database has never been seeded. Run the seed against it ' +
        '(RUN_SEED=true on Render, or `pnpm db:seed` locally) rather than using this script — ' +
        'a user without a role cannot be created here.',
    );
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  if (!existing) {
    const adminRole = await prisma.role.findUnique({ where: { code: 'GROUP_ADMIN' } });
    if (!adminRole) {
      console.error('\nNo GROUP_ADMIN role found. Seed the database first.');
      process.exitCode = 1;
      return;
    }
    const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
    const created = await prisma.user.create({
      data: {
        email,
        name: 'GRID-X Administrator',
        roleId: adminRole.id,
        userType: 'INTERNAL',
        status: 'ACTIVE',
        passwordHash,
        passwordUpdatedAt: new Date(),
        ...(company
          ? { companies: { create: [{ companyId: company.id, isDefault: true }] } }
          : {}),
      },
    });
    console.log(`\nCreated ${email} as GROUP_ADMIN (${created.id}).`);
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, passwordUpdatedAt: new Date(), status: 'ACTIVE' },
    });
    // Every existing session is now stale; a password change should not leave them usable.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    console.log(`\nReset the password for ${email} (role ${existing.role.code}).`);
    if (existing.status !== 'ACTIVE') {
      console.log(`  Status was ${existing.status}; it is now ACTIVE.`);
    }
  }

  /**
   * Section 18 — two-factor is required for senior roles by default. Someone recovering access has
   * no authenticator enrolled yet, so leaving that in force would hand them a session that opens
   * only the enrolment screen. Clearing it makes the recovery actually recover something.
   */
  const twoFactor = await prisma.systemSetting.findUnique({
    where: { key: 'security.twoFactorRequiredRoles' },
  });
  const required = Array.isArray(twoFactor?.value) ? (twoFactor?.value as string[]) : null;
  if (required === null || required.length > 0) {
    await prisma.systemSetting.upsert({
      where: { key: 'security.twoFactorRequiredRoles' },
      create: { key: 'security.twoFactorRequiredRoles', value: [] },
      update: { value: [] },
    });
    console.log(
      '  Two-factor enforcement cleared so you can sign in. Turn it back on in ' +
        'Administration -> Settings once you have enrolled an authenticator.',
    );
  }

  console.log('\nSign in with:');
  console.log(`  ${email}`);
  console.log(`  ${password}`);
  if (generated) {
    console.log('\nThis password was generated and is shown only here. Change it after signing in.');
  }
}

main()
  .catch((error) => {
    console.error('\nFailed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Seeds the built-in `super` role and the six permission claims, and optionally adds the first super user.
// Idempotent. Uses the Admin SDK with Application Default Credentials (or the emulator), never a key in the repo.
//
//   gcloud auth application-default login
//   GOOGLE_CLOUD_PROJECT=<project-id> npm run seed -- --super-email you@example.com
//
// Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=<project-id> npm run seed -- --super-email you@example.com
import { initializeApp } from 'firebase-admin/app';
import { buildApp } from '../src/composition';

function readSuperEmail(args: string[]): string | null {
  const index = args.indexOf('--super-email');
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

async function main(): Promise<void> {
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) {
    throw new Error('Set GOOGLE_CLOUD_PROJECT to your Firebase project id');
  }
  initializeApp();
  const { seed } = buildApp();

  await seed.seedBuiltIns();
  console.log('Seeded role "super" and 6 permission claims');

  const email = readSuperEmail(process.argv.slice(2));
  if (email) {
    const added = await seed.addFirstSuperUser(email);
    console.log(`User ${added} is an active super user`);
  } else {
    console.log('No --super-email given: no user was added');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { buildApp } from './composition';
import { toHttpsError } from './shared/errors/HttpsErrorMapper';

// Composition root: the only place that knows every module. See composition.ts for the wiring.
initializeApp();
setGlobalOptions({ region: process.env.FUNCTIONS_REGION ?? 'us-central1', maxInstances: 10 });

let router: ReturnType<typeof buildApp>['router'] | undefined;
const getRouter = () => (router ??= buildApp().router);

// The ONE write/RPC endpoint. Request {action, payload}; failures carry details.code (stable domain code).
export const api = onCall({ timeoutSeconds: 60, memory: '256MiB' }, async (request) => {
  try {
    return await getRouter().handle(request.auth, request.data);
  } catch (error) {
    throw toHttpsError(error);
  }
});

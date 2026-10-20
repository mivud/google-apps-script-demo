import type { CallableRequest } from 'firebase-functions/v2/https';

type AuthData = CallableRequest['auth'];
import { hasPermission, type Access, type PermissionValue } from '../auth/Access';
import type { AccessResolver } from '../auth/AccessResolver';
import { callerFromAuth } from '../auth/Caller';
import type { RequestContext } from '../context/RequestContext';
import { forbidden, validation } from '../errors/DomainError';
import { formatUtc, type Clock } from '../time/Clock';
import { isRecord, PayloadReader } from '../validation/PayloadReader';

export interface ActionCall {
  readonly request: RequestContext;
  readonly payload: PayloadReader;
  readonly access: Access | null;
}

// permission = null: any signed-in Google caller (the handler then sees access = null for unknown users).
export interface ActionDefinition {
  readonly action: string;
  readonly permission: PermissionValue | null;
  readonly handler: (call: ActionCall) => Promise<unknown>;
}

export class ActionRouter {
  private readonly actions = new Map<string, ActionDefinition>();

  constructor(
    definitions: readonly ActionDefinition[],
    private readonly resolver: AccessResolver,
    private readonly clock: Clock,
  ) {
    definitions.forEach((definition) => this.actions.set(definition.action, definition));
  }

  // Order: authenticate, find the action, authorize, then run. Nothing from the payload is trusted.
  async handle(auth: AuthData, data: unknown): Promise<unknown> {
    const caller = callerFromAuth(auth);
    if (!isRecord(data) || typeof data.action !== 'string') throw validation('invalid_request');
    const definition = this.actions.get(data.action);
    if (!definition) throw validation('unknown_action');

    const access = await this.resolver.resolve(caller.email);
    if (definition.permission && (!access || !hasPermission(access, definition.permission))) throw forbidden();

    const request: RequestContext = { actor: caller.email, nowIso: formatUtc(this.clock.now()) };
    return definition.handler({ request, payload: PayloadReader.of(data.payload), access });
  }
}

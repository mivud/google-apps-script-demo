import { ALL_PERMISSIONS, PERMISSION_KEY, SUPER_ROLE } from '../../../shared/auth/Access';
import { SYSTEM_ACTOR } from '../../../shared/context/RequestContext';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { formatUtc, type Clock } from '../../../shared/time/Clock';
import { parseEmail } from '../domain/Identity';
import type { AccessIndexService } from './AccessService';
import type { IdentityStore } from './IdentityStore';

const SUPER_DESCRIPTION = 'Full access, bypasses every permission check';

// Equivalent of the Supabase seed in 002_users.sql plus the "first super user" snippet. Idempotent.
// It runs outside the API on purpose: there is no caller, so the lockout rules do not apply.
export class SeedIdentity {
  constructor(
    private readonly store: IdentityStore,
    private readonly ids: IdGenerator,
    private readonly index: AccessIndexService,
    private readonly clock: Clock,
  ) {}

  private request() {
    return { actor: SYSTEM_ACTOR, nowIso: formatUtc(this.clock.now()) };
  }

  async seedBuiltIns(): Promise<void> {
    await this.store.run(this.request(), async (tx) => {
      const roles = await tx.roles.list();
      if (!roles.some((role) => role.name === SUPER_ROLE)) {
        await tx.roles.save({ id: this.ids.next(), name: SUPER_ROLE, description: SUPER_DESCRIPTION });
      }
      for (const value of ALL_PERMISSIONS) {
        const claim = { key: PERMISSION_KEY, value };
        if (!(await tx.claims.get(claim))) await tx.claims.save(claim);
      }
    });
  }

  async addFirstSuperUser(emailInput: string): Promise<string> {
    const email = parseEmail(emailInput);
    const userId = await this.store.run(this.request(), async (tx) => {
      const superRole = (await tx.roles.list()).find((role) => role.name === SUPER_ROLE);
      if (!superRole) throw new Error('Run the built-in seed first');
      const user = (await tx.users.findByEmail(email)) ?? (await tx.users.save({ id: this.ids.next(), email, active: true }));
      const assigned = (await tx.assignments.rolesOfUser(user.id)).some((link) => link.role_id === superRole.id);
      if (!assigned) await tx.assignments.assignRole(user.id, superRole.id);
      return user.id;
    });
    await this.index.refreshUsers([userId]);
    return email;
  }
}

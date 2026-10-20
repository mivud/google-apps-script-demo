// Who acts and when. Audit columns come from here, never from the client payload.
export interface RequestContext {
  readonly actor: string;
  readonly nowIso: string;
}

export const SYSTEM_ACTOR = 'system';

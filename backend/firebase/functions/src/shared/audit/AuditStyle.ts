import type { RequestContext } from '../context/RequestContext';

export interface AuditStyle {
  readonly created: string;
  readonly modified: string;
  readonly createdBy: string;
  readonly modifiedBy: string;
}

// Identity and expense tables.
export const IDENTITY_AUDIT: AuditStyle = {
  created: 'created',
  modified: 'last_modified',
  createdBy: 'created_by',
  modifiedBy: 'last_modified_by',
};
export interface IdentityAudit {
  created: string;
  created_by: string;
  last_modified: string;
  last_modified_by: string;
}

// Device tables.
export const DEVICE_AUDIT: AuditStyle = {
  created: 'created_at',
  modified: 'modified_at',
  createdBy: 'created_by',
  modifiedBy: 'last_modified_by',
};
export interface DeviceAudit {
  created_at: string;
  modified_at: string;
  created_by: string;
  last_modified_by: string;
}

// Mirrors the Supabase audit triggers: creation fields are kept from the stored row, client values are ignored.
export function stampAudit(
  style: AuditStyle,
  previous: Record<string, unknown> | null,
  request: RequestContext,
): Record<string, string> {
  return {
    [style.created]: previous ? String(previous[style.created]) : request.nowIso,
    [style.createdBy]: previous ? String(previous[style.createdBy]) : request.actor,
    [style.modified]: request.nowIso,
    [style.modifiedBy]: request.actor,
  };
}

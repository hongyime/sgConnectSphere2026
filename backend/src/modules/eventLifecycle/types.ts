import type { EventStatus } from './status.js';

export type EventRecord = {
  id: string;
  title: string;
  description?: string;
  purpose?: string;
  clientOrgId: string;
  organiserId: string;
  coordinatorId?: string;
  status: EventStatus;
  statusChangedAt: Date;
  startAt?: Date;
  endAt?: Date;
  expectedAttendance?: number;
  layoutId?: string;
  venueRequirements?: string;
  accessibilityNote?: string;
  // E02-S03: predefined accessibility_features ids selected from the shared
  // vocabulary venue records also draw from (BDR T-13). Distinct from
  // accessibilityNote, which is free text and explicitly excluded from
  // automated venue matching.
  accessibilityFeatureIds?: string[];
  equipmentRequirements?: string;
  layoutPreference?: string;
  registrationSetup?: string;
};

export type StatusChangeRequest = {
  eventId: string;
  actorId: string;
  toStatus: EventStatus;
  reason?: string;
};

export type CreateEventRequest = {
  title: string;
  description?: string;
  purpose?: string;
  organiserId: string;
  clientOrgId: string;
  status?: Extract<EventStatus, 'draft' | 'submitted'>;
  startAt: Date;
  endAt: Date;
  expectedAttendance: number;
  layoutId?: string;
  venueRequirements?: string;
  accessibilityNote?: string;
  accessibilityFeatureIds?: string[];
  equipmentRequirements?: string;
  layoutPreference?: string;
  registrationSetup?: string;
};

// A full replacement of every editable field on an existing draft. The service
// layer always resolves a sparse patch against the current record before
// calling the repository, so this is a plain update, not a merge-in-SQL patch.
export type EventUpdate = Omit<CreateEventRequest, 'organiserId' | 'clientOrgId'>;

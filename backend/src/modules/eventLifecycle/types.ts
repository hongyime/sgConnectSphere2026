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
  equipmentRequirements?: string;
  layoutPreference?: string;
  registrationSetup?: string;
};

// A full replacement of every editable field on an existing draft. The service
// layer always resolves a sparse patch against the current record before
// calling the repository, so this is a plain update, not a merge-in-SQL patch.
export type EventUpdate = Omit<CreateEventRequest, 'organiserId' | 'clientOrgId'>;

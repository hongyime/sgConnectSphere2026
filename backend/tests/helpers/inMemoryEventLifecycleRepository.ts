import type { EventLifecycleRepository } from '../../src/modules/eventLifecycle/repository.js';
import type { CreateEventRequest, EventRecord } from '../../src/modules/eventLifecycle/types.js';

export type StatusChange = {
  eventId: string;
  status: EventRecord['status'];
  actorId: string;
  fromStatus: EventRecord['status'];
  reason?: string;
};

function recordFromCreate(id: string, request: CreateEventRequest): EventRecord {
  return {
    id,
    title: request.title,
    description: request.description,
    purpose: request.purpose,
    clientOrgId: request.clientOrgId,
    organiserId: request.organiserId,
    status: request.status ?? 'submitted',
    statusChangedAt: new Date(),
    startAt: request.startAt,
    endAt: request.endAt,
    expectedAttendance: request.expectedAttendance,
    venueRequirements: request.venueRequirements,
    accessibilityNote: request.accessibilityNote,
    accessibilityFeatureIds: request.accessibilityFeatureIds,
    equipmentRequirements: request.equipmentRequirements,
    layoutPreference: request.layoutPreference,
    registrationSetup: request.registrationSetup,
  };
}

// A fake backed by an in-memory map, so callers can exercise a real
// find -> mutate -> persist round trip without a database.
export function createInMemoryEventLifecycleRepository(): EventLifecycleRepository & {
  created: CreateEventRequest[];
  events: Map<string, EventRecord>;
  statusChanges: StatusChange[];
} {
  const created: CreateEventRequest[] = [];
  const events = new Map<string, EventRecord>();
  const statusChanges: StatusChange[] = [];
  let nextId = 1;

  return {
    created,
    events,
    statusChanges,
    async createEvent(request) {
      created.push(request);
      const record = recordFromCreate(`event-${nextId++}`, request);
      events.set(record.id, record);
      return record;
    },
    async findEventById(eventId) {
      return events.get(eventId) ?? null;
    },
    async updateEventStatus(eventId, status, actorId, reason) {
      const existing = events.get(eventId);
      if (!existing) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Mirrors the real repository: no audit entry for a same-status no-op.
      if (existing.status !== status) {
        statusChanges.push({ eventId, status, actorId, fromStatus: existing.status, reason });
      }
      const record: EventRecord = { ...existing, status, statusChangedAt: new Date() };
      events.set(eventId, record);
      return record;
    },
    async listEventsByOrganiser(organiserId, status) {
      return [...events.values()].filter(
        (event) => event.organiserId === organiserId && (!status || event.status === status),
      );
    },
    async updateEvent(eventId, update) {
      const existing = events.get(eventId);
      if (!existing) {
        throw new Error(`Event not found: ${eventId}`);
      }
      const record: EventRecord = { ...existing, ...update, statusChangedAt: new Date() };
      events.set(eventId, record);
      return record;
    },
    async deleteEvent(eventId) {
      const existing = events.get(eventId);
      if (!existing || existing.status !== 'draft') {
        throw new Error(`Draft event not found: ${eventId}`);
      }
      events.delete(eventId);
    },
  };
}

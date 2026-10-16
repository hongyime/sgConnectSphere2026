import type { EditableField } from './eventEditApi';

export const editableFieldLabels: Record<EditableField | string, string> = {
  title: 'event name', description: 'description', purpose: 'purpose', startAt: 'start', endAt: 'end',
  expectedAttendance: 'expected attendance', venueRequirements: 'venue requirements', accessibilityNote: 'accessibility needs',
  equipmentRequirements: 'equipment', layoutPreference: 'layout', registrationSetup: 'registration setup', registrationDates: 'registration dates',
};

export function fieldList(fields: string[]) {
  const names = fields.map(field => editableFieldLabels[field] ?? field);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? 'details';
}

import { AccessError } from '../eventVisibility/service.js';

export const SAFETY_FACTORS = [
  'attendance_capacity',
  'venue_layout',
  'emergency_access',
  'accessibility',
  'equipment_placement',
  'crowd_movement',
  'venue_restrictions',
] as const;

export type SafetyFactor = typeof SAFETY_FACTORS[number];
export type SafetyFactorAssessment = { satisfactory: boolean; comment: string };
export type SafetyFactors = Record<SafetyFactor, SafetyFactorAssessment>;
export type SafetyDecision = 'approve' | 'request_changes' | 'reject';
export type SafetyDecisionInput = { decision: SafetyDecision; factors: unknown; reason?: unknown };
export type ParsedSafetyDecision = { decision: SafetyDecision; factors: SafetyFactors; reason?: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function parseSafetyDecision(input: unknown): ParsedSafetyDecision {
  if (!isObject(input) || !['approve', 'request_changes', 'reject'].includes(String(input.decision))) {
    throw new AccessError(400, 'A valid safety decision is required.');
  }
  if (!isObject(input.factors)) throw new AccessError(400, 'Record every safety factor before deciding.');

  const factors = {} as SafetyFactors;
  for (const key of SAFETY_FACTORS) {
    const value = input.factors[key];
    if (!isObject(value) || typeof value.satisfactory !== 'boolean' || typeof value.comment !== 'string') {
      throw new AccessError(400, 'Record every safety factor before deciding.');
    }
    const comment = value.comment.trim();
    if (!comment || comment.length > 2000) throw new AccessError(400, 'Each safety factor needs a comment of 1 to 2000 characters.');
    factors[key] = { satisfactory: value.satisfactory, comment };
  }

  const decision = input.decision as SafetyDecision;
  const reason = typeof input.reason === 'string' ? input.reason.trim() : undefined;
  if (decision !== 'approve' && !reason) throw new AccessError(400, 'A reason is required for this safety decision.');
  if (reason && reason.length > 2000) throw new AccessError(400, 'The safety decision reason must not exceed 2000 characters.');
  if (decision === 'approve' && SAFETY_FACTORS.some(key => !factors[key].satisfactory)) {
    throw new AccessError(409, 'Approval is refused while any safety factor is unsatisfactory.');
  }
  return { decision, factors, reason };
}

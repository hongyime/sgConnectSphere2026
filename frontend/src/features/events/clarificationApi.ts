// Client for the E03-S02 (SCRUM-33) clarification endpoints in api/events.ts.
// The rules live in backend/src/modules/eventLifecycle/clarification.ts; the
// screens mirror them only so most problems show before a round trip, using
// the server's own sentences so each rule has one message either way.
//   POST /api/events?clarification=request&id=<id>   { questions: string[] }
//   POST /api/events?clarification=response&id=<id>  { answers: [{ questionId, answer }] }
// Outstanding questions arrive on both event detail reads (`outstandingQuestions`).
import { apiCall, jsonRequest } from '../../shared';

export type OutstandingQuestion = { id: string; body: string; created_at: string; author_name: string };

// Same limits as the server (MAX_CLARIFICATION_TEXT, MAX_QUESTIONS_PER_REQUEST).
export const MAX_CLARIFICATION_TEXT = 2000;
export const MAX_QUESTIONS = 20;

export const messages = {
  noQuestion: 'Add at least one question.',
  questionTooLong: `Each question must be ${MAX_CLARIFICATION_TEXT} characters or fewer.`,
  blankQuestion: 'Enter the question, or remove this box.',
  notUnderReview: 'Clarification can only be requested while the request is Under Review.',
  answerAll: 'Answer every outstanding question before resubmitting.',
  answerBlank: 'Answer this question.',
  answerTooLong: `Each answer must be ${MAX_CLARIFICATION_TEXT} characters or fewer.`,
  notAwaiting: 'This request is not awaiting clarification.',
  notOwner: 'Only the Organiser who submitted this request can answer its questions.',
};

// Keeps only well-formed rows, so a partial read never breaks a screen.
export function readQuestions(value: unknown): OutstandingQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OutstandingQuestion => typeof item === 'object' && item !== null
    && typeof (item as OutstandingQuestion).id === 'string' && typeof (item as OutstandingQuestion).body === 'string');
}

export function requestClarification(eventId: string, questions: string[]) {
  return apiCall<{ clarification: unknown }>(
    `/api/events?clarification=request&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', { questions }), 'Unable to send your questions.');
}

export function respondToClarification(eventId: string, answers: { questionId: string; answer: string }[]) {
  return apiCall<{ clarification: unknown }>(
    `/api/events?clarification=response&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', { answers }), 'Unable to send your answers.');
}

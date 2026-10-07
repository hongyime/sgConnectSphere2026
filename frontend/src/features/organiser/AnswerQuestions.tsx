// E03-S02 (SCRUM-33) Scenario 2: the Organiser answers every outstanding
// clarification question, which sends the request back to its Coordinator
// (Under Review). Built from templates/FormTemplate.tsx; replaces the mock
// ClarificationResponse that stood in for this screen.
//
// Only the Organiser who submitted the request may answer (D21), and only
// while it is Awaiting Clarification (D22). Both cases show the server's
// own sentence instead of the form; the server still has the final say, so a
// stale page gets its refusal in the error alert (TC_E03S02_09 to _11).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FormActions, FormField, FormSection, LoadingState, PageLayout,
  formatDate, useLoad,
} from '../../shared';
import { MAX_CLARIFICATION_TEXT, messages, respondToClarification } from '../events/clarificationApi';
import { NotFound } from './Organiser';
import { getClarificationRequest, type ClarificationRequest } from './organiserRequestsApi';

export function AnswerQuestions() {
  const { eventCode: identifier = '' } = useParams();
  const { result, reload } = useLoad(signal => getClarificationRequest(identifier, signal), [identifier]);
  const back = `/organiser/requests/${encodeURIComponent(identifier)}`;

  if (result.state === 'error' && result.failure.status === 404) {
    return <NotFound eventCode={identifier} message={result.failure.message} />;
  }
  const request = result.state === 'ready' ? result.data : null;

  return (
    <PageLayout eyebrow={request?.eventCode ?? 'Event organiser'} title="Answer questions" width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading questions…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="these questions" backTo="/organiser" backLabel="Back to my events" />
      ) : null}
      {request && !request.owner ? (
        <Alert tone="info" action={<ButtonLink to="/organiser">Back to my events</ButtonLink>}>{messages.notOwner}</Alert>
      ) : null}
      {request && request.owner && (request.status !== 'awaiting_clarification' || request.outstandingQuestions.length === 0) ? (
        <Alert tone="info" action={<ButtonLink to={back}>Back to request</ButtonLink>}>{messages.notAwaiting}</Alert>
      ) : null}
      {request && request.owner && request.status === 'awaiting_clarification' && request.outstandingQuestions.length > 0 ? (
        <AnswerForm key={request.id} request={request} back={back} />
      ) : null}
    </PageLayout>
  );
}

type Errors = Record<string, string>;

// Mirror of the server's checks, so most problems show before a round trip.
export function checkAnswers(request: ClarificationRequest, answers: Record<string, string>): Errors {
  const errors: Errors = {};
  for (const question of request.outstandingQuestions) {
    const text = (answers[question.id] ?? '').trim();
    if (!text) errors[question.id] = messages.answerBlank;
    else if (text.length > MAX_CLARIFICATION_TEXT) errors[question.id] = messages.answerTooLong;
  }
  return errors;
}

function AnswerForm({ request, back }: { request: ClarificationRequest; back: string }) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Don't update state if the user navigated away while sending. Set on
  // every mount: in development StrictMode mounts, unmounts and remounts once,
  // and a ref left false would drop every reply.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function update(questionId: string, value: string) {
    setAnswers(current => ({ ...current, [questionId]: value }));
    setErrors(current => ({ ...current, [questionId]: '' }));
    setServerError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = checkAnswers(request, answers);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setServerError(Object.values(found).includes(messages.answerBlank)
        ? messages.answerAll
        : 'Fix the highlighted answers, then send again.');
      return;
    }
    setSending(true);
    const result = await respondToClarification(request.id, request.outstandingQuestions.map(question => ({
      questionId: question.id, answer: answers[question.id].trim(),
    })));
    if (!mounted.current) return;
    setSending(false);
    if (!result.ok) { setServerError(result.message); return; }
    navigate(back, { state: { answered: true } });
  }

  return (
    <Card title="Your answers">
      <p>
        Your Coordinator needs more information about {request.title} before the review can continue.
        Answer every question, then send your answers to put the request back under review.
      </p>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title={request.outstandingQuestions.length === 1 ? 'Question' : 'Questions'}>
          {request.outstandingQuestions.map((question, index) => (
            <FormField
              key={question.id}
              wide
              label={`${index + 1}. ${question.body}`}
              hint={`Asked by ${question.author_name} on ${formatDate(question.created_at)}. Up to ${MAX_CLARIFICATION_TEXT} characters.`}
              error={errors[question.id] || undefined}
            >
              {props => (
                <textarea {...props} rows={4} value={answers[question.id] ?? ''} onChange={change => update(question.id, change.target.value)} />
              )}
            </FormField>
          ))}
        </FormSection>
        <FormActions>
          <ButtonLink to={back}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" busy={sending} busyLabel="Sending…" icon={<Send size={14} aria-hidden="true" />}>
            Send answers
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

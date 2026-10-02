// E03-S02 (SCRUM-33) Scenario 1: the assigned Coordinator sends the
// Organiser one or more questions, which moves the request to Awaiting
// Clarification until they answer. Built from templates/FormTemplate.tsx, on
// its own page (D17) and sent in one step with no ConfirmPanel (D18), since
// it ends when the Organiser answers.
//
// The read refuses anyone but the assigned Coordinator, and a request that
// isn't Under Review shows the server's sentence instead of the form (D22).
// The server still has the final say: a stale page gets its refusal in the
// error alert (TC_E03S02_05 to _08).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Send } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FormActions, FormField, FormSection, LoadingState, PageLayout, useLoad,
} from '../../shared';
import { MAX_CLARIFICATION_TEXT, MAX_QUESTIONS, messages, requestClarification } from '../events/clarificationApi';
import { getAssignedEvent, type AssignedEventDetail } from './coordinatorApi';

export function RequestClarification() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getAssignedEvent(eventCode, signal), [eventCode]);
  const event = result.state === 'ready' ? result.data : null;
  const back = `/coordinator/events/${encodeURIComponent(eventCode)}`;

  return (
    <PageLayout eyebrow={event?.event_code ?? eventCode} title="Request clarification" width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading event…" rows={2} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="this event" backTo="/coordinator" backLabel="Back to dashboard" />
      ) : null}
      {event && event.status !== 'under_review' ? (
        <Alert tone="info" action={<ButtonLink to={back}>Back to event</ButtonLink>}>{messages.notUnderReview}</Alert>
      ) : null}
      {event && event.status === 'under_review' ? <QuestionsForm key={event.id} event={event} back={back} /> : null}
    </PageLayout>
  );
}

// Mirror of the server's checks, one message per box. A blank box among
// filled ones is flagged rather than silently dropped, so nothing the
// Coordinator meant to ask goes missing.
export function checkQuestions(texts: string[]): (string | undefined)[] {
  const trimmed = texts.map(text => text.trim());
  if (trimmed.every(text => !text)) return trimmed.map((_, index) => (index === 0 ? messages.noQuestion : undefined));
  return trimmed.map(text => {
    if (!text) return messages.blankQuestion;
    if (text.length > MAX_CLARIFICATION_TEXT) return messages.questionTooLong;
    return undefined;
  });
}

type Question = { key: number; text: string };

function QuestionsForm({ event, back }: { event: AssignedEventDetail; back: string }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([{ key: 1, text: '' }]);
  const [errors, setErrors] = useState<(string | undefined)[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // The box just added gets focus, so keyboard users land in it.
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const nextKey = useRef(2);
  // Don't update state if the user navigated away while sending. Set on
  // every mount: in development StrictMode mounts, unmounts and remounts once,
  // and a ref left false would drop every reply.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function clearMessages() {
    setErrors([]);
    setServerError(null);
  }

  function update(key: number, text: string) {
    setQuestions(current => current.map(question => (question.key === key ? { ...question, text } : question)));
    clearMessages();
  }

  function add() {
    const key = nextKey.current++;
    setQuestions(current => [...current, { key, text: '' }]);
    setFocusKey(key);
    clearMessages();
  }

  function remove(key: number) {
    setQuestions(current => current.filter(question => question.key !== key));
    clearMessages();
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const found = checkQuestions(questions.map(question => question.text));
    setErrors(found);
    if (found.some(Boolean)) {
      setServerError(found.includes(messages.noQuestion) ? messages.noQuestion : 'Fix the highlighted questions, then send again.');
      return;
    }
    setSending(true);
    const result = await requestClarification(event.id, questions.map(question => question.text.trim()));
    if (!mounted.current) return;
    setSending(false);
    if (!result.ok) { setServerError(result.message); return; }
    navigate(back, { state: { clarificationSent: true } });
  }

  return (
    <Card title="Your questions">
      <p>
        Ask {event.organiser_name} what you need to know about {event.title}. Sending moves the request to
        Awaiting clarification, and the review pauses until they answer.
      </p>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title={questions.length === 1 ? 'Question' : 'Questions'}>
          {questions.map((question, index) => (
            <div key={question.key} className="field-wide">
              <FormField
                label={`Question ${index + 1}`}
                hint={`Up to ${MAX_CLARIFICATION_TEXT} characters.`}
                error={errors[index]}
              >
                {props => (
                  <textarea
                    {...props}
                    rows={3}
                    value={question.text}
                    autoFocus={question.key === focusKey}
                    onChange={change => update(question.key, change.target.value)}
                  />
                )}
              </FormField>
              {questions.length > 1 ? (
                <Button onClick={() => remove(question.key)} disabled={sending}>Remove question {index + 1}</Button>
              ) : null}
            </div>
          ))}
        </FormSection>
        {questions.length < MAX_QUESTIONS ? (
          <p><Button onClick={add} disabled={sending} icon={<Plus size={14} aria-hidden="true" />}>Add another question</Button></p>
        ) : (
          <p>You can send up to {MAX_QUESTIONS} questions at a time.</p>
        )}
        <FormActions>
          <ButtonLink to={back}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" busy={sending} busyLabel="Sending…" icon={<Send size={14} aria-hidden="true" />}>
            Send questions
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

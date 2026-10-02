// E03-S02 (SCRUM-33) Scenario 3: the questions still waiting for the
// Organiser, each with who asked and the date it was raised. Shown on the
// Organiser's request page and the Coordinator's event page. A FactList with
// a <small> second line, like the Summary card's "Since …" facts.
import type { ReactNode } from 'react';
import { Card, FactList, formatDate } from '../../shared';
import type { OutstandingQuestion } from './clarificationApi';

export function OutstandingQuestions({ questions, actions }: { questions: OutstandingQuestion[]; actions?: ReactNode }) {
  if (questions.length === 0) return null;
  return (
    <Card title="Outstanding questions" actions={actions}>
      <FactList
        items={questions.map((question, index) => [
          `Question ${index + 1}`,
          <>{question.body}<small>Asked by {question.author_name} on {formatDate(question.created_at)}</small></>,
        ])}
      />
    </Card>
  );
}

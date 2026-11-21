export const QUESTION_MIN_LENGTH = 10;
export const QUESTION_MAX_LENGTH = 500;
export const ASKER_NAME_MAX_LENGTH = 100;

export type QuestionValidationResult =
  | {
      valid: true;
      question: string;
      askerName: string | null;
    }
  | {
      valid: false;
      error: string;
    };

export function validateQuestionSubmission(input: {
  askerName: string;
  questionText: string;
  humanVerified: boolean;
}): QuestionValidationResult {
  const trimmedName = input.askerName.trim();
  const trimmedQuestion = input.questionText.trim();

  if (trimmedName.length > ASKER_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Customer name cannot exceed ${ASKER_NAME_MAX_LENGTH} characters.`,
    };
  }

  if (trimmedQuestion.length < QUESTION_MIN_LENGTH) {
    return {
      valid: false,
      error: `Your question must be at least ${QUESTION_MIN_LENGTH} characters long.`,
    };
  }

  if (trimmedQuestion.length > QUESTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Your question cannot exceed ${QUESTION_MAX_LENGTH} characters.`,
    };
  }

  if (!input.humanVerified) {
    return {
      valid: false,
      error: 'Please complete the human verification challenge before submitting.',
    };
  }

  return {
    valid: true,
    question: trimmedQuestion,
    askerName: trimmedName.length > 0 ? trimmedName : null,
  };
}

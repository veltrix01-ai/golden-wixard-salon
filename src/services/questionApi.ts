export interface SubmitQuestionPayload {
  question: string;
  asker_name: string | null;
  human_verified: boolean;
  /** Cloudflare Turnstile one-time token — verified server-side before saving. */
  turnstileToken: string;
  website: string;
}

export interface SubmitQuestionResult {
  ok: boolean;
  status: number;
  message?: string;
  id?: string;
  error?: string;
  errorType?: string;
}

export async function submitCustomerQuestion(
  payload: SubmitQuestionPayload
): Promise<SubmitQuestionResult> {
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: {
    error?: string;
    errorType?: string;
    message?: string;
    id?: string;
  } = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorType: data.errorType,
      error:
        data.error ||
        (res.status >= 500
          ? 'Unable to save your question right now. Please try again in a moment.'
          : 'Failed to submit question. Please check your details and try again.'),
    };
  }

  return {
    ok: true,
    status: res.status,
    id: data.id,
    message:
      data.message ||
      'Thank you! Your question has been submitted. The salon owner will review and answer it soon.',
  };
}

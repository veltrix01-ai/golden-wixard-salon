import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DatabaseStorageError,
  isSupabaseQuestionsTableReady,
  isUuid,
  markSupabaseTableMissing,
  parseContentRangeTotal,
  supabaseQuestionsFetch,
} from './supabaseService';

export interface QuestionRecord {
  id: string;
  question: string;
  asker_name?: string | null;
  answer?: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string | null;
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.data-questions.json');

function loadStoredQuestions(): QuestionRecord[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading questions file', err);
  }
  return [];
}

const questionsStore: QuestionRecord[] = loadStoredQuestions();

function saveQuestionsStore(): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(questionsStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist questions to disk', err);
  }
}

async function tryWithSupabase<T>(fn: () => Promise<T>): Promise<{ handled: true; data: T } | { handled: false }> {
  if (!(await isSupabaseQuestionsTableReady())) {
    return { handled: false };
  }
  try {
    const data = await fn();
    return { handled: true, data };
  } catch (err) {
    if (err instanceof DatabaseStorageError && err.reasonCode === 'table_missing') {
      markSupabaseTableMissing();
      return { handled: false };
    }
    throw err;
  }
}

export async function listPublicQuestions(params: {
  searchQuery: string;
  page: number;
  limit: number;
}) {
  const { searchQuery, page, limit } = params;
  const offset = (page - 1) * limit;

  const supa = await tryWithSupabase(async () => {
    const queryParts = [
      'select=id,question,asker_name,answer,answered_at',
      'status=eq.answered',
      'order=answered_at.desc.nullslast',
      `limit=${limit}`,
      `offset=${offset}`,
    ];

    if (searchQuery) {
      const safeTerm = searchQuery.replace(/[,()*%\\]/g, ' ').trim();
      if (safeTerm) {
        const pattern = `*${safeTerm}*`;
        const encoded = encodeURIComponent(pattern);
        queryParts.push(
          `or=(question.ilike.${encoded},answer.ilike.${encoded},asker_name.ilike.${encoded})`
        );
      }
    }

    const res = await supabaseQuestionsFetch(`?${queryParts.join('&')}`, {
      method: 'GET',
      keyMode: 'public',
      prefer: 'count=exact',
    });

    const rows = (await res.json()) as Array<{
      id: string;
      question: string;
      asker_name?: string | null;
      answer?: string | null;
      answered_at?: string | null;
    }>;
    const total = parseContentRangeTotal(res.headers.get('content-range'), rows.length);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      questions: rows.map((q) => ({
        id: q.id,
        question: q.question,
        asker_name: q.asker_name || null,
        answer: q.answer || null,
        answered_at: q.answered_at || null,
      })),
      total,
      page,
      totalPages,
      limit,
    };
  });

  if (supa.handled) {
    return supa.data;
  }

  let answeredList = questionsStore.filter((q) => q.status === 'answered');
  if (searchQuery) {
    const lowered = searchQuery.toLowerCase();
    answeredList = answeredList.filter(
      (q) =>
        q.question.toLowerCase().includes(lowered) ||
        (q.answer && q.answer.toLowerCase().includes(lowered)) ||
        (q.asker_name && q.asker_name.toLowerCase().includes(lowered))
    );
  }
  answeredList.sort((a, b) => {
    const timeA = a.answered_at ? new Date(a.answered_at).getTime() : 0;
    const timeB = b.answered_at ? new Date(b.answered_at).getTime() : 0;
    return timeB - timeA;
  });

  const total = answeredList.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = answeredList.slice(offset, offset + limit);

  return {
    questions: paginated.map((q) => ({
      id: q.id,
      question: q.question,
      asker_name: q.asker_name || null,
      answer: q.answer || null,
      answered_at: q.answered_at || null,
    })),
    total,
    page,
    totalPages,
    limit,
  };
}

export async function createPendingQuestion(input: {
  question: string;
  asker_name: string | null;
}): Promise<QuestionRecord> {
  const newQuestion: QuestionRecord = {
    id: crypto.randomUUID(),
    question: input.question,
    asker_name: input.asker_name,
    answer: null,
    status: 'pending',
    created_at: new Date().toISOString(),
    answered_at: null,
  };

  const supa = await tryWithSupabase(async () => {
    // Use return=minimal so both SUPABASE_SERVICE_ROLE_KEY and RLS-restricted SUPABASE_ANON_KEY inserts succeed
    await supabaseQuestionsFetch('', {
      method: 'POST',
      keyMode: 'public',
      prefer: 'return=minimal',
      body: {
        id: newQuestion.id,
        question: newQuestion.question,
        asker_name: newQuestion.asker_name,
        answer: null,
        status: 'pending',
        created_at: newQuestion.created_at,
        answered_at: null,
      },
    });
    return newQuestion;
  });

  if (supa.handled) {
    return supa.data;
  }

  questionsStore.unshift(newQuestion);
  saveQuestionsStore();
  return newQuestion;
}

export async function listAllAdminQuestions(statusFilter?: string): Promise<QuestionRecord[]> {
  const supa = await tryWithSupabase(async () => {
    const queryParts = ['select=*', 'order=created_at.desc'];
    if (statusFilter === 'pending' || statusFilter === 'answered') {
      queryParts.push(`status=eq.${statusFilter}`);
    }
    const res = await supabaseQuestionsFetch(`?${queryParts.join('&')}`, {
      method: 'GET',
      keyMode: 'service',
    });
    return (await res.json()) as QuestionRecord[];
  });

  if (supa.handled) {
    return supa.data;
  }

  let list = [...questionsStore];
  if (statusFilter === 'pending' || statusFilter === 'answered') {
    list = list.filter((q) => q.status === statusFilter);
  }
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list;
}

export async function publishAdminQuestionAnswer(
  id: string,
  answer: string
): Promise<QuestionRecord | null> {
  const answeredAt = new Date().toISOString();

  const supa = await tryWithSupabase(async () => {
    if (!isUuid(id)) return null;
    const res = await supabaseQuestionsFetch(`?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      keyMode: 'service',
      prefer: 'return=representation',
      body: {
        answer,
        status: 'answered',
        answered_at: answeredAt,
      },
    });
    const rows = (await res.json()) as QuestionRecord[];
    return rows[0] || null;
  });

  if (supa.handled) {
    return supa.data;
  }

  const question = questionsStore.find((q) => q.id === id);
  if (!question) return null;
  question.answer = answer;
  question.status = 'answered';
  question.answered_at = answeredAt;
  saveQuestionsStore();
  return question;
}

export async function updateAdminQuestion(
  id: string,
  updates: { unpublish?: boolean; answer?: string }
): Promise<QuestionRecord | null> {
  const supa = await tryWithSupabase(async () => {
    if (!isUuid(id)) return null;
    const payload = updates.unpublish
      ? { status: 'pending', answered_at: null }
      : { answer: updates.answer };
    const res = await supabaseQuestionsFetch(`?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      keyMode: 'service',
      prefer: 'return=representation',
      body: payload,
    });
    const rows = (await res.json()) as QuestionRecord[];
    return rows[0] || null;
  });

  if (supa.handled) {
    return supa.data;
  }

  const question = questionsStore.find((q) => q.id === id);
  if (!question) return null;
  if (updates.unpublish) {
    question.status = 'pending';
    question.answered_at = null;
  } else if (updates.answer !== undefined) {
    question.answer = updates.answer;
  }
  saveQuestionsStore();
  return question;
}

export async function deleteAdminQuestion(id: string): Promise<boolean> {
  const supa = await tryWithSupabase(async () => {
    if (!isUuid(id)) return false;
    const res = await supabaseQuestionsFetch(`?id=eq.${encodeURIComponent(id)}&select=id`, {
      method: 'DELETE',
      keyMode: 'service',
      prefer: 'return=representation',
    });
    const rows = (await res.json()) as Array<{ id: string }>;
    return rows.length > 0;
  });

  if (supa.handled) {
    return supa.data;
  }

  const index = questionsStore.findIndex((q) => q.id === id);
  if (index === -1) return false;
  questionsStore.splice(index, 1);
  saveQuestionsStore();
  return true;
}

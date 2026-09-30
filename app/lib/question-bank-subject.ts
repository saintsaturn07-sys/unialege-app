const QUESTION_BANK_SUBJECTS: Record<string, string> = {
  english: "English Studies",
  "english language": "English Studies",
  "english studies": "English Studies",
};

export function normalizeQuestionBankSubject(subject: string) {
  const normalized = subject.trim().replace(/\s+/g, " ").toLowerCase();
  return QUESTION_BANK_SUBJECTS[normalized] ?? subject.trim();
}

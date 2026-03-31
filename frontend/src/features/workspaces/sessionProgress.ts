export interface SessionProgressInput {
  cardCount: number;
  knownCardCount: number;
  questionCount: number;
  correctQuestionCount: number;
  elapsedSeconds: number;
  plannedDurationMinutes: number | null;
}

export interface SessionProgressSummary {
  cardsDone: number;
  cardsPct: number | null;
  quizCorrectN: number;
  quizPct: number | null;
  quizScorePct: number | null;
  timePct: number | null;
  contentTotal: number;
  allCardsKnown: boolean;
  allQuizCorrect: boolean;
  isScore100: boolean;
  correctItems: number;
  motivScorePct: number;
}

export function getSessionProgressSummary({
  cardCount,
  knownCardCount,
  questionCount,
  correctQuestionCount,
  elapsedSeconds,
  plannedDurationMinutes,
}: SessionProgressInput): SessionProgressSummary {
  const cardsDone = knownCardCount;
  const cardsPct = cardCount > 0 ? cardsDone / cardCount : null;
  const quizCorrectN = correctQuestionCount;
  const quizPct = questionCount > 0 ? quizCorrectN / questionCount : null;
  const quizScorePct = quizPct;
  const timePlannedSeconds = (plannedDurationMinutes ?? 0) * 60;
  const timePct = timePlannedSeconds > 0 ? Math.min(elapsedSeconds / timePlannedSeconds, 1) : null;
  const contentTotal = cardCount + questionCount;
  const allCardsKnown = cardCount === 0 || cardsDone === cardCount;
  const allQuizCorrect = questionCount === 0 || quizCorrectN === questionCount;
  const isScore100 = contentTotal === 0 || (allCardsKnown && allQuizCorrect);
  const correctItems = cardsDone + quizCorrectN;
  const motivScorePct = contentTotal > 0 ? Math.round(correctItems / contentTotal * 100) : 100;

  return {
    cardsDone,
    cardsPct,
    quizCorrectN,
    quizPct,
    quizScorePct,
    timePct,
    contentTotal,
    allCardsKnown,
    allQuizCorrect,
    isScore100,
    correctItems,
    motivScorePct,
  };
}

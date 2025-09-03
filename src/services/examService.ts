import { Test, TestSubmission, Question, COPOMapping, LeaderboardEntry, AntiCheatEvent } from '@/types/exam';
import { toast } from 'sonner';

// Local storage keys
const TESTS_KEY = 'dsba_tests';
const SUBMISSIONS_KEY = 'dsba_submissions';
const COPO_KEY = 'dsba_copo';
const ANTICHEAT_KEY = 'dsba_anticheat';

// Mock data for initial state
const mockTests: Test[] = [
  {
    id: 'test-1',
    title: 'Data Structures - First IA',
    description: 'Internal Assessment covering Arrays, Linked Lists, and Stacks',
    subject: 'Computer Science',
    duration: 120,
    totalMarks: 40,
    isActive: true,
    createdBy: 'T001',
    createdAt: new Date('2024-01-15'),
    instructions: [
      'Read all questions carefully before starting',
      'Manage your time effectively',
      'Do not refresh the page during exam',
      'Anti-cheat measures are active'
    ],
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        text: 'Which data structure follows LIFO principle?',
        options: ['Queue', 'Stack', 'Array', 'Linked List'],
        correctAnswer: 'Stack',
        marks: 5,
        co: 'CO1',
        po: 'PO1'
      },
      {
        id: 'q2',
        type: 'checkbox',
        text: 'Select all linear data structures:',
        options: ['Array', 'Tree', 'Stack', 'Graph', 'Queue'],
        correctAnswer: ['Array', 'Stack', 'Queue'],
        marks: 10,
        co: 'CO2',
        po: 'PO2'
      },
      {
        id: 'q3',
        type: 'descriptive',
        text: 'Explain the advantages of linked lists over arrays.',
        keywords: ['dynamic', 'memory', 'insertion', 'deletion', 'flexible'],
        marks: 15,
        co: 'CO3',
        po: 'PO3'
      }
    ]
  }
];

const mockCOPO: COPOMapping = {
  courseOutcomes: [
    'CO1: Understand basic data structures',
    'CO2: Implement linear data structures',
    'CO3: Analyze algorithm complexity',
    'CO4: Design efficient algorithms',
    'CO5: Apply data structures to solve problems'
  ],
  programOutcomes: [
    'PO1: Engineering knowledge',
    'PO2: Problem analysis',
    'PO3: Design/development of solutions',
    'PO4: Conduct investigations',
    'PO5: Modern tool usage'
  ]
};

// Initialize data if not exists
const initializeData = () => {
  if (!localStorage.getItem(TESTS_KEY)) {
    localStorage.setItem(TESTS_KEY, JSON.stringify(mockTests));
  }
  if (!localStorage.getItem(SUBMISSIONS_KEY)) {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(COPO_KEY)) {
    localStorage.setItem(COPO_KEY, JSON.stringify(mockCOPO));
  }
  if (!localStorage.getItem(ANTICHEAT_KEY)) {
    localStorage.setItem(ANTICHEAT_KEY, JSON.stringify([]));
  }
};

// Test Management
export const getTests = (): Test[] => {
  initializeData();
  return JSON.parse(localStorage.getItem(TESTS_KEY) || '[]');
};

export const getActiveTests = (): Test[] => {
  return getTests().filter(test => test.isActive);
};

export const getTestById = (id: string): Test | null => {
  const tests = getTests();
  return tests.find(test => test.id === id) || null;
};

export const createTest = (test: Omit<Test, 'id' | 'createdAt'>): Test => {
  const newTest: Test = {
    ...test,
    id: `test-${Date.now()}`,
    createdAt: new Date()
  };
  
  const tests = getTests();
  tests.push(newTest);
  localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
  
  toast.success('Test created successfully');
  return newTest;
};

export const updateTest = (id: string, updates: Partial<Test>): boolean => {
  const tests = getTests();
  const testIndex = tests.findIndex(test => test.id === id);
  
  if (testIndex === -1) return false;
  
  tests[testIndex] = { ...tests[testIndex], ...updates };
  localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
  
  toast.success('Test updated successfully');
  return true;
};

export const toggleTestStatus = (id: string): boolean => {
  const tests = getTests();
  const test = tests.find(t => t.id === id);
  
  if (!test) return false;
  
  test.isActive = !test.isActive;
  localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
  
  toast.success(`Test ${test.isActive ? 'activated' : 'deactivated'}`);
  return true;
};

// Submission Management
export const getSubmissions = (): TestSubmission[] => {
  initializeData();
  return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
};

export const getSubmissionsByTest = (testId: string): TestSubmission[] => {
  return getSubmissions().filter(sub => sub.testId === testId);
};

export const getSubmissionsByStudent = (studentId: string): TestSubmission[] => {
  return getSubmissions().filter(sub => sub.studentId === studentId);
};

// Auto-evaluation system
export const evaluateAnswers = (test: Test, answers: Record<string, string | string[]>): {
  score: number;
  evaluatedAnswers: TestSubmission['evaluatedAnswers'];
} => {
  let totalScore = 0;
  const evaluatedAnswers: TestSubmission['evaluatedAnswers'] = {};

  test.questions.forEach(question => {
    const userAnswer = answers[question.id];
    let isCorrect = false;
    let marksAwarded = 0;
    let feedback = '';

    switch (question.type) {
      case 'mcq':
        isCorrect = userAnswer === question.correctAnswer;
        marksAwarded = isCorrect ? question.marks : 0;
        break;

      case 'checkbox':
        if (Array.isArray(userAnswer) && Array.isArray(question.correctAnswer)) {
          const correctAnswers = new Set(question.correctAnswer);
          const userAnswers = new Set(userAnswer);
          
          // Calculate partial credit
          const correctSelected = [...userAnswers].filter(ans => correctAnswers.has(ans)).length;
          const totalCorrect = correctAnswers.size;
          const incorrectSelected = userAnswers.size - correctSelected;
          
          // Partial scoring: (correct selections / total correct) * marks - penalty for wrong selections
          const partialScore = (correctSelected / totalCorrect) * question.marks;
          const penalty = Math.min(partialScore * 0.5, incorrectSelected * (question.marks / totalCorrect));
          
          marksAwarded = Math.max(0, partialScore - penalty);
          isCorrect = correctSelected === totalCorrect && incorrectSelected === 0;
        }
        break;

      case 'descriptive':
        if (typeof userAnswer === 'string' && question.keywords) {
          const answerLower = userAnswer.toLowerCase();
          const matchedKeywords = question.keywords.filter(keyword => 
            answerLower.includes(keyword.toLowerCase())
          );
          
          // Award marks based on keyword matching
          const keywordScore = (matchedKeywords.length / question.keywords.length) * question.marks;
          marksAwarded = Math.round(keywordScore);
          isCorrect = matchedKeywords.length >= question.keywords.length * 0.6; // 60% threshold
          
          feedback = `Keywords found: ${matchedKeywords.join(', ')}`;
        }
        break;
    }

    evaluatedAnswers[question.id] = {
      isCorrect,
      marksAwarded,
      feedback
    };

    totalScore += marksAwarded;
  });

  return { score: Math.round(totalScore), evaluatedAnswers };
};

export const submitTest = (
  testId: string,
  studentId: string,
  studentName: string,
  answers: Record<string, string | string[]>,
  timeSpent: number,
  antiCheatEvents: AntiCheatEvent[] = []
): TestSubmission => {
  const test = getTestById(testId);
  if (!test) throw new Error('Test not found');

  const { score, evaluatedAnswers } = evaluateAnswers(test, answers);

  const submission: TestSubmission = {
    id: `sub-${Date.now()}`,
    testId,
    studentId,
    studentName,
    answers,
    score,
    totalMarks: test.totalMarks,
    timeSpent,
    submittedAt: new Date(),
    evaluatedAnswers,
    antiCheatEvents
  };

  const submissions = getSubmissions();
  submissions.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

  toast.success('Test submitted successfully');
  return submission;
};

// Leaderboard
export const getLeaderboard = (testId: string): LeaderboardEntry[] => {
  const submissions = getSubmissionsByTest(testId);
  
  const leaderboard = submissions
    .map((sub, index) => ({
      studentId: sub.studentId,
      studentName: sub.studentName,
      score: sub.score,
      totalMarks: sub.totalMarks,
      percentage: Math.round((sub.score / sub.totalMarks) * 100),
      rank: index + 1,
      timeSpent: sub.timeSpent,
      submittedAt: sub.submittedAt
    }))
    .sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent);

  // Assign proper ranks
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return leaderboard;
};

// CO/PO Management
export const getCOPOMapping = (): COPOMapping => {
  initializeData();
  return JSON.parse(localStorage.getItem(COPO_KEY) || '{}');
};

export const updateCOPOMapping = (copo: COPOMapping): void => {
  localStorage.setItem(COPO_KEY, JSON.stringify(copo));
  toast.success('CO/PO mapping updated successfully');
};

// Anti-cheat system
export const logAntiCheatEvent = (event: Omit<AntiCheatEvent, 'id'>): void => {
  const events = JSON.parse(localStorage.getItem(ANTICHEAT_KEY) || '[]');
  const newEvent: AntiCheatEvent = {
    ...event,
    id: `ac-${Date.now()}`
  };
  
  events.push(newEvent);
  localStorage.setItem(ANTICHEAT_KEY, JSON.stringify(events));
};
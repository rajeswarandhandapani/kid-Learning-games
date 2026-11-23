export interface QuizQuestion {
  prompt: string;
  promptSub?: string;
  correctAnswer: string | number;
  choices: Array<string | number>;
  dedupeKey?: string | number;
  visual?: Node | (() => Node | null) | null;
  hintVisual?: Node | (() => Node | null) | null;
  solution?: Node | (() => Node | null) | null;
  choiceVisuals?: Record<string, Node | (() => Node | null)>;
  choiceLabels?: Record<string, string>;
  noChoiceListen?: boolean;
  promptTappable?: boolean;
  speech?: boolean;
  speechPrompt?: string;
  speechRate?: number;
  explanation?: string;
  reviewPrompt?: string;
  reviewId?: string;
  smallQuestion?: boolean;
}

export interface QuizModeLink {
  label: string;
  query: string;
  active: boolean;
}

export interface QuizModeGroup {
  id: string;
  links: QuizModeLink[];
}

export interface QuizGameConfig {
  totalQuestions: number;
  timePerQuestion: number;
  subtitle?: string;
  modeLabel?: string;
  infoText: string;
  instructions: string;
  spokenInstructions?: string;
  speechWarning?: string;
  finishTitle: string;
  mascot?: string;
  bigChoices?: boolean;
  bestTimeKey?: string;
  modeGroups?: QuizModeGroup[];
  generateQuestion: (askedSet: Set<string | number>) => QuizQuestion;
  formatAnswer?: (value: string | number) => string;
}

export interface QuizGameDefinition {
  id: string;
  buildConfig: (params: URLSearchParams) => QuizGameConfig;
}

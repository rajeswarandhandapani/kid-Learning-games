import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { KlgCatalogueService, type KlgGame } from '../core/klg-catalogue.service';
import { KlgProgressService, type KlgRecordOutcome, type KlgReviewItem } from '../core/klg-progress.service';
import { KlgSoundsService } from '../core/klg-sounds.service';
import { KlgDomHostDirective } from './dom-host.directive';
import { GameLevelRowComponent, GameTopBarComponent } from './game-shell.component';
import type { QuizGameDefinition, QuizQuestion } from './quiz-types';

declare function confetti(options: Record<string, unknown>): void;

type QuizPhase = 'start' | 'play' | 'results';

interface WrongAnswerEntry {
  prompt: string;
  correctAnswer: string;
  givenAnswer: string;
}

interface ReviewState {
  queue: KlgReviewItem[];
  next: number;
  right: number;
  cleared: number;
}

const REVIEW_LIMIT = 10;

function stripReviewParam(rawQuery: string): string {
  return String(rawQuery || '')
    .replace(/^\?/, '')
    .split('&')
    .filter((part) => part && !/^review=/.test(part))
    .join('&');
}

function nodeToHtml(value: Node | (() => Node | null) | null | undefined): string {
  const node = typeof value === 'function' ? value() : value;
  if (!node) return '';
  if (node instanceof Element) return node.outerHTML;
  const box = document.createElement('div');
  box.appendChild(node.cloneNode(true));
  return box.innerHTML;
}

function htmlToNode(html: string): Node | null {
  if (!html) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.childElementCount === 1 ? tpl.content.firstElementChild : tpl.content;
}

function snapshotToQuestion(snapshot: Record<string, unknown>, reviewId: string): QuizQuestion {
  const { pictures, ...rest } = snapshot as Record<string, unknown> & {
    pictures?: {
      visual?: string;
      hintVisual?: string;
      solution?: string;
      choiceVisuals?: Record<string, string>;
    };
  };
  const q = { ...(rest as unknown as QuizQuestion), reviewId };
  if (pictures?.visual) q.visual = () => htmlToNode(pictures.visual!);
  if (pictures?.hintVisual) q.hintVisual = () => htmlToNode(pictures.hintVisual!);
  if (pictures?.solution) q.solution = () => htmlToNode(pictures.solution!);
  if (pictures?.choiceVisuals) {
    const map: Record<string, () => Node | null> = {};
    for (const [k, v] of Object.entries(pictures.choiceVisuals)) {
      map[k] = () => htmlToNode(v);
    }
    q.choiceVisuals = map;
  }
  return q;
}

/**
 * Reusable standalone Angular multiple-choice quiz engine preserving full feature, visual,
 * timer, Review My Mistakes, XP/badge, and accessibility parity with assets/js/quiz-engine.js.
 */
@Component({
  selector: 'klg-quiz-engine',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameTopBarComponent, GameLevelRowComponent, KlgDomHostDirective],
  template: `
    <klg-game-bar [game]="game()" (goHome)="goWorld.emit($event)" />

    <div class="container quiz-shell pb-5">
      <!-- Start screen -->
      <div id="start-screen" class="card quiz-card p-4 text-center" [class.d-none]="phase() !== 'start'">
        <div class="card-body">
          <div class="game-card-icon mb-2">{{ game().icon }}</div>
          <h1 class="h3 fw-bold">{{ game().name }}</h1>
          @if (config().subtitle) {
            <p class="text-muted">{{ config().subtitle }}</p>
          }

          @if (config().modeLabel) {
            <p class="text-muted" id="mode-label">{{ config().modeLabel }}</p>
          }

          @if (config().speechWarning && !sounds.canSpeak()) {
            <p id="speech-note" class="text-danger fw-bold mb-1"><small>{{ config().speechWarning }}</small></p>
          }

          @if (reviewIntroCount() > 0) {
            <p id="klg-review-intro" class="klg-review-intro">
              🔁 Review time! {{ reviewIntroCount() }}
              {{ reviewIntroCount() === 1 ? 'tricky question' : 'tricky questions' }} to try again. No timer, no rush.
            </p>
          } @else {
            <klg-level-row
              [game]="game()"
              [query]="query()"
              (selectQuery)="onNavigateQuery($event)"
            />
          }

          <button
            #startBtn
            id="start-btn"
            type="button"
            class="btn btn-lg text-white fw-bold px-5 mt-2 kid-play"
            style="background: var(--klg-purple);"
            (click)="startRound()"
          >{{ reviewIntroCount() > 0 ? '▶ Start review' : '▶ Play' }}</button>

          @if (sounds.canSpeak()) {
            <button
              type="button"
              class="quiz-listen quiz-intro-listen"
              (click)="speakInstructions()"
            >🔊 Hear how to play</button>
          }

          @if (reviewIntroCount() === 0) {
            <details class="kid-more" [open]="moreOpen()">
              <summary>⚙️ More ways to play</summary>

              @for (group of config().modeGroups || []; track group.id) {
                <div [id]="group.id" class="d-flex flex-wrap justify-content-center gap-2 mb-3">
                  @for (link of group.links; track link.query) {
                    <a
                      class="btn btn-sm"
                      [class.btn-secondary]="link.active"
                      [class.btn-outline-secondary]="!link.active"
                      [href]="hrefForQuery(link.query)"
                      (click)="onClickModeLink($event, link.query)"
                    >{{ link.label }}</a>
                  }
                </div>
              }

              <div class="kid-mode-row" role="group" aria-label="How would you like to play?">
                <button
                  type="button"
                  class="kid-mode-btn"
                  data-play-mode="practice"
                  [attr.aria-pressed]="playMode() === 'practice'"
                  (click)="setPlayMode('practice')"
                >🐢 Take your time</button>
                <button
                  type="button"
                  class="kid-mode-btn"
                  data-play-mode="challenge"
                  [attr.aria-pressed]="playMode() === 'challenge'"
                  (click)="setPlayMode('challenge')"
                >⏱️ Beat the clock</button>
              </div>

              <div class="quiz-settings kid-select-hidden">
                <label>
                  How would you like to play?
                  <select
                    id="play-mode"
                    [value]="playMode()"
                    (change)="setPlayMode($any($event.target).value === 'challenge' ? 'challenge' : 'practice')"
                  >
                    <option value="practice">Practice · no timer</option>
                    <option value="challenge">Challenge · timed</option>
                  </select>
                </label>
              </div>

              <p id="quiz-info">{{ displayedInfoText() }}</p>
              <p class="text-muted mb-1"><small>{{ config().instructions }}</small></p>

              @if (bestTimeText()) {
                <p id="best-time-note" class="fw-bold" style="color: var(--klg-purple);" [hidden]="playMode() === 'practice'">
                  {{ bestTimeText() }}
                </p>
              }
            </details>
          }
        </div>
      </div>

      <!-- Quiz screen -->
      <div id="quiz-screen" class="card quiz-card p-4" [class.d-none]="phase() !== 'play'">
        <div class="card-body">
          <div class="quiz-tools">
            <button type="button" id="quiz-exit" (click)="exitToStart()">⬅ Back</button>
            <span class="quiz-progress-text">
              <span class="visually-hidden">Question </span>
              <span id="question-number">{{ questionNumber() }}</span> /
              <span id="total-questions">{{ totalQuestions() }}</span>
            </span>
            <span id="quiz-mascot" class="klg-mascot" [class]="mascotMood()" aria-hidden="true">{{ mascot() }}</span>
            <span id="score-pill" class="quiz-score-pill">Score: {{ score() }}</span>
          </div>

          <div class="klg-progress-track mb-2">
            <div id="progress-fill" class="klg-progress-fill" [style.width.%]="progressPct()"></div>
          </div>

          <div class="quiz-timer-bar mb-1" [hidden]="isPractice()">
            <div
              id="timer-fill"
              class="quiz-timer-bar-fill"
              [class.warn]="timeRemaining() <= 3"
              [style.width.%]="timerPct()"
            ></div>
          </div>
          <div class="text-end mb-4 kid-timer-text">
            <small id="timer-text" class="text-muted">{{ isPractice() ? 'Practice · no timer' : timeRemaining() + 's' }}</small>
          </div>

          <div id="streak-badge" class="klg-streak-badge" [class.show]="streak() >= 3">
            @if (streak() >= 3) {
              🔥 {{ streak() }} in a row!
            }
          </div>

          @if (currentQuestion()?.promptSub) {
            <p class="text-center text-muted fw-bold mb-1">{{ currentQuestion()!.promptSub }}</p>
          }

          <div class="kid-prompt">
            @if (activeVisual()) {
              <div #visualBox class="quiz-visual" [klgDomNode]="activeVisual()"></div>
            }
            <p
              #questionTextEl
              id="question-text"
              [class]="'quiz-question mb-4 ' + questionExtraClass()"
              [class.quiz-question-sm]="!!currentQuestion()?.smallQuestion"
              [class.klg-tappable]="!!currentQuestion()?.promptTappable"
              [attr.tabindex]="currentQuestion()?.promptTappable ? 0 : -1"
              [attr.role]="currentQuestion()?.promptTappable ? 'button' : null"
              [attr.aria-label]="currentQuestion()?.promptTappable ? 'Listen again: ' + currentQuestion()!.prompt : null"
              (click)="onPromptTap()"
              (keydown)="onPromptKeydown($event)"
            >{{ currentQuestion()?.prompt || '' }}</p>

            <button
              type="button"
              class="quiz-listen"
              [hidden]="!questionSpeech()"
              aria-label="Listen to the question again"
              (click)="speakCurrentQuestion()"
            >🔊</button>
          </div>

          @if (currentQuestion()?.hintVisual) {
            <div class="quiz-hint">
              @if (!hintShown()) {
                <button type="button" class="quiz-hint-btn" (click)="hintShown.set(true)">💡 Show me</button>
              } @else {
                <div [klgDomNode]="currentQuestion()!.hintVisual"></div>
              }
            </div>
          }

          <div
            #choicesContainer
            id="choices-container"
            class="row justify-content-center g-2"
            [class.quiz-choices-big]="config().bigChoices !== false"
          >
            @for (choice of renderedChoices(); track choice.key) {
              <div class="quiz-choice-tile col-5 m-2" [class.has-listen]="choice.showListen">
                <button
                  type="button"
                  class="btn quiz-choice-btn"
                  [class.has-visual]="!!choice.visual"
                  [class.correct]="locked() && choice.isCorrect"
                  [class.incorrect]="locked() && isChoiceSelectedWrong(choice.formatted)"
                  [disabled]="locked()"
                  [attr.aria-label]="choice.label"
                  [attr.data-answer]="choice.formatted"
                  (click)="handleAnswer(choice.raw, $any($event.currentTarget))"
                >
                  @if (choice.visual) {
                    <span [klgDomNode]="choice.visual"></span>
                  } @else {
                    {{ choice.display }}
                  }
                </button>
                @if (choice.showListen) {
                  <button
                    type="button"
                    class="quiz-choice-listen"
                    [attr.aria-label]="'Hear answer: ' + choice.label"
                    (click)="sounds.speak(choice.label)"
                  >🔊</button>
                }
              </div>
            }
          </div>

          <p #feedbackEl class="quiz-feedback" id="quiz-feedback" role="status">{{ feedbackText() }}</p>
          <button
            #nextBtn
            type="button"
            class="quiz-next"
            [hidden]="!locked() || !isPractice()"
            (click)="onNextClick()"
          >{{ nextButtonLabel() }}</button>
        </div>
      </div>

      <!-- Results screen -->
      <div #resultsScreen id="results-screen" class="card results-card p-4" [class.d-none]="phase() !== 'results'" tabindex="-1">
        <div class="card-body">
          <div id="results-emoji" class="results-emoji mb-2">{{ resultsMeta().emoji }}</div>
          <h2 class="fw-bold">{{ reviewActive() ? 'Review complete!' : config().finishTitle }}</h2>
          <div id="results-score" class="results-score my-3">{{ score() }} / {{ totalQuestions() }}</div>
          <div id="results-stars" class="results-stars mb-3">
            @if (!reviewActive()) {
              @for (s of starSlots(); track $index) {
                <span class="star" [class.earned]="s">{{ s ? '⭐' : '☆' }}</span>
              }
            }
          </div>
          <p id="results-time" class="fw-bold" style="color: var(--klg-purple);">{{ finishTimeText() }}</p>
          <p id="results-message" class="lead">{{ resultsMeta().message }}</p>

          @if (reward(); as rw) {
            <div id="klg-reward" class="klg-reward">
              @if (rw.rankUp) {
                <div class="klg-rank-up">{{ rw.rank.emoji }} Level up — you're a {{ rw.rank.name }}!</div>
              }
              <div class="klg-xp-line">
                +{{ rw.xp }} XP
                <span class="klg-xp-rank"> {{ rw.rank.emoji }} {{ rw.rank.name }} • {{ rw.totalXp }} XP total</span>
              </div>
              @if (rw.newBadges.length) {
                <div class="klg-new-badges">
                  @for (b of rw.newBadges; track b.id) {
                    <span class="klg-badge-pill">🏅 {{ b.emoji }} {{ b.name }}</span>
                  }
                </div>
              }
              <div class="klg-reward-meta">
                @if (rw.dayStreak > 1) {
                  🔥 {{ rw.dayStreak }}-day streak
                }
                @if (rw.toNextRank > 0) {
                  {{ rw.dayStreak > 1 ? ' • ' : '' }}{{ rw.toNextRank }} XP to {{ rw.rank.next?.name }}
                }
              </div>
            </div>
          }

          @if (reviewActive()) {
            <div id="klg-review-links" class="klg-review-links mt-4">
              @if (nextReviewGroup(); as nextGrp) {
                <a
                  id="klg-review-next"
                  class="btn btn-lg btn-primary fw-bold"
                  [href]="reviewNextHref(nextGrp)"
                  (click)="onOpenReviewGroup($event, nextGrp)"
                >Next: {{ gameName(nextGrp.gameId) }} →</a>
              }
              <a
                id="klg-review-home"
                class="btn btn-lg btn-outline-secondary fw-bold"
                href="#home"
                (click)="onReviewHome($event)"
              >🏠 Back to all games</a>
            </div>
          } @else {
            <div class="d-flex justify-content-center gap-2 mt-4 flex-wrap">
              @if (nextAfterGame(); as nextG) {
                <a
                  class="kid-next-game"
                  [href]="nextHref(nextG.id)"
                  [attr.data-next]="nextG.id"
                  (click)="onOpenNextGame($event, nextG.id)"
                >▶ Next game: {{ nextG.name }}</a>
              }
              <button
                id="play-again-btn"
                type="button"
                class="btn btn-lg text-white fw-bold px-4"
                style="background: var(--klg-purple);"
                (click)="startRound()"
              >Play Again</button>
              <a
                [href]="'#world/' + game().subject"
                class="btn btn-lg btn-outline-secondary fw-bold px-4 kid-finish-home"
                (click)="onFinishHome($event)"
              >🏠 Home</a>
            </div>
          }

          <div id="results-review" class="text-start mx-auto mt-3" style="max-width: 480px;">
            @if (wrongAnswers().length === 0) {
              <div class="alert alert-success text-center mt-2">
                Perfect score! No mistakes to review. 🌟
              </div>
            } @else {
              <div class="card border-warning mt-2">
                <div class="card-header bg-warning bg-opacity-25 fw-bold">
                  Review mistakes ({{ wrongAnswers().length }})
                </div>
                <ul class="list-group list-group-flush">
                  @for (item of wrongAnswers(); track $index) {
                    <li class="list-group-item">
                      <strong>{{ item.prompt }}</strong> &rarr; Correct:
                      <span class="text-success fw-bold">{{ item.correctAnswer }}</span>
                      <span class="text-danger ms-2">(You picked: {{ item.givenAnswer }})</span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class QuizEngineComponent {
  readonly game = input.required<KlgGame>();
  readonly definition = input.required<QuizGameDefinition>();
  readonly query = input<string>('');
  readonly angularGameIds = input<ReadonlySet<string>>(new Set());

  readonly navigateQuery = output<string>();
  readonly goWorld = output<string>();
  readonly goHome = output<void>();
  readonly openGame = output<{ gameId: string; query?: string }>();

  protected readonly catalogue = inject(KlgCatalogueService);
  protected readonly progress = inject(KlgProgressService);
  protected readonly sounds = inject(KlgSoundsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly startBtn = viewChild<ElementRef<HTMLButtonElement>>('startBtn');
  private readonly visualBox = viewChild<ElementRef<HTMLElement>>('visualBox');
  private readonly questionTextEl = viewChild<ElementRef<HTMLElement>>('questionTextEl');
  private readonly feedbackEl = viewChild<ElementRef<HTMLElement>>('feedbackEl');
  private readonly nextBtn = viewChild<ElementRef<HTMLButtonElement>>('nextBtn');
  private readonly resultsScreen = viewChild<ElementRef<HTMLElement>>('resultsScreen');

  protected readonly phase = signal<QuizPhase>('start');
  protected readonly playMode = signal<'practice' | 'challenge'>('practice');
  protected readonly isPractice = signal(true);
  protected readonly reviewActive = signal(false);

  protected readonly questionNumber = signal(0);
  protected readonly totalQuestions = signal(10);
  protected readonly score = signal(0);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly timeRemaining = signal(10);
  protected readonly mascot = signal('🐵');
  protected readonly mascotMood = signal('');
  protected readonly locked = signal(false);
  protected readonly hintShown = signal(false);
  protected readonly feedbackText = signal('');
  protected readonly finishTimeText = signal('');
  protected readonly reward = signal<KlgRecordOutcome | null>(null);
  protected readonly wrongAnswers = signal<WrongAnswerEntry[]>([]);
  protected readonly currentQuestion = signal<QuizQuestion | null>(null);
  protected readonly solvedVisualOverride = signal<Node | (() => Node | null) | null>(null);
  private readonly selectedAnswer = signal<string | number | null>(null);
  private readonly bestMsVersion = signal(0);

  private askedPrompts = new Set<string | number>();
  private reviewState: ReviewState | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private elapsedMs = 0;
  private questionStartMs = 0;
  private deadline = 0;
  private hiddenAt = 0;

  protected readonly params = computed(() => new URLSearchParams(this.query()));

  protected readonly config = computed(() => this.definition().buildConfig(this.params()));

  protected readonly reviewQuery = computed(() => stripReviewParam(this.query()));

  protected readonly reviewIntroCount = computed(() => {
    this.progress.revision();
    const g = this.game();
    const q = this.params();
    if (q.get('review') !== '1') return 0;
    return this.progress.reviewDueFor(g.id, this.reviewQuery(), REVIEW_LIMIT).length;
  });

  protected readonly moreOpen = computed(() => {
    const g = this.game();
    const settings = new URLSearchParams(this.query());
    settings.delete('review');
    for (const lvl of g.levels) {
      for (const [k] of new URLSearchParams(lvl.query).entries()) settings.delete(k);
    }
    return [...settings.keys()].length > 0;
  });

  protected readonly displayedInfoText = computed(() => {
    const info = this.config().infoText;
    if (this.playMode() === 'practice') {
      return info.replace(/\d+ seconds (each|per question)/g, 'no time limit').replace(/timed /gi, '');
    }
    return info;
  });

  protected readonly bestTimeText = computed(() => {
    this.bestMsVersion();
    const key = this.config().bestTimeKey;
    if (!key) return '';
    const best = this.progress.loadBestMs(key);
    return best
      ? `🏅 Best time: ${(best / 1000).toFixed(1)}s (perfect score)`
      : '🏅 Answer everything correctly to set a best-time record!';
  });

  protected readonly activeVisual = computed(() => {
    const solved = this.solvedVisualOverride();
    if (solved) return solved;
    return this.currentQuestion()?.visual || null;
  });

  protected readonly questionSpeech = computed(() => {
    const q = this.currentQuestion();
    if (!q || !this.sounds.canSpeak() || q.speech) return '';
    if (q.speechPrompt !== undefined) {
      return q.speechPrompt.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
    }
    return /[A-Za-z]{2,}/.test(q.prompt) ? q.prompt.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim() : '';
  });

  protected readonly progressPct = computed(() => {
    const total = this.totalQuestions();
    if (!total) return 0;
    if (this.phase() === 'results') return 100;
    return Math.max(0, ((this.questionNumber() - 1) / total) * 100);
  });

  protected readonly timerPct = computed(() => {
    const max = this.config().timePerQuestion || 10;
    return Math.max(0, (this.timeRemaining() / max) * 100);
  });

  protected readonly questionExtraClass = computed(
    () => this.currentQuestion()?.questionClass || this.config().questionClass || ''
  );

  protected readonly renderedChoices = computed(() => {
    const q = this.currentQuestion();
    const fmt = this.config().formatAnswer || ((v: string | number) => String(v));
    if (!q) return [];
    const correctFormatted = fmt(q.correctAnswer);
    return q.choices.map((raw, idx) => {
      const formatted = fmt(raw);
      const label = q.choiceLabels?.[String(raw)] || formatted;
      const display = q.choiceDisplay?.[String(raw)] || formatted;
      const visual = q.choiceVisuals?.[String(raw)] || null;
      const isCorrect = formatted === correctFormatted;
      const showListen = this.sounds.canSpeak() && !q.noChoiceListen && /[A-Za-z]{2,}/.test(label);
      return {
        key: `${idx}:${formatted}`,
        raw,
        formatted,
        display,
        label,
        visual,
        isCorrect,
        showListen,
      };
    });
  });

  protected isChoiceSelectedWrong(formatted: string): boolean {
    const q = this.currentQuestion();
    const sel = this.selectedAnswer();
    if (!q || sel === null) return false;
    const fmt = this.config().formatAnswer || ((v: string | number) => String(v));
    return fmt(sel) === formatted && formatted !== fmt(q.correctAnswer);
  }

  protected readonly nextButtonLabel = computed(() => {
    if (this.questionNumber() < this.totalQuestions()) return 'Next question →';
    return this.reviewActive() ? 'All done →' : 'See my stars →';
  });

  protected readonly resultsMeta = computed(() => {
    if (this.reviewActive()) {
      const right = this.reviewState?.right || 0;
      const cleared = this.reviewState?.cleared || 0;
      return {
        emoji: '🔁',
        starsCount: 0,
        message: cleared
          ? `You mastered ${cleared} tricky ${cleared === 1 ? 'question' : 'questions'}!`
          : right
            ? 'Nice work! Tricky questions come back once more to make sure they stick.'
            : 'Good try! Tricky questions come back tomorrow.',
      };
    }
    const total = this.totalQuestions() || 1;
    const pct = this.score() / total;
    if (pct >= 0.9) return { emoji: '🏆', starsCount: 3, message: "Outstanding! You're a superstar!" };
    if (pct >= 0.7) return { emoji: '🎉', starsCount: 2, message: 'Great job! Keep practicing!' };
    if (pct >= 0.5) return { emoji: '👍', starsCount: 1, message: 'Good effort! Try again to beat your score!' };
    return { emoji: '💪', starsCount: 0, message: "Keep practicing, you'll get it!" };
  });

  protected readonly starSlots = computed(() => {
    const count = this.resultsMeta().starsCount;
    return [count >= 1, count >= 2, count >= 3];
  });

  protected readonly nextAfterGame = computed(() => {
    this.progress.revision();
    return this.catalogue.nextAfter(this.game().id, this.progress.summary().games);
  });

  protected readonly nextReviewGroup = computed(() => {
    this.progress.revision();
    return this.progress.reviewSummary().groups[0] || null;
  });

  constructor() {
    effect(() => {
      // Reset to start screen whenever the active game ID or query changes.
      this.game().id;
      this.query();
      untracked(() => this.resetToStart());
    });

    const onVis = () => {
      if (document.hidden) this.hiddenAt = Date.now();
      else if (this.hiddenAt) {
        const away = Date.now() - this.hiddenAt;
        this.questionStartMs += away;
        if (this.deadline) this.deadline += away;
        this.hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVis);

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.sounds.cancelSpeech();
      document.removeEventListener('visibilitychange', onVis);
    });
  }

  private clearTimers(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  private resetToStart(): void {
    this.clearTimers();
    this.sounds.cancelSpeech();
    this.phase.set('start');
    this.playMode.set('practice');
    this.locked.set(false);
    this.currentQuestion.set(null);
    this.solvedVisualOverride.set(null);
    this.reward.set(null);
    this.wrongAnswers.set([]);
    this.reviewActive.set(false);
    this.reviewState = null;
  }

  protected hrefForQuery(nextQuery: string): string {
    return `#play/${this.game().id}${nextQuery ? '?' + nextQuery : ''}`;
  }

  protected onNavigateQuery(nextQuery: string): void {
    this.navigateQuery.emit(nextQuery);
  }

  protected onClickModeLink(event: Event, nextQuery: string): void {
    event.preventDefault();
    this.sounds.click();
    this.navigateQuery.emit(nextQuery);
  }

  protected setPlayMode(mode: 'practice' | 'challenge'): void {
    this.playMode.set(mode);
  }

  protected speakInstructions(): void {
    const g = this.game();
    const cfg = this.config();
    const spoken = cfg.spokenInstructions || `${g.name}. ${cfg.instructions || cfg.infoText}`;
    this.sounds.speak(spoken);
  }

  protected startRound(): void {
    this.clearTimers();
    this.sounds.click();
    const cfg = this.config();
    const g = this.game();
    const isReviewReq = this.params().get('review') === '1';
    const due = isReviewReq ? this.progress.reviewDueFor(g.id, this.reviewQuery(), REVIEW_LIMIT) : [];

    if (isReviewReq && due.length > 0) {
      this.reviewState = { queue: due, next: 0, right: 0, cleared: 0 };
      this.reviewActive.set(true);
      this.isPractice.set(true);
      this.totalQuestions.set(due.length);
    } else {
      this.reviewState = null;
      this.reviewActive.set(false);
      this.isPractice.set(this.playMode() === 'practice');
      this.totalQuestions.set(cfg.totalQuestions);
    }

    this.questionNumber.set(0);
    this.score.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.askedPrompts.clear();
    this.wrongAnswers.set([]);
    this.reward.set(null);
    this.finishTimeText.set('');
    this.elapsedMs = 0;
    this.mascot.set(cfg.mascot || '🐵');
    this.mascotMood.set('');
    this.phase.set('play');
    this.advanceQuestion();
  }

  protected exitToStart(): void {
    this.clearTimers();
    this.sounds.cancelSpeech();
    this.sounds.click();
    this.locked.set(true);
    this.phase.set('start');
    setTimeout(() => this.startBtn()?.nativeElement.focus(), 0);
  }

  private advanceQuestion(): void {
    this.clearTimers();
    if (this.questionNumber() >= this.totalQuestions()) {
      this.finishRound();
      return;
    }

    const nextIdx = this.questionNumber() + 1;
    this.questionNumber.set(nextIdx);
    this.locked.set(false);
    this.hintShown.set(false);
    this.selectedAnswer.set(null);
    this.solvedVisualOverride.set(null);
    this.feedbackText.set('');

    let q: QuizQuestion;
    if (this.reviewState) {
      const item = this.reviewState.queue[this.reviewState.next];
      this.reviewState.next += 1;
      q = snapshotToQuestion(item.snapshot, item.id);
    } else {
      q = this.makeUniqueQuestion();
    }

    this.currentQuestion.set(q);
    this.questionStartMs = Date.now();
    this.startTimer();

    if (window.scrollY > 0) window.scrollTo(0, 0);
    setTimeout(() => {
      this.questionTextEl()?.nativeElement.focus({ preventScroll: true });
      const speech = this.questionSpeech();
      if (speech) this.sounds.speak(speech, q.speechRate ?? 0.88);
    }, 0);
  }

  private makeUniqueQuestion(): QuizQuestion {
    const gen = this.config().generateQuestion;
    let q!: QuizQuestion;
    let key: string | number = '';
    for (let i = 0; i < 50; i += 1) {
      q = gen(this.askedPrompts);
      key = q.dedupeKey !== undefined ? q.dedupeKey : q.prompt;
      if (!this.askedPrompts.has(key)) break;
    }
    this.askedPrompts.add(key);
    return q;
  }

  private startTimer(): void {
    if (this.isPractice()) return;
    const perQ = this.config().timePerQuestion || 10;
    this.timeRemaining.set(perQ);
    this.deadline = Date.now() + perQ * 1000;
    this.timerInterval = setInterval(() => {
      if (document.hidden) return;
      const rem = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
      this.timeRemaining.set(rem);
      if (rem <= 0) {
        this.handleAnswer(null, null);
      } else if (rem <= 3) {
        this.sounds.tick();
      }
    }, 1000);
  }

  protected onPromptTap(): void {
    if (this.currentQuestion()?.promptTappable) this.speakCurrentQuestion();
  }

  protected onPromptKeydown(event: KeyboardEvent): void {
    if (this.currentQuestion()?.promptTappable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.speakCurrentQuestion();
    }
  }

  protected speakCurrentQuestion(): void {
    const text = this.questionSpeech();
    if (text) this.sounds.speak(text, this.currentQuestion()?.speechRate ?? 0.88);
  }

  protected handleAnswer(selected: string | number | null, btnEl: HTMLButtonElement | null): void {
    if (this.locked()) return;
    const q = this.currentQuestion();
    if (!q) return;

    this.locked.set(true);
    this.clearTimers();
    if (!q.speech) this.sounds.cancelSpeech();
    this.elapsedMs += Date.now() - this.questionStartMs;
    this.selectedAnswer.set(selected);

    const fmt = this.config().formatAnswer || ((v: string | number) => String(v));
    const answerLabel = q.choiceLabels?.[String(q.correctAnswer)] || fmt(q.correctAnswer);
    const isCorrect = selected !== null && fmt(selected) === fmt(q.correctAnswer);

    if (isCorrect) {
      this.score.update((s) => s + 1);
      const nextStreak = this.streak() + 1;
      this.streak.set(nextStreak);
      this.bestStreak.update((b) => Math.max(b, nextStreak));
      this.sounds.correct(nextStreak);
      this.mascot.set('😄');
      this.mascotMood.set('happy');
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        this.spawnFloatEmoji(rect);
        if (typeof confetti === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const particleCount = nextStreak === 10 ? 80 : nextStreak === 5 ? 40 : 14;
          confetti({
            particleCount,
            spread: 55,
            scalar: 0.7,
            ticks: 50,
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            },
          });
        }
      }
    } else {
      this.streak.set(0);
      this.mascot.set('🌱');
      this.mascotMood.set('');
      if (selected === null) this.sounds.timeUp();
      else this.sounds.wrong();

      const givenLabel =
        selected === null ? "No answer (time's up)" : q.choiceLabels?.[String(selected)] || fmt(selected);
      this.wrongAnswers.update((list) => [
        ...list,
        {
          prompt: q.reviewPrompt || q.prompt,
          correctAnswer: answerLabel,
          givenAnswer: givenLabel,
        },
      ]);
    }

    if (this.reviewState && q.reviewId) {
      const outcome = this.progress.recordReviewAnswer(q.reviewId, isCorrect);
      if (isCorrect) this.reviewState.right += 1;
      if (outcome === 'cleared') this.reviewState.cleared += 1;
    } else if (!isCorrect && selected !== null) {
      this.saveMiss(q, answerLabel);
    }

    if (q.solution) {
      this.solvedVisualOverride.set(q.solution);
    }

    this.feedbackText.set(
      (isCorrect ? 'Yes! Well done. ' : `Good try! The answer is ${answerLabel}. `) + (q.explanation || '')
    );

    setTimeout(() => {
      if (this.isPractice()) {
        this.nextBtn()?.nativeElement.focus({ preventScroll: true });
      }
      this.feedbackEl()?.nativeElement.scrollIntoView({ block: 'nearest' });
    }, 0);

    if (!this.isPractice()) {
      const delay = isCorrect ? 900 : 3500;
      this.transitionTimer = setTimeout(() => this.advanceQuestion(), delay);
    }
  }

  private saveMiss(q: QuizQuestion, answerLabel: string): void {
    try {
      const stripFields = new Set(['visual', 'hintVisual', 'solution', 'choiceVisuals']);
      const snapshot = JSON.parse(JSON.stringify(q, (k, v) => (stripFields.has(k) ? undefined : v)));
      const pictures: Record<string, unknown> = {};
      if (q.visual && this.visualBox()) {
        pictures['visual'] = this.visualBox()!.nativeElement.innerHTML;
      }
      if (q.hintVisual) pictures['hintVisual'] = nodeToHtml(q.hintVisual);
      if (q.solution) pictures['solution'] = nodeToHtml(q.solution);
      if (q.choiceVisuals) {
        const cv: Record<string, string> = {};
        for (const [k, v] of Object.entries(q.choiceVisuals)) cv[k] = nodeToHtml(v);
        pictures['choiceVisuals'] = cv;
      }
      snapshot.pictures = pictures;
      this.progress.recordMiss({
        gameId: this.game().id,
        query: this.reviewQuery(),
        key: String(q.dedupeKey !== undefined ? q.dedupeKey : q.prompt),
        snapshot,
        prompt: q.reviewPrompt || q.prompt,
        answer: answerLabel,
      });
    } catch {
      /* unserializable question simply is not saved for review */
    }
  }

  private spawnFloatEmoji(rect: DOMRect): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const span = document.createElement('span');
    span.className = 'klg-float-emoji';
    span.textContent = '✨';
    span.style.left = `${rect.left + rect.width / 2 - 12}px`;
    span.style.top = `${rect.top - 10}px`;
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }

  protected onNextClick(): void {
    if (!this.locked()) return;
    this.clearTimers();
    this.advanceQuestion();
  }

  private finishRound(): void {
    this.clearTimers();
    this.sounds.cancelSpeech();
    this.phase.set('results');
    setTimeout(() => this.resultsScreen()?.nativeElement.focus({ preventScroll: true }), 0);

    if (this.reviewState) {
      if (this.reviewState.right > 0) this.sounds.fanfare();
      this.finishTimeText.set('');
      this.reward.set(this.progress.finishReview({ right: this.reviewState.right, cleared: this.reviewState.cleared }));
      return;
    }

    const total = this.totalQuestions();
    const score = this.score();
    const pct = total > 0 ? score / total : 0;

    if (pct >= 0.7) {
      this.sounds.fanfare();
      this.launchConfetti();
    }

    if (this.isPractice()) {
      this.finishTimeText.set('Practice complete · every little step counts.');
    } else {
      const cfg = this.config();
      const timeSec = (this.elapsedMs / 1000).toFixed(1);
      if (score === total && total > 0 && cfg.bestTimeKey) {
        const prev = this.progress.loadBestMs(cfg.bestTimeKey);
        if (prev === null || this.elapsedMs < prev) {
          this.progress.saveBestMs(cfg.bestTimeKey, this.elapsedMs);
          this.bestMsVersion.update((v) => v + 1);
          this.sounds.newRecord();
          this.finishTimeText.set(`⏱️ Completed in ${timeSec}s — 🏆 New Best Time!`);
        } else {
          this.finishTimeText.set(`⏱️ Completed in ${timeSec}s (Best: ${(prev / 1000).toFixed(1)}s)`);
        }
      } else {
        this.finishTimeText.set(`⏱️ Completed in ${timeSec}s`);
      }
    }

    const outcome = this.progress.record({
      gameId: this.game().id,
      score,
      total,
      elapsedMs: this.isPractice() ? 0 : this.elapsedMs,
      bestStreak: this.bestStreak(),
      mode: this.reviewQuery() || 'default',
    });
    this.reward.set(outcome);
    if (outcome?.rankUp) {
      this.sounds.newRecord();
      this.launchConfetti();
    }
  }

  private launchConfetti(): void {
    if (typeof confetti !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  }

  protected gameName(id: string): string {
    return this.catalogue.byId(id)?.name || 'another game';
  }

  protected nextHref(id: string): string {
    return this.angularGameIds().has(id) ? `#play/${id}` : `games/${id}/index.html`;
  }

  protected reviewNextHref(group: { gameId: string; query: string }): string {
    const q = group.query ? `${group.query}&review=1` : 'review=1';
    return this.angularGameIds().has(group.gameId)
      ? `#play/${group.gameId}?${q}`
      : `games/${group.gameId}/index.html?${q}`;
  }

  protected onOpenNextGame(event: Event, id: string): void {
    if (!this.angularGameIds().has(id)) return;
    event.preventDefault();
    this.sounds.click();
    this.openGame.emit({ gameId: id });
  }

  protected onOpenReviewGroup(event: Event, group: { gameId: string; query: string }): void {
    if (!this.angularGameIds().has(group.gameId)) return;
    event.preventDefault();
    this.sounds.click();
    const q = group.query ? `${group.query}&review=1` : 'review=1';
    this.openGame.emit({ gameId: group.gameId, query: q });
  }

  protected onFinishHome(event: Event): void {
    event.preventDefault();
    this.sounds.click();
    this.goWorld.emit(this.game().subject);
  }

  protected onReviewHome(event: Event): void {
    event.preventDefault();
    this.sounds.click();
    this.goHome.emit();
  }
}

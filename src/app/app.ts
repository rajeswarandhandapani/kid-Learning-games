import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { ParentDialogComponent } from './components/parent-dialog.component';
import { QuizEngineComponent } from './game/quiz-engine.component';
import { ConfirmDialogComponent } from './kit/confirm-dialog.component';
import { ToastComponent } from './kit/toast.component';
import { KlgHubService } from './services/klg-hub.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ParentDialogComponent, QuizEngineComponent, ToastComponent, ConfirmDialogComponent],
  template: `
    @if (hub.view() === 'play' && hub.activeGame() && hub.activeDefinition()) {
      <klg-quiz-engine
        [game]="hub.activeGame()!"
        [definition]="hub.activeDefinition()!"
        [query]="hub.activeGameQuery()"
        [angularGameIds]="hub.angularGameIds"
        (navigateQuery)="hub.setActiveGameQuery($event)"
        (goWorld)="hub.go(null, 'world/' + $event)"
        (goHome)="hub.go(null, 'home')"
        (openGame)="hub.openGame(null, $event.gameId, $event.query)"
      />
    } @else {
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Skip to games</a>
    <div class="kid-clouds" aria-hidden="true"></div>

    <header class="kid-top">
      <a class="kid-logo" href="#home" aria-label="Little Learners home" (click)="hub.go($event, 'home')">
        <img src="assets/art/owl.svg" alt="" width="46" height="46" />
        <b>Little Learners</b>
      </a>
      <a
        class="kid-chip"
        id="stars-chip"
        href="#me"
        (click)="hub.go($event, 'me')"
        [attr.aria-label]="starsAria()"
      >
        ⭐ {{ hub.summary().stars }}
      </a>
      <button
        type="button"
        id="klg-mute-btn"
        class="klg-mute-btn"
        (click)="hub.toggleMuted()"
        [attr.aria-label]="hub.muted() ? 'Turn sound on' : 'Turn sound off'"
      >
        {{ hub.muted() ? '🔇' : '🔊' }}
      </button>
    </header>

    <main #mainEl id="main" class="kid-main" tabindex="-1">
      <!-- Home view -->
      <section class="kid-view" data-view="home" [hidden]="hub.view() !== 'home'">
        <div class="kid-title kid-hello">
          <img class="kid-owl" src="assets/art/owl.svg" alt="" width="84" height="84" />
          <div class="kid-bubble">
            <h1 tabindex="-1">What shall we play?</h1>
            <button
              id="home-title-say"
              type="button"
              class="kid-say"
              [hidden]="!hub.canSpeak()"
              aria-label="Hear: What shall we play?"
              (click)="hub.say('What shall we play?')"
            >
              🔊
            </button>
          </div>
        </div>

        <div
          id="play-next-wrap"
          class="kid-next-wrap"
          [attr.data-subject]="hub.playNextGame()?.subject || null"
        >
          <a
            id="play-next"
            class="kid-play-next"
            [href]="hub.playNextGame() ? hub.gameHref(hub.playNextGame()!.id) : '#'"
            [attr.data-subject]="hub.playNextGame()?.subject || null"
            (click)="openIfReady($event, hub.playNextGame()?.id)"
          >
            <span class="kid-play-arrow" aria-hidden="true">▶</span>
            <span class="kid-play-words">
              <b>Play next</b>
              <small id="play-next-name">{{ hub.playNextGame()?.name || '' }}</small>
            </span>
            <span id="play-next-pic" class="kid-play-pic" aria-hidden="true">
              {{ hub.playNextGame()?.icon || '' }}
            </span>
          </a>
          <button
            type="button"
            class="kid-say"
            [hidden]="!hub.canSpeak()"
            aria-label="Hear: Play next"
            (click)="speakPlayNext($event)"
          >
            🔊
          </button>
        </div>

        <!-- Review My Mistakes -->
        <div id="review-card" class="klg-review-card" [hidden]="hub.reviewSummary().due === 0">
          <div>
            <div id="review-count" class="fw-bold">{{ hub.reviewSummary().due }} {{ hub.reviewSummary().due === 1 ? 'question' : 'questions' }} ready for another try</div>
            <div id="review-note" class="small">From {{ hub.reviewSummary().groups.length }} {{ hub.reviewSummary().groups.length === 1 ? 'game.' : 'games.' }}</div>
          </div>
          <a
            id="review-link"
            class="kid-review-go"
            [href]="hub.reviewSummary().groups[0]?.href || '#'"
          >
            🔁 Try again
          </a>
        </div>

        <div id="home-level" class="kid-levelcard">
          <span class="kid-levelcard-pic" aria-hidden="true">{{ hub.summary().rank.emoji }}</span>
          <div class="kid-levelcard-rank">
            <b>{{ hub.summary().rank.name }}</b>
            <div class="kid-xp"><i [style.width.%]="hub.rankFillPct()"></i></div>
          </div>
          <div class="kid-levelcard-stats">
            <span>🔥 {{ hub.summary().dayStreak }}</span>
            <span>🎮 {{ hub.summary().plays }}</span>
            <span>🏅 {{ badgeCount() }}</span>
          </div>
        </div>

        <div id="worlds" class="kid-worlds">
          @for (sub of hub.subjects(); track sub.key) {
            <div class="kid-world" [attr.data-subject]="sub.key">
              <a
                class="kid-world-link"
                [href]="'#world/' + sub.key"
                [attr.aria-label]="sub.say"
                (click)="hub.go($event, 'world/' + sub.key)"
              >
                <span class="kid-world-icon" aria-hidden="true">{{ sub.icon }}</span>
                <b>{{ sub.kid }}</b>
                <span class="kid-world-count" aria-hidden="true">
                  ⭐ {{ hub.worldProgress(sub.key).done }}/{{ hub.worldProgress(sub.key).total }}
                  <span class="kid-world-bar">
                    <i [style.width.%]="hub.worldProgress(sub.key).pct"></i>
                  </span>
                </span>
              </a>
              <button
                type="button"
                class="kid-say"
                [hidden]="!hub.canSpeak()"
                [attr.aria-label]="'Hear: ' + sub.say"
                (click)="speakTopic($event, sub.say)"
              >
                🔊
              </button>
            </div>
          }

          <div class="kid-world" data-world="favorites">
            <a
              class="kid-world-link"
              href="#world/favorites"
              aria-label="Favorites"
              (click)="hub.go($event, 'world/favorites')"
            >
              <span class="kid-world-icon" aria-hidden="true">♥</span>
              <b>Favorites</b>
              <span class="kid-world-count" aria-hidden="true">♥ {{ hub.favorites().length }}</span>
            </a>
            <button
              type="button"
              class="kid-say"
              [hidden]="!hub.canSpeak()"
              aria-label="Hear: Favorites"
              (click)="speakTopic($event, 'Favorites')"
            >
              🔊
            </button>
          </div>
        </div>

        <div class="kid-row">
          <a
            id="daily-link"
            class="kid-soft"
            [href]="hub.dailyGame() ? hub.gameHref(hub.dailyGame()!.id) : '#'"
            (click)="openIfReady($event, hub.dailyGame()?.id)"
          >
            <small>Today’s game</small>
            <span id="daily-name">
              {{ hub.dailyGame() ? hub.dailyGame()!.icon + ' ' + hub.dailyGame()!.name : '' }}
            </span>
          </a>
          <button id="surprise-btn" type="button" class="kid-soft" (click)="hub.surpriseGame()">
            🎲 Surprise me
          </button>
        </div>
      </section>

      <!-- Me / My stars view -->
      <section class="kid-view" data-view="me" [hidden]="hub.view() !== 'me'">
        <div class="kid-title kid-title-back">
          <a class="kid-back" href="#home" (click)="hub.go($event, 'home')">⬅ Back</a>
          <h1 tabindex="-1">⭐ My stars</h1>
        </div>
        <div id="learning-progress" class="card klg-player-card">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <div id="player-rank-emoji" class="klg-player-rank">{{ hub.summary().rank.emoji }}</div>
              <div class="flex-grow-1" style="min-width: 200px;">
                <div class="h4 fw-bold mb-1" id="player-rank-name">{{ hub.summary().rank.name }}</div>
                <div class="klg-xp-track">
                  <div id="player-xp-fill" class="klg-xp-fill" [style.width.%]="hub.rankFillPct()"></div>
                </div>
                <div class="small fw-bold mt-1" id="player-xp-caption">{{ xpCaption() }}</div>
              </div>
              <div class="d-flex gap-2 flex-wrap" id="player-stats">
                @for (st of hub.playerStatsCards(); track st.label) {
                  <div class="klg-player-stat text-center">
                    <div>{{ st.icon }} {{ st.val }}</div>
                    <div class="small fw-normal">{{ st.label }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        <h2 class="kid-subhead">🏅 My badges</h2>
        <div class="kid-badges" id="player-badges">
          @for (badge of hub.badges(); track badge.id) {
            <div
              class="klg-badge-chip"
              [class.locked]="!hub.summary().badges[badge.id]"
              [title]="hub.summary().badges[badge.id] ? badge.name + ' — earned!' : badge.name + ': ' + badge.hint"
            >
              <span class="kid-badge-pic" aria-hidden="true">{{ badge.emoji }}</span>
              <b>{{ badge.name }}</b>
            </div>
          }
        </div>
      </section>

      <!-- World view -->
      <section class="kid-view" data-view="world" [hidden]="hub.view() !== 'world'">
        <div
          id="world-head"
          class="kid-world-head"
          [attr.data-subject]="hub.worldMeta().isSubject ? hub.worldMeta().key : null"
        >
          <a class="kid-back" href="#home" (click)="hub.go($event, 'home')">⬅ Back</a>
          <h1 id="world-title" tabindex="-1">{{ hub.worldMeta().title }}</h1>
          <button
            id="world-say"
            type="button"
            class="kid-say"
            [hidden]="!hub.canSpeak()"
            [attr.aria-label]="'Hear: ' + hub.worldMeta().spoken"
            (click)="speakTopic($event, hub.worldMeta().spoken)"
          >
            🔊
          </button>
        </div>
        <p id="path-next" class="path-next" role="status">{{ hub.pathNextText() }}</p>
        <p id="world-empty" class="kid-empty" [hidden]="hub.worldGamesList().length > 0">
          ♡ Tap the heart on a game to keep it here.
        </p>
      </section>

      <!-- All games library view -->
      <section id="library" class="kid-view library-controls" data-view="all" [hidden]="hub.view() !== 'all'">
        <div class="kid-title kid-title-back">
          <a class="kid-back" href="#home" (click)="hub.go($event, 'home')">⬅ Back</a>
          <h1 tabindex="-1">All games</h1>
        </div>
        <div class="search-row">
          <label class="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              #searchInput
              id="game-search"
              type="search"
              placeholder="Find a game…"
              aria-label="Search games"
              [value]="hub.search()"
              (input)="hub.search.set($any($event.target).value)"
            />
          </label>
          <label class="level-select">
            Age
            <select
              id="level-filter"
              (change)="hub.levelFilter.set($any($event.target).value)"
            >
              <option value="all" [selected]="hub.levelFilter() === 'all'">All ages</option>
              <option value="1" [selected]="hub.levelFilter() === '1'">🐣 Ages 3–5</option>
              <option value="2" [selected]="hub.levelFilter() === '2'">🧱 Ages 5–7</option>
              <option value="3" [selected]="hub.levelFilter() === '3'">🚀 Ages 7–9</option>
              <option value="4" [selected]="hub.levelFilter() === '4'">🧠 Ages 9+</option>
            </select>
          </label>
        </div>
        <div class="subject-tabs" id="subject-tabs" role="group" aria-label="Filter by subject">
          <button
            type="button"
            data-subject="all"
            [attr.aria-pressed]="hub.subjectFilter() === 'all'"
            (click)="hub.subjectFilter.set('all')"
          >
            All games
          </button>
          @for (sub of hub.subjects(); track sub.key) {
            <button
              type="button"
              [attr.data-subject]="sub.key"
              [class.tamil-tab]="sub.key === 'tamil'"
              [attr.aria-pressed]="hub.subjectFilter() === sub.key"
              (click)="hub.subjectFilter.set(sub.key)"
            >
              {{ sub.label }}
            </button>
          }
          <button
            type="button"
            data-subject="favorites"
            [attr.aria-pressed]="hub.subjectFilter() === 'favorites'"
            (click)="hub.subjectFilter.set('favorites')"
          >
            ♡ Favorites
          </button>
        </div>
        <p id="filter-status" class="filter-status" role="status">{{ hub.filterStatusText() }}</p>
        <div id="empty-games" [hidden]="hub.visibleGamesCount() !== 0">
          <h3>No games found yet</h3>
          <p>Try another word or age.</p>
          <button id="clear-filters" type="button" (click)="clearSearch(searchInput)">Show all games</button>
        </div>
      </section>

      <!-- All 84 game cards stay in DOM with [hidden] / order, matching KlgCatalogue & tests -->
      <div id="levels" class="kid-cards" [hidden]="hub.view() !== 'world' && hub.view() !== 'all'">
        @for (card of hub.renderedGames(); track card.game.id) {
          <div
            class="game-tile"
            [attr.data-game]="card.game.id"
            [hidden]="!card.visible"
            [style.order]="card.order"
          >
            <a
              [href]="hub.gameHref(card.game.id)"
              class="text-decoration-none"
              (click)="hub.openGame($event, card.game.id)"
            >
              <div
                class="card game-card"
                [class.done]="card.done"
                [class.next-up]="card.isNextUp"
                [attr.data-game]="card.game.id"
                [attr.data-subject]="card.game.subject"
                [attr.data-level]="card.game.level"
                [attr.data-ages]="card.agesBands"
                [attr.data-new]="card.game.isNew ? '1' : null"
              >
                <div class="card-body">
                  <div class="game-card-icon">{{ card.game.icon }}</div>
                  <h3>{{ card.game.name }}</h3>
                  <p class="kid-blurb">{{ card.game.blurb }}</p>
                  <div class="kid-card-ages">Ages {{ card.agesLabel }}</div>
                  <div class="klg-card-stars" [attr.aria-label]="card.starAria">{{ card.starText }}</div>
                </div>
                @if (card.isNewFlag) {
                  <span class="klg-card-flag">NEW</span>
                }
                @if (card.isNextUp) {
                  <span class="kid-next-chip">Next up</span>
                }
              </div>
            </a>
            <button
              type="button"
              class="kid-say"
              [hidden]="!hub.canSpeak()"
              [attr.aria-label]="'Hear: ' + card.game.name"
              (click)="speakTopic($event, card.spokenName)"
            >
              🔊
            </button>
            <button
              type="button"
              class="favorite-button"
              [attr.aria-label]="'Favorite ' + card.game.name"
              [attr.aria-pressed]="card.favorite"
              (click)="hub.toggleFavorite(card.game.id)"
            >
              {{ card.favorite ? '♥' : '♡' }}
            </button>
          </div>
        }
      </div>

      <section class="kid-view kid-world-foot" data-view="world" [hidden]="hub.view() !== 'world'">
        <a class="kid-quiet" href="#all" (click)="hub.go($event, 'all')">See every game</a>
      </section>
    </main>

    <footer class="home-footer">
      <button class="kid-quiet parent-link" id="parent-open" type="button" (click)="hub.openParent()">
        For grown-ups
      </button>
      <span>Progress stays on this device.</span>
    </footer>

    <klg-parent-dialog />
    }
    <kit-toast />
    <kit-confirm-dialog />
  `,
})
export class App {
  readonly hub = inject(KlgHubService);
  private readonly mainEl = viewChild<ElementRef<HTMLElement>>('mainEl');

  starsAria(): string {
    const n = this.hub.summary().stars;
    return `${n}${n === 1 ? ' star' : ' stars'}. See my stars.`;
  }

  badgeCount(): number {
    return Object.keys(this.hub.summary().badges).length;
  }

  xpCaption(): string {
    const s = this.hub.summary();
    const next = s.rank.next;
    return next
      ? `${s.xp} XP · ${next.min - s.xp} to ${next.emoji} ${next.name}`
      : `${s.xp} XP · top rank reached! 👑`;
  }

  skipToMain(event: Event): void {
    event.preventDefault();
    this.mainEl()?.nativeElement.focus();
  }

  speakPlayNext(event: Event): void {
    event.preventDefault();
    const next = this.hub.playNextGame();
    if (next) this.hub.say(`Play next: ${this.hub.spokenName(next)}`);
  }

  speakTopic(event: Event, text: string): void {
    event.preventDefault();
    this.hub.say(text);
  }

  clearSearch(input: HTMLInputElement): void {
    this.hub.clearFilters();
    input.focus();
  }

  openIfReady(event: Event, id?: string): void {
    if (!id) return;
    this.hub.openGame(event, id);
  }
}

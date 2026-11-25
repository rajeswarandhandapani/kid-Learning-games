import { Injectable, computed, inject, signal } from '@angular/core';
import { KlgCatalogueService, type KlgGame, type KlgLevelDef, type KlgSubjectDef } from '../core/klg-catalogue.service';
import {
  KlgProgressService,
  type KlgBadge,
  type KlgGameStats,
  type KlgProgressSummary,
  type KlgRank,
  type KlgReviewGroup,
  type KlgReviewSummary,
  type KlgTrickyItem,
} from '../core/klg-progress.service';
import { KlgSoundsService } from '../core/klg-sounds.service';
import { ANGULAR_GAME_IDS, isAngularGame, loadAngularQuizGame } from '../games/game-registry';
import type { QuizGameDefinition } from '../game/quiz-types';

export type {
  KlgLevelDef,
  KlgSubjectDef,
  KlgGame,
  KlgRank,
  KlgBadge,
  KlgGameStats,
  KlgProgressSummary,
  KlgReviewGroup,
  KlgReviewSummary,
  KlgTrickyItem,
};

export interface SkillReportRow {
  tag: string;
  name: string;
  subject: string;
  stars: number;
  avgPct: number | null;
  recent: number[];
  sparkPoints: string;
  sparkAria: string;
  last: string;
  weak: boolean;
}

export interface RenderedGameCard {
  game: KlgGame;
  agesLabel: string;
  agesBands: string;
  stars: number;
  starText: string;
  starAria: string;
  isNewFlag: boolean;
  done: boolean;
  isNextUp: boolean;
  favorite: boolean;
  visible: boolean;
  order: number;
  spokenName: string;
}

const FAVORITES_KEY = 'klg-favorites';
const PATH_KEY = 'klg-path';

function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage */
  }
}

function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function dailyIndex(count: number): number {
  if (!count) return 0;
  const d = new Date();
  const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  const mixed = (seed * 9301 + 49297) % 233280;
  return Math.floor((mixed / 233280) * count) % count;
}

@Injectable({ providedIn: 'root' })
export class KlgHubService {
  private readonly catService = inject(KlgCatalogueService);
  private readonly progressService = inject(KlgProgressService);
  private readonly soundsService = inject(KlgSoundsService);

  readonly view = signal<'home' | 'world' | 'me' | 'all' | 'play'>('home');
  readonly world = signal('');
  readonly activeGameId = signal('');
  readonly activeGameQuery = signal('');
  readonly angularGameIds = ANGULAR_GAME_IDS;

  readonly summary = this.progressService.summary;
  readonly reviewSummary = this.progressService.reviewSummary;
  readonly favorites = signal<string[]>([]);
  readonly muted = this.soundsService.muted;

  // Filters on #all view
  readonly search = signal('');
  readonly levelFilter = signal('all');
  readonly subjectFilter = signal('all');

  // Grown-up dialog & PWA state
  readonly parentOpen = signal(false);
  readonly offlineStatus = signal('');
  readonly installHelp = signal('');
  readonly justInstalled = signal(false);
  private readonly installPromptEvent = signal<{ prompt: () => Promise<void> } | null>(null);
  readonly showInstallBtn = computed(
    () => Boolean(this.installPromptEvent()) && !this.justInstalled() && !this.isStandalone(),
  );

  private initialized = false;
  private firstRoute = true;
  private loadSeq = 0;

  readonly subjects = computed(() => this.catService.subjects());
  readonly badges = computed<KlgBadge[]>(() => this.progressService.badges());
  readonly allGames = computed<KlgGame[]>(() => this.catService.games());
  readonly totalGamesCount = computed(() => this.allGames().length);
  readonly activeGame = computed<KlgGame | null>(() => {
    const id = this.activeGameId();
    return id ? this.catService.byId(id) || null : null;
  });
  readonly activeDefinition = signal<QuizGameDefinition | null>(null);

  readonly canSpeak = (): boolean => this.soundsService.canSpeak();

  readonly playNextGame = computed<KlgGame | null>(() => {
    return this.catService.nextFor(this.summary().games, readPref(PATH_KEY, ''));
  });

  readonly dailyGame = computed<KlgGame | null>(() => {
    const list = this.allGames();
    return list.length ? list[dailyIndex(list.length)] : null;
  });

  readonly rankFillPct = computed(() => {
    const s = this.summary();
    const next = s.rank.next;
    if (!next) return 100;
    const span = Math.max(1, next.min - s.rank.min);
    return Math.min(100, Math.max(0, ((s.xp - s.rank.min) / span) * 100));
  });

  readonly playerStatsCards = computed(() => {
    const s = this.summary();
    const badgeTotal = this.badges().length;
    return [
      { icon: '🎮', val: s.plays, label: s.plays === 1 ? 'game played' : 'games played' },
      { icon: '⭐', val: s.stars, label: 'stars' },
      { icon: '🔥', val: s.dayStreak, label: 'day streak' },
      { icon: '🏅', val: `${Object.keys(s.badges).length}/${badgeTotal}`, label: 'badges' },
    ];
  });

  readonly worldMeta = computed(() => {
    const w = this.world();
    const subs = this.catService.subjectMap();
    const sub = subs[w];
    return {
      key: w,
      isSubject: Boolean(sub),
      title: sub ? `${sub.icon} ${sub.kid}` : '♥ Favorites',
      spoken: sub ? sub.say : 'Favorites',
    };
  });

  readonly worldGamesList = computed<KlgGame[]>(() => {
    if (this.view() !== 'world') return [];
    const w = this.world();
    if (w === 'favorites') {
      return this.favorites().map(id => this.catService.byId(id)).filter((g): g is KlgGame => Boolean(g));
    }
    return this.catService.gamesFor(w);
  });

  readonly worldNextUp = computed<KlgGame | null>(() => {
    if (this.view() !== 'world' || this.world() === 'favorites') return null;
    const games = this.summary().games;
    return this.worldGamesList().find(g => !(games[g.id] && games[g.id].bestStars > 0)) ?? null;
  });

  readonly pathNextText = computed(() => {
    if (this.view() !== 'world' || this.world() === 'favorites') return '';
    const next = this.worldNextUp();
    if (!next) return '🎉 You have a star in every game here!';
    const steps = this.catService.pathsMap()[next.subject]?.steps ?? [];
    const step = steps.find(s => s.game === next.id);
    return `Next up: ${step ? `${step.label} · ${next.name}` : next.name}`;
  });

  readonly renderedGames = computed<RenderedGameCard[]>(() => {
    const list = this.allGames();
    if (!list.length) return [];
    const gamesMap = this.summary().games;
    const favs = new Set(this.favorites());
    const v = this.view();
    const wList = this.worldGamesList();
    const wOrder = new Map(wList.map((g, idx) => [g.id, idx]));
    const nextUpId = this.worldNextUp()?.id ?? null;

    const q = this.search().trim().toLowerCase();
    const lvl = this.levelFilter();
    const subF = this.subjectFilter();

    return list.map((game, index) => {
      const stats = gamesMap[game.id];
      const earned = stats ? stats.bestStars : 0;
      const done = Boolean(stats && stats.bestStars > 0);
      const ages = game.levels.map(l => String(l.band));
      const agesLabel = this.catService.agesLabel(game);

      let visible = false;
      let order = index;
      if (v === 'world') {
        visible = wOrder.has(game.id);
        order = visible ? wOrder.get(game.id)! : index;
      } else if (v === 'all') {
        const text = `${game.name} ${game.blurb} Ages ${agesLabel}`.toLowerCase();
        const matchesSearch = !q || text.includes(q);
        const matchesLevel =
          lvl === 'all' || ages.includes(lvl) || (!ages.length && String(game.level) === lvl);
        const matchesSubject =
          subF === 'all' || (subF === 'favorites' ? favs.has(game.id) : game.subject === subF);
        visible = matchesSearch && matchesLevel && matchesSubject;
        order = game.level * 1000 + index;
      }

      return {
        game,
        agesLabel,
        agesBands: ages.join(','),
        stars: earned,
        starText: '⭐'.repeat(earned) + '☆'.repeat(3 - earned),
        starAria: `${earned}${earned === 1 ? ' star' : ' stars'}`,
        isNewFlag: Boolean(game.isNew && !stats),
        done,
        isNextUp: v === 'world' && game.id === nextUpId,
        favorite: favs.has(game.id),
        visible,
        order,
        spokenName: this.spokenName(game),
      };
    });
  });

  readonly visibleGamesCount = computed(() => {
    const cards = this.renderedGames();
    let count = 0;
    for (const c of cards) if (c.visible) count++;
    return count;
  });

  readonly filterStatusText = computed(() => {
    const n = this.visibleGamesCount();
    return `${n} ${n === 1 ? 'game' : 'games'}`;
  });

  readonly reportData = computed(() => {
    const games = this.catService.games();
    const paths = this.catService.pathsMap();
    const subs = this.catService.subjectMap();
    const skills = this.catService.skillNames();
    const current = this.summary();
    const review = this.reviewSummary();
    const tricky = this.progressService.tricky(10);
    if (!games.length) {
      return {
        hasPlays: false,
        practiseNames: [] as string[],
        readyNext: [] as KlgGame[],
        subjectSections: [] as Array<{ key: string; label: string; rows: SkillReportRow[] }>,
        tricky,
        reviewTotal: review.due + review.waiting,
        reviewCleared: review.cleared,
      };
    }

    const rowMap = new Map<
      string,
      { tag: string; subject: string; played: KlgGame[]; stars: number; recent: number[]; last: string }
    >();
    for (const g of games) {
      const st = current.games[g.id];
      for (const tag of g.skills) {
        let entry = rowMap.get(tag);
        if (!entry) {
          entry = { tag, subject: g.subject, played: [], stars: 0, recent: [], last: '' };
          rowMap.set(tag, entry);
        }
        if (st) {
          entry.played.push(g);
          entry.stars = Math.max(entry.stars, st.bestStars || 0);
          if ((st.lastPlayed || '') >= entry.last) {
            entry.last = st.lastPlayed || entry.last;
            entry.recent = st.recent || [];
          }
        }
      }
    }

    const skillName = (tag: string) =>
      skills[tag] || tag.split('.')[1]?.replace(/-/g, ' ') || tag;

    const allRows: SkillReportRow[] = [];
    for (const r of rowMap.values()) {
      const avgPct = r.recent.length
        ? r.recent.reduce((a, b) => a + b, 0) / r.recent.length
        : null;
      const pts =
        r.recent.length >= 2
          ? r.recent
              .map((v, i) => `${(i * (90 / (r.recent.length - 1))).toFixed(1)},${(22 - (v / 100) * 20).toFixed(1)}`)
              .join(' ')
          : '';
      allRows.push({
        tag: r.tag,
        name: skillName(r.tag),
        subject: r.subject,
        stars: r.stars,
        avgPct,
        recent: r.recent,
        sparkPoints: pts,
        sparkAria: `Last ${r.recent.length} scores: ${r.recent.join('%, ')}%`,
        last: r.last || '–',
        weak: avgPct !== null && avgPct < 60,
      });
    }

    const practiseNames = allRows.filter(r => r.weak).map(r => r.name);

    const nextGameAfter = (game: KlgGame): KlgGame | null => {
      for (const key of Object.keys(paths)) {
        const steps = paths[key].steps;
        const idx = steps.findIndex(s => s.game === game.id);
        if (idx >= 0) {
          for (let j = idx + 1; j < steps.length; j++) {
            const st = current.games[steps[j].game];
            if (!st || !st.bestStars) return this.catService.byId(steps[j].game) || null;
          }
        }
      }
      return null;
    };

    const readyNext: KlgGame[] = [];
    for (const r of rowMap.values()) {
      if (r.stars !== 3) continue;
      const done = r.played.find(g => current.games[g.id]?.bestStars === 3);
      const next = done ? nextGameAfter(done) : null;
      if (next && !readyNext.some(x => x.id === next.id)) readyNext.push(next);
    }

    const subjectSections = Object.keys(subs)
      .map(key => ({
        key,
        label: subs[key].label,
        rows: allRows.filter(r => r.subject === key && rowMap.get(r.tag)!.played.length > 0),
      }))
      .filter(s => s.rows.length > 0);

    return {
      hasPlays: current.gamesPlayed > 0,
      practiseNames,
      readyNext: readyNext.slice(0, 4),
      subjectSections,
      tricky,
      reviewTotal: review.due + review.waiting,
      reviewCleared: review.cleared,
    };
  });

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Remove auto-injected body button from sounds.js; the header renders #klg-mute-btn directly.
    const orphanMute = document.querySelector('body > #klg-mute-btn');
    if (orphanMute) orphanMute.remove();

    this.refreshState();
    this.syncFromHash();

    window.addEventListener('hashchange', () => this.syncFromHash());
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.installPromptEvent.set(e as unknown as { prompt: () => Promise<void> });
      this.refreshInstallHelp();
    });
    window.addEventListener('appinstalled', () => {
      this.justInstalled.set(true);
      this.refreshInstallHelp();
    });
  }

  refreshState(): void {
    this.favorites.set(readFavorites());
    this.progressService.refresh();
    this.soundsService.sync();
  }

  syncFromHash(): void {
    const rawHash = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
    const qIdx = rawHash.indexOf('?');
    const hashPath = qIdx >= 0 ? rawHash.slice(0, qIdx) : rawHash;
    let hashQuery = qIdx >= 0 ? rawHash.slice(qIdx + 1) : '';
    const subs = this.catService.subjectMap();

    let nextView: 'home' | 'world' | 'me' | 'all' | 'play' = 'home';
    let nextWorld = '';
    let nextGameId = '';
    let nextGameSubject = '';

    if (hashPath === 'me' || hashPath === 'all') {
      nextView = hashPath;
    } else if (hashPath.startsWith('world/')) {
      const key = hashPath.slice(6);
      if (subs[key] || key === 'favorites') {
        nextView = 'world';
        nextWorld = key;
        if (subs[key]) writePref(PATH_KEY, key);
      }
    } else if (hashPath.startsWith('play/')) {
      const id = hashPath.slice(5);
      const game = this.catService.byId(id);
      if (game && isAngularGame(id)) {
        if (!hashQuery) {
          const saved = this.progressService.readSavedQuery(game);
          if (saved) {
            hashQuery = saved;
            if (typeof history !== 'undefined' && typeof location !== 'undefined') {
              history.replaceState(null, '', `#play/${id}?${saved}`);
            }
          }
        }
        nextView = 'play';
        nextGameId = id;
        nextGameSubject = game.subject;
        writePref(PATH_KEY, game.subject);
      }
    }

    if (this.view() === 'play' && nextView !== 'play') {
      this.soundsService.cancelSpeech();
    }

    const prevGameId = this.activeGameId();
    this.view.set(nextView);
    this.world.set(nextWorld);
    this.activeGameId.set(nextGameId);
    this.activeGameQuery.set(nextGameId ? hashQuery : '');

    if (nextView === 'play' && nextGameId) {
      if (prevGameId !== nextGameId || !this.activeDefinition()) {
        this.activeDefinition.set(null);
        this.loadGameDefinition(nextGameId);
      }
    } else {
      this.loadSeq += 1;
      if (this.activeDefinition()) this.activeDefinition.set(null);
    }

    if (typeof document !== 'undefined') {
      document.body.dataset['view'] = nextView;
      document.body.dataset['world'] = nextWorld;
      if (nextView === 'play') {
        document.body.classList.remove('learning-home');
        document.body.classList.add('kid-game');
        document.body.dataset['subject'] = nextGameSubject;
      } else {
        document.body.classList.remove('kid-game');
        document.body.classList.add('learning-home');
        delete document.body.dataset['subject'];
      }
      window.scrollTo(0, 0);
      if (!this.firstRoute && nextView !== 'play') {
        queueMicrotask(() => {
          const title = document.querySelector<HTMLElement>(`.kid-view[data-view="${nextView}"] h1`);
          title?.focus({ preventScroll: true });
        });
      }
    }
    this.firstRoute = false;
  }

  gameHref(gameId: string, query?: string): string {
    const q = query ? `?${query}` : '';
    return isAngularGame(gameId) ? `#play/${gameId}${q}` : `games/${gameId}/index.html${q}`;
  }

  openGame(event: Event | null, gameId: string, query?: string): void {
    if (isAngularGame(gameId)) {
      event?.preventDefault();
      this.soundsService.click();
      const target = `#play/${gameId}${query ? `?${query}` : ''}`;
      if (typeof location !== 'undefined') {
        location.hash = target;
      }
      this.syncFromHash();
      return;
    }
    if (event === null && typeof window !== 'undefined') {
      window.location.href = this.gameHref(gameId, query);
    }
  }

  setActiveGameQuery(nextQuery: string): void {
    const id = this.activeGameId();
    if (!id) return;
    const target = `#play/${id}${nextQuery ? `?${nextQuery}` : ''}`;
    if (typeof location !== 'undefined') {
      location.hash = target;
    }
    this.syncFromHash();
  }

  private loadGameDefinition(id: string): void {
    const seq = ++this.loadSeq;
    void loadAngularQuizGame(id).then((def) => {
      if (seq === this.loadSeq && this.activeGameId() === id) {
        this.activeDefinition.set(def);
      }
    });
  }

  go(event: Event | null, hashTarget: string): void {
    event?.preventDefault();
    const clean = hashTarget.replace(/^#\/?/, '');
    if (typeof location !== 'undefined') {
      location.hash = '#' + clean;
    }
    this.syncFromHash();
  }

  worldProgress(key: string): { done: number; total: number; pct: number } {
    const list = this.catService.gamesFor(key);
    const games = this.summary().games;
    const done = list.filter(g => games[g.id] && games[g.id].bestStars > 0).length;
    const total = list.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  spokenName(game: KlgGame): string {
    return /[\u0B80-\u0BFF]/.test(game.name) ? game.blurb : game.name;
  }

  say(text: string): void {
    this.soundsService.speak(text);
  }

  toggleMuted(): void {
    this.soundsService.toggleMuted();
  }

  toggleFavorite(id: string): void {
    const cur = this.favorites();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    this.favorites.set(next);
    writePref(FAVORITES_KEY, JSON.stringify(next));
  }

  surpriseGame(): void {
    const list = this.allGames();
    if (!list.length) return;
    this.soundsService.click();
    const pick = list[Math.floor(Math.random() * list.length)];
    this.openGame(null, pick.id);
  }

  clearFilters(): void {
    this.search.set('');
    this.levelFilter.set('all');
    this.subjectFilter.set('all');
  }

  openParent(): void {
    this.refreshState();
    this.refreshOfflineStatus();
    this.refreshInstallHelp();
    this.parentOpen.set(true);
  }

  closeParent(): void {
    this.parentOpen.set(false);
  }

  async triggerInstall(): Promise<void> {
    const prompt = this.installPromptEvent();
    this.installPromptEvent.set(null);
    this.refreshInstallHelp();
    if (prompt) await prompt.prompt();
  }

  resetProgress(): void {
    if (!window.confirm('Start over? This clears your XP, stars, badges and streak on this device.')) {
      return;
    }
    this.progressService.reset();
    window.location.reload();
  }

  gameNameFor(id: string): string {
    return this.catService.byId(id)?.name ?? '';
  }

  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  private refreshOfflineStatus(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('caches' in window)) {
      this.offlineStatus.set('This browser cannot save the games for offline use.');
      return;
    }
    this.offlineStatus.set('Saving the games for offline use… keep this page open for a minute while online.');
    navigator.serviceWorker.ready
      .then(() => caches.keys())
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('klg-') || (k.startsWith('ngsw:') && k.includes(':cache')))
            .map(k => caches.open(k).then(c => c.keys()).then(list => list.length)),
        ),
      )
      .then(counts => {
        const saved = counts.reduce((sum, n) => sum + n, 0);
        if (saved > 0) {
          this.offlineStatus.set(`✓ Saved on this device for offline use (${saved} files).`);
        }
      })
      .catch(() => {
        this.offlineStatus.set('');
      });
  }

  private refreshInstallHelp(): void {
    if (typeof navigator === 'undefined') return;
    const installed = this.justInstalled() || this.isStandalone();
    const apple =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (installed) {
      this.installHelp.set('✓ Installed on this device.');
    } else if (this.installPromptEvent()) {
      this.installHelp.set('Install it to open the games from their own icon, without the browser’s address bar.');
    } else if (apple) {
      this.installHelp.set(
        'In Safari, tap Share, then Add to Home Screen. Do this early, because stars earned in Safari may not move to the installed app.',
      );
    } else {
      this.installHelp.set(
        'Open your browser’s menu and choose Install app or Add to Home screen. If neither is listed, try Chrome.',
      );
    }
  }
}

import { Injectable, computed, signal } from '@angular/core';

export interface KlgLevelDef {
  name: string;
  emoji: string;
  ages: string;
  short: string;
  say: string;
  note: string;
}

export interface KlgSubjectDef {
  label: string;
  kid: string;
  icon: string;
  say: string;
}

export interface KlgGameLevel {
  band: number;
  query: string;
}

export interface KlgGame {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  level: number;
  subject: string;
  skills: string[];
  levels: KlgGameLevel[];
  isNew?: boolean;
  v3?: boolean;
}

export interface KlgRank {
  index: number;
  name: string;
  emoji: string;
  min: number;
  next?: { index: number; name: string; emoji: string; min: number } | null;
}

export interface KlgBadge {
  id: string;
  emoji: string;
  name: string;
  hint: string;
}

export interface KlgGameStats {
  plays: number;
  bestScore: number;
  total: number;
  bestStars: number;
  bestMs: number;
  lastPlayed?: string;
  recent?: number[];
}

export interface KlgProgressSummary {
  xp: number;
  plays: number;
  dayStreak: number;
  bestDayStreak: number;
  gamesPlayed: number;
  stars: number;
  threeStarGames: number;
  games: Record<string, KlgGameStats>;
  badges: Record<string, string>;
  rank: KlgRank;
}

export interface KlgReviewGroup {
  gameId: string;
  query: string;
  count: number;
  href: string;
}

export interface KlgReviewSummary {
  due: number;
  waiting: number;
  cleared: number;
  groups: KlgReviewGroup[];
}

export interface KlgTrickyItem {
  gameId: string;
  prompt: string;
  answer: string;
  misses: number;
}

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

interface CatalogueGlobal {
  LEVELS: Record<number, KlgLevelDef>;
  SUBJECTS: Record<string, KlgSubjectDef>;
  GAMES: KlgGame[];
  PATHS: Record<string, { steps: Array<{ game: string; label: string }> }>;
  SKILL_NAMES: Record<string, string>;
  byId(id: string): KlgGame | undefined;
  agesLabel(g: KlgGame): string;
  gamesFor(subject?: string): KlgGame[];
  nextFor(games: Record<string, KlgGameStats>, prefer: string): KlgGame | null;
}

interface ProgressGlobal {
  RANKS: Array<{ name: string; emoji: string; min: number }>;
  BADGES: KlgBadge[];
  summary(): KlgProgressSummary;
  reset(): void;
  review: {
    summary(): KlgReviewSummary;
    tricky(limit?: number): KlgTrickyItem[];
  };
}

interface SoundsGlobal {
  isMuted(): boolean;
  toggleMuted(): boolean;
  click(): void;
}

const FAVORITES_KEY = 'klg-favorites';
const PATH_KEY = 'klg-path';

const EMPTY_SUMMARY: KlgProgressSummary = {
  xp: 0,
  plays: 0,
  dayStreak: 0,
  bestDayStreak: 0,
  gamesPlayed: 0,
  stars: 0,
  threeStarGames: 0,
  games: {},
  badges: {},
  rank: { index: 0, name: 'Curious Chick', emoji: '🐣', min: 0, next: { index: 1, name: 'Bright Spark', emoji: '✨', min: 250 } },
};

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
  readonly view = signal<'home' | 'world' | 'me' | 'all'>('home');
  readonly world = signal('');
  readonly summary = signal<KlgProgressSummary>(EMPTY_SUMMARY);
  readonly reviewSummary = signal<KlgReviewSummary>({ due: 0, waiting: 0, cleared: 0, groups: [] });
  readonly favorites = signal<string[]>([]);
  readonly muted = signal(false);

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

  private get cat(): CatalogueGlobal | null {
    return (window as unknown as { KlgCatalogue?: CatalogueGlobal }).KlgCatalogue ?? null;
  }

  private get prog(): ProgressGlobal | null {
    return (window as unknown as { KlgProgress?: ProgressGlobal }).KlgProgress ?? null;
  }

  private get sounds(): SoundsGlobal | null {
    return (window as unknown as { KlgSounds?: SoundsGlobal }).KlgSounds ?? null;
  }

  readonly subjects = computed(() => {
    const c = this.cat;
    if (!c) return [];
    return Object.keys(c.SUBJECTS).map(key => ({ key, ...c.SUBJECTS[key] }));
  });

  readonly badges = computed<KlgBadge[]>(() => this.prog?.BADGES ?? []);
  readonly allGames = computed<KlgGame[]>(() => this.cat?.GAMES ?? []);
  readonly totalGamesCount = computed(() => this.allGames().length);

  readonly canSpeak = (): boolean =>
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { speechSynthesis?: unknown }).speechSynthesis) &&
    typeof (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance !== 'undefined';

  readonly playNextGame = computed<KlgGame | null>(() => {
    const c = this.cat;
    if (!c) return null;
    return c.nextFor(this.summary().games, readPref(PATH_KEY, ''));
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
    const c = this.cat;
    const sub = c?.SUBJECTS[w];
    return {
      key: w,
      isSubject: Boolean(sub),
      title: sub ? `${sub.icon} ${sub.kid}` : '♥ Favorites',
      spoken: sub ? sub.say : 'Favorites',
    };
  });

  readonly worldGamesList = computed<KlgGame[]>(() => {
    const c = this.cat;
    if (!c || this.view() !== 'world') return [];
    const w = this.world();
    if (w === 'favorites') {
      return this.favorites().map(id => c.byId(id)).filter((g): g is KlgGame => Boolean(g));
    }
    return c.gamesFor(w);
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
    const steps = this.cat?.PATHS[next.subject]?.steps ?? [];
    const step = steps.find(s => s.game === next.id);
    return `Next up: ${step ? `${step.label} · ${next.name}` : next.name}`;
  });

  readonly renderedGames = computed<RenderedGameCard[]>(() => {
    const c = this.cat;
    if (!c) return [];
    const list = this.allGames();
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
      const agesLabel = c.agesLabel(game);

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
    const c = this.cat;
    const current = this.summary();
    const review = this.reviewSummary();
    const tricky = this.prog?.review.tricky(10) ?? [];
    if (!c) {
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
    for (const g of c.GAMES) {
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
      c.SKILL_NAMES[tag] || tag.split('.')[1]?.replace(/-/g, ' ') || tag;

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
      for (const key of Object.keys(c.PATHS)) {
        const steps = c.PATHS[key].steps;
        const idx = steps.findIndex(s => s.game === game.id);
        if (idx >= 0) {
          for (let j = idx + 1; j < steps.length; j++) {
            const st = current.games[steps[j].game];
            if (!st || !st.bestStars) return c.byId(steps[j].game) || null;
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

    const subjectSections = Object.keys(c.SUBJECTS)
      .map(key => ({
        key,
        label: c.SUBJECTS[key].label,
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
    if (this.prog) {
      this.summary.set(this.prog.summary());
      this.reviewSummary.set(this.prog.review.summary());
    }
    if (this.sounds) {
      this.muted.set(this.sounds.isMuted());
    }
  }

  syncFromHash(): void {
    const hash = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
    let nextView: 'home' | 'world' | 'me' | 'all' = 'home';
    let nextWorld = '';

    if (hash === 'me' || hash === 'all') {
      nextView = hash;
    } else if (hash.startsWith('world/')) {
      const key = hash.slice(6);
      if (this.cat?.SUBJECTS[key] || key === 'favorites') {
        nextView = 'world';
        nextWorld = key;
        if (this.cat?.SUBJECTS[key]) writePref(PATH_KEY, key);
      }
    }

    this.view.set(nextView);
    this.world.set(nextWorld);
    if (typeof document !== 'undefined') {
      document.body.dataset['view'] = nextView;
      document.body.dataset['world'] = nextWorld;
      window.scrollTo(0, 0);
      if (!this.firstRoute) {
        queueMicrotask(() => {
          const title = document.querySelector<HTMLElement>(`.kid-view[data-view="${nextView}"] h1`);
          title?.focus({ preventScroll: true });
        });
      }
    }
    this.firstRoute = false;
  }

  go(event: Event, hashTarget: string): void {
    event.preventDefault();
    const clean = hashTarget.replace(/^#\/?/, '');
    if (typeof location !== 'undefined') {
      location.hash = '#' + clean;
    }
    this.syncFromHash();
  }

  worldProgress(key: string): { done: number; total: number; pct: number } {
    const list = this.cat?.gamesFor(key) ?? [];
    const games = this.summary().games;
    const done = list.filter(g => games[g.id] && games[g.id].bestStars > 0).length;
    const total = list.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  spokenName(game: KlgGame): string {
    return /[\u0B80-\u0BFF]/.test(game.name) ? game.blurb : game.name;
  }

  say(text: string): void {
    if (!this.canSpeak() || !text) return;
    const synth = (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis;
    const Utterance = (window as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance })
      .SpeechSynthesisUtterance;
    synth.cancel();
    const cleaned = String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
    const utt = new Utterance(cleaned);
    utt.lang = 'en-US';
    utt.rate = 0.88;
    synth.speak(utt);
  }

  toggleMuted(): void {
    if (this.sounds) {
      const nowMuted = this.sounds.toggleMuted();
      this.muted.set(nowMuted);
      if (!nowMuted) this.sounds.click();
    }
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
    this.sounds?.click();
    const pick = list[Math.floor(Math.random() * list.length)];
    window.location.href = `games/${pick.id}/index.html`;
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
    this.prog?.reset();
    window.location.reload();
  }

  gameNameFor(id: string): string {
    return this.cat?.byId(id)?.name ?? '';
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

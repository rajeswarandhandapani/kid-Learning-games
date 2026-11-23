import { Injectable, signal } from '@angular/core';
import type { KlgGame } from './klg-catalogue.service';

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

export interface KlgReviewItem {
  id: string;
  gameId: string;
  query: string;
  snapshot: Record<string, unknown>;
  step: number;
  due: string;
  misses: number;
  prompt?: string;
  answer?: string;
}

export interface KlgTrickyItem {
  gameId: string;
  prompt: string;
  answer: string;
  misses: number;
}

export interface KlgRecordResult {
  gameId: string;
  score: number;
  total: number;
  elapsedMs?: number;
  bestStreak?: number;
  mode?: string;
  beeChampion?: boolean;
}

export interface KlgRecordOutcome {
  xp: number;
  totalXp: number;
  rank: KlgRank;
  rankUp: boolean;
  stars?: number;
  bestStars?: number;
  isBest?: boolean;
  newBadges: KlgBadge[];
  dayStreak: number;
  toNextRank: number;
}

export interface KlgSavedLevels {
  band: number;
  games: Record<string, string>;
}

interface ProgressGlobal {
  RANKS: Array<{ name: string; emoji: string; min: number }>;
  BADGES: KlgBadge[];
  summary(): KlgProgressSummary;
  gameStats(id: string): KlgGameStats | null;
  record(result: KlgRecordResult): KlgRecordOutcome;
  reset(): void;
  review: {
    summary(): KlgReviewSummary;
    tricky(limit?: number): KlgTrickyItem[];
    dueHere(limit?: number, opts?: { gameId?: string; query?: string }): KlgReviewItem[];
    miss(item: { gameId?: string; query?: string; key: string; snapshot: unknown; prompt?: string; answer?: string }): string | null;
    answered(id: string, correct: boolean): 'cleared' | 'later' | 'again';
    finish(result: { right: number; cleared: number }): KlgRecordOutcome;
  };
}

const LEVELS_KEY = 'klg-game-levels';

export const EMPTY_SUMMARY: KlgProgressSummary = {
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

/**
 * Reactive Angular service wrapping window.KlgProgress (klg-progress-v1, klg-review-v1)
 * plus safe helpers for legacy level preferences (klg-game-levels) and best-time keys.
 */
@Injectable({ providedIn: 'root' })
export class KlgProgressService {
  readonly revision = signal(0);
  readonly summary = signal<KlgProgressSummary>(EMPTY_SUMMARY);
  readonly reviewSummary = signal<KlgReviewSummary>({ due: 0, waiting: 0, cleared: 0, groups: [] });

  constructor() {
    this.refresh();
  }

  private global(): ProgressGlobal | undefined {
    return (window as unknown as { KlgProgress?: ProgressGlobal }).KlgProgress;
  }

  refresh(): void {
    const p = this.global();
    try {
      this.summary.set(p ? p.summary() : EMPTY_SUMMARY);
    } catch {
      this.summary.set(EMPTY_SUMMARY);
    }
    try {
      this.reviewSummary.set(p?.review ? p.review.summary() : { due: 0, waiting: 0, cleared: 0, groups: [] });
    } catch {
      this.reviewSummary.set({ due: 0, waiting: 0, cleared: 0, groups: [] });
    }
    this.revision.update((n) => n + 1);
  }

  ranks(): Array<{ name: string; emoji: string; min: number }> {
    return this.global()?.RANKS || [];
  }

  badges(): KlgBadge[] {
    return this.global()?.BADGES || [];
  }

  gameStats(id: string): KlgGameStats | null {
    try {
      return this.global()?.gameStats(id) || null;
    } catch {
      return null;
    }
  }

  tricky(limit = 10): KlgTrickyItem[] {
    try {
      return this.global()?.review.tricky(limit) || [];
    } catch {
      return [];
    }
  }

  reset(): void {
    try {
      this.global()?.reset();
    } catch {
      /* ignore */
    }
    this.refresh();
  }

  record(result: KlgRecordResult): KlgRecordOutcome | null {
    const p = this.global();
    if (!p) return null;
    const outcome = p.record(result);
    this.refresh();
    return outcome;
  }

  reviewDueFor(gameId: string, query: string, limit = 10): KlgReviewItem[] {
    try {
      return this.global()?.review.dueHere(limit, { gameId, query }) || [];
    } catch {
      return [];
    }
  }

  recordMiss(item: {
    gameId: string;
    query: string;
    key: string;
    snapshot: unknown;
    prompt?: string;
    answer?: string;
  }): string | null {
    const p = this.global();
    if (!p?.review) return null;
    const id = p.review.miss(item);
    this.refresh();
    return id;
  }

  recordReviewAnswer(id: string, correct: boolean): 'cleared' | 'later' | 'again' {
    const p = this.global();
    if (!p?.review) return 'again';
    const outcome = p.review.answered(id, correct);
    this.refresh();
    return outcome;
  }

  finishReview(result: { right: number; cleared: number }): KlgRecordOutcome | null {
    const p = this.global();
    if (!p?.review) return null;
    const outcome = p.review.finish(result);
    this.refresh();
    return outcome;
  }

  readSavedLevels(): KlgSavedLevels {
    try {
      const saved = JSON.parse(localStorage.getItem(LEVELS_KEY) || 'null');
      if (saved && typeof saved === 'object' && saved.games && typeof saved.games === 'object') {
        return { band: Number(saved.band) || 0, games: saved.games as Record<string, string> };
      }
    } catch {
      /* storage disabled */
    }
    return { band: 0, games: {} };
  }

  /** Resolves the saved or age-nearest query for a game when opened with empty settings. */
  readSavedQuery(game: KlgGame): string | null {
    if (!game.levels.length) return null;
    const saved = this.readSavedLevels();
    const direct = saved.games[game.id];
    if (typeof direct === 'string') return direct;
    if (saved.band) {
      const closest = game.levels.slice().sort((a, b) => Math.abs(a.band - saved.band) - Math.abs(b.band - saved.band))[0];
      return closest ? closest.query : null;
    }
    return null;
  }

  saveLevel(gameId: string, band: number, query: string): void {
    const saved = this.readSavedLevels();
    saved.band = band;
    saved.games[gameId] = query;
    try {
      localStorage.setItem(LEVELS_KEY, JSON.stringify(saved));
    } catch {
      /* storage disabled */
    }
  }

  loadBestMs(key: string): number | null {
    try {
      const v = parseInt(localStorage.getItem(key) || '', 10);
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  }

  saveBestMs(key: string, ms: number): void {
    try {
      localStorage.setItem(key, String(ms));
    } catch {
      /* storage disabled */
    }
  }
}

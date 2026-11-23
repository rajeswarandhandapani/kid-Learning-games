import { Injectable } from '@angular/core';

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

export interface KlgPath {
  title?: string;
  eyebrow?: string;
  note?: string;
  steps: Array<{ game: string; label: string }>;
}

interface CatalogueGlobal {
  LEVELS: Record<number, KlgLevelDef>;
  SUBJECTS: Record<string, KlgSubjectDef>;
  GAMES: KlgGame[];
  PATHS: Record<string, KlgPath>;
  SKILL_NAMES: Record<string, string>;
  byId(id: string): KlgGame | undefined;
  agesLabel(g: KlgGame): string;
  gamesFor(subject?: string): KlgGame[];
  nextFor(games: Record<string, { bestStars?: number }>, prefer: string): KlgGame | null;
  nextAfter(id: string, games: Record<string, { bestStars?: number }>): KlgGame | null;
}

/** Angular wrapper around the shared window.KlgCatalogue metadata and ordering helpers. */
@Injectable({ providedIn: 'root' })
export class KlgCatalogueService {
  private global(): CatalogueGlobal | undefined {
    return (window as unknown as { KlgCatalogue?: CatalogueGlobal }).KlgCatalogue;
  }

  games(): KlgGame[] {
    return this.global()?.GAMES || [];
  }

  subjectMap(): Record<string, KlgSubjectDef> {
    return this.global()?.SUBJECTS || {};
  }

  subjects(): Array<KlgSubjectDef & { key: string }> {
    const map = this.subjectMap();
    return Object.entries(map).map(([key, def]) => ({ key, ...def }));
  }

  levelsMap(): Record<number, KlgLevelDef> {
    return this.global()?.LEVELS || {};
  }

  pathsMap(): Record<string, KlgPath> {
    return this.global()?.PATHS || {};
  }

  skillNames(): Record<string, string> {
    return this.global()?.SKILL_NAMES || {};
  }

  byId(id: string): KlgGame | undefined {
    return this.global()?.byId(id);
  }

  gamesFor(subject?: string): KlgGame[] {
    return this.global()?.gamesFor(subject) || [];
  }

  nextFor(games: Record<string, { bestStars?: number }>, prefer: string): KlgGame | null {
    return this.global()?.nextFor(games, prefer) || null;
  }

  nextAfter(id: string, games: Record<string, { bestStars?: number }>): KlgGame | null {
    return this.global()?.nextAfter(id, games) || null;
  }

  agesLabel(game: KlgGame): string {
    return this.global()?.agesLabel(game) || '';
  }
}

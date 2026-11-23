import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { KlgCatalogueService, type KlgGame, type KlgGameLevel } from '../core/klg-catalogue.service';
import { KlgProgressService } from '../core/klg-progress.service';
import { KlgSoundsService } from '../core/klg-sounds.service';

/**
 * Shared top navbar and age-level selector for Angular-hosted games,
 * matching the styling contract in assets/css/common.css (.kid-game).
 */
@Component({
  selector: 'klg-game-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="navbar navbar-dark klg-navbar mb-4">
      <div class="container">
        <a
          class="navbar-brand"
          [href]="'#world/' + game().subject"
          aria-label="Home: choose another game"
          (click)="onHome($event)"
        >🏠 Home</a>
        <span class="navbar-text text-white kid-game-name">{{ game().icon }} {{ game().name }}</span>
        <button
          type="button"
          id="klg-mute-btn"
          class="klg-mute-btn"
          [attr.aria-label]="sounds.muted() ? 'Turn sound on' : 'Turn sound off'"
          (click)="sounds.toggleMuted()"
        >{{ sounds.muted() ? '🔇' : '🔊' }}</button>
      </div>
    </nav>
  `,
})
export class GameTopBarComponent {
  readonly game = input.required<KlgGame>();
  readonly goHome = output<string>();

  protected readonly sounds = inject(KlgSoundsService);

  protected onHome(event: Event): void {
    event.preventDefault();
    this.sounds.cancelSpeech();
    this.sounds.click();
    this.goHome.emit(this.game().subject);
  }
}

/** Age-band pill row rendered on the start screen inside .kid-levels. */
@Component({
  selector: 'klg-level-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (levels().length > 1) {
      <nav class="kid-levels" aria-label="Choose a level">
        <span class="kid-levels-label">Age</span>
        @for (item of levels(); track item.level.band) {
          <a
            class="kid-level"
            [href]="item.href"
            [attr.data-band]="item.level.band"
            [attr.aria-label]="item.ages"
            [attr.aria-current]="item.active ? 'true' : null"
            (click)="selectLevel($event, item.level, item.nextQuery)"
          >
            <span class="kid-level-pic">{{ item.emoji }}</span>
            <b>{{ item.short }}</b>
          </a>
        }
      </nav>
    }
  `,
})
export class GameLevelRowComponent {
  readonly game = input.required<KlgGame>();
  readonly query = input<string>('');
  readonly selectQuery = output<string>();

  private readonly catalogue = inject(KlgCatalogueService);
  private readonly progress = inject(KlgProgressService);
  private readonly sounds = inject(KlgSoundsService);

  private readonly levelKeys = computed(() => {
    const keys = new Set<string>();
    for (const level of this.game().levels) {
      for (const [k] of new URLSearchParams(level.query).entries()) keys.add(k);
    }
    return [...keys];
  });

  protected readonly levels = computed(() => {
    const g = this.game();
    if (g.levels.length < 2) return [];
    const defs = this.catalogue.levelsMap();
    const keys = this.levelKeys();
    const currentParams = new URLSearchParams(this.query());

    const activeLevel =
      g.levels.find((lvl) => {
        const wanted = [...new URLSearchParams(lvl.query).entries()];
        return (
          wanted.every(([k, v]) => currentParams.get(k) === v) &&
          keys.every((k) => wanted.some(([wk]) => wk === k) || !currentParams.has(k))
        );
      }) ||
      g.levels.find((lvl) => lvl.band === g.level) ||
      null;

    return g.levels.map((level) => {
      const info = defs[level.band] || { ages: '', emoji: '', short: String(level.band) };
      const next = new URLSearchParams(this.query());
      next.delete('review');
      keys.forEach((k) => next.delete(k));
      for (const [k, v] of new URLSearchParams(level.query).entries()) next.set(k, v);
      const nextQuery = next.toString();
      return {
        level,
        ages: info.ages,
        emoji: info.emoji,
        short: info.short,
        active: level === activeLevel,
        nextQuery,
        href: `#play/${g.id}${nextQuery ? '?' + nextQuery : ''}`,
      };
    });
  });

  protected selectLevel(event: Event, level: KlgGameLevel, nextQuery: string): void {
    event.preventDefault();
    this.sounds.click();
    this.progress.saveLevel(this.game().id, level.band, level.query);
    this.selectQuery.emit(nextQuery);
  }
}

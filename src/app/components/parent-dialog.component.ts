import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { KlgHubService } from '../services/klg-hub.service';

@Component({
  selector: 'klg-parent-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg id="parent-dialog" (cancel)="onCancel($event)">
      <div class="dialog-heading">
        <h2>For grown-ups</h2>
        <button id="parent-close" type="button" aria-label="Close grown-up information" (click)="hub.closeParent()">
          ✕
        </button>
      </div>

      <p>
        Your child chooses an age on the first visit, and the games follow it. Ages are a guide, not a limit: tap
        the age at the top of the page, or Easier and Harder under a subject's games, to change it.
        <a id="see-all-grownup" href="#all" (click)="seeAll($event)">See and search all {{ hub.totalGamesCount() }} games</a>.
      </p>

      <h3>Learning without pressure</h3>
      <p>
        Every game starts in untimed practice. Children can read feedback and move on when ready. A timed challenge
        is optional, under More ways to play.
      </p>

      <h3>Progress &amp; privacy</h3>
      <p>
        Stars, favorites, and achievements are saved in this browser. They are not synced between devices. Clearing
        browser data removes them.
      </p>

      <h3>Use it like an app, even offline</h3>
      <p>
        Every game, picture and Tamil recording is saved on this device the first time you visit, so the games keep
        working without internet.
      </p>
      <p id="offline-status" class="small">{{ hub.offlineStatus() }}</p>
      <p id="install-help">{{ hub.installHelp() }}</p>
      <button
        type="button"
        id="install-app"
        class="install-app"
        [hidden]="!hub.showInstallBtn()"
        (click)="hub.triggerInstall()"
      >
        Install Little Learners
      </button>

      <p id="parent-summary">
        {{ hub.summary().gamesPlayed }} activities explored · {{ hub.summary().plays }} rounds completed ·
        {{ hub.summary().stars }} stars earned.
      </p>

      <div id="parent-report">
        <h3>Progress report</h3>
        @if (!hub.reportData().hasPlays) {
          <p>No rounds yet. Once your child plays, you will see stars and recent scores for each skill here.</p>
        } @else {
          <p class="report-summary">
            <b>Needs practice:</b>
            {{ hub.reportData().practiseNames.length ? hub.reportData().practiseNames.join(', ') : 'nothing right now 🎉' }}
            <br />
            <b>Ready for next:</b>
            @if (hub.reportData().readyNext.length) {
              @for (g of hub.reportData().readyNext; track g.id; let last = $last) {
                <a [href]="'games/' + g.id + '/index.html'">{{ g.icon }} {{ g.name }}</a>@if (!last) {, }
              }
            } @else {
              keep earning stars on the current games
            }
          </p>

          @for (section of hub.reportData().subjectSections; track section.key) {
            <h4>{{ section.label }}</h4>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Stars</th>
                  <th>Recent scores</th>
                  <th>Last played</th>
                </tr>
              </thead>
              <tbody>
                @for (r of section.rows; track r.tag) {
                  <tr [class.weak]="r.weak">
                    <td>{{ r.name }}</td>
                    <td>{{ '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars) }}</td>
                    <td>
                      @if (r.recent.length >= 2) {
                        <svg class="spark" viewBox="0 0 90 24" role="img" [attr.aria-label]="r.sparkAria">
                          <polyline [attr.points]="r.sparkPoints" fill="none" stroke="#4055b5" stroke-width="2" />
                        </svg>
                        <small> {{ Math.round(r.avgPct || 0) }}% avg</small>
                      } @else if (r.avgPct !== null) {
                        <small>{{ Math.round(r.avgPct) }}% avg</small>
                      } @else {
                        –
                      }
                    </td>
                    <td>{{ r.last }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          @if (hub.reportData().tricky.length) {
            <h4>🔁 Tricky questions</h4>
            <p class="report-note">
              {{ hub.reportData().reviewTotal }} saved for review, {{ hub.reportData().reviewCleared }} mastered so far.
            </p>
            <table class="report-table report-tricky">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Missed</th>
                </tr>
              </thead>
              <tbody>
                @for (item of hub.reportData().tricky; track $index) {
                  <tr>
                    <td>
                      {{ item.prompt }}
                      @if (hub.gameNameFor(item.gameId); as gName) {
                        <small>{{ gName }}</small>
                      }
                    </td>
                    <td>{{ item.answer || '–' }}</td>
                    <td>{{ item.misses }}×</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <button type="button" class="print-report" id="print-report" (click)="printReport()">
            Print this report
          </button>
        }
      </div>

      <button id="reset-progress" type="button" class="reset-button" (click)="hub.resetProgress()">
        Reset learning progress
      </button>
      <p class="small">This removes earned progress on this browser after confirmation.</p>

      <h3>Badges</h3>
      <div id="parent-badge-list" class="parent-badges">
        @for (badge of hub.badges(); track badge.id) {
          <div class="parent-badge">
            {{ badge.emoji }} {{ badge.name }} · {{ hub.summary().badges[badge.id] ? 'earned' : badge.hint }}
          </div>
        }
      </div>
    </dialog>
  `,
})
export class ParentDialogComponent {
  readonly hub = inject(KlgHubService);
  private readonly dlgRef = viewChild<ElementRef<HTMLDialogElement>>('dlg');
  readonly Math = Math;

  constructor() {
    effect(() => {
      const open = this.hub.parentOpen();
      const el = this.dlgRef()?.nativeElement;
      if (!el) return;
      if (open && !el.open) el.showModal();
      else if (!open && el.open) el.close();
    });
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.hub.closeParent();
  }

  seeAll(event: Event): void {
    this.hub.closeParent();
    this.hub.go(event, 'all');
  }

  printReport(): void {
    window.print();
  }
}

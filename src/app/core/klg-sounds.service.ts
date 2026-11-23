import { Injectable, signal } from '@angular/core';

interface SoundsGlobal {
  isMuted(): boolean;
  setMuted(value: boolean): void;
  toggleMuted(): boolean;
  click(): void;
  correct(streak?: number): void;
  wrong(): void;
  timeUp(): void;
  tick(): void;
  fanfare(): void;
  newRecord(): void;
}

/** Angular service wrapping Web Audio sound effects (window.KlgSounds) and speech synthesis. */
@Injectable({ providedIn: 'root' })
export class KlgSoundsService {
  readonly muted = signal(this.readMuted());

  private global(): SoundsGlobal | undefined {
    return (window as unknown as { KlgSounds?: SoundsGlobal }).KlgSounds;
  }

  private readMuted(): boolean {
    try {
      return !!this.global()?.isMuted();
    } catch {
      return false;
    }
  }

  sync(): void {
    this.muted.set(this.readMuted());
  }

  toggleMuted(): boolean {
    const sounds = this.global();
    const nowMuted = sounds ? sounds.toggleMuted() : !this.muted();
    this.muted.set(nowMuted);
    if (!nowMuted) this.click();
    return nowMuted;
  }

  click(): void {
    try {
      this.global()?.click();
    } catch {
      /* audio context unavailable */
    }
  }

  correct(streak = 1): void {
    try {
      this.global()?.correct(streak);
    } catch {
      /* audio context unavailable */
    }
  }

  wrong(): void {
    try {
      this.global()?.wrong();
    } catch {
      /* audio context unavailable */
    }
  }

  timeUp(): void {
    try {
      this.global()?.timeUp();
    } catch {
      /* audio context unavailable */
    }
  }

  tick(): void {
    try {
      this.global()?.tick();
    } catch {
      /* audio context unavailable */
    }
  }

  fanfare(): void {
    try {
      this.global()?.fanfare();
    } catch {
      /* audio context unavailable */
    }
  }

  newRecord(): void {
    try {
      this.global()?.newRecord();
    } catch {
      /* audio context unavailable */
    }
  }

  canSpeak(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  speak(text: string, rate = 0.88): void {
    if (!this.canSpeak() || !text) return;
    try {
      window.speechSynthesis.cancel();
      const cleaned = String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
      if (!cleaned) return;
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = 'en-US';
      u.rate = rate;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable */
    }
  }

  cancelSpeech(): void {
    if (!this.canSpeak()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export interface MathVisGlobal {
  groups(count: number, each: number, emoji: string, opts?: { holder?: string; label?: string }): HTMLElement;
  array(rows: number, cols: number, emoji?: string, opts?: { label?: string }): HTMLElement;
  numberLine(opts: { step: number; hops: number; max?: number; back?: boolean; hideEnd?: boolean; label?: string }): HTMLElement;
  circled(total: number, groupSize: number, emoji?: string, opts?: { label?: string }): HTMLElement;
  share(total: number, people: number, emoji: string, opts?: { label?: string }): HTMLElement;
  triangle(product: number, a: number, b: number, hidden: string | null): HTMLElement;
  pile(count: number, emoji: string, opts?: { label?: string }): HTMLElement;
  figure(label: string, className: string): HTMLElement;
  el(name: string, attrs: Record<string, string | number>, text?: string): Element;
  HOLDER_WORD: Record<string, string>;
  numberChoices(answer: number, mistakes: number[]): number[];
}

export interface BlocksGlobal {
  tenFrame(n: number, opts?: { emoji?: string; split?: number; crossed?: number; label?: string }): HTMLElement;
  blocks(n: number, opts?: { compact?: boolean; highlight?: string; label?: string }): HTMLElement;
  chart(n: number, opts?: { label?: string }): HTMLElement;
}

export interface ShapesGlobal {
  polygon(name: string, opts?: { label?: string }): HTMLElement;
  solid(name: string, opts?: { label?: string }): HTMLElement;
  SIDES: Record<string, number>;
  FACES: Record<string, { faces: number; edges: number; corners: number; flat: number; curved: number }>;
}

export interface FracVisGlobal {
  pie(n: number, d: number, opts?: { label?: string }): HTMLElement;
  bar(n: number, d: number, opts?: { label?: string }): HTMLElement;
  set(n: number, d: number, emoji: string, opts?: { label?: string }): HTMLElement;
  line(n: number, d: number, opts?: { max?: number; label?: string }): HTMLElement;
  stacked(list: Array<[number, number]>, opts?: { label?: string }): HTMLElement;
}

export interface ClockGlobal {
  face(h: number, m: number, opts?: { label?: string }): HTMLElement;
  handAngles(h: number, m: number): { hour: number; minute: number };
  digital(h: number, m: number): string;
  spoken(h: number, m: number): string;
  timeline(startMin: number, durMin: number, opts?: { label?: string }): HTMLElement;
  fmt(min: number): string;
}

export interface MoneyVisGlobal {
  tray(list: number[], opts?: { label?: string }): HTMLElement;
  describe(list: number[]): string;
  sum(list: number[]): number;
  fmt(cents: number): string;
  greedy(cents: number): number[];
  tag(emoji: string, name: string, cents: number): HTMLElement;
}

export interface MeasureVisGlobal {
  ruler(len: number, opts?: { unit?: string; emoji?: string; max?: number; label?: string }): HTMLElement;
  balance(left: number, right: number, opts?: { leftEmoji?: string; rightEmoji?: string; label?: string }): HTMLElement;
  jug(fill: number, max: number, opts?: { unit?: string; label?: string }): HTMLElement;
  thermometer(temp: number, opts?: { min?: number; max?: number; label?: string }): HTMLElement;
}

function winGlobal<T>(key: string): T | undefined {
  return (window as unknown as Record<string, T | undefined>)[key];
}

export const klgMathVis = () => winGlobal<MathVisGlobal>('KlgMathVis');
export const klgBlocks = () => winGlobal<BlocksGlobal>('KlgBlocks');
export const klgShapes = () => winGlobal<ShapesGlobal>('KlgShapes');
export const klgFracVis = () => winGlobal<FracVisGlobal>('KlgFractionVis') || winGlobal<FracVisGlobal>('KlgFracVis');
export const klgClock = () => winGlobal<ClockGlobal>('KlgClock');
export const klgMoneyVis = () => winGlobal<MoneyVisGlobal>('KlgMoneyVis');
export const klgMeasureVis = () => winGlobal<MeasureVisGlobal>('KlgMeasureVis');

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick<T>(array: readonly T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/** Answer plus three distinct non-negative wrong choices. */
export function numericChoices(answer: number, candidates: readonly number[]): number[] {
  const wrongs: number[] = [];
  for (const value of candidates) {
    if (Number.isInteger(value) && value >= 0 && value !== answer && !wrongs.includes(value)) {
      wrongs.push(value);
    }
    if (wrongs.length === 3) break;
  }
  let filler = answer + 2;
  while (wrongs.length < 3) {
    if (filler !== answer && filler > 0 && !wrongs.includes(filler)) wrongs.push(filler);
    filler += 1;
  }
  return shuffle([answer, ...wrongs]);
}

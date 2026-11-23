export interface MathVisGlobal {
  array(rows: number, cols: number, emoji?: string): Node;
  circled(total: number, groupSize: number, emoji?: string): Node;
}

export interface BlocksGlobal {
  tenFrame(n: number, opts?: { emoji?: string; split?: number; crossed?: number }): HTMLElement;
  blocks(n: number, opts?: { compact?: boolean }): HTMLElement;
}

export function klgMathVis(): MathVisGlobal | undefined {
  return (window as unknown as { KlgMathVis?: MathVisGlobal }).KlgMathVis;
}

export function klgBlocks(): BlocksGlobal | undefined {
  return (window as unknown as { KlgBlocks?: BlocksGlobal }).KlgBlocks;
}

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

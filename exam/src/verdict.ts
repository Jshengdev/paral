export type Verdict = {
  criterion: string;   // C1 to C17 from the video and the team, U2 to U7 for use
  step: number;        // which ask of the scenario, from 0
  pass: boolean | null; // null: this run could not show it either way
  what: string;        // the claim, in plain words
  measured: string;    // what the run showed
  limit?: string;      // the bar, and where the bar comes from
};

export const yes = (criterion: string, step: number, what: string, measured: string, limit?: string): Verdict => ({ criterion, step, pass: true, what, measured, limit });
export const no = (criterion: string, step: number, what: string, measured: string, limit?: string): Verdict => ({ criterion, step, pass: false, what, measured, limit });
export const unseen = (criterion: string, step: number, what: string, measured: string): Verdict => ({ criterion, step, pass: null, what, measured });

export const within = (criterion: string, step: number, what: string, ms: number | null, limitMs: number, source: string): Verdict =>
  ms === null ? no(criterion, step, what, "it never happened", `${limitMs} ms (${source})`)
    : { criterion, step, pass: ms <= limitMs, what, measured: `${Math.round(ms)} ms`, limit: `${limitMs} ms (${source})` };

/** One value paral runs on: the value, why it has that value, and what was measured. */
export type Setting<T> = { value: T; why: string; measured: string };

/** One rung of the hint ladder: what a hint of this strength may do, in how many sentences, and the fixed line that is always safe to say. */
export type Rung = { name: string; may: string; sentences: number; safe: string };

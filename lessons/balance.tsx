// A lesson: an equation is a balance. Whatever is added to one pan is added to the other, and it stays level.
// Rendered by raea from the data beside it (lesson.gen.ts, written by render.ts). Every moving thing reads the frame.
import { AbsoluteFill, Composition, Easing, interpolate, registerRoot, useCurrentFrame } from "raea";
import lesson from "./lesson.gen";

const FPS = 30;
const W = 960;
const H = 540;
const INK = lesson.ink;
const ACCENT = lesson.accent;
const at = (seconds: number) => Math.round(seconds * FPS);
const DROP = [at(1.8), at(2.5)] as const;   // the same thing lands on both pans, together
const SETTLE = [at(4.2), at(4.9)] as const; // each side becomes its simpler form
const END = at(8);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, [from, to]: readonly [number, number], out: [number, number]) =>
  interpolate(f, [from, to], out, { ...clamp, easing: Easing.out(Easing.cubic) });

function Pan({ x, before, after, add }: { x: number; before: string; after: string; add: string }) {
  const f = useCurrentFrame();
  const dip = f < DROP[1] ? 0 : interpolate(f, [DROP[1], DROP[1] + 5, DROP[1] + 14], [0, 7, 0], clamp);
  const settled = f >= SETTLE[1];
  return (
    <div style={{ position: "absolute", left: x - 170, top: 150 + dip, width: 340, textAlign: "center", color: INK }}>
      <div style={{ fontSize: 72, fontWeight: 600, height: 96 }}>
        {settled ? after : before}
        {f >= DROP[0] && !settled ? <span style={{ color: ACCENT, opacity: ease(f, DROP, [0, 1]) }}> {add}</span> : null}
      </div>
      <div style={{ margin: "14px auto 0", width: 250, height: 8, borderRadius: 4, background: INK }} />
      <div style={{ margin: "0 auto", width: 4, height: 54, background: INK }} />
    </div>
  );
}

function Balance() {
  const f = useCurrentFrame();
  const caption = f < DROP[0] ? lesson.say[0] : f < SETTLE[1] ? lesson.say[1] : lesson.say[2];
  return (
    <AbsoluteFill style={{ background: lesson.ground, fontFamily: "Helvetica Neue, Helvetica, sans-serif" }}>
      <Pan x={250} before={lesson.left} after={lesson.leftAfter} add={lesson.add} />
      <Pan x={710} before={lesson.right} after={lesson.rightAfter} add={lesson.add} />
      <div style={{ position: "absolute", left: 250, top: 322, width: 460, height: 8, borderRadius: 4, background: INK }} />
      <div style={{ position: "absolute", left: 462, top: 330, width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderBottom: `44px solid ${INK}` }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 410, textAlign: "center", fontSize: 54, color: INK }}>{caption}</div>
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="balance" width={W} height={H} fps={FPS} durationInFrames={END} component={Balance} />);

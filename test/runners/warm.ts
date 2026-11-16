// The runner for the row about keeping a page's pages ahead of an ask, with a stand-in where Claude would be.
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../../mind/adapters/anthropic.ts";
import { empty } from "../../mind/cores/hold.ts";
import { together, type KeptPage } from "../../mind/cores/page.ts";
import type { Asked } from "../../mind/ports.ts";
import { settings } from "../../mind/settings.ts";

type Block = { type: string; text?: string; source?: { data: string } };
type Request = { model: string; max_tokens: number; system: string; betas: string[]; fallbacks: string; output_config: unknown; messages: { content: Block[] }[] };

const REPLY = { problem: "What is first on this page?", breakIndex: null, breakLine: null, result: null, lesson: null, board: null, beats: [{ mark: null, say: "The application is first." }], spots: [] };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const tick = () => new Promise((done) => setTimeout(done, 0));

/**
 * Warms the first page's pages twice, asks on that page, warms the second page's, asks on the third and then warms
 * it; and counts what a mind with the switch off, and one that has spent its share of the cap, sends.
 */
export async function warmed(input: { pages: KeptPage[]; today: number }) {
  const [first, second, third] = input.pages.map((page) => together(page, input.pages));
  const asked = (known: KeptPage[]): Asked => ({ words: "what is first?", picturePath: null, lines: ["a line of his screen"], circled: [], leadIn: "", saidFirst: null, today: input.today, known, ahead: [], spots: [], lessons: [], lesson: empty, rung: settings.ladder.value[0], fresh: true });
  function mind(changed: typeof settings, keptTokens: number) {
    const warms: Request[] = [];
    const asks: Request[] = [];
    const client = {
      beta: {
        messages: {
          create: async (params: Request) => (warms.push(params), { model: params.model, usage: { input_tokens: 10, output_tokens: 1, cache_creation_input_tokens: keptTokens } }),
          stream: (params: Request) => (asks.push(params), { on: () => {}, finalMessage: async () => ({ model: params.model, stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 }, content: [{ type: "text", text: JSON.stringify(REPLY) }] }) }),
        },
      },
    } as unknown as Anthropic;
    const logged: string[] = [];
    return { warms, asks, logged, brain: anthropic(changed, { answer: "the answer prompt", secondLook: "", opener: "", glance: "" }, (line) => logged.push(line), client).brain };
  }
  const signal = new AbortController().signal;

  const on = mind(settings, 1000);
  on.brain.warm!(first, input.today);
  on.brain.warm!(first, input.today);
  await tick();
  const afterTwoLooks = on.warms.length;
  await on.brain.answer(asked(first), signal);
  on.brain.warm!(second, input.today);
  await on.brain.answer(asked(third), signal);
  on.brain.warm!(third, input.today);
  await tick();
  const [warm, ask] = [on.warms[0], on.asks[0]];
  const blocks = warm.messages[0].content;

  const off = mind({ ...settings, warmPages: { ...settings.warmPages, value: false } } as unknown as typeof settings, 1000);
  off.brain.warm!(first, input.today);
  // One keeping of two million tokens is more than the cap's share by the adapter's own count.
  const spent = mind(settings, 2_000_000);
  spent.brain.warm!(first, input.today);
  await tick();
  spent.brain.warm!(second, input.today);
  await tick();

  return {
    requestsAfterTwoLooksOfOnePage: afterTwoLooks,
    requestsInAll: on.warms.length,
    theSecondPageIsWarmedWithItsOwnPagesFirst: on.warms[1]?.messages[0].content[0].text?.includes(`Page "${input.pages[1].title}"`) === true && on.warms[1].messages[0].content[0].text !== blocks[0].text,
    aPageAlreadyAskedAboutIsNotWarmed: !on.warms.some((sent) => same(sent.messages[0].content[0], on.asks[1].messages[0].content[0])),
    sameAsAnAsk: { model: warm.model === ask.model, system: warm.system === ask.system, betas: same(warm.betas, ask.betas), fallbacks: warm.fallbacks === ask.fallbacks, outputConfig: same(warm.output_config, ask.output_config), pagesBlock: same(blocks[0], ask.messages[0].content[0]) },
    maxTokens: warm.max_tokens,
    blocks: blocks.map((block) => block.type),
    thePictureIsOneDot: (blocks[1].source?.data.length ?? 0) < 200,
    theWordsAreOneDot: blocks[2].text,
    holdsNothingOfHisScreenOrWords: !JSON.stringify(warm).includes("a line of his screen") && !JSON.stringify(warm).includes("what is first?"),
    logged: on.logged.filter((line) => line.includes("kept ahead")),
    requestsWithTheSwitchOff: off.warms.length,
    requestsOnceTheShareOfTheCapIsSpent: spent.warms.length,
  };
}

import { tmpdir } from "node:os";

/**
 * The folder the mind writes his files into: the calendar file, the notes page and its cut-out pictures. The real
 * app's mind writes to the Mac's temporary folder, under fixed names, where the app looks for them. A row or a
 * scripted run names a folder of its own (PARAL_OUT), so a check run on the same Mac never writes over the page or
 * the date his app has just opened.
 */
export const outbox = (): string => process.env.PARAL_OUT ?? tmpdir();

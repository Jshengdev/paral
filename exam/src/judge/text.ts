/** Text as it is compared: lower case, every kind of dash as a hyphen, one space between words. */
export const plain = (text: string) => text.toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, " ");

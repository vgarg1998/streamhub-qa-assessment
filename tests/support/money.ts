export function parseInr(text: string): number {
  const cleaned = text.replace(/[^\d.]/g, "");
  if (!cleaned) {
    throw new Error(`Could not read an amount from "${text}"`);
  }
  return Number(cleaned);
}

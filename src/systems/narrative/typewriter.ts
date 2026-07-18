export const STELE_CHARACTER_INTERVAL_MS = 18;

export function getVisibleCharacterCount(
  text: string,
  elapsedMilliseconds: number,
  skipped = false,
): number {
  if (skipped) return text.length;
  const elapsed = Number.isFinite(elapsedMilliseconds)
    ? Math.max(0, elapsedMilliseconds)
    : 0;
  return Math.min(
    text.length,
    Math.floor(elapsed / STELE_CHARACTER_INTERVAL_MS),
  );
}


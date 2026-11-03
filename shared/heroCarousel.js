export const DEFAULT_HERO_INTERVAL_SECONDS = 3;
export const MIN_HERO_INTERVAL_SECONDS = 1;
export const MAX_HERO_INTERVAL_SECONDS = 60;

export const isValidHeroIntervalSeconds = value => Number.isFinite(value)
  && value >= MIN_HERO_INTERVAL_SECONDS && value <= MAX_HERO_INTERVAL_SECONDS;

// Older carousel content contains only the slides array.
export function normalizeHeroCarousel(content) {
  return {
    slides: Array.isArray(content) ? content : Array.isArray(content?.slides) ? content.slides : [],
    intervalSeconds: isValidHeroIntervalSeconds(content?.intervalSeconds)
      ? content.intervalSeconds : DEFAULT_HERO_INTERVAL_SECONDS,
  };
}

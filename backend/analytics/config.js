const integer = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.parseInt(value, 10) || fallback));
export const analyticsConfig = () => ({
  enabled: process.env.ANALYTICS_ENABLED === 'true',
  consentVersion: process.env.ANALYTICS_CONSENT_VERSION || '2026-10-v1',
  retentionDays: integer(process.env.ANALYTICS_RETENTION_DAYS, 90, 1, 730),
  abandonmentMinutes: integer(process.env.ANALYTICS_ABANDONMENT_MINUTES, 30, 10, 1440),
  sessionMinutes: 30,
});
export const expiresAt = () => new Date(Date.now() + analyticsConfig().retentionDays * 86400000);

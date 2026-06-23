export const BUILD_SHA = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

export function buildLabel(): string {
  if (!BUILD_TIME) return BUILD_SHA;
  const d = new Date(BUILD_TIME);
  if (Number.isNaN(d.getTime())) return BUILD_SHA;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${BUILD_SHA} · ${date} ${time}Z`;
}

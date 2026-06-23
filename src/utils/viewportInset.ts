// iOS PWA bug: after the on-screen keyboard opens once, position:fixed
// elements anchor to the visual viewport instead of the layout viewport,
// so the TabBar drifts as the page scrolls. We mirror the visual-viewport
// offset into a CSS variable so the bar can compensate via transform.

let wired = false;

export function setupViewportInsetVar(): void {
  if (wired) return;
  if (typeof window === 'undefined') return;
  const vv = window.visualViewport;
  if (!vv) return;
  wired = true;

  const update = (): void => {
    const gap = window.innerHeight - (vv.height + vv.offsetTop);
    const safe = Math.max(0, Math.round(gap));
    document.documentElement.style.setProperty('--vv-bottom-gap', `${safe}px`);
  };

  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  window.addEventListener('orientationchange', update);
  update();
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphView {
  positions: Record<string, NodePosition>;
  tx: number;
  ty: number;
  scale: number;
}

const KEY = 'slalom.graphView';

export function loadView(): GraphView | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GraphView>;
    if (
      !parsed ||
      typeof parsed.tx !== 'number' ||
      typeof parsed.ty !== 'number' ||
      typeof parsed.scale !== 'number' ||
      !parsed.positions ||
      typeof parsed.positions !== 'object'
    ) {
      return null;
    }
    return {
      positions: parsed.positions as Record<string, NodePosition>,
      tx: parsed.tx,
      ty: parsed.ty,
      scale: parsed.scale,
    };
  } catch {
    return null;
  }
}

export function saveView(v: GraphView): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function clearPositions(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

import type { Side, Transition } from './types';
import { blend, isoToday } from './rating';

export function sideOk(edgeSide: Side, side: Side): boolean {
  return edgeSide == null || side == null || edgeSide === side;
}

export interface EdgeEndpoint {
  name: string;
  side: Side;
}

export function edgeMatches(
  edge: Transition,
  fromTrick: string,
  fromSide: Side,
  toTrick: string,
  toSide: Side,
): boolean {
  const forward =
    edge.from === fromTrick &&
    edge.to === toTrick &&
    sideOk(edge.fromSide, fromSide) &&
    sideOk(edge.toSide, toSide);
  if (forward) return true;
  if (!edge.bidi) return false;
  return (
    edge.from === toTrick &&
    edge.to === fromTrick &&
    sideOk(edge.fromSide, toSide) &&
    sideOk(edge.toSide, fromSide)
  );
}

export function hasEdgeStep(edges: Transition[], a: EdgeEndpoint, b: EdgeEndpoint): boolean {
  return edges.some((e) => edgeMatches(e, a.name, a.side, b.name, b.side));
}

export function applyEdgeReport(e: Transition, score: number, today: string = isoToday()): Transition {
  e.rate = blend(e.rate, score);
  e.last = today;
  return e;
}

export function isDuplicateEdge(
  edges: Transition[],
  from: string,
  to: string,
  fromSide: Side,
  toSide: Side,
): boolean {
  return edges.some(
    (e) =>
      e.from === from &&
      e.to === to &&
      (e.fromSide ?? null) === (fromSide ?? null) &&
      (e.toSide ?? null) === (toSide ?? null),
  );
}

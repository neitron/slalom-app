import type { Trick, UserTrickProgress } from '../domain/types';

export function mergeTrick(catalog: Trick, progress: UserTrickProgress | null | undefined): Trick {
  if (!progress) {
    return {
      ...catalog,
      rate: null,
      rateL: null,
      rateR: null,
      last: null,
      status: 'Not Started',
      fav: false,
    };
  }
  const lrEnabled = catalog.lr && progress.lrEnabled;
  return {
    ...catalog,
    lr: lrEnabled,
    rate: lrEnabled ? null : progress.rate,
    rateL: lrEnabled ? progress.rateL : null,
    rateR: lrEnabled ? progress.rateR : null,
    last: progress.last,
    status: progress.status,
    fav: progress.fav,
  };
}

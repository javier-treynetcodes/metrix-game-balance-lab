/**
 * @file Small helpers for genre texts shared by the picker and the workspace.
 */

import { GENRES, type GenreProfile } from '../../lib/genres';
import { metricName } from '../../lib/metrics';

export { GENRES };

/** Name of the metric a genre ranks by, as shown on the genre cards ("your choice" for Other). */
export function metricNameFor(genre: GenreProfile): string {
  return genre.id === 'other' ? 'your choice' : metricName(genre.primary, genre);
}

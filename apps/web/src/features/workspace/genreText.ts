import { GENRES, type GenreProfile } from '../../lib/genres';
import { metricName } from '../../lib/metrics';

export { GENRES };

export function metricNameFor(genre: GenreProfile): string {
  return genre.id === 'other' ? 'your choice' : metricName(genre.primary, genre);
}

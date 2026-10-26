/**
 * @file Genre picker shown right after the first import.
 */

import type { Genre } from '@metrix/core';
import { GENRES, metricNameFor } from './genreText';

/** First question after importing: the genre decides how duels are ranked and explained. */
export function GenrePicker({ onPick }: { onPick: (genre: Genre) => void }) {
  return (
    <section className="panel genre-picker" aria-labelledby="genre-title">
      <h2 id="genre-title">What kind of game is this?</h2>
      <p className="muted">
        The genre decides which measure ranks your duels and how results are explained. Your data and the damage rules stay
        the same, and you can change it at any time.
      </p>
      <ul className="genre-grid">
        {GENRES.map((genre) => (
          <li key={genre.id}>
            <button type="button" className="genre-card" onClick={() => onPick(genre.id)}>
              <span className="genre-name">{genre.name}</span>
              <span className="genre-pitch">{genre.pitch}</span>
              <span className="genre-metric">Ranks by: {metricNameFor(genre)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

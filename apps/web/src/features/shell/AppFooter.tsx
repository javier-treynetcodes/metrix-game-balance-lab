/**
 * @file Site footer with the sponsor card and project links.
 */

import { GitHubIcon, HeartIcon } from '../../components/Icons';
import { LINKS } from '../../lib/links';

/** Page footer: the sponsor card, the privacy promise and the author and source links. */
export function AppFooter() {
  return (
    <footer className="app-footer">
      <section className="sponsor-card" aria-labelledby="sponsor-title">
        <div>
          <h2 id="sponsor-title">Keep Métrix free and growing</h2>
          <p className="muted">
            Métrix is free to use. Sponsoring on GitHub funds new analyses like the cost/power curve and the galaxy map.
          </p>
        </div>
        <a className="sponsor-button sponsor-button-large" href={LINKS.sponsor} target="_blank" rel="noreferrer">
          <HeartIcon />
          <span>Become a sponsor</span>
        </a>
      </section>
      <div className="footer-bottom">
        <p>A professional game development solution. Your data never leaves your browser.</p>
        <p className="footer-links">
          <span>
            Built by{' '}
            <a href={LINKS.author} target="_blank" rel="noreferrer">
              @javier-treynetcodes
            </a>
          </span>
          <a href={LINKS.repo} target="_blank" rel="noreferrer" className="inline-icon-link">
            <GitHubIcon /> Source
          </a>
        </p>
      </div>
    </footer>
  );
}

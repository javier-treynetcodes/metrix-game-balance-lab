import { GitHubIcon, HeartIcon, LogoMark } from '../../components/Icons';
import { LINKS } from '../../lib/links';

export function AppHeader() {
  return (
    <header className="app-header">
      <a className="brand" href="./" aria-label="Métrix home">
        <LogoMark />
        <span className="brand-name">Métrix</span>
        <span className="brand-tagline">Game Balance Lab</span>
      </a>
      <nav className="header-links" aria-label="Project">
        <a className="header-link" href={LINKS.repo} target="_blank" rel="noreferrer">
          <GitHubIcon />
          <span>GitHub</span>
        </a>
        <a className="sponsor-button" href={LINKS.sponsor} target="_blank" rel="noreferrer">
          <HeartIcon />
          <span>Sponsor</span>
        </a>
      </nav>
    </header>
  );
}

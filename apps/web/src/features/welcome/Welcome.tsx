import { ShieldIcon, SwordIcon } from '../../components/Icons';

const FEATURES = [
  {
    title: 'Import and validate',
    text: 'Drop the CSV of your catalog. Every error is listed at once, with the line to fix and how.',
    icon: 'import',
  },
  {
    title: 'See who beats whom',
    text: 'Duel matrix, walls and a Versus view that shows every subtraction behind each hit.',
    icon: 'duel',
  },
  {
    title: 'Tweak and export',
    text: 'Edit values, try changes with − and +, and export the table exactly as you tested it.',
    icon: 'export',
  },
] as const;

function FeatureIcon({ name }: { name: (typeof FEATURES)[number]['icon'] }) {
  if (name === 'duel') {
    return (
      <span className="feature-icon">
        <SwordIcon />
        <ShieldIcon />
      </span>
    );
  }
  return (
    <span className="feature-icon">
      <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d={name === 'import' ? 'M8 2v8m0 0L5 7m3 3 3-3M3 12v2h10v-2' : 'M8 10V2m0 0L5 5m3-3 3 3M3 12v2h10v-2'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Welcome() {
  return (
    <section className="panel welcome" aria-labelledby="welcome-title">
      <p className="eyebrow">Balance lab for game designers · Any genre</p>
      <h1 id="welcome-title">
        Balance your game with <span className="gradient-text">data</span>, not guesswork
      </h1>
      <p className="lead">
        Import your catalog of cards, champions, units or weapons, see who beats whom and why, tweak values and export
        your balanced table. Everything runs locally in your browser.
      </p>
      <ul className="feature-grid">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="feature-card">
            <FeatureIcon name={feature.icon} />
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

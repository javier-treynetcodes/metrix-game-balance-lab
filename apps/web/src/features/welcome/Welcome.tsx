const QUESTIONS = [
  'Which entities do almost the same thing?',
  'Which ones are broken or useless for their cost?',
  'Which strategy has no answer?',
  'Did this patch raise the overall power level?',
] as const;

export function Welcome() {
  return (
    <section className="panel welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title">Balance your game with data, not guesswork</h1>
      <p className="lead">
        Import your catalog of cards, champions, units or weapons and find clones, off-curve
        entities, coverage gaps and duel outcomes. Everything runs locally in your browser.
      </p>
      <ul className="question-list">
        {QUESTIONS.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}

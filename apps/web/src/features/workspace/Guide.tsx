/**
 * @file Three-step quick tour shown with the example data.
 */

import { useState } from 'react';
import { readFlag, writeFlag } from '../../lib/storage';

const DISMISSED = 'metrix:guide-dismissed';

interface GuideProps {
  /** True once the catalog has at least one change (step 1 done). */
  edited: boolean;
  /** True once the Duels tab was opened (step 2 done). */
  visitedDuels: boolean;
  /** True once the Versus tab was opened (step 3 done). */
  visitedVersus: boolean;
  /** Opens the tab a step talks about. */
  onGo: (tab: 'catalog' | 'duels' | 'versus') => void;
}

/** Three-step tour for the example data. Closes for good once dismissed or completed. */
export function Guide({ edited, visitedDuels, visitedVersus, onGo }: GuideProps) {
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISSED));
  if (dismissed) return null;
  const steps = [
    { done: edited, label: 'Click a value in the catalog to edit it', tab: 'catalog' as const },
    { done: visitedDuels, label: 'Open Duels to see who beats whom', tab: 'duels' as const },
    { done: visitedVersus, label: 'Compare two entities in Versus', tab: 'versus' as const },
  ];
  const close = () => {
    writeFlag(DISMISSED);
    setDismissed(true);
  };
  const allDone = steps.every((step) => step.done);

  return (
    <section className="guide" aria-labelledby="guide-title">
      <div className="guide-head">
        <h2 id="guide-title">{allDone ? 'You are all set' : 'Quick tour'}</h2>
        <button type="button" className="icon-button" onClick={close} aria-label="Close the tour">
          ✕
        </button>
      </div>
      <ol className="guide-steps">
        {steps.map((step, index) => (
          <li key={step.label} className={step.done ? 'done' : undefined}>
            <span className="guide-check" aria-hidden="true">
              {step.done ? '✓' : index + 1}
            </span>
            <button type="button" className="link-button" onClick={() => onGo(step.tab)}>
              {step.label}
            </button>
            {step.done && <span className="visually-hidden">(done)</span>}
          </li>
        ))}
      </ol>
      {allDone && (
        <button type="button" className="button button-primary" onClick={close}>
          Close the tour
        </button>
      )}
    </section>
  );
}

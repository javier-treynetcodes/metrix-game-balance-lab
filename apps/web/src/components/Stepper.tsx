/**
 * @file Whole-number stepper used by the what-if controls in Versus.
 */

interface StepperProps {
  /** Visible label, also used to name the buttons for screen readers ("DEF 1 plus 1"). */
  label: string;
  /** Current whole-number value. */
  value: number;
  /** Lowest allowed value: the minus button is disabled there. Defaults to 0. */
  min?: number;
  /** Highlights the stepper when the value differs from the catalog. */
  changed?: boolean;
  /** Receives the new value, already clamped to `min` and stripped of non-digits. */
  onChange: (value: number) => void;
}

/** Whole-number input with -1 / +1 buttons, for quick what-if changes. */
export function Stepper({ label, value, min = 0, changed = false, onChange }: StepperProps) {
  return (
    <div className={`stepper${changed ? ' is-changed' : ''}`}>
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button type="button" onClick={() => onChange(Math.max(value - 1, min))} disabled={value <= min} aria-label={`${label} minus 1`}>
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '');
            onChange(Math.max(digits === '' ? min : Number(digits), min));
          }}
        />
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`${label} plus 1`}>
          +
        </button>
      </div>
    </div>
  );
}

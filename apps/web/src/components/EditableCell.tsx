import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface EditableCellProps {
  /** What the cell shows when not editing. */
  display: ReactNode;
  /** Text placed in the input when editing starts. */
  value: string;
  /** Accessible name, e.g. "HP of Heavy Unit". */
  label: string;
  numeric?: boolean;
  /** Saves the text; returns an error message to keep editing, or null when saved. */
  onCommit: (text: string) => string | null;
}

/** Spreadsheet-like cell: click or Enter to edit, Enter or leaving the cell saves, Esc cancels. */
export function EditableCell({ display, value, label, numeric = false, onCommit }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  // Saving with Enter unmounts the input, which fires blur: this stops a second save.
  const closing = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = () => {
    closing.current = false;
    setText(value);
    setError(null);
    setEditing(true);
  };

  const finish = (save: boolean) => {
    if (closing.current) return;
    if (save && text !== value) {
      const problem = onCommit(text);
      if (problem) {
        setError(problem);
        return;
      }
    }
    closing.current = true;
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  if (!editing) {
    return (
      <button ref={buttonRef} type="button" className="cell-button" onClick={start} aria-label={`${label}: ${value || 'empty'}. Edit`}>
        {display}
      </button>
    );
  }

  return (
    <span className="cell-editor">
      <input
        ref={inputRef}
        value={text}
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        inputMode={numeric ? 'numeric' : undefined}
        className={numeric ? 'num' : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') finish(true);
          if (event.key === 'Escape') finish(false);
        }}
        onBlur={() => {
          if (!error) finish(true);
        }}
      />
      {error && (
        <span id={errorId} role="alert" className="cell-error">
          {error}
        </span>
      )}
    </span>
  );
}

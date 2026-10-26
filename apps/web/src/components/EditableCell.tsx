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

  /** Closes the editor; returns false when the value was rejected and editing goes on. */
  const finish = (save: boolean): boolean => {
    if (closing.current) return true;
    if (save && text !== value) {
      const problem = onCommit(text);
      if (problem) {
        setError(problem);
        return false;
      }
    }
    closing.current = true;
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => buttonRef.current?.focus());
    return true;
  };

  /** Spreadsheet keys: Enter goes to the cell below, Tab to the next cell, Shift+Tab to the previous one. */
  const move = (direction: 'down' | 'next' | 'previous') => {
    requestAnimationFrame(() => {
      const button = buttonRef.current;
      const cell = button?.closest('td, th');
      const table = button?.closest('table');
      if (!button || !(cell instanceof HTMLTableCellElement) || !table) return;
      let target: Element | undefined;
      if (direction === 'down') {
        const position = [...cell.querySelectorAll('.cell-button')].indexOf(button);
        const below = cell.parentElement?.nextElementSibling?.children[cell.cellIndex];
        target = below?.querySelectorAll('.cell-button')[position];
      } else {
        const all = [...table.querySelectorAll('.cell-button')];
        target = all[all.indexOf(button) + (direction === 'next' ? 1 : -1)];
      }
      if (target instanceof HTMLButtonElement) target.click();
    });
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
          if (event.key === 'Enter' && finish(true)) move('down');
          if (event.key === 'Escape') finish(false);
          if (event.key === 'Tab') {
            event.preventDefault();
            if (finish(true)) move(event.shiftKey ? 'previous' : 'next');
          }
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

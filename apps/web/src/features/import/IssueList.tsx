import type { ImportIssue } from '@metrix/core';

const MAX_LINES_SHOWN = 12;

function formatLines(lines: number[]): string {
  const shown = lines.slice(0, MAX_LINES_SHOWN).join(', ');
  const rest = lines.length - MAX_LINES_SHOWN;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
}

/** Import issues, errors first, each with the lines to fix. */
export function IssueList({ issues }: { issues: readonly ImportIssue[] }) {
  const sorted = [...issues].sort(
    (a, b) => Number(a.severity === 'warning') - Number(b.severity === 'warning'),
  );
  return (
    <ul className="issue-list">
      {sorted.map((issue) => (
        <li key={`${issue.code}|${issue.column ?? ''}`} className={`issue issue-${issue.severity}`}>
          <span className="issue-badge">{issue.severity === 'error' ? 'Error' : 'Warning'}</span>
          <div className="issue-body">
            <p>{issue.message}</p>
            {(issue.column !== undefined || issue.lines) && (
              <p className="issue-meta">
                {issue.column !== undefined && (
                  <>
                    Column <code>{issue.column}</code>
                  </>
                )}
                {issue.column !== undefined && issue.lines && ' · '}
                {issue.lines && (
                  <>
                    {issue.lines.length === 1 ? 'Line' : 'Lines'} {formatLines(issue.lines)}
                  </>
                )}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

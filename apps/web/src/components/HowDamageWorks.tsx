import type { Channel } from '@metrix/core';
import { StatCode } from './StatCode';

/** The damage rules in four short points and one worked example, all with whole numbers. */
export function HowDamageWorks({ channels, open = false }: { channels: readonly Channel[]; open?: boolean }) {
  const [one, two] = channels;
  if (!one || !two) return null;
  const code = (kind: 'atk' | 'def' | 'arm' | 'hyb', key: string) => <StatCode kind={kind} channels={channels} channelKey={key} />;
  return (
    <details className="how-it-works" open={open}>
      <summary>How damage works</summary>
      <ol className="rules">
        <li>
          <strong>One kind of attack per entity:</strong> {code('atk', one.key)}, {code('atk', two.key)} or hybrid (
          {code('hyb', one.key)} + {code('hyb', two.key)}).
        </li>
        <li>
          <strong>Each attack only meets the defense of its own channel:</strong> {code('atk', one.key)} −{' '}
          {code('def', one.key)}, never below 0. {code('def', one.key)} does nothing against {code('atk', two.key)}.
        </li>
        <li>
          <strong>No defense = full damage</strong> on that channel.
        </li>
        <li>
          <strong>Hybrid attacks hit both channels at once.</strong> Each part meets that channel&apos;s defense and also
          the hybrid armor ({code('arm', one.key)}, {code('arm', two.key)}), which only works against hybrid attacks.
        </li>
      </ol>
      <div className="example">
        <p className="muted small">Example: a hybrid attacker hits a defender</p>
        <table className="example-table">
          <tbody>
            <tr>
              <th scope="row">{code('hyb', one.key)} 30</th>
              <td>
                30 − {code('def', one.key)} 20 − {code('arm', one.key)} 10
              </td>
              <td className="num">= 0</td>
            </tr>
            <tr>
              <th scope="row">{code('hyb', two.key)} 25</th>
              <td>
                25 − {code('def', two.key)} 0 − {code('arm', two.key)} 5
              </td>
              <td className="num">= 20</td>
            </tr>
            <tr className="total">
              <th scope="row">Per hit</th>
              <td>0 + 20</td>
              <td className="num">= 20</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}

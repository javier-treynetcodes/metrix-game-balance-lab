/**
 * @file Collapsible explanation of the damage rules with a worked example.
 */

import type { Channel } from '@metrix/core';
import { StatCode } from './StatCode';

/** Props of {@link HowDamageWorks}. */
interface HowDamageWorksProps {
  channels: readonly Channel[];
  /** Starts expanded. */
  open?: boolean;
  /** True when the catalog has attack speed: explains time to defeat. */
  usesSpeed?: boolean;
  /** True when the catalog has move speed: explains that it is informative. */
  usesMove?: boolean;
}

/** The damage rules in short points and one worked example, all with whole numbers. */
export function HowDamageWorks({ channels, open = false, usesSpeed = false, usesMove = false }: HowDamageWorksProps) {
  const [one, two] = channels;
  if (!one || !two) return null;
  const code = (kind: 'atk' | 'def', key: string) => <StatCode kind={kind} channels={channels} channelKey={key} />;
  return (
    <details className="how-it-works" open={open}>
      <summary>How damage works</summary>
      <ol className="rules">
        <li>
          <strong>Attack on one or both channels:</strong> {code('atk', one.key)}, {code('atk', two.key)} or both at once
          (a mixed attack). Each channel is worked out on its own and the results are added.
        </li>
        <li>
          <strong>Damage = attack − armor against it</strong>, never below 0.
        </li>
        <li>
          <strong>Armor coverage:</strong> by default {code('def', one.key)} only stops {code('atk', one.key)} and{' '}
          {code('def', two.key)} only stops {code('atk', two.key)}. In the table below you can make an armor also stop a
          share of the other channel.
        </li>
        <li>
          <strong>No armor against a channel = full damage</strong> on that channel.
        </li>
        <li>
          <strong>Complements</strong> add attack or armor to every character of their class. Compare base values and
          values with complements in Duels and Versus.
        </li>
        {usesSpeed && (
          <li>
            <strong>Attack speed</strong> is a percentage where 100 is normal. Time to defeat = hits × 100 ÷ speed: 20
            hits at 125 % take 16.0. Fewer wins.
          </li>
        )}
        {usesMove && (
          <li>
            <strong>Move speed</strong> never changes who wins. It only tells who can chase the other down or escape.
          </li>
        )}
      </ol>
      <div className="example">
        <p className="muted small">
          Example: a mixed attacker hits a defender whose {code('def', one.key)} also stops 20 % of {code('atk', two.key)}
        </p>
        <table className="example-table">
          <tbody>
            <tr>
              <th scope="row">{code('atk', one.key)} 30</th>
              <td>
                30 − {code('def', one.key)} 20
              </td>
              <td className="num">= 10</td>
            </tr>
            <tr>
              <th scope="row">{code('atk', two.key)} 25</th>
              <td>
                25 − ({code('def', one.key)} 20 × 20 % + {code('def', two.key)} 5) = 25 − 9
              </td>
              <td className="num">= 16</td>
            </tr>
            <tr className="total">
              <th scope="row">Per hit</th>
              <td>10 + 16</td>
              <td className="num">= 26</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}

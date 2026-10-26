import type { Channel } from '@metrix/core';
import { ChannelDot } from './AttackBadge';

/** The damage rules in four short points and one worked example, all with whole numbers. */
export function HowDamageWorks({ channels, open = false }: { channels: readonly Channel[]; open?: boolean }) {
  const [one, two] = channels;
  const first = one?.label ?? 'Channel 1';
  const second = two?.label ?? 'Channel 2';
  return (
    <details className="how-it-works" open={open}>
      <summary>How damage works</summary>
      <ol className="rules">
        <li>
          <strong>One kind of damage per entity:</strong>{' '}
          {one && <ChannelDot channels={channels} channelKey={one.key} />} {first},{' '}
          {two && <ChannelDot channels={channels} channelKey={two.key} />} {second} or{' '}
          <span className="dot tone-hybrid" aria-hidden="true" /> hybrid.
        </li>
        <li>
          <strong>Damage = attack − defense of the same channel</strong>, never below 0. {first} defense does nothing
          against {second} attacks.
        </li>
        <li>
          <strong>No defense on a channel = full damage</strong> on that channel.
        </li>
        <li>
          <strong>Hybrid attacks hit both channels at once.</strong> Each part faces that channel&apos;s defense plus the
          defender&apos;s hybrid armor, which only works against hybrid attacks.
        </li>
      </ol>
      <div className="example">
        <p className="muted small">Example: a hybrid attack of 30 {first} and 25 {second}</p>
        <table className="example-table">
          <tbody>
            <tr>
              <th scope="row">{first}</th>
              <td>30 − (20 defense + 10 hybrid armor)</td>
              <td className="num">= 0</td>
            </tr>
            <tr>
              <th scope="row">{second}</th>
              <td>25 − (0 defense + 5 hybrid armor)</td>
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

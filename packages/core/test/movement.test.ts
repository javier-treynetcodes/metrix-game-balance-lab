import { describe, expect, it } from 'vitest';
import { matchup, moveEdge, movementNote, SLIGHT_MOVE_DIFFERENCE } from '../src';
import { channels, entity } from './helpers';

// The strong side wins every duel below: 4 hits against 10.
const strong = (move?: number) => entity('strong', { hp: 100, atk: { '1': 25 }, ...(move === undefined ? {} : { move }) });
const weak = (move?: number) => entity('weak', { hp: 100, atk: { '1': 10 }, ...(move === undefined ? {} : { move }) });

describe('moveEdge', () => {
  it('compares the move of both sides and marks small differences as slight', () => {
    expect(moveEdge(matchup(strong(120), weak(100), channels))).toEqual({ faster: 'attacker', difference: 20, slight: false });
    expect(moveEdge(matchup(strong(100), weak(105), channels))).toEqual({ faster: 'defender', difference: 5, slight: true });
    expect(moveEdge(matchup(strong(100), weak(100 + SLIGHT_MOVE_DIFFERENCE), channels))?.slight).toBe(false);
    expect(moveEdge(matchup(strong(100), weak(100), channels))).toEqual({ faster: 'none', difference: 0, slight: false });
  });

  it('is undefined when the catalog has no move', () => {
    expect(moveEdge(matchup(strong(), weak(100), channels))).toBeUndefined();
    expect(movementNote(matchup(strong(100), weak(), channels), 'hits')).toBeUndefined();
  });
});

describe('movementNote', () => {
  it('crosses movement with the winner of the duel', () => {
    expect(movementNote(matchup(strong(120), weak(100), channels), 'hits')).toBe('winner-faster');
    expect(movementNote(matchup(strong(100), weak(120), channels), 'hits')).toBe('loser-faster');
    expect(movementNote(matchup(weak(120), strong(100), channels), 'hits')).toBe('loser-faster');
    expect(movementNote(matchup(strong(100), weak(100), channels), 'hits')).toBe('same');
  });

  it('only says who is faster when there is no winner', () => {
    expect(movementNote(matchup(strong(120), strong(100), channels), 'hits')).toBe('faster-no-winner');
    expect(movementNote(matchup(strong(120), weak(100), channels), 'blocked')).toBe('faster-no-winner');
  });
});

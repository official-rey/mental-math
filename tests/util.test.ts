import { describe, expect, it } from 'vitest';
import type { Problem } from '../src/techniques/types';
import { fmt, isCorrect, normalize, scaled } from '../src/techniques/util';
import { applyKey } from '../src/ui/keypad';

const P = (answer: string, tolerance?: number): Problem => ({ technique: 'x', level: 1, text: '', answer, data: {}, tolerance });

describe('answer checking', () => {
  it('normalizes separators and redundant zeros', () => {
    expect(normalize('1,161')).toBe('1161');
    expect(normalize(' 012.50 ')).toBe('12.5');
    expect(normalize('.25')).toBe('0.25');
    expect(normalize('≈ 30,380')).toBe('30380');
  });
  it('accepts equivalent forms and rejects junk', () => {
    expect(isCorrect(P('282'), '282')).toBe(true);
    expect(isCorrect(P('12.6'), '12.60')).toBe(true);
    expect(isCorrect(P('0.428571'), '.428571')).toBe(true);
    expect(isCorrect(P('282'), '283')).toBe(false);
    expect(isCorrect(P('282'), '')).toBe(false);
    expect(isCorrect(P('282'), '2a2')).toBe(false);
  });
  it('honours tolerance', () => {
    expect(isCorrect(P('5.2', 0.1), '5.1')).toBe(true);
    expect(isCorrect(P('5.2', 0.1), '5.4')).toBe(false);
  });
  it('formats numbers', () => {
    expect(fmt(4387)).toBe('4,387');
    expect(fmt(282)).toBe('282');
    expect(fmt(12345.25)).toBe('12,345.25');
    expect(scaled(1260, 2)).toBe('12.6');
    expect(scaled(5, 3)).toBe('0.005');
  });
});

describe('number pad', () => {
  it('builds an entry key by key', () => {
    let v = '';
    for (const k of ['1', '2', 'back', '.', '5', '.', '0'] as const) v = applyKey(v, k)!;
    expect(v).toBe('1.50');
    expect(applyKey('', '.')).toBe('0.');
    expect(applyKey('0', '7')).toBe('7');
    expect(applyKey('123', 'clear')).toBe('');
    expect(applyKey('123', 'enter')).toBeNull();
    expect(applyKey('123456789012', '3')).toBe('123456789012');
  });
});

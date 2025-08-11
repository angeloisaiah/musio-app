import { describe, expect, test } from 'vitest';
import { normalizeTag } from './normalize';

describe('normalizeTag', () => {
  test('lowercases, trims, hyphenates spaces and dedup hyphens', () => {
    expect(normalizeTag('  Deep  House  ')).toBe('deep-house');
    expect(normalizeTag('Lo-Fi!!')).toBe('lo-fi');
    expect(normalizeTag('Hip  Hop ')).toBe('hip-hop');
  });

  test('removes non-alphanum except hyphen', () => {
    expect(normalizeTag('drum&bass')).toBe('drum-bass');
    expect(normalizeTag('rnb/soul')).toBe('rnb-soul');
  });
});

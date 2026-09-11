/**
 * RezeBot Persian NLP shared utilities tests
 */

import { describe, it, expect } from 'vitest';
import { formatPersianDuration, parsePersianDuration } from '../src/shared/utils/persian-nlp/index.js';
import { PersianNormalizer, PersianIntentParser, persianNormalizer, persianIntentParser } from '../src/modules/natural-language/persianNLP.ts';

describe('PersianNormalizer', () => {
  it('normalizes Arabic letters', () => {
    expect(persianNormalizer.normalize('کتاب').includes('\u06A9')).toBe(true); // ک
  });

  it('normalizes Persian digits', () => {
    expect(persianNormalizer.normalize('۱۲۳')).toBe('123');
  });

  it('removes diacritics', () => {
    const result = persianNormalizer.normalize('کتاب\u064B\u064C');
    expect(result).toBe('کتاب');
  });

  it('handles empty', () => {
    expect(persianNormalizer.normalize('')).toBe('');
  });

  it('collapses whitespace', () => {
    expect(persianNormalizer.normalize('hello    world')).toBe('hello world');
  });

  it('detects Persian language', () => {
    expect(persianNormalizer.detectLanguage('سلام')).toBe('fa');
    expect(persianNormalizer.detectLanguage('hello')).toBe('other');
  });
});

describe('Shared NLP Utilities', () => {
  describe('formatPersianDuration', () => {
    it('formats seconds', () => {
      expect(formatPersianDuration(30)).toBe('۳۰ ثانیه');
    });
    it('formats minutes', () => {
      expect(formatPersianDuration(60)).toBe('یک دقیقه');
    });
    it('formats hours', () => {
      expect(formatPersianDuration(3600)).toBe('یک ساعت');
    });
    it('formats days', () => {
      expect(formatPersianDuration(86400)).toBe('یک روز');
    });
    it('formats years', () => {
      expect(formatPersianDuration(31536000)).toBe('یک سال');
    });
  });

  describe('parsePersianDuration', () => {
    it('parses simple seconds', () => {
      expect(parsePersianDuration('30s')).toBe(30);
    });
    it('parses minutes', () => {
      expect(parsePersianDuration('5m')).toBe(300);
    });
    it('parses hours', () => {
      expect(parsePersianDuration('2h')).toBe(7200);
    });
    it('parses Persian numbers', () => {
      expect(parsePersianDuration('یک')).toBe(3600); // hour default for single
    });
    it('parses combinations', () => {
      expect(parsePersianDuration('یک روز')).toBe(86400);
    });
  });
});
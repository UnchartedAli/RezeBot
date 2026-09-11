/**
 * RezeBot — Persian NLP
 * Persian text normalization and intent parsing.
 *
 * Handles: Arabic→Persian character mapping, digit normalization,
 * punctuation normalization, half-space, common typos, slang,
 * colloquial forms, and intent classification.
 */

const PERSIAN_NORMALIZATION_MAP: Record<string, string> = {
  // Arabic to Persian letters
  '\u064A': '\u06CC', // ي → ی
  '\u0649': '\u06CC', // ى → ی
  '\u0643': '\u06A9', // ك → ک
  '\u0623': '\u0627', // أ → ا
  '\u0625': '\u0627', // إ → ا
  '\u0622': '\u0627', // آ → ا
  '\u0629': '\u0647', // ة → ه
  '\u0624': '\u0648', // ؤ → و
  '\u0626': '\u06CC', // ئ → ی
  '\u0621': '\u0627', // ء → ا
  '\u06C0': '\u0647', // ۀ → ه
  // Remove Arabic diacritics (harakat)
  '\u064B': '',
  '\u064C': '',
  '\u064D': '',
  '\u064E': '',
  '\u064F': '',
  '\u0650': '',
  '\u0651': '',
  '\u0652': '',
  '\u0653': '',
  '\u0654': '',
  '\u0655': '',
  '\u0656': '',
  '\u0657': '',
  '\u0658': '',
  '\u0659': '',
  '\u065A': '',
  '\u065B': '',
  '\u065C': '',
  '\u065D': '',
  '\u065E': '',
  '\u065F': '',
};

const PERSIAN_DIGITS: Record<string, string> = {
  '\u06F0': '0',
  '\u06F1': '1',
  '\u06F2': '2',
  '\u06F3': '3',
  '\u06F4': '4',
  '\u06F5': '5',
  '\u06F6': '6',
  '\u06F7': '7',
  '\u06F8': '8',
  '\u06F9': '9',
  '\u0660': '0',
  '\u0661': '1',
  '\u0662': '2',
  '\u0663': '3',
  '\u0664': '4',
  '\u0665': '5',
  '\u0666': '6',
  '\u0667': '7',
  '\u0668': '8',
  '\u0669': '9',
};

const PERSIAN_PUNCTUATION_MAP: Record<string, string> = {
  '\u00AB': '"', // «
  '\u00BB': '"', // »
  '\u061F': '?', // ؟
  '\u060C': ',', // ،
  '\u061B': ';', // ؛
  '\u066B': '.', // ٫
  '\u066C': ',', // ٬
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...', // …
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u0640': '', // tatweel ـ
};

const PERSIAN_SLANG: Record<string, string> = {
  '\u0631\u06CC\u0632\u0647': 'reze',
  '\u0645\u06CC\u0648\u062A': 'mute',
  '\u0645\u06CC\u0648\u062A\u0634': 'mute',
  '\u0645\u06CC\u0648\u062A\u06A9\u0646': 'mute',
  '\u0645\u0648\u062A': 'mute',
  '\u0633\u0627\u06A9\u062A': 'mute',
  '\u062E\u0641\u0647': 'mute',
  '\u0628\u0646': 'ban',
  '\u0628\u0627\u0646': 'ban',
  '\u0628\u0646\u062F': 'ban',
  '\u0627\u062E\u0631\u0627\u062C': 'kick',
  '\u06A9\u06CC\u06A9': 'kick',
  '\u0627\u062E\u0637\u0627\u0631': 'warn',
  '\u0647\u0634\u062F\u0627\u0631': 'warn',
  '\u06AF\u0632\u0627\u0631\u0634': 'report',
  '\u0634\u06A9\u0627\u06CC\u062A': 'report',
  '\u0642\u0648\u0627\u0646\u06CC\u0646': 'rules',
  '\u062E\u0648\u0634 \u0622\u0645\u062F': 'welcome',
  '\u0686\u0637\u0648\u0631': 'how',
  '\u0686\u0637\u0648\u0631\u06CC': 'how',
  '\u06A9\u0645\u06A9': 'help',
};

const TYPO_MAP: Record<string, string> = {
  '\u06A9\u0644': '\u06A9\u0646', // کل → کن
  '\u0647\u06CC\u0686\u06CC': '\u0647\u06CC\u0686', // هیچی → هیچ
  '\u0645\u06CC\u062E\u0648\u0627\u0645': '\u0645\u06CC\u062E\u0648\u0627\u0647\u0645',
  '\u0645\u06CC\u062E\u0648\u0627\u06CC': '\u0645\u06CC\u062E\u0648\u0627\u0647\u06CC\u062F',
  '\u0627\u0648\u0646': '\u0622\u0646', // اون → آن
  '\u0627\u0648\u0646\u062C\u0627': '\u0622\u0646\u062C\u0627',
  '\u062E\u0648\u0628\u0647': '\u062E\u0648\u0628 \u0627\u0633\u062A',
  '\u0628\u062F\u0647': '\u0628\u062F \u0627\u0633\u062A',
};

// Persian keyword builders (using explicit Unicode escapes to avoid source encoding issues)
const BAN = '\u0628\u0646\u06A9';          // بن
const BAN_CONJ = '\u0628\u0646\u062F';        // بند
const KICK = '\u0627\u062E\u0631\u0627\u062C';  // اخراج
const KICK_SHORT = '\u06A9\u06CC\u06A9';        // کیک
const MUTE = '\u0645\u06CC\u0648\u062A';         // میوت
const MUTE_SHORT = '\u0645\u0648\u062A';        // موت
const SILENCE = '\u0633\u0627\u06A9\u062A';     // ساکت
const DELETE = '\u062D\u0630\u0641';          // حذف
const WARN = '\u0647\u0634\u062F\u0627\u0631';  // هشدار
const HELP = '\u06A9\u0645\u06A9';             // کمک
const HELP2 = '\u0631\u0627\u0647\u0646\u0645\u0627'; // راهنما
const DELETE_EN = 'delete';
const PURGE = 'purge';
const LOCK = '\u0642\u0641\u0644';            // قفل
const LOCK_EN = 'lock';
const LOCK_CLOSE = '\u0628\u0633\u062A\u0647'; // بسته
const LOCK_OPEN = '\u0628\u0627\u0632';        // باز
const UNLOCK_EN = 'unlock';
const RULES = '\u0642\u0648\u0627\u0646\u06CC\u0646'; // قوانین
const RULES_EN = 'rules';
const REPORT = '\u06AF\u0632\u0627\u0631\u0634'; // گزارش
const REPORT_EN = 'report';
const RULE = '\u0642\u0627\u0646\u0648\u0646';  // قانون
const REPORT2 = '\u0634\u06A9\u0627\u064A\u062A'; // شکایت
const START_EN = 'start';
const STOP_EN = 'stop';
const STOP_FA = '\u062A\u0648\u0642\u0641';  // توقف
const SHARJ = '\u0634\u0631\u0648\u0639';     // شروع
const STATUS1 = '\u0648\u0636\u0639\u06CC\u062A'; // وضعیت
const STATUS_EN = 'status';
const STATUS2 = '\u0627\u0637\u0644\u0627\u0639\u0627\u062A'; // اطلاعات
const INFO_EN = 'info';
const TICKET = '\u062A\u06CC\u06A9\u062A';    // تیکت
const TICKET_EN = 'ticket';
const SUPPORT = '\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC'; // پشتیبانی
const HELP_EN = 'help';
const GREETING = '\u0633\u0644\u0627\u0645'; // سلام

interface IntentPattern {
  regex: RegExp;
  intent: string;
  extract?: (match: RegExpMatchArray) => Record<string, unknown>;
  baseConfidence: number;
}

export class PersianNormalizer {
  normalize(text: string): string {
    if (!text) return '';

    let result = text;

    result = this.normalizePresentationForms(result);
    result = this.normalizeDigits(result);
    result = this.normalizePunctuation(result);
    result = this.normalizeHalfSpace(result);
    result = this.fixCommonTypos(result);
    result = this.normalizeSlang(result);
    result = this.normalizeWhitespace(result);
    result = this.normalizePersianSpecific(result);

    return result;
  }

  private normalizePresentationForms(text: string): string {
    let result = '';
    for (const char of text) {
      result += PERSIAN_NORMALIZATION_MAP[char] ?? char;
    }
    return result;
  }

  private normalizeDigits(text: string): string {
    let result = '';
    for (const char of text) {
      result += PERSIAN_DIGITS[char] ?? char;
    }
    return result;
  }

  private normalizePunctuation(text: string): string {
    let result = '';
    for (const char of text) {
      result += PERSIAN_PUNCTUATION_MAP[char] ?? char;
    }
    return result;
  }

  private normalizeHalfSpace(text: string): string {
    return text
      .replace(/(\S)\s-\s(\S)/g, '$1$2')
      .replace(/\u200c/g, '')
      .replace(/\u200d/g, '')
      .replace(/\u200b/g, '')
      .replace(/\u200f/g, '');
  }

  private fixCommonTypos(text: string): string {
    let result = text;
    for (const [typo, fix] of Object.entries(TYPO_MAP)) {
      result = result.split(typo).join(fix);
    }
    return result;
  }

  private normalizeSlang(text: string): string {
    let result = text;
    for (const [slang, standard] of Object.entries(PERSIAN_SLANG)) {
      result = result.split(slang).join(standard);
    }
    return result;
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^[\s\u200c\u200b]+|[\s\u200c\u200b]+$/g, '')
      .trim();
  }

  private normalizePersianSpecific(text: string): string {
    return text
      .replace(/\u0627\u0647/g, '\u0647')
      .replace(/\u0627\u064B/g, '\u0627')
      .replace(/[\u06CC]+/g, '\u06CC')
      .replace(/[\u0637]+/g, '\u0637')
      .replace(/[\u0638]+/g, '\u0638');
  }

  detectLanguage(text: string): 'fa' | 'mixed' | 'other' {
    if (!text) return 'other';

    const normalized = this.normalize(text);
    const persianChars = (normalized.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (normalized.match(/[a-zA-Z]/g) || []).length;
    const totalChars = normalized.replace(/\s/g, '').length;

    if (totalChars === 0) return 'other';

    const persianRatio = persianChars / totalChars;
    const latinRatio = latinChars / totalChars;

    if (persianRatio > 0.7) return 'fa';
    if (persianRatio > 0.3 || (persianChars > 0 && latinRatio > 0.3)) return 'mixed';
    return 'other';
  }
}

export class PersianIntentParser {
  private normalizer = new PersianNormalizer();

  parse(text: string): {
    intent: string;
    entities: Record<string, unknown>;
    confidence: number;
    normalized: string;
    language: 'fa' | 'mixed' | 'other';
  } {
    const normalized = this.normalizer.normalize(text);
    const language = this.normalizer.detectLanguage(text);

    const patterns = this.getIntentPatterns();

    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        return {
          intent: pattern.intent,
          entities: this.extractEntities(match, pattern),
          confidence: pattern.baseConfidence,
          normalized,
          language,
        };
      }
    }

    return {
      intent: 'unknown',
      entities: {},
      confidence: 0.1,
      normalized,
      language,
    };
  }

  private getIntentPatterns(): IntentPattern[] {
    return [
      {
        regex: /^(?:\u062D\u0630\u0641|\u0628\u0646\s+\u06A9\u0646|\u0628\u0646\s+\u06A9\u0646\u06CC\u062F|\u0627\u062E\u0631\u0627\u062C|\u06A9\u06CC\u06A9|\u0633\u0627\u06A9\u062A\s+\u06A9\u0646|\u0633\u0627\u06A9\u062A\s+\u0634\u0648|\u0645\u0648\u062A|\u0645\u06CC\u0648\u062A)\s+(.+)$/i,
        intent: 'moderate',
        extract: (match) => ({
          action: match[0].includes('\u062D\u0630\u0641')
            ? 'delete'
            : match[0].includes('\u0628\u0646')
              ? 'ban'
              : match[0].includes('\u0627\u062E\u0631\u0627\u062C') || match[0].includes('\u06A9\u06CC\u06A9')
                ? 'kick'
                : match[0].includes('\u0633\u0627\u06A9\u062A') || match[0].includes('\u0645\u06CC\u0648\u062A') || match[0].includes('\u0645\u0648\u062A')
                  ? 'mute'
                  : 'warn',
          target: match[1]?.trim(),
        }),
        baseConfidence: 0.95,
      },
      {
        regex: /^(?:\u0647\u0634\u062F\u0627\u0631|warning|warn)\s+(.+)$/i,
        intent: 'warn',
        extract: (match) => ({ target: match[1]?.trim() }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u062D\u0630\u0641|delete|purge)\s+(?:\u067E\u06CC\u0627\u0645|\u0647\u0645\u0647)?\s*(\d*)$/i,
        intent: 'delete_messages',
        extract: (match) => ({ count: match[1] ? parseInt(match[1], 10) : 1 }),
        baseConfidence: 0.85,
      },
      {
        regex: /^(?:\u0642\u0641\u0644|unlock|lock|\u0628\u0633\u062A\u0647\s+\u06A9\u0646|\u0628\u0627\u0632\s+\u06A9\u0646)\s*(?:\u0686\u062A|\u06AF\u0631\u0648\u0647|\u06A9\u0627\u0646\u0627\u0644)?$/i,
        intent: 'lock_toggle',
        extract: (match) => ({
          action:
            match[0].includes('\u0642\u0641\u0644') ||
            match[0].includes('lock') ||
            match[0].includes('\u0628\u0633\u062A\u0647')
              ? 'lock'
              : 'unlock',
        }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u06A9\u0645\u06A9|help|\u0631\u0627\u0647\u0646\u0645\u0627|\u062F\u0633\u062A\u0648\u0631\u0627\u062A)$/i,
        intent: 'help',
        extract: () => ({}),
        baseConfidence: 0.95,
      },
      {
        regex: /^(?:\u062A\u0646\u0638\u06CC\u0645\u0627\u062A|settings|setup|config|\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC)\s*(.*)$/i,
        intent: 'settings',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u0633\u0648\u0627\u0644\s+\u0645\u06A9\u0631\u0631|faq|\u0633\u0624\u0627\u0644\s+\u0645\u06A9\u0631\u0631)\s*(.*)$/i,
        intent: 'faq',
        extract: (match) => ({ query: match[1]?.trim() }),
        baseConfidence: 0.85,
      },
      {
        regex: /^(?:\u0627\u0645\u062A\u06CC\u0627\u0632|coin|points|\u06A9\u06CC\u0641 \u067E\u0648\u0644|balance|\u0645\u0648\u062C\u0648\u062F\u06CC)\s*(.*)$/i,
        intent: 'economy',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u06AF\u0632\u0627\u0631\u0634|report|\u0634\u06A9\u0627\u06CC\u062A)\s+(.*)$/i,
        intent: 'report',
        extract: (match) => ({ reason: match[1]?.trim() }),
        baseConfidence: 0.95,
      },
      {
        regex: /^(?:\u062E\u0648\u0634\s*\u0622\u0645\u062F|welcome|\u062E\u0648\u0634\u0622\u0645\u062F)\s*(.*)$/i,
        intent: 'welcome',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.8,
      },
      {
        regex: /^(?:\u0642\u0648\u0627\u0646\u06CC\u0646|rules|\u0642\u0627\u0646\u0648\u0646)\s*(.*)$/i,
        intent: 'rules',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.85,
      },
      {
        regex: /^(?:\u0634\u0631\u0648\u0639|start|\u0634\u0631\u0648\u0639\s+\u06A9\u0646|stop|\u062A\u0648\u0642\u0641)$/i,
        intent: 'start_stop',
        extract: (match) => ({
          action:
            match[0].includes('stop') || match[0].includes('\u062A\u0648\u0642\u0641') ? 'stop' : 'start',
        }),
        baseConfidence: 0.85,
      },
      {
        regex: /^(?:\u0648\u0636\u0639\u06CC\u062A|status|\u0627\u0637\u0644\u0627\u0639\u0627\u062A|info)$/i,
        intent: 'status',
        extract: () => ({}),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u062A\u06CC\u06A9\u062A|ticket|\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC|support|\u0633\u0627\u067E\u0648\u0631\u062A)\s*(.*)$/i,
        intent: 'ticket',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u06AF\u06CC\u0631\u0648\u06CC|giveaway|\u0634\u0627\u0646\u0633)\s*(.*)$/i,
        intent: 'giveaway',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.85,
      },
      {
        regex: /^(?:quiz|trivia|\u0633\u0648\u0627\u0644|question|\u0628\u0627\u0632\u06CC|game)\s*(.*)$/i,
        intent: 'quiz',
        extract: (match) => ({ subCommand: match[1]?.trim() }),
        baseConfidence: 0.8,
      },
      {
        regex: /^(?:\u062A\u0631\u062C\u0645\u0647|translate|\u062A\u0631\u062C\u0645\u0647\s+\u0628\u0647)\s*(.*)$/i,
        intent: 'translate',
        extract: (match) => ({ text: match[1]?.trim() }),
        baseConfidence: 0.9,
      },
      {
        regex: /^(?:\u062E\u0644\u0627\u0635\u0647|summary|\u062E\u0644\u0627\u0635\u0647\s+\u06A9\u0646)\s*(.*)$/i,
        intent: 'summarize',
        extract: (match) => ({ text: match[1]?.trim() }),
        baseConfidence: 0.85,
      },
    ];
  }

  private extractEntities(
    match: RegExpMatchArray,
    pattern: IntentPattern
  ): Record<string, unknown> {
    if (pattern.extract) {
      return pattern.extract(match);
    }
    return {};
  }
}

export const persianNormalizer = new PersianNormalizer();
export const persianIntentParser = new PersianIntentParser();

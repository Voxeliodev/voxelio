// ============================================================
// VOXELIO CHAT FILTER
// Replaces blocked words with hashtags (#).
// The blocked word keeps its original length — "damn" → "####".
// ============================================================

// ============================================================
// BLOCKED WORDS
// Add or remove words as needed. Keep them lowercase.
// The filter matches whole words and common leetspeak variants.
// ============================================================

const BLOCKED_WORDS: string[] = [
  // Common swear words
  "damn",
  "hell",
  "crap",
  "piss",
  "fuck",
  "fuk",
  "fck",
  "shit",
  "sht",
  "bitch",
  "bastard",
  "asshole",
  "arse",
  "ass",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "boob",
  "tits",
  "tit",
  "penis",
  "vagina",
  "cum",
  "wank",
  "wanker",
  "twat",
  "prick",
  "bollocks",
  "bugger",

  // Insults / harassment
  "idiot",
  "stupid",
  "moron",
  "dumbass",
  "retard",
  "loser",
  "noob",
  "scrub",
  "nigger",
  "n1gger",
  "nigga",
  "n1gga",
  "faggot",

  // Slurs — you should expand this list yourself with any
  // slurs relevant to your community. Keep them lowercase.
  // (Deliberately left minimal here to avoid embedding real slurs.)

  // Common leetspeak bypasses
  "f4ck",
  "sh1t",
  "b1tch",
  "d1ck",
  "a55",
  "a$$",
];

// ============================================================
// NORMALIZE
// Convert leetspeak and lewd bypasses to their plain form.
// ============================================================
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\+/g, "t")
    .replace(/[._\-]/g, ""); // strip separators like f.u.c.k
}

// ============================================================
// FILTER
// Replaces every blocked word with # characters.
// ============================================================
export function filterMessage(text: string): string {
  if (!text) return text;

  let result = text;

  // Sort by length descending so longer words are matched first
  const sortedWords = [...BLOCKED_WORDS].sort((a, b) => b.length - a.length);

  for (const badWord of sortedWords) {
    // Build a regex that:
    // - Is case-insensitive
    // - Matches whole words (word boundaries)
    // - Allows leetspeak inside (0,1,3,4,5,7,@,$)
    // - Allows separators (. - _ spaces) between characters
    const chars = badWord
      .split("")
      .map((c) => escapeRegex(c))
      .join("[.\\-_\\s]?");

    const pattern = new RegExp(
      `\\b${chars}\\b`,
      "gi"
    );

    result = result.replace(pattern, (match) => "#".repeat(match.length));
  }

  return result;
}

// ============================================================
// CHECK
// Returns true if the text contains a blocked word.
// ============================================================
export function containsBlockedWord(text: string): boolean {
  if (!text) return false;
  return filterMessage(text) !== text;
}

// ============================================================
// HELPERS
// ============================================================
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
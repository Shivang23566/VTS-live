export const normalizeTranscript = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text) => normalizeTranscript(text).split(" ").filter(Boolean);

export function getLessonVideos(dictionary, lessonId) {
  return dictionary.filter((entry) =>
    entry.reviewed === true &&
    typeof entry.video === "string" && entry.video.startsWith("/signs/") &&
    (!entry.lessonId || entry.lessonId === lessonId || entry.lessonId === "general")
  );
}

function buildCandidates(dictionary, lessonId) {
  return getLessonVideos(dictionary, lessonId).flatMap((entry) => {
    const phrases = new Set(
      [entry.id, entry.phrase, ...(entry.aliases ?? [])].map(normalizeTranscript).filter(Boolean),
    );
    return [...phrases].map((phrase) => ({ entry, tokens: phrase.split(" ") }));
  }).sort((a, b) => b.tokens.length - a.tokens.length);
}

function scan(tokens, candidates) {
  const matches = [];
  let consumedThrough = 0;
  let index = 0;

  while (index < tokens.length) {
    // Prefer the longest complete title at this word, never a partial title.
    const match = candidates.find((candidate) =>
      candidate.tokens.every((token, offset) => token === tokens[index + offset]),
    );
    if (match) {
      matches.push(match.entry);
      index += match.tokens.length;
      consumedThrough = index;
    } else {
      index += 1;
    }
  }

  return { matches, consumedThrough };
}

export function findConceptMatches(text, dictionary, lessonId) {
  return scan(tokenize(text), buildCandidates(dictionary, lessonId)).matches;
}

// Retain the single-match API for callers that only need the first result.
export function findConceptMatch(text, dictionary, lessonId) {
  return findConceptMatches(text, dictionary, lessonId)[0] ?? null;
}

/** Collect title fragments across consecutive FINAL speech results. */
export function createTranscriptParser(dictionary, lessonId, { maxGapMs = 12000 } = {}) {
  const candidates = buildCandidates(dictionary, lessonId);
  const longestTitle = Math.max(0, ...candidates.map(({ tokens }) => tokens.length));
  let pending = [];
  let lastInputAt = null;

  return {
    push(text, now = Date.now()) {
      const nextTokens = tokenize(text);
      if (nextTokens.length === 0) return [];
      if (lastInputAt !== null && now - lastInputAt > maxGapMs) pending = [];
      lastInputAt = now;

      const tokens = [...pending, ...nextTokens];
      const { matches, consumedThrough } = scan(tokens, candidates);
      pending = [];

      // Keep only a trailing, unfinished title prefix; completed titles cannot replay.
      const remaining = Math.min(longestTitle - 1, tokens.length - consumedThrough);
      for (let length = remaining; length > 0; length -= 1) {
        const suffix = tokens.slice(-length);
        if (candidates.some((candidate) =>
          candidate.tokens.length > length &&
          suffix.every((token, index) => token === candidate.tokens[index]),
        )) {
          pending = suffix;
          break;
        }
      }

      return matches;
    },
    reset() {
      pending = [];
      lastInputAt = null;
    },
  };
}

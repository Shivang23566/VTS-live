const normalize = (value) =>
  value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function findConceptMatch(text, dictionary, lessonId) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  return (
    dictionary.find((entry) => {
      if (entry.lessonId !== lessonId || entry.reviewed !== true) return false;
      const phrases = [entry.phrase, ...(entry.aliases ?? [])];
      return phrases.some((phrase) => {
        const normalizedPhrase = normalize(phrase);
        return normalizedText === normalizedPhrase || normalizedText.includes(` ${normalizedPhrase} `);
      });
    }) ?? null
  );
}

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
      // Allow matching if entry matches lessonId or if it's marked as general/global
      if (entry.lessonId && lessonId && entry.lessonId !== lessonId && entry.lessonId !== "general") {
        return false;
      }
      if (entry.reviewed !== true) return false;
      
      const phrases = [entry.phrase, ...(entry.aliases ?? [])];
      return phrases.some((phrase) => {
        const normalizedPhrase = normalize(phrase);
        return (
          normalizedText === normalizedPhrase ||
          normalizedText.includes(normalizedPhrase) ||
          normalizedPhrase.includes(normalizedText)
        );
      });
    }) ?? null
  );
}

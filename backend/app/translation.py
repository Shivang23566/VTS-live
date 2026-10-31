"""ASL adapters for sltAI's interfaces; never instantiate its PSL provider.

This is a bounded vocabulary composer, not a trained/general ASL grammar model.
Explicit bilingual sentence patterns are experimental and need linguistic review.
"""
import json
import os
import re
import unicodedata
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[2] / ".cache/matplotlib"))
from sign_language_translator.languages import TextLanguage, SignLanguage

LEXICON = json.loads(Path(__file__).with_name("lexicon.json").read_text(encoding="utf-8"))


class TranslationUnavailable(ValueError):
    def __init__(self, message, code="unsupported_text"):
        super().__init__(message)
        self.code = code


def normalize(text):
    text = unicodedata.normalize("NFKC", text).casefold()
    return " ".join("".join(c if unicodedata.category(c)[0] in "LMN" or c.isspace() else " " for c in text).split())


class ClassroomTextLanguage(TextLanguage):
    def __init__(self, language):
        self.language = language
        self.key = "hi" if language == "hi-IN" else "en"
        self.phrases = sorted(
            [(normalize(alias).split(), entry["gloss"]) for entry in LEXICON["entries"] for alias in entry[self.key]],
            key=lambda pair: len(pair[0]), reverse=True,
        )
        self.sentences = {normalize(row[self.key]): row["glosses"] for row in LEXICON["sentences"]}

    def name(self):
        return self.language

    @classmethod
    def token_regex(cls):
        return r"[^\W_]+"

    @classmethod
    def allowed_characters(cls):
        return set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .?!।") | {chr(n) for n in range(0x900, 0x980)}

    def preprocess(self, text):
        return unicodedata.normalize("NFKC", text).strip()

    def tokenize(self, text):
        normalized = normalize(text)
        if normalized in self.sentences:
            return list(self.sentences[normalized])
        # Bounded bilingual patterns. Negation and unknown words are never removed.
        if self.key == "hi":
            patterns = [
                (r"मुझे (.+) चाहिए", ["I", "WANT"]),
                (r"मुझे (.+) पसंद (?:है|हैं)", ["I", "LIKE"]),
                (r"मैं (.+) (?:पीता|पीती) (?:हूँ|हूं)", ["I", "DRINK"]),
                (r"मैं (.+) (?:खाता|खाती) (?:हूँ|हूं)", ["I", "EAT"]),
            ]
            for pattern, prefix in patterns:
                match = re.fullmatch(pattern, normalized)
                if match:
                    obj = self._vocabulary_tokens(match[1])
                    if len(obj) == 1:
                        return prefix + obj
        else:
            match = re.fullmatch(r"i (want|like|have|see|read|eat|drink) (?:a |an |the )?(.+)", normalized)
            if match:
                obj = self._vocabulary_tokens(match[2])
                if len(obj) == 1:
                    return ["I", match[1].upper(), *obj]
        return self._vocabulary_tokens(normalized)

    def _vocabulary_tokens(self, normalized):
        words, glosses, index = normalized.split(), [], 0
        while index < len(words):
            match = next(((phrase, gloss) for phrase, gloss in self.phrases if words[index:index + len(phrase)] == phrase), None)
            if match is None:
                raise TranslationUnavailable("This sentence is outside the available ASL vocabulary and sentence patterns. Captions continue.")
            phrase, gloss = match
            glosses.append(gloss)
            index += len(phrase)
        if not glosses:
            raise TranslationUnavailable("No supported words were found. Captions continue.")
        return glosses

    def sentence_tokenize(self, text):
        return [s.strip() for s in re.split(r"[.!?।]+", text) if s.strip()]

    def detokenize(self, tokens):
        return " ".join(tokens)

    def tag(self, tokens):
        return [(token, "gloss") for token in ([tokens] if isinstance(tokens, str) else tokens)]

    def get_tags(self, tokens):
        return [tag for _, tag in self.tag(tokens)]

    def get_word_senses(self, tokens):
        return [[token] for token, _ in self.tag(tokens)]


class ASLVocabulary(SignLanguage):
    @staticmethod
    def name():
        return "asl"

    def restructure_sentence(self, sentence, tags=None, contexts=None):
        # Sentence patterns already supply explicit gloss order. Never apply PSL
        # grammar or invent a general ASL reordering for arbitrary input.
        tokens = list(sentence)
        return tokens, list(tags or ["gloss"] * len(tokens)), list(contexts or [None] * len(tokens))

    def tokens_to_sign_dicts(self, tokens, tags=None, contexts=None):
        known = {entry["gloss"] for entry in LEXICON["entries"]}
        result = []
        for token in tokens:
            if token not in known:
                raise TranslationUnavailable("Unknown ASL gloss")
            result.append(self._make_equal_weight_sign_dict([[token]]))
        return result


class GlossTranslator:
    def __init__(self):
        self.languages = {code: ClassroomTextLanguage(code) for code in ("en-IN", "hi-IN")}
        self.sign_language = ASLVocabulary()

    def translate(self, text, language):
        if language not in self.languages:
            raise TranslationUnavailable("Unsupported speech language")
        nlp = self.languages[language]
        glosses = []
        for sentence in nlp.sentence_tokenize(nlp.preprocess(text)):
            tokens = nlp.tokenize(sentence)
            tokens, tags, contexts = self.sign_language.restructure_sentence(tokens, nlp.get_tags(tokens))
            mappings = self.sign_language.tokens_to_sign_dicts(tokens, tags, contexts)
            glosses.extend(label for mapping in mappings for label in mapping["signs"][0])
        if not glosses or len(glosses) > 32:
            raise TranslationUnavailable("Use a shorter supported sentence (up to 32 signs).")
        return glosses

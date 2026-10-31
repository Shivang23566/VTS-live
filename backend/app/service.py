from .translation import GlossTranslator, LEXICON, TranslationUnavailable


class AnimationService:
    def __init__(self, store, max_frames=2400, translator=None):
        self.store = store
        self.max_frames = max_frames
        self.translator = translator or GlossTranslator()

    def catalog(self):
        available = set(self.store.glosses())
        return {
            "sign_language": "asl", "label": "American Sign Language",
            "quality": "experimental-vocabulary", "ready": bool(available),
            "schema": "mediapipe-image-75-v1",
            "notice": "ASL vocabulary prototype. Sentence grammar, hand detail and facial expressions need expert validation.",
            "vocabulary": [entry for entry in LEXICON["entries"] if entry["gloss"] in available],
            "examples": [row for row in LEXICON["sentences"] if set(row["glosses"]) <= available],
        }

    def prepare(self, text, language):
        glosses = self.translator.translate(text, language)
        clips = [self.store.get(gloss) for gloss in glosses]
        missing = [gloss for gloss, clip in zip(glosses, clips) if clip is None]
        if missing:
            raise TranslationUnavailable("Landmark data is missing for: " + ", ".join(dict.fromkeys(missing)) + ". Captions continue.", "missing_landmarks")
        if sum(len(clip.frames) for clip in clips) > self.max_frames:
            raise TranslationUnavailable("The animation is too long. Try a shorter sentence.", "too_long")
        return glosses, clips

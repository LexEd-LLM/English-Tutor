POSSIBLE_CUSTOM_PROMPTS = [

]


DOK_DESCRIPTIONS = {
  1: """- **DOK Level 1 (Recall):** Focus on recognizing or recalling basic English facts, such as word meaning, grammar forms, or sound patterns.""",
  2: """- **DOK Level 2 (Skill/Concept):** Questions require applying learned rules or concepts to new examples.""",
  3: """- **DOK Level 3 (Strategic Thinking):** Include deeper reasoning, contextual inference, or decision making.""",
}

QUESTION_TYPES = [
    # Phonetics & Phonology
    "Stress discrimination (choose the word with different stress position)",
    "Pronunciation discrimination (choose the word with a different underlined sound)",

    # Vocabulary
    "Synonyms (choose the word or phrase closest in meaning to the underlined word)",
    "Antonyms (choose the word or phrase opposite in meaning to the underlined word)",
    "Lexical cloze (choose the most appropriate word based on context: noun, verb, adjective, adverb)",
    "Phrasal verbs (choose the correct phrasal verb based on meaning and usage)",
    "Idioms (understand and choose the correct meaning or equivalent of an idiomatic expression)",
    "Translation (translate words, phrases or sentences between English and Vietnamese)",
    "Translation (translate words, phrases or sentences between Vietnamese and English)",

    # Grammar
    "Grammatical cloze (choose the grammatically correct word or structure to complete the sentence)",
    "Tenses (choose the correct tense form)",
    "Passive voice (identify or use passive structures correctly)",
    "Comparatives and superlatives (form or identify comparative/superlative structures)",
    "Articles (choose the correct article: a, an, the, or zero article)",
    "Prepositions (choose the correct preposition)",
    "Conjunctions and linking words (choose the correct linking word or connector)",
    "Relative clauses (complete or analyze relative clause structures)",
    "Verb forms (choose the correct gerund, infinitive, or participle form)",
    "Tag questions (choose the correct question tag)",
    "Conditionals (choose the correct conditional sentence structure)",
    "Reported speech (convert or choose correct reported forms)",
    "Modal verbs (use modal verbs correctly for functions like advice, obligation, etc.)",
    "Subject-verb agreement (choose the correct verb form based on the subject)",
    "Sentence structure (identify or complete complex/compound sentence structures)",

    # Reading Comprehension
    # "Main idea or best title (choose the best summary or title for the text)",
    # "Specific details (find or infer specific information from the text)",
    # "Inference (draw logical conclusions based on information in the text)",
    # "Vocabulary in context (determine the meaning of a word based on how it is used in the passage)",
    # "Reference (identify what a pronoun or word refers to)",
    # "True / False / Not Given (determine whether statements are true, false, or not mentioned in the text)",

    # Writing (via MCQ)
    "Error identification (spot and identify grammar or word choice errors in a sentence)",
    "Sentence combination (choose the best way to combine two simple sentences)",
    "Sentence transformation (choose the sentence that is closest in meaning to the given sentence)",

    # Cloze Test
    "Paragraph cloze test (choose the best word or phrase to complete blanks in a short text)"
]

DIFFICULTY_LEVELS_VOICE_QUESTIONS = {
  1: """Level 1: The two words should have clearly different vowel or consonant sounds.""",
  2: """Level 2: The words should sound quite similar, sharing at least one major sound.""",
  3: """Level 3: The two words should be minimal pairs or nearly indistinguishable in sound (e.g., "ship" vs "sheep")."""
}

DIFFICULTY_LEVELS_PHONUNCIATION_QUESTIONS = {
    1: "Beginner - Focus on basic words with regular spelling-to-sound patterns (e.g., cat, dog, book)",
    2: "Intermediate - Include common but slightly irregular words or phrases (e.g., schedule, comfortable, a cup of tea)",
    3: "Advanced - Focus on difficult or misleading pronunciation (e.g., colonel, thorough, 'through the tunnel')"
}
// Supported application languages.
// These codes are used throughout the backend.

const LANGUAGES = {
  en: {
    code: "en",
    name: "English",

    // Google Speech-to-Text
    speechCode: "en-IN",

    // Google Text-to-Speech
    ttsCode: "en-IN",
    ttsVoice: "en-IN-Neural2-A"
  },

  mr: {
    code: "mr",
    name: "Marathi",

    speechCode: "mr-IN",

    ttsCode: "mr-IN",
    ttsVoice: "mr-IN-Neural2-A"
  },

  hi: {
    code: "hi",
    name: "Hindi",

    speechCode: "hi-IN",

    ttsCode: "hi-IN",
    ttsVoice: "hi-IN-Neural2-A"
  }
};

function getLanguage(language) {
  return LANGUAGES[language] || LANGUAGES.en;
}

function isSupportedLanguage(language) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, language);
}

module.exports = {
  LANGUAGES,
  getLanguage,
  isSupportedLanguage
};


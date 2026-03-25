// services/faq.service.js
// Helper functions for FAQ lookup.

const { FAQ_GENRES, FAQ_QUESTIONS } = require('./faq.data');

/**
 * Get all available FAQ genres.
 * @returns {Array<{id: string, title: string}>}
 */
function getGenres() {
  return FAQ_GENRES;
}

/**
 * Get all questions for a given genre.
 * @param {string} genreId
 * @returns {Array<{id: string, title: string, answer: string}>|null}
 */
function getQuestions(genreId) {
  const questions = FAQ_QUESTIONS[genreId];
  return questions || null;
}

/**
 * Get the answer for a specific question by its ID.
 * Searches across all genres.
 * @param {string} questionId
 * @returns {{question: string, answer: string, genre: string}|null}
 */
function getAnswer(questionId) {
  for (const [genreId, questions] of Object.entries(FAQ_QUESTIONS)) {
    const found = questions.find((q) => q.id === questionId);
    if (found) {
      const genre = FAQ_GENRES.find((g) => g.id === genreId);
      return {
        question: found.title,
        answer: found.answer,
        genre: genre ? genre.title : genreId,
      };
    }
  }
  return null;
}

module.exports = { getGenres, getQuestions, getAnswer };

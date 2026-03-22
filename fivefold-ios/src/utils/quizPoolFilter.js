/**
 * Quiz pool rules: some categories exclude the hardest tier so play stays approachable.
 * Keys match `questions.json` category ids (e.g. new-testament).
 */
export const CATEGORIES_WITHOUT_ADVANCED = ['new-testament'];

export function includeQuizQuestion(categoryId, difficulty) {
  if (CATEGORIES_WITHOUT_ADVANCED.includes(categoryId) && difficulty === 'advanced') {
    return false;
  }
  return true;
}

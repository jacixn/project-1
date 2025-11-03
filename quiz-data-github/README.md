# Biblely Quiz Data

This repository contains all quiz data for the Biblely app Quiz & Games feature.

## Files

- `categories.json` - Quiz categories with metadata
- `questions.json` - All quiz questions organized by category, type, and difficulty
- `badges.json` - Achievement badges configuration
- `levels.json` - User progression levels

## Structure

### Categories
Each category has:
- `id`: Unique identifier
- `title`: Display name
- `icon`: Emoji icon
- `color`: Primary color (hex)
- `gradient`: Array of gradient colors
- `totalQuizzes`: Total available quizzes
- `description`: Category description
- `locked`: (optional) Whether category is locked
- `unlockRequirement`: (optional) Unlock condition

### Questions
Organized by:
```
{
  "category-id": {
    "quiz-type": {
      "difficulty": [
        {
          "id": "unique-question-id",
          "question": "Question text",
          "options": ["Option 1", "Option 2", ...], // For multiple-choice
          "correctAnswer": 0, // Index for MC, true/false for TF
          "explanation": "Why this is the answer",
          "reference": "Bible verse reference",
          "points": 10
        }
      ]
    }
  }
}
```

Quiz types: `multiple-choice`, `true-false`
Difficulties: `beginner`, `intermediate`, `expert`

### Badges
Each badge has:
- `id`: Unique identifier
- `title`: Badge name
- `description`: What it's for
- `icon`: Emoji icon
- `color`: Badge color
- `requirement`: How to earn it
- `locked`: (optional) Whether badge is initially locked

### Levels
Each level has:
- `level`: Level number (1-8)
- `title`: Level title
- `xpRequired`: XP needed to reach this level
- `color`: Level color

## Usage

The Biblely app fetches this data from:
```
https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/[filename].json
```

## Adding New Questions

1. Choose the appropriate category in `questions.json`
2. Choose quiz type (`multiple-choice` or `true-false`)
3. Choose difficulty level
4. Add your question following the structure above
5. Ensure unique `id` for each question

## Updating

The app caches data for 24 hours. Users will automatically get updates after the cache expires.


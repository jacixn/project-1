/**
 * Verse Simplification Service
 *
 * Provides simplified Bible verse explanations using curated fallback content.
 * The external API integration has been removed — all explanations are local.
 */

class VerseSimplificationService {
  static async simplifyVerse(verse) {
    try {
      const fallbackSimplifications = {
        'Jeremiah 29:11': 'This verse means God has good plans for your life! He wants you to be happy and successful, and He will help you have hope for the future. It\'s like having a loving parent who always wants the best for you.',
        'Proverbs 3:5-6': 'This verse means you should trust God completely, even when you don\'t understand everything. It\'s like following a GPS \u2014 even if you don\'t know the way, God does! When you trust Him, He will guide you on the right path.',
        'Joshua 1:9': 'This verse means you can be brave because God is always with you! You don\'t have to be scared or worried because God is like the strongest, most loving friend who never leaves your side.',
        '1 Peter 5:7': 'This verse means when you\'re worried or scared about something, you can tell God about it and He will take care of you. It\'s like giving your heavy backpack to a strong adult who can carry it for you.',
        'Romans 8:28': 'This verse means that even when bad things happen, God can turn them into something good for people who love Him. It\'s like how a puzzle piece might look weird by itself, but it fits perfectly in the big picture.',
        'John 3:16': 'This verse means that God loves everyone in the world so much that He gave us His Son, Jesus, so that if we believe in Him, we can live forever with God. It\'s the biggest gift anyone has ever given!',
        'Psalm 23:1': 'This verse means God takes care of you like a shepherd takes care of his sheep. You will always have what you need because God is looking after you.',
        'Philippians 4:13': 'This verse means you can do hard things because God gives you the strength to keep going. It doesn\'t mean you\'ll be a superhero, but that God helps you through every challenge.',
        'Matthew 6:33': 'This verse means if you put God first in your life, He will make sure you have everything you need. It\'s like doing your homework before playing \u2014 when you get the important things right, everything else falls into place.',
        'Isaiah 41:10': 'This verse means you don\'t need to be afraid because God is right there with you. He will make you strong and hold you up when things get tough.',
      };

      const simplified = fallbackSimplifications[verse.reference] ||
        `This verse teaches us about God's love and care. Every verse in the Bible has a special message — take a moment to read it again and think about what it means for your life today.`;

      return {
        success: true,
        simplified,
        original: verse,
      };
    } catch (error) {
      return {
        success: false,
        simplified: 'This verse contains God\'s wisdom and love for you. Take a moment to reflect on its meaning.',
        original: verse,
        error: error.message,
      };
    }
  }

  static async getVerseInsight(verse) {
    try {
      const insights = {
        'Jeremiah 29:11': 'When life feels uncertain, this verse reminds us that God is already working out a plan for our good. Trust the process.',
        'Proverbs 3:5-6': 'Instead of relying solely on your own understanding, lean into God\'s guidance. He sees the bigger picture.',
        'Joshua 1:9': 'Courage isn\'t the absence of fear — it\'s knowing God walks with you through every challenge.',
        'Romans 8:28': 'Even in difficult seasons, God weaves everything together for the good of those who love Him.',
        'Philippians 4:13': 'True strength comes from God. Whatever you face today, you don\'t face it alone.',
      };

      return insights[verse.reference] || 'This verse contains wisdom for your life journey. Reflect on how it speaks to your situation today.';
    } catch (error) {
      return 'This verse contains God\'s wisdom and love for you.';
    }
  }
}

export default VerseSimplificationService;

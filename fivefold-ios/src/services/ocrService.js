// OCR Service - Uses Google ML Kit for text recognition
import TextRecognition from '@react-native-ml-kit/text-recognition';

class OCRService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Extract text from an image using ML Kit
   * @param {string} imageUri - The URI of the image to process
   * @returns {Promise<{success: boolean, text: string, blocks: Array, error?: string}>}
   */
  async extractTextFromImage(imageUri) {
    if (this.isProcessing) {
      return { success: false, text: '', blocks: [], error: 'OCR already in progress' };
    }

    this.isProcessing = true;
    console.log('📸 Starting OCR on image:', imageUri);

    try {
      // Process the image with ML Kit
      const result = await TextRecognition.recognize(imageUri);
      
      console.log('✅ OCR completed successfully');
      console.log('📝 Text blocks found:', result.blocks?.length || 0);

      // Extract all text from blocks
      let fullText = '';
      const blocks = [];

      if (result.blocks && result.blocks.length > 0) {
        result.blocks.forEach((block, index) => {
          const blockText = block.text || '';
          fullText += blockText + '\n';
          blocks.push({
            index,
            text: blockText,
            confidence: block.confidence,
            boundingBox: block.frame,
          });
        });
      }

      // Clean up the extracted text
      fullText = this.cleanExtractedText(fullText);

      console.log('📖 Extracted text length:', fullText.length);
      if (fullText.length > 0) {
        console.log('📖 First 200 chars:', fullText.substring(0, 200));
      }

      this.isProcessing = false;
      return {
        success: true,
        text: fullText.trim(),
        blocks,
        rawResult: result,
      };
    } catch (error) {
      console.error('❌ OCR error:', error);
      this.isProcessing = false;
      return {
        success: false,
        text: '',
        blocks: [],
        error: error.message || 'Failed to process image',
      };
    }
  }

  /**
   * Clean up extracted text for better readability
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanExtractedText(text) {
    if (!text) return '';

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR errors in Bible text
      .replace(/\bl\b/g, 'I') // lowercase L often confused with I
      .replace(/\bO\b/g, '0') // Capital O sometimes meant as zero in verse numbers
      // Remove page numbers that might appear (common patterns)
      .replace(/^\d+\s*$/gm, '')
      // Clean up line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Check if the extracted text looks like Bible content
   * @param {string} text - Extracted text
   * @returns {boolean}
   */
  isBibleContent(text) {
    if (!text || text.length < 20) return false;

    // Common Bible book names
    const bibleBooks = [
      'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
      'joshua', 'judges', 'ruth', 'samuel', 'kings', 'chronicles',
      'ezra', 'nehemiah', 'esther', 'job', 'psalm', 'proverbs',
      'ecclesiastes', 'song', 'isaiah', 'jeremiah', 'lamentations',
      'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
      'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai',
      'zechariah', 'malachi', 'matthew', 'mark', 'luke', 'john',
      'acts', 'romans', 'corinthians', 'galatians', 'ephesians',
      'philippians', 'colossians', 'thessalonians', 'timothy', 'titus',
      'philemon', 'hebrews', 'james', 'peter', 'jude', 'revelation'
    ];

    // Common Bible words
    const bibleWords = [
      'lord', 'god', 'jesus', 'christ', 'spirit', 'holy',
      'blessed', 'faith', 'love', 'grace', 'mercy', 'salvation',
      'sin', 'heaven', 'earth', 'pray', 'amen', 'hallelujah',
      'gospel', 'apostle', 'prophet', 'angel', 'devil', 'satan'
    ];

    const lowerText = text.toLowerCase();

    // Check for Bible book names
    const hasBookName = bibleBooks.some(book => lowerText.includes(book));
    
    // Check for verse numbering patterns (e.g., "1:1", "3:16")
    const hasVersePattern = /\d+:\d+/.test(text);
    
    // Check for common Bible words
    const bibleWordCount = bibleWords.filter(word => lowerText.includes(word)).length;

    return hasBookName || hasVersePattern || bibleWordCount >= 2;
  }

  /**
   * Format extracted text for AI prompt
   * @param {string} text - Extracted text
   * @param {string} userQuestion - Optional user question
   * @returns {string}
   */
  formatForAIPrompt(text, userQuestion = '') {
    const isBible = this.isBibleContent(text);
    
    let prompt = '';
    
    if (isBible) {
      prompt = `[The user shared a photo of a Bible page. Here is the text extracted from the image:]

"${text}"

`;
      if (userQuestion) {
        prompt += `The user asks: ${userQuestion}`;
      } else {
        prompt += `Please identify which book, chapter, and verses this is from. Then explain what this passage means and its significance. Keep your response conversational and helpful.`;
      }
    } else {
      prompt = `[The user shared a photo with the following text extracted:]

"${text}"

`;
      if (userQuestion) {
        prompt += `The user asks: ${userQuestion}`;
      } else {
        prompt += `This doesn't appear to be from the Bible. Please let the user know, and if they have questions about this text, you can try to help.`;
      }
    }

    return prompt;
  }
}

// Export singleton instance
const ocrService = new OCRService();
export default ocrService;


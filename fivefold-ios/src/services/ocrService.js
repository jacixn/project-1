// OCR Service - Uses Cloud-based OCR API (OCR.space free tier)
// No native dependencies required - works with Expo

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'K88462037888957'; // Free API key for OCR.space

class OCRService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Extract text from an image using cloud OCR API
   * @param {string} imageUri - The URI of the image to process
   * @param {string} base64Data - Optional base64 encoded image data
   * @returns {Promise<{success: boolean, text: string, error?: string}>}
   */
  async extractTextFromImage(imageUri, base64Data = null) {
    if (this.isProcessing) {
      return { success: false, text: '', error: 'OCR already in progress' };
    }

    this.isProcessing = true;
    console.log('📸 Starting cloud OCR on image');

    try {
      // Prepare form data for the API
      const formData = new FormData();
      
      if (base64Data) {
        // Use base64 if available
        formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
      } else {
        // For file:// URIs, we need to read and convert to base64
        // In React Native, we can use fetch to read local files
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Convert blob to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => {
            const dataUrl = reader.result;
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        });
        
        formData.append('base64Image', base64);
      }
      
      formData.append('apikey', OCR_API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 is better for text-heavy images

      console.log('📤 Sending image to OCR API...');
      
      const ocrResponse = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!ocrResponse.ok) {
        throw new Error(`OCR API error: ${ocrResponse.status}`);
      }

      const result = await ocrResponse.json();
      console.log('📥 OCR API response received');

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
      }

      // Extract text from the response
      let fullText = '';
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        fullText = result.ParsedResults
          .map(r => r.ParsedText || '')
          .join('\n');
      }

      // Clean up the extracted text
      fullText = this.cleanExtractedText(fullText);

      console.log('📖 Extracted text length:', fullText.length);
      if (fullText.length > 0) {
        console.log('📖 First 200 chars:', fullText.substring(0, 200));
      }

      this.isProcessing = false;
      return {
        success: fullText.length > 0,
        text: fullText.trim(),
        confidence: result.ParsedResults?.[0]?.TextOverlay?.MeanConfidence,
      };
    } catch (error) {
      console.error('❌ OCR error:', error);
      this.isProcessing = false;
      
      // Try alternative approach using FileSystem if available
      try {
        return await this.extractWithFileSystem(imageUri);
      } catch (fallbackError) {
        console.error('❌ Fallback OCR also failed:', fallbackError);
        return {
          success: false,
          text: '',
          error: error.message || 'Failed to process image',
        };
      }
    }
  }

  /**
   * Alternative extraction using expo-file-system for base64 conversion
   */
  async extractWithFileSystem(imageUri) {
    console.log('📷 Trying FileSystem approach...');
    
    try {
      const FileSystem = require('expo-file-system').default;
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Prepare form data
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
      formData.append('apikey', OCR_API_KEY);
      formData.append('language', 'eng');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');
      
      const ocrResponse = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      });
      
      const result = await ocrResponse.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
      }
      
      let fullText = '';
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        fullText = result.ParsedResults
          .map(r => r.ParsedText || '')
          .join('\n');
      }
      
      fullText = this.cleanExtractedText(fullText);
      
      this.isProcessing = false;
      return {
        success: fullText.length > 0,
        text: fullText.trim(),
      };
    } catch (error) {
      this.isProcessing = false;
      throw error;
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
      // Remove page numbers that might appear (common patterns)
      .replace(/^\d+\s*$/gm, '')
      // Clean up line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove common OCR artifacts
      .replace(/[|\\]/g, '')
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
      'gospel', 'apostle', 'prophet', 'angel', 'devil', 'satan',
      'righteousness', 'commandment', 'scripture', 'testament'
    ];

    const lowerText = text.toLowerCase();

    // Check for Bible book names
    const hasBookName = bibleBooks.some(book => lowerText.includes(book));
    
    // Check for verse numbering patterns (e.g., "1:1", "3:16", "1 And", "2 Then")
    const hasVersePattern = /\d+:\d+/.test(text) || /^\s*\d+\s+[A-Z]/m.test(text);
    
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

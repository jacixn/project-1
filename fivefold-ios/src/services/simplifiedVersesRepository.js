// Centralized GitHub Repository for Simplified Bible Verses
// This saves money by reusing AI-simplified verses across all users

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios';
const GITHUB_API_BASE = 'https://api.github.com/repos/jacixn/project-1';

class SimplifiedVersesRepository {
  constructor() {
    this.cache = new Map(); // In-memory cache
  }

  // Fetch simplified chapter from GitHub (fast & free)
  async getSimplifiedChapter(bookId, chapterNumber) {
    try {
      const cacheKey = `${bookId}_${chapterNumber}`;
      
      // Check in-memory cache first
      if (this.cache.has(cacheKey)) {
        console.log('✅ Found in memory cache:', cacheKey);
        return this.cache.get(cacheKey);
      }

      // Try to fetch from GitHub
      const url = `${GITHUB_RAW_BASE}/chapters/${bookId}/${chapterNumber}.json`;
      console.log('📡 Checking GitHub for simplified verses:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Found simplified chapter in GitHub:', cacheKey);
        
        // Validate data
        if (data && data.verses && typeof data.verses === 'object') {
          this.cache.set(cacheKey, data.verses);
          return data.verses;
        } else {
          console.warn('⚠️ Invalid data format from GitHub');
          return null;
        }
      } else if (response.status === 404) {
        console.log('📝 Chapter not yet simplified in GitHub:', cacheKey);
        return null;
      } else {
        console.warn('⚠️ GitHub request failed:', response.status);
        return null;
      }
    } catch (error) {
      console.log('⚠️ Could not fetch from GitHub:', error.message);
      return null;
    }
  }

  // Save simplified chapter to GitHub (for future users)
  // Note: This requires a GitHub Personal Access Token with 'repo' scope
  async saveSimplifiedChapter(bookId, bookName, chapterNumber, versesMap, githubToken) {
    try {
      if (!githubToken) {
        console.log('⚠️ No GitHub token provided, skipping save to repository');
        return false;
      }

      const cacheKey = `${bookId}_${chapterNumber}`;
      const filePath = `chapters/${bookId}/${chapterNumber}.json`;
      
      // Convert Map to plain object
      const versesObject = Object.fromEntries(versesMap);
      
      const content = JSON.stringify({
        book: bookName,
        bookId: bookId,
        chapter: chapterNumber,
        simplifiedDate: new Date().toISOString(),
        verses: versesObject,
        verseCount: Object.keys(versesObject).length
      }, null, 2);

      // Check if file already exists
      const checkUrl = `${GITHUB_API_BASE}/contents/${filePath}`;
      console.log('📡 Checking if file exists:', filePath);
      
      let sha = null;
      try {
        const checkResponse = await fetch(checkUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        });
        
        if (checkResponse.ok) {
          const existingFile = await checkResponse.json();
          sha = existingFile.sha;
          console.log('📝 File exists, will update');
        }
      } catch (checkError) {
        console.log('📝 File does not exist, will create new');
      }

      // Create or update the file
      const createUrl = `${GITHUB_API_BASE}/contents/${filePath}`;
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      
      const body = {
        message: `Add simplified verses for ${bookName} ${chapterNumber}`,
        content: base64Content,
        branch: 'main'
      };
      
      if (sha) {
        body.sha = sha; // Include SHA for updates
      }

      console.log('💾 Saving to GitHub:', filePath);
      const response = await fetch(createUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        console.log('✅ Successfully saved to GitHub repository');
        this.cache.set(cacheKey, versesObject);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to save to GitHub:', response.status, error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving to GitHub:', error);
      return false;
    }
  }

  // Clear in-memory cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cleared simplified verses cache');
  }
}

// Create singleton instance
const simplifiedVersesRepository = new SimplifiedVersesRepository();

export default simplifiedVersesRepository;


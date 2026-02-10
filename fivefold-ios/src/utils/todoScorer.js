// 3-tier todo scoring system with AI understanding for React Native
import aiService from '../services/aiService';

const difficultyTiers = {
  low: { 
    name: 'Low Tier', 
    minPoints: 35, 
    maxPoints: 69, 
    color: '#4CAF50',
    icon: '🟢',
    description: 'Quick & simple tasks'
  },
  mid: { 
    name: 'Mid Tier', 
    minPoints: 69, 
    maxPoints: 173, 
    color: '#FF9800',
    icon: '🟡',
    description: 'Moderate effort required'
  },
  high: { 
    name: 'High Tier', 
    minPoints: 173, 
    maxPoints: 345, 
    color: '#f44336',
    icon: '🔴',
    description: 'Complex & time-intensive'
  }
};

export const scoreTask = async (taskText) => {
  try {
    // Check if AI is available
    const status = await aiService.getStatus();
    if (!status.hasApiKey) {
      // No API key - ask user to set one up
      throw new Error('Please enable smart features in Profile > Settings to get smart task scoring!');
    }

    const aiResult = await aiService.analyzeTask(taskText);
    console.log('🤖 AI result:', aiResult);
    console.log('🔍 AI tier specifically:', aiResult.tier);
    console.log('🔍 AI tier type:', typeof aiResult.tier);
    
    // Use AI result with proper tier data
    const tierData = difficultyTiers[aiResult.tier] || difficultyTiers.mid;
    
    console.log('📊 TierData for', aiResult.tier, ':', tierData);
    console.log('🗂️ Available tiers:', Object.keys(difficultyTiers));
    
    return {
      // Legacy compatibility  
      difficulty: aiResult.complexity || 0.5,
      band: aiResult.tier,
      basePoints: aiResult.points,
      points: aiResult.points,
      
      // New 3-tier system data
      tier: aiResult.tier,               // AI says: low/mid/high
      tierData: tierData,                // Get proper tier display data
      complexity: aiResult.complexity || 0.5,
      rationale: `${tierData.icon} ${tierData.name}: ${aiResult.reasoning}`,
      
      // AI-specific data
      aiEnabled: true,
      confidence: aiResult.confidence,
      timeEstimate: aiResult.timeEstimate,
      reasoning: aiResult.reasoning,
      source: 'ai'
    };
    
  } catch (error) {
    console.error('AI scoring failed:', error);
    // Re-throw the error so the UI can handle it - no fallback, AI only!
    throw error;
  }
};

// Export tier data for UI components
export const getDifficultyTiers = () => difficultyTiers;

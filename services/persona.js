// /services/persona.js
const fs = require('fs').promises;
const path = require('path');

/**
 * Persona and Knowledge Management Service
 */
class PersonaService {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.knowledgeFile = path.join(this.dataDir, 'knowledge.json');
    this.statsFile = path.join(this.dataDir, 'stats.json');
    
    this.knowledgeCache = [];
    this.stats = {
      totalKnowledge: 0,
      lastUpdate: null,
      trainingCount: 0
    };

    this.initializeData();
  }

  async initializeData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadKnowledge();
      await this.loadStats();
    } catch (error) {
      console.error('Data initialization error:', error.message);
    }
  }

  async loadKnowledge() {
    try {
      const data = await fs.readFile(this.knowledgeFile, 'utf8');
      this.knowledgeCache = JSON.parse(data);
      console.log(`📚 Loaded ${this.knowledgeCache.length} knowledge items`);
    } catch (error) {
      // File doesn't exist, start with empty knowledge
      this.knowledgeCache = [];
      await this.saveKnowledge();
    }
  }

  async saveKnowledge() {
    try {
      await fs.writeFile(this.knowledgeFile, JSON.stringify(this.knowledgeCache, null, 2));
    } catch (error) {
      console.error('Error saving knowledge:', error.message);
    }
  }

  async loadStats() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      this.stats = { ...this.stats, ...JSON.parse(data) };
    } catch (error) {
      // File doesn't exist, use defaults
      await this.saveStats();
    }
  }

  async saveStats() {
    try {
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error('Error saving stats:', error.message);
    }
  }

  async trainAenki(content, metadata = {}) {
    try {
      const knowledgeItem = {
        id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: content.substring(0, 10000), // Limit content size
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          source: metadata.source || 'manual',
          type: metadata.type || 'text'
        },
        embedding: this.simulateEmbedding(content) // Simulated vector
      };

      this.knowledgeCache.push(knowledgeItem);

      // Limit knowledge base size
      const maxItems = parseInt(process.env.MAX_KNOWLEDGE_ITEMS) || 1000;
      if (this.knowledgeCache.length > maxItems) {
        this.knowledgeCache = this.knowledgeCache.slice(-maxItems);
      }

      // Update stats
      this.stats.totalKnowledge = this.knowledgeCache.length;
      this.stats.lastUpdate = new Date().toISOString();
      this.stats.trainingCount++;

      await Promise.all([
        this.saveKnowledge(),
        this.saveStats()
      ]);

      console.log(`✅ Knowledge added: ${knowledgeItem.id}`);
      
      return {
        success: true,
        id: knowledgeItem.id,
        added: true,
        totalKnowledge: this.knowledgeCache.length
      };

    } catch (error) {
      console.error('Training error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  simulateEmbedding(text) {
    // Simulate a 512-dimensional embedding vector
    const embedding = [];
    for (let i = 0; i < 512; i++) {
      embedding.push((Math.random() - 0.5) * 2);
    }
    return embedding;
  }

  async searchKnowledge(query, threshold = 0.7, limit = 5) {
    try {
      // Simulate semantic search with keyword matching for now
      const queryLower = query.toLowerCase();
      
      const results = this.knowledgeCache
        .map(item => ({
          ...item,
          similarity: this.calculateSimilarity(queryLower, item.content.toLowerCase())
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return {
        success: true,
        query,
        results,
        found: results.length,
        total: this.knowledgeCache.length
      };

    } catch (error) {
      console.error('Search error:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  calculateSimilarity(query, content) {
    // Simple keyword-based similarity (in production, use real embeddings)
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const contentWords = content.split(/\s+/);
    
    let matches = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(word => word.includes(queryWord))) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  getAvatarStats() {
    return {
      ...this.stats,
      knowledgeItems: this.knowledgeCache.length,
      lastKnowledgeUpdate: this.stats.lastUpdate,
      memoryUsage: this.estimateMemoryUsage(),
      capabilities: {
        textToSpeech: !!process.env.GOOGLE_API_KEY,
        chatCompletion: !!process.env.OPENAI_API_KEY,
        continuousLearning: process.env.CONTINUOUS_LEARNING === 'true',
        healthResearch: process.env.HEALTH_RESEARCH_MODE === 'true'
      }
    };
  }

  estimateMemoryUsage() {
    const bytes = JSON.stringify(this.knowledgeCache).length;
    return {
      bytes,
      kb: Math.round(bytes / 1024),
      mb: Math.round(bytes / (1024 * 1024))
    };
  }
}

module.exports = new PersonaService();

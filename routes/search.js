// /routes/search.js
const express = require('express');
const personaService = require('../services/persona');

const router = express.Router();

/**
 * Search knowledge base
 * GET /api/search
 */
router.get('/', async (req, res) => {
  try {
    const { 
      query, 
      threshold = 0.7, 
      limit = 10 
    } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing required parameter: query',
        code: 'MISSING_QUERY'
      });
    }

    if (query.length < 2) {
      return res.status(400).json({
        error: 'Query too short (minimum 2 characters)',
        code: 'QUERY_TOO_SHORT'
      });
    }

    const searchThreshold = Math.max(0, Math.min(1, parseFloat(threshold)));
    const searchLimit = Math.max(1, Math.min(50, parseInt(limit)));

    const searchResult = await personaService.searchKnowledge(
      query, 
      searchThreshold, 
      searchLimit
    );

    if (!searchResult.success) {
      return res.status(500).json({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
        details: searchResult.error
      });
    }

    res.json({
      success: true,
      query,
      results: searchResult.results.map(item => ({
        id: item.id,
        content: item.content.substring(0, 500), // Truncate for API response
        similarity: Math.round(item.similarity * 100) / 100,
        metadata: {
          source: item.metadata.source,
          timestamp: item.metadata.timestamp,
          type: item.metadata.type,
          title: item.metadata.title
        }
      })),
      pagination: {
        found: searchResult.found,
        returned: searchResult.results.length,
        threshold: searchThreshold,
        limit: searchLimit
      },
      stats: {
        totalKnowledge: searchResult.total,
        searchTime: Date.now()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      error: 'Knowledge search failed',
      code: 'SEARCH_ERROR',
      details: error.message
    });
  }
});

/**
 * Advanced search with filters
 * POST /api/search
 */
router.post('/', async (req, res) => {
  try {
    const { 
      query, 
      filters = {},
      threshold = 0.7,
      limit = 10 
    } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query',
        code: 'MISSING_QUERY'
      });
    }

    // Get all search results first
    const searchResult = await personaService.searchKnowledge(query, threshold, 100);

    if (!searchResult.success) {
      return res.status(500).json({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
        details: searchResult.error
      });
    }

    let filteredResults = searchResult.results;

    // Apply filters
    if (filters.source) {
      filteredResults = filteredResults.filter(item => 
        item.metadata.source === filters.source
      );
    }

    if (filters.type) {
      filteredResults = filteredResults.filter(item => 
        item.metadata.type === filters.type
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredResults = filteredResults.filter(item => 
        new Date(item.metadata.timestamp) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredResults = filteredResults.filter(item => 
        new Date(item.metadata.timestamp) <= toDate
      );
    }

    // Apply limit
    const limitedResults = filteredResults.slice(0, parseInt(limit));

    res.json({
      success: true,
      query,
      filters,
      results: limitedResults.map(item => ({
        id: item.id,
        content: item.content.substring(0, 500),
        similarity: Math.round(item.similarity * 100) / 100,
        metadata: item.metadata
      })),
      pagination: {
        found: filteredResults.length,
        returned: limitedResults.length,
        threshold,
        limit: parseInt(limit)
      },
      stats: {
        totalKnowledge: searchResult.total,
        beforeFilters: searchResult.results.length,
        afterFilters: filteredResults.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Advanced search error:', error.message);
    res.status(500).json({
      error: 'Advanced search failed',
      code: 'ADVANCED_SEARCH_ERROR',
      details: error.message
    });
  }
});

/**
 * Get search suggestions
 * GET /api/search/suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    // Simple suggestion system based on common health/longevity terms
    const commonTerms = [
      'longevidad', 'aging', 'envejecimiento', 'salud', 'health',
      'nutrición', 'nutrition', 'ejercicio', 'exercise', 'suplementos',
      'supplements', 'NAD+', 'rapamycin', 'metformin', 'ayuno',
      'fasting', 'telómeros', 'telomeres', 'mitocondrias',
      'mitochondria', 'antioxidantes', 'inflammation', 'inflamación'
    ];

    let suggestions = [];

    if (q && q.length >= 2) {
      suggestions = commonTerms.filter(term => 
        term.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10);
    } else {
      suggestions = commonTerms.slice(0, 10);
    }

    res.json({
      success: true,
      query: q || '',
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get suggestions',
      code: 'SUGGESTIONS_ERROR'
    });
  }
});

module.exports = router;

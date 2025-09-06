// /services/ingest.js
const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Content ingestion service with domain whitelisting
 */
class IngestService {
  constructor() {
    // Whitelist of allowed domains for scraping
    this.allowedDomains = [
      'wikipedia.org',
      'ncbi.nlm.nih.gov',
      'pubmed.ncbi.nlm.nih.gov',
      'nature.com',
      'science.org',
      'harvard.edu',
      'stanford.edu',
      'mit.edu',
      'sistemasorbix.com',
      'idotec.online'
    ];
  }

  async ingestUrl(url) {
    try {
      // Validate URL domain
      const urlObj = new URL(url);
      const isAllowed = this.allowedDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );

      if (!isAllowed) {
        throw new Error(`Domain ${urlObj.hostname} not in whitelist`);
      }

      console.log(`📥 Ingesting content from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AeNKI Content Ingestion Bot 1.0'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const content = this.extractContent(html);

      return {
        success: true,
        url,
        content: content.substring(0, 10000), // Limit to 10k chars
        title: this.extractTitle(html),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Ingestion failed for ${url}:`, error.message);
      return {
        success: false,
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  extractContent(html) {
    try {
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, .nav, .menu, .sidebar').remove();
      
      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const mainSelectors = [
        'main',
        'article', 
        '.content',
        '.main-content',
        '#content',
        '.post-content',
        '.entry-content'
      ];

      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text();
      }

      // Clean up whitespace
      return content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

    } catch (error) {
      console.error('Content extraction error:', error.message);
      return '';
    }
  }

  extractTitle(html) {
    try {
      const $ = cheerio.load(html);
      return $('title').text().trim() || 'Untitled';
    } catch (error) {
      return 'Untitled';
    }
  }

  async ingestText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text content');
    }

    return {
      success: true,
      content: text.substring(0, 10000), // Limit to 10k chars
      type: 'text',
      timestamp: new Date().toISOString()
    };
  }

  async batchIngest(items) {
    const results = [];
    
    for (const item of items) {
      if (item.type === 'url') {
        results.push(await this.ingestUrl(item.value));
      } else if (item.type === 'text') {
        results.push(await this.ingestText(item.value));
      }
    }

    return {
      success: true,
      results,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new IngestService();

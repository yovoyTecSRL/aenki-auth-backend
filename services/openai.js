// /services/openai.js
const fetch = require('node-fetch');

/**
 * OpenAI Chat Service with persona and knowledge integration
 */
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.enabled = !!this.apiKey;
    
    if (!this.enabled) {
      console.log('⚠️  OpenAI: API key not configured - using simulation mode');
    }
  }

  async chatWithAenki(prompt, context = {}) {
    const {
      persona = this.getDefaultPersona(),
      knowledge = [],
      maxTokens = 1000
    } = context;

    if (!this.enabled) {
      return this.simulateResponse(prompt, persona);
    }

    try {
      const messages = this.buildMessages(prompt, persona, knowledge);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7
        }),
        timeout: 30000
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status}`);
        return this.simulateResponse(prompt, persona);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || 'No response generated';

      return {
        success: true,
        response: content,
        model: this.model,
        usage: data.usage,
        provider: 'openai',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return this.simulateResponse(prompt, persona);
    }
  }

  buildMessages(prompt, persona, knowledge) {
    const messages = [
      {
        role: 'system',
        content: persona
      }
    ];

    // Add knowledge context if available
    if (knowledge.length > 0) {
      const knowledgeContext = knowledge
        .slice(0, 5) // Limit to 5 most relevant pieces
        .map(k => k.content || k.text || k)
        .join('\n\n');

      messages.push({
        role: 'system',
        content: `Conocimiento relevante:\n${knowledgeContext}`
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  getDefaultPersona() {
    return `Eres AeNKI, un asistente de IA especializado en salud, longevidad y bienestar. 
    Tienes conocimientos profundos en:
    - medicine preventiva y longevidad
    - Nutrición y suplementación
    - Ejercicio y actividad física
    - Salud mental y bienestar
    - Investigación centrica actual
    
    Respondes de manera informativa, equilibrada y basada en evidencia científica.
    Siempre recomiendas consultar con profesionales de la salud para decisiones importantes.`;
  }

  simulateResponse(prompt, persona) {
    const responses = [
      "Basándome en la investigación actual en longevidad, es importante mantener un enfoque integral que incluya nutrición, ejercicio y manejo del estrés.",
      "Los estudios recientes sugieren que la restricción calórica moderada y el ejercicio regular pueden tener efectos positivos en el envejecimiento saludable.",
      "Es fascinante cómo la ciencia de la longevidad está evolucionando. Te recomiendo siempre consultar con un profesional de la salud.",
      "La medicina personalizada está revolucionando nuestro entendimiento del envejecimiento y la prevención de enfermedades.",
      "Los marcadores biológicos de envejecimiento nos ayudan a entender mejor cómo optimizar nuestra salud a largo plazo."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      response: `${randomResponse}\n\n[Respuesta simulada - configura OPENAI_API_KEY para respuestas reales basadas en: "${prompt.substring(0, 50)}..."]`,
      model: 'simulation',
      provider: 'simulation',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new OpenAIService();

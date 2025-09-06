// /services/googleTTS.js
const fetch = require('node-fetch');

/**
 * Google Text-to-Speech Service
 * Uses Google Cloud TTS API if available, otherwise simulates
 */
class GoogleTTSService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.enabled = !!this.apiKey;
    
    if (!this.enabled) {
      console.log('⚠️  Google TTS: API key not configured - using simulation mode');
    }
  }

  async synthesize(text, options = {}) {
    const {
      languageCode = 'es-ES',
      voiceName = 'es-ES-Wavenet-D',
      audioEncoding = 'MP3'
    } = options;

    if (!this.enabled) {
      return this.simulateAudio(text);
    }

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode,
              name: voiceName
            },
            audioConfig: {
              audioEncoding
            }
          }),
          timeout: 15000
        }
      );

      if (!response.ok) {
        console.error(`Google TTS API error: ${response.status}`);
        return this.simulateAudio(text);
      }

      const data = await response.json();
      
      return {
        success: true,
        audioContent: data.audioContent,
        format: audioEncoding.toLowerCase(),
        text: text,
        provider: 'google'
      };

    } catch (error) {
      console.error('Google TTS error:', error.message);
      return this.simulateAudio(text);
    }
  }

  simulateAudio(text) {
    // Simulate base64 audio content
    const simulatedAudio = Buffer.from(`SIMULATED_AUDIO_${text.length}_${Date.now()}`).toString('base64');
    
    return {
      success: true,
      audioContent: simulatedAudio,
      format: 'mp3',
      text: text,
      provider: 'simulation',
      note: 'This is simulated audio data - configure GOOGLE_API_KEY for real TTS'
    };
  }
}

module.exports = new GoogleTTSService();

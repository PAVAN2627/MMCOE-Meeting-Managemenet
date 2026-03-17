import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@deepgram/sdk';
import { Transcript, Summary, TaskSuggestion, TranscriptProcessingStatus, TranscriptSegment } from '@/types/ai.types';
import { Timestamp } from 'firebase/firestore';

class AIService {
  private genAI: GoogleGenerativeAI;
  private deepgram: any;

  constructor() {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    
    if (!geminiApiKey) {
      console.warn('Gemini API key not configured');
    }
    if (!deepgramApiKey) {
      console.warn('Deepgram API key not configured');
    }
    
    this.genAI = new GoogleGenerativeAI(geminiApiKey || '');
    this.deepgram = createClient(deepgramApiKey || '');
  }

  /**
   * Transcribe audio to text using Deepgram
   * Supports multi-language input, generates English-only output
   */
  async transcribeAudio(audioUrl: string, sourceLanguage: string = 'auto'): Promise<Transcript> {
    try {
      // Fetch audio file
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();

      // Transcribe with Deepgram
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: sourceLanguage === 'auto' ? undefined : sourceLanguage,
          detect_language: sourceLanguage === 'auto',
          punctuate: true,
          paragraphs: true,
          utterances: true,
          diarize: true, // Speaker diarization
          smart_format: true,
        }
      );

      if (error) {
        throw new Error(`Deepgram error: ${error.message}`);
      }

      const transcript = result.results.channels[0].alternatives[0];
      const detectedLanguage = result.results.channels[0].detected_language || sourceLanguage;

      // Extract segments with speaker info
      const segments: TranscriptSegment[] = (result.results.utterances || []).map((utterance: any) => ({
        startTime: utterance.start,
        endTime: utterance.end,
        text: utterance.transcript,
        speaker: `Speaker ${utterance.speaker}`,
        confidence: utterance.confidence,
      }));

      // If not English, translate using Gemini
      let finalText = transcript.transcript;
      if (detectedLanguage !== 'en' && detectedLanguage !== 'en-US') {
        finalText = await this.translateToEnglish(transcript.transcript);
      }

      return {
        id: '',
        meetingId: '',
        text: finalText,
        segments,
        sourceLanguage: detectedLanguage,
        outputLanguage: 'en',
        processingStatus: TranscriptProcessingStatus.COMPLETED,
        confidence: transcript.confidence,
        createdAt: Timestamp.now(),
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Translate text to English using Gemini
   */
  private async translateToEnglish(text: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Translate the following text to English. Only provide the translation, no explanations:\n\n${text}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original if translation fails
    }
  }

  /**
   * Generate meeting summary using Gemini AI
   */
  async generateSummary(transcript: string): Promise<Summary> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
You are an AI assistant analyzing a meeting transcript. Please provide:

1. A concise summary (2-3 paragraphs)
2. Key discussion points (bullet points)
3. Decisions made during the meeting (bullet points)
4. Main discussion topics (bullet points)

Transcript:
${transcript}

Please format your response as JSON with the following structure:
{
  "summary": "Full summary text",
  "keyPoints": ["point 1", "point 2", ...],
  "decisions": ["decision 1", "decision 2", ...],
  "discussionTopics": ["topic 1", "topic 2", ...]
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: '',
        meetingId: '',
        aiGeneratedText: parsed.summary,
        approvedText: '',
        keyPoints: parsed.keyPoints || [],
        decisions: parsed.decisions || [],
        discussionTopics: parsed.discussionTopics || [],
        status: 'draft',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Suggest tasks from meeting transcript and summary using Gemini AI
   */
  async suggestTasks(transcript: string, summary: string): Promise<TaskSuggestion[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
You are an AI assistant analyzing a meeting to identify action items and tasks.

Meeting Summary:
${summary}

Full Transcript:
${transcript}

Please identify all action items, tasks, and follow-ups mentioned in the meeting.
For each task, provide:
1. A clear task description
2. Suggested assignee (if mentioned, otherwise leave empty)
3. Suggested deadline (if mentioned, otherwise leave empty)
4. Confidence score (0-1) indicating how certain you are this is a task

Format your response as JSON array:
[
  {
    "description": "Task description",
    "suggestedAssignee": "Person name or empty",
    "suggestedDeadline": "Date string or empty",
    "confidence": 0.95
  }
]
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return parsed.map((task: any) => ({
        description: task.description,
        suggestedAssignee: task.suggestedAssignee || undefined,
        suggestedDeadline: task.suggestedDeadline ? new Date(task.suggestedDeadline) : undefined,
        confidence: task.confidence || 0.5,
      }));
    } catch (error) {
      console.error('Error suggesting tasks:', error);
      return [];
    }
  }

  /**
   * Identify speakers in transcript
   */
  async identifySpeakers(transcript: string): Promise<any[]> {
    // Speaker diarization is handled by Deepgram during transcription
    console.log('Speaker identification is included in transcription');
    return [];
  }
}

export const aiService = new AIService();

import nlp from 'compromise';
import { NlpManager } from 'node-nlp';
import * as chrono from 'chrono-node';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export interface EnhancedIntent {
  intent: string;
  confidence: number;
  entities: {
    person?: string[];
    location?: string[];
    time?: string[];
    action?: string;
    object?: string;
    urgency?: 'high' | 'medium' | 'low';
    ordinal?: 'first' | 'last' | 'next' | 'previous';
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  question_type?: 'when' | 'what' | 'where' | 'who' | 'how' | 'why';
  calendar_context?: {
    is_calendar_query: boolean;
    query_type: 'specific_event' | 'time_range' | 'list_events' | 'first_meeting' | 'next_event';
    time_scope: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'specific_date' | 'general';
  };
}

export class EnhancedNLPProcessor {
  private nlpManager: NlpManager;
  private initialized = false;

  constructor() {
    this.nlpManager = new NlpManager({ languages: ['en'] });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Add training data for calendar intents
    this.addCalendarTrainingData();
    
    // Train the model
    await this.nlpManager.train();
    this.initialized = true;
  }

  private addCalendarTrainingData(): void {
    // Calendar query intents
    this.nlpManager.addDocument('en', 'when am I taking %person% to the %location%', 'calendar.specific_event');
    this.nlpManager.addDocument('en', 'when do I take %person% to %location%', 'calendar.specific_event');
    this.nlpManager.addDocument('en', 'when is my %event% with %person%', 'calendar.specific_event');
    this.nlpManager.addDocument('en', 'what time is my %event%', 'calendar.specific_event');
    
    this.nlpManager.addDocument('en', 'what is my first meeting tomorrow', 'calendar.first_meeting');
    this.nlpManager.addDocument('en', 'what is my first meeting today', 'calendar.first_meeting');
    this.nlpManager.addDocument('en', 'first meeting tomorrow', 'calendar.first_meeting');
    this.nlpManager.addDocument('en', 'next meeting', 'calendar.first_meeting');
    
    this.nlpManager.addDocument('en', 'what is my schedule today', 'calendar.list_events');
    this.nlpManager.addDocument('en', 'what is my schedule tomorrow', 'calendar.list_events');
    this.nlpManager.addDocument('en', 'show me my calendar', 'calendar.list_events');
    this.nlpManager.addDocument('en', 'what do I have today', 'calendar.list_events');
    
    // Add named entities
    this.nlpManager.addNamedEntityText('person', 'mum', ['en'], ['mom', 'mother', 'mama']);
    this.nlpManager.addNamedEntityText('person', 'dad', ['en'], ['father', 'papa']);
    this.nlpManager.addNamedEntityText('location', 'airport', ['en'], ['terminal', 'departure', 'flight']);
    this.nlpManager.addNamedEntityText('location', 'office', ['en'], ['work', 'workplace']);
    this.nlpManager.addNamedEntityText('location', 'hospital', ['en'], ['clinic', 'medical center']);
  }

  async processQuery(input: string, userTimezone: string = 'UTC'): Promise<EnhancedIntent> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Parse with compromise for linguistic analysis
    const doc = nlp(input);
    
    // Get NLP intent classification
    const response = await this.nlpManager.process('en', input);
    
    // Extract time expressions with chrono-node
    const timeExpressions = chrono.parse(input);
    
    // Extract entities using compromise
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const dates = doc.dates().out('array');
    
    // Enhanced entity extraction
    const entities = this.extractEnhancedEntities(input, people, places, dates, timeExpressions);
    
    // Determine question type
    const question_type = this.getQuestionType(input);
    
    // Analyze calendar context
    const calendar_context = this.analyzeCalendarContext(input, response.intent, entities);
    
    // Determine sentiment
    const sentiment = this.getSentiment(doc);

    return {
      intent: response.intent || 'general.query',
      confidence: response.score || 0.5,
      entities,
      sentiment,
      question_type,
      calendar_context
    };
  }

  private extractEnhancedEntities(
    input: string, 
    people: string[], 
    places: string[], 
    dates: string[], 
    timeExpressions: any[]
  ): EnhancedIntent['entities'] {
    const lowerInput = input.toLowerCase();
    
    // Enhanced person detection
    const personKeywords = ['mum', 'mom', 'mother', 'dad', 'father', 'colleague', 'boss', 'friend', 'doctor', 'client'];
    const detectedPersons = [
      ...people,
      ...personKeywords.filter(keyword => lowerInput.includes(keyword))
    ];

    // Enhanced location detection  
    const locationKeywords = ['airport', 'office', 'home', 'work', 'hospital', 'clinic', 'school', 'restaurant', 'gym'];
    const detectedLocations = [
      ...places,
      ...locationKeywords.filter(keyword => lowerInput.includes(keyword))
    ];

    // Time detection
    const timeKeywords = ['today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'night'];
    const detectedTimes = [
      ...dates,
      ...timeKeywords.filter(keyword => lowerInput.includes(keyword)),
      ...timeExpressions.map(expr => expr.text)
    ];

    // Action detection
    let action: string | undefined;
    if (lowerInput.includes('take') || lowerInput.includes('bring')) action = 'transport';
    else if (lowerInput.includes('meet') || lowerInput.includes('meeting')) action = 'meeting';
    else if (lowerInput.includes('call') || lowerInput.includes('phone')) action = 'call';
    else if (lowerInput.includes('visit') || lowerInput.includes('go to')) action = 'visit';

    // Ordinal detection
    let ordinal: 'first' | 'last' | 'next' | 'previous' | undefined;
    if (lowerInput.includes('first')) ordinal = 'first';
    else if (lowerInput.includes('last')) ordinal = 'last';
    else if (lowerInput.includes('next')) ordinal = 'next';
    else if (lowerInput.includes('previous') || lowerInput.includes('before')) ordinal = 'previous';

    // Urgency detection
    let urgency: 'high' | 'medium' | 'low' = 'low';
    if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('emergency')) {
      urgency = 'high';
    } else if (lowerInput.includes('important') || lowerInput.includes('priority') || lowerInput.includes('soon')) {
      urgency = 'medium';
    }

    return {
      person: detectedPersons.length > 0 ? Array.from(new Set(detectedPersons)) : undefined,
      location: detectedLocations.length > 0 ? Array.from(new Set(detectedLocations)) : undefined,
      time: detectedTimes.length > 0 ? Array.from(new Set(detectedTimes)) : undefined,
      action,
      ordinal,
      urgency
    };
  }

  private getQuestionType(input: string): EnhancedIntent['question_type'] | undefined {
    const lowerInput = input.toLowerCase();
    if (lowerInput.startsWith('when ') || lowerInput.includes(' when ')) return 'when';
    if (lowerInput.startsWith('what ') || lowerInput.includes(' what ')) return 'what';
    if (lowerInput.startsWith('where ') || lowerInput.includes(' where ')) return 'where';
    if (lowerInput.startsWith('who ') || lowerInput.includes(' who ')) return 'who';
    if (lowerInput.startsWith('how ') || lowerInput.includes(' how ')) return 'how';
    if (lowerInput.startsWith('why ') || lowerInput.includes(' why ')) return 'why';
    return undefined;
  }

  private analyzeCalendarContext(input: string, intent: string, entities: EnhancedIntent['entities']): EnhancedIntent['calendar_context'] {
    const lowerInput = input.toLowerCase();
    
    const is_calendar_query = intent.startsWith('calendar.') || 
                              lowerInput.includes('meeting') || 
                              lowerInput.includes('schedule') || 
                              lowerInput.includes('calendar') || 
                              lowerInput.includes('event') ||
                              lowerInput.includes('appointment') ||
                              Boolean(entities.time?.length);

    let query_type: 'specific_event' | 'time_range' | 'list_events' | 'first_meeting' | 'next_event' = 'list_events';
    
    if (intent === 'calendar.specific_event' || (entities.person && entities.location)) {
      query_type = 'specific_event';
    } else if (intent === 'calendar.first_meeting' || entities.ordinal === 'first') {
      query_type = 'first_meeting';
    } else if (entities.ordinal === 'next') {
      query_type = 'next_event';
    }

    let time_scope: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'specific_date' | 'general' = 'general';
    if (entities.time?.some(t => t.includes('today'))) time_scope = 'today';
    else if (entities.time?.some(t => t.includes('tomorrow'))) time_scope = 'tomorrow';
    else if (entities.time?.some(t => t.includes('week'))) time_scope = 'this_week';

    return {
      is_calendar_query,
      query_type,
      time_scope
    };
  }

  private getSentiment(doc: any): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis based on compromise
    const positive = doc.has('#Positive');
    const negative = doc.has('#Negative');
    
    if (positive && !negative) return 'positive';
    if (negative && !positive) return 'negative';
    return 'neutral';
  }

  // Helper method to extract specific calendar events
  extractCalendarKeywords(query: string): string[] {
    const doc = nlp(query);
    
    // Extract nouns and proper nouns that might be event-related
    const keywords = [
      ...doc.nouns().out('array'),
      ...doc.people().out('array'),
      ...doc.places().out('array'),
      ...doc.organizations().out('array')
    ].filter(keyword => keyword.length > 2);

    // Add common calendar-related synonyms
    const additionalKeywords: string[] = [];
    keywords.forEach(keyword => {
      const lower = keyword.toLowerCase();
      switch (lower) {
        case 'mum':
        case 'mom':
          additionalKeywords.push('mother', 'family', 'mum', 'mom');
          break;
        case 'dad':
          additionalKeywords.push('father', 'family', 'dad');
          break;
        case 'airport':
          additionalKeywords.push('flight', 'departure', 'terminal', 'travel');
          break;
        case 'flight':
          additionalKeywords.push('airport', 'departure', 'travel');
          break;
        case 'meeting':
          additionalKeywords.push('call', 'conference', 'discussion');
          break;
      }
    });

    return Array.from(new Set([...keywords, ...additionalKeywords]));
  }
}

// Singleton instance
let nlpProcessor: EnhancedNLPProcessor | null = null;

export function getEnhancedNLPProcessor(): EnhancedNLPProcessor {
  if (!nlpProcessor) {
    nlpProcessor = new EnhancedNLPProcessor();
  }
  return nlpProcessor;
}
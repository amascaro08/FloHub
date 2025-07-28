declare module 'compromise' {
  interface Doc {
    people(): Doc;
    places(): Doc;
    dates(): Doc;
    nouns(): Doc;
    organizations(): Doc;
    out(format: string): string[];
    has(selector: string): boolean;
  }
  
  function nlp(text: string): Doc;
  export default nlp;
}

declare module 'node-nlp' {
  export interface NlpManagerOptions {
    languages: string[];
  }
  
  export interface NlpResponse {
    intent: string;
    score: number;
    entities?: any[];
  }
  
  export class NlpManager {
    constructor(options: NlpManagerOptions);
    addDocument(language: string, utterance: string, intent: string): void;
    addNamedEntityText(entityName: string, entityValue: string, languages: string[], synonyms?: string[]): void;
    train(): Promise<void>;
    process(language: string, utterance: string): Promise<NlpResponse>;
  }
}

declare module 'chrono-node' {
  export interface ParsedResult {
    text: string;
    start: Date;
    end?: Date;
  }
  
  export function parse(text: string): ParsedResult[];
}

declare module 'natural' {
  export const SentimentAnalyzer: any;
  export const PorterStemmer: any;
  export const WordTokenizer: any;
}
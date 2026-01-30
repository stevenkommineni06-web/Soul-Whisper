
export interface FocusPoint {
  title: string;
  description: string;
  scripture: string;
}

export interface CrossReference {
  theme: string;
  reference: string;
}

export interface SubTopic {
  label: string;
  icon: string;
}

export interface Situation {
  id: string;
  label: string;
  icon: string;
  description: string;
  subTopics?: SubTopic[];
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface PrayerResponse {
  story: string;
  prayer: string;
  title: string;
  references: string[];
  focusPoints: FocusPoint[];
  crossReferences: CrossReference[];
  imagePrompt: string;
  imageUrl?: string;
}

export interface SavedPrayer extends PrayerResponse {
  id: string;
  timestamp: number;
}

export interface User {
  name: string;
  email: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  type?: 'text' | 'audio' | 'visual';
  metadata?: {
    originalMode?: ConversionMode;
    targetMode?: ConversionMode;
    processingTime?: number;
    sigml?: string;
    missingWords?: string[];
  };
}

export type ConversionMode = 'visual' | 'audio' | 'text';

export interface ConversionSettings {
  inputMode: ConversionMode;
  outputMode: ConversionMode;
  instantMode: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
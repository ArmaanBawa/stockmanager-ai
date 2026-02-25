export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessName: string;
}


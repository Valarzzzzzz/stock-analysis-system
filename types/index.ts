export interface AIAnalysis {
  keyLevels: {
    support: number;
    resistance: number;
  };
  direction: '做多' | '做空' | '观望';
  stopLoss: number;
  target: number;
  reasoning: string;
}

export interface Analysis {
  id: string;
  stockCode?: string; // 股票代码（可选，如 AAPL, TSLA 等）
  date: string;
  imageUrl: string;
  userInput: string;
  aiAnalysis: AIAnalysis;
  status: 'pending_review' | 'reviewed';
  createdAt: string;
}

export interface Review {
  id: string;
  analysisId: string;
  actualHigh: number;
  actualLow: number;
  actualClose: number;
  accuracy: number;
  feedback: string;
  reviewedAt: string;
}

// 复盘对话类型
export interface ReviewConversation {
  id: string;
  analysisId: string; // 关联的原始分析ID
  messages: Message[]; // 复盘讨论的消息列表
  actualData?: {
    actualHigh: number;
    actualLow: number;
    actualClose: number;
  };
  accuracy?: number;
  status: 'ongoing' | 'completed'; // 进行中 / 已完成
  createdAt: string;
  updatedAt: string;
}

// 对话相关类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

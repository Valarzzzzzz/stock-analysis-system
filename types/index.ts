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
  conversationId: string; // 关联的原始对话ID（改：从analysisId变为conversationId）
  messages: Message[]; // 复盘讨论的消息列表
  predictions: PredictionReview[]; // 对话中所有预测的复盘结果
  overallAccuracy?: number; // 平均准确率
  qualityScore?: number; // 整体对话质量评分 (0-100)
  status: 'ongoing' | 'completed'; // 进行中 / 已完成
  createdAt: string;
  updatedAt: string;
}

// 单个预测的复盘结果
export interface PredictionReview {
  messageId: string; // 对应的消息ID
  imageUrl?: string; // 预测时的图片
  prediction: AIAnalysis; // 原始预测
  actualData?: {
    actualHigh: number;
    actualLow: number;
    actualClose: number;
  };
  accuracy?: number; // 该预测的准确率
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

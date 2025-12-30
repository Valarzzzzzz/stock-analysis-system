import fs from 'fs/promises';
import path from 'path';
import { Analysis, Review, Conversation, Message, ReviewConversation, PredictionReview } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 读取JSON文件
async function readJSON<T>(filename: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入JSON文件
async function writeJSON<T>(filename: string, data: T[]) {
  await ensureDir(DATA_DIR);
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== 分析相关操作 ====================

export async function saveAnalysis(analysis: Analysis) {
  const analyses = await readJSON<Analysis>('analyses.json');
  analyses.push(analysis);
  await writeJSON('analyses.json', analyses);
}

export async function getAnalyses(): Promise<Analysis[]> {
  return await readJSON<Analysis>('analyses.json');
}

export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const analyses = await getAnalyses();
  return analyses.find(a => a.id === id) || null;
}

export async function updateAnalysisStatus(id: string, status: 'pending_review' | 'reviewed') {
  const analyses = await getAnalyses();
  const index = analyses.findIndex(a => a.id === id);
  if (index !== -1) {
    analyses[index].status = status;
    await writeJSON('analyses.json', analyses);
  }
}

// ==================== 复盘相关操作 ====================

export async function saveReview(review: Review) {
  const reviews = await readJSON<Review>('reviews.json');
  reviews.push(review);
  await writeJSON('reviews.json', reviews);
  await updateAnalysisStatus(review.analysisId, 'reviewed');
}

export async function getReviews(): Promise<Review[]> {
  return await readJSON<Review>('reviews.json');
}

export async function getReviewByAnalysisId(analysisId: string): Promise<Review | null> {
  const reviews = await getReviews();
  return reviews.find(r => r.analysisId === analysisId) || null;
}

// ==================== 图片上传 ====================

export async function saveImage(buffer: Buffer, filename: string): Promise<string> {
  await ensureDir(UPLOADS_DIR);
  const timestamp = Date.now();
  const newFilename = `${timestamp}_${filename}`;
  const filepath = path.join(UPLOADS_DIR, newFilename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/${newFilename}`;
}

// ==================== 历史分析上下文 ====================

export async function getHistoricalContext(): Promise<string> {
  const analyses = await getAnalyses();
  const reviews = await getReviews();

  const reviewedAnalyses = analyses
    .filter(a => a.status === 'reviewed')
    .slice(-10);

  if (reviewedAnalyses.length === 0) {
    return '';
  }

  const accuracyRates = reviewedAnalyses
    .map(a => reviews.find(r => r.analysisId === a.id))
    .filter(r => r !== undefined)
    .map(r => r!.accuracy);

  const avgAccuracy = accuracyRates.length > 0
    ? (accuracyRates.reduce((sum, acc) => sum + acc, 0) / accuracyRates.length).toFixed(1)
    : '0';

  let context = '\n\n📊 历史复盘数据（用于持续学习和改进预测）：\n';
  context += `总复盘次数: ${reviewedAnalyses.length}，平均准确率: ${avgAccuracy}%\n\n`;

  for (const analysis of reviewedAnalyses) {
    const review = reviews.find(r => r.analysisId === analysis.id);
    if (review) {
      const stockInfo = analysis.stockCode ? `[${analysis.stockCode}] ` : '';
      context += `${stockInfo}${analysis.date}:\n`;
      context += `• 预测: ${analysis.aiAnalysis.direction}, 支撑${analysis.aiAnalysis.keyLevels.support}, 阻力${analysis.aiAnalysis.keyLevels.resistance}, 目标${analysis.aiAnalysis.target}\n`;
      context += `• 实际: 最高${review.actualHigh}, 最低${review.actualLow}, 收盘${review.actualClose}\n`;
      context += `• 准确率: ${review.accuracy}% ${review.accuracy >= 80 ? '✅' : review.accuracy >= 60 ? '⚠️' : '❌'}\n`;
      context += `• 反思: ${review.feedback}\n`;
      context += '---\n';
    }
  }

  context += '\n⚠️ 重要：根据以上历史数据，总结预测失误的原因，在新的分析中避免重复错误。特别关注准确率低于60%的案例。\n';

  return context;
}

// ==================== 对话相关操作 ====================

export async function getConversations(): Promise<Conversation[]> {
  return await readJSON<Conversation>('conversations.json');
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversations = await getConversations();
  return conversations.find(c => c.id === id) || null;
}

export async function saveConversation(conversation: Conversation) {
  const conversations = await getConversations();
  const index = conversations.findIndex(c => c.id === conversation.id);

  if (index !== -1) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  await writeJSON('conversations.json', conversations);
}

export async function deleteConversation(id: string) {
  const conversations = await getConversations();
  const filtered = conversations.filter(c => c.id !== id);
  await writeJSON('conversations.json', filtered);
}

export async function addMessageToConversation(conversationId: string, message: Message) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();

  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
  }

  await saveConversation(conversation);
}

// ==================== 复盘对话相关操作 ====================

export async function getReviewConversations(): Promise<ReviewConversation[]> {
  return await readJSON<ReviewConversation>('review-conversations.json');
}

export async function getReviewConversationById(id: string): Promise<ReviewConversation | null> {
  const conversations = await getReviewConversations();
  return conversations.find(c => c.id === id) || null;
}

export async function getReviewConversationByConversationId(conversationId: string): Promise<ReviewConversation | null> {
  const conversations = await getReviewConversations();
  return conversations.find(c => c.conversationId === conversationId) || null;
}

export async function saveReviewConversation(conversation: ReviewConversation) {
  const conversations = await getReviewConversations();
  const index = conversations.findIndex(c => c.id === conversation.id);

  if (index !== -1) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  await writeJSON('review-conversations.json', conversations);
}

export async function addMessageToReviewConversation(conversationId: string, message: Message) {
  const conversation = await getReviewConversationById(conversationId);
  if (!conversation) {
    throw new Error('Review conversation not found');
  }

  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();

  await saveReviewConversation(conversation);
}

export async function completeReviewConversation(
  reviewConversationId: string,
  overallAccuracy: number,
  qualityScore: number
) {
  const conversation = await getReviewConversationById(reviewConversationId);
  if (!conversation) {
    throw new Error('Review conversation not found');
  }

  conversation.overallAccuracy = overallAccuracy;
  conversation.qualityScore = qualityScore;
  conversation.status = 'completed';

  await saveReviewConversation(conversation);
}

import { supabase } from './supabase';
import { uploadImage } from './cloudinary';
import { Analysis, Review, Conversation, Message, ReviewConversation } from '@/types';

// ==================== 分析相关操作 ====================

export async function saveAnalysis(analysis: Analysis) {
  const { error } = await supabase
    .from('analyses')
    .insert([{
      id: analysis.id,
      stock_code: analysis.stockCode,
      date: analysis.date,
      image_url: analysis.imageUrl,
      user_input: analysis.userInput,
      ai_analysis: analysis.aiAnalysis,
      status: analysis.status,
      created_at: analysis.createdAt,
    }]);

  if (error) {
    console.error('保存分析失败:', error);
    throw new Error('保存分析失败');
  }
}

export async function getAnalyses(): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取分析列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    stockCode: row.stock_code,
    date: row.date,
    imageUrl: row.image_url,
    userInput: row.user_input,
    aiAnalysis: row.ai_analysis,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    stockCode: data.stock_code,
    date: data.date,
    imageUrl: data.image_url,
    userInput: data.user_input,
    aiAnalysis: data.ai_analysis,
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function updateAnalysisStatus(id: string, status: 'pending_review' | 'reviewed') {
  const { error } = await supabase
    .from('analyses')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('更新分析状态失败:', error);
  }
}

// ==================== 复盘相关操作 ====================

export async function saveReview(review: Review) {
  const { error } = await supabase
    .from('reviews')
    .insert([{
      id: review.id,
      analysis_id: review.analysisId,
      actual_high: review.actualHigh,
      actual_low: review.actualLow,
      actual_close: review.actualClose,
      accuracy: review.accuracy,
      feedback: review.feedback,
      reviewed_at: review.reviewedAt,
    }]);

  if (error) {
    console.error('保存复盘失败:', error);
    throw new Error('保存复盘失败');
  }

  // 更新对应分析的状态
  await updateAnalysisStatus(review.analysisId, 'reviewed');
}

export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error('获取复盘列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    analysisId: row.analysis_id,
    actualHigh: row.actual_high,
    actualLow: row.actual_low,
    actualClose: row.actual_close,
    accuracy: row.accuracy,
    feedback: row.feedback,
    reviewedAt: row.reviewed_at,
  }));
}

export async function getReviewByAnalysisId(analysisId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('analysis_id', analysisId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    analysisId: data.analysis_id,
    actualHigh: data.actual_high,
    actualLow: data.actual_low,
    actualClose: data.actual_close,
    accuracy: data.accuracy,
    feedback: data.feedback,
    reviewedAt: data.reviewed_at,
  };
}

// ==================== 图片上传 ====================

export async function saveImage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const imageUrl = await uploadImage(buffer, filename);
    return imageUrl;
  } catch (error) {
    console.error('图片上传失败:', error);
    throw new Error('图片上传失败');
  }
}

// ==================== 历史分析上下文 ====================

export async function getHistoricalContext(): Promise<string> {
  const analyses = await getAnalyses();
  const reviews = await getReviews();

  // 只取最近10条已复盘的分析
  const reviewedAnalyses = analyses
    .filter(a => a.status === 'reviewed')
    .slice(0, 10);

  if (reviewedAnalyses.length === 0) {
    return '';
  }

  // 统计准确率
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
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('获取对话列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    messages: data.messages,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveConversation(conversation: Conversation) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation.id)
    .single();

  if (existing) {
    // 更新现有对话
    const { error } = await supabase
      .from('conversations')
      .update({
        title: conversation.title,
        messages: conversation.messages,
        updated_at: conversation.updatedAt,
      })
      .eq('id', conversation.id);

    if (error) {
      console.error('更新对话失败:', error);
      throw new Error('更新对话失败');
    }
  } else {
    // 创建新对话
    const { error } = await supabase
      .from('conversations')
      .insert([{
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      }]);

    if (error) {
      console.error('创建对话失败:', error);
      throw new Error('创建对话失败');
    }
  }
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除对话失败:', error);
    throw new Error('删除对话失败');
  }
}

export async function addMessageToConversation(conversationId: string, message: Message) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();

  // 如果是第一条用户消息，自动生成标题
  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
  }

  await saveConversation(conversation);
}

// ==================== 复盘对话相关操作 ====================

export async function getReviewConversations(): Promise<ReviewConversation[]> {
  const { data, error } = await supabase
    .from('review_conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('获取复盘对话列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    analysisId: row.analysis_id,
    messages: row.messages,
    actualData: row.actual_data,
    accuracy: row.accuracy,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getReviewConversationById(id: string): Promise<ReviewConversation | null> {
  const { data, error } = await supabase
    .from('review_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    analysisId: data.analysis_id,
    messages: data.messages,
    actualData: data.actual_data,
    accuracy: data.accuracy,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getReviewConversationByAnalysisId(analysisId: string): Promise<ReviewConversation | null> {
  const { data, error } = await supabase
    .from('review_conversations')
    .select('*')
    .eq('analysis_id', analysisId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    analysisId: data.analysis_id,
    messages: data.messages,
    actualData: data.actual_data,
    accuracy: data.accuracy,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveReviewConversation(conversation: ReviewConversation) {
  const { data: existing } = await supabase
    .from('review_conversations')
    .select('id')
    .eq('id', conversation.id)
    .single();

  if (existing) {
    // 更新现有复盘对话
    const { error } = await supabase
      .from('review_conversations')
      .update({
        messages: conversation.messages,
        actual_data: conversation.actualData,
        accuracy: conversation.accuracy,
        status: conversation.status,
        updated_at: conversation.updatedAt,
      })
      .eq('id', conversation.id);

    if (error) {
      console.error('更新复盘对话失败:', error);
      throw new Error('更新复盘对话失败');
    }
  } else {
    // 创建新复盘对话
    const { error } = await supabase
      .from('review_conversations')
      .insert([{
        id: conversation.id,
        analysis_id: conversation.analysisId,
        messages: conversation.messages,
        actual_data: conversation.actualData,
        accuracy: conversation.accuracy,
        status: conversation.status,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      }]);

    if (error) {
      console.error('创建复盘对话失败:', error);
      throw new Error('创建复盘对话失败');
    }
  }

  // 如果复盘已完成，更新原始分析的状态
  if (conversation.status === 'completed') {
    await updateAnalysisStatus(conversation.analysisId, 'reviewed');
  }
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
  conversationId: string,
  actualData: { actualHigh: number; actualLow: number; actualClose: number },
  accuracy: number
) {
  const conversation = await getReviewConversationById(conversationId);
  if (!conversation) {
    throw new Error('Review conversation not found');
  }

  conversation.actualData = actualData;
  conversation.accuracy = accuracy;
  conversation.status = 'completed';

  await saveReviewConversation(conversation);

  // 同时创建传统的 Review 记录以保持兼容性
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const review: Review = {
    id: `review_${Date.now()}`,
    analysisId: conversation.analysisId,
    actualHigh: actualData.actualHigh,
    actualLow: actualData.actualLow,
    actualClose: actualData.actualClose,
    accuracy,
    feedback: lastMessage?.content || '',
    reviewedAt: new Date().toISOString(),
  };

  await saveReview(review);
}

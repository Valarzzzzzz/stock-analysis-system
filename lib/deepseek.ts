import { AIAnalysis, Message } from '@/types';
import { getHistoricalContext } from './storage';

export async function analyzeStock(
  imageBase64: string,
  userInput: string
): Promise<AIAnalysis> {
  const apiKey = process.env.QWEN_API_KEY || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('QWEN_API_KEY 未配置');
  }

  // 获取历史分析上下文（用于持续学习）
  const historicalContext = await getHistoricalContext();

  const systemPrompt = `你是一位专业的股市技术分析师，擅长K线图分析、趋势判断和点位预测。

分析要求：
1. 仔细观察图表中的K线形态、成交量、均线系统、技术指标
2. 识别关键支撑位和阻力位
3. 判断当前趋势和可能的操作方向
4. 给出明确的止损位和目标位
5. 提供详细的分析逻辑

${historicalContext}

请以JSON格式返回分析结果，严格按照以下格式：
{
  "keyLevels": {
    "support": 支撑位数字,
    "resistance": 阻力位数字
  },
  "direction": "做多" 或 "做空" 或 "观望",
  "stopLoss": 止损位数字,
  "target": 目标位数字,
  "reasoning": "详细的分析理由，包括技术形态、量价关系、趋势判断等"
}`;

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
              {
                type: 'text',
                text: userInput || '请分析这张股市K线图，给出操作建议',
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 尝试解析JSON
    let analysis: AIAnalysis;
    try {
      // 提取JSON内容（可能被代码块包裹）
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                        content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      // 如果解析失败，尝试从文本中提取关键信息
      console.error('JSON解析失败，使用备用方案:', parseError);
      analysis = {
        keyLevels: {
          support: 0,
          resistance: 0,
        },
        direction: '观望',
        stopLoss: 0,
        target: 0,
        reasoning: content,
      };
    }

    return analysis;
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    throw error;
  }
}

// 对话式聊天（支持多轮对话）
export async function chat(
  messages: Message[],
  imageBase64?: string
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  // 获取历史复盘上下文
  const historicalContext = await getHistoricalContext();

  const systemPrompt = `你是一位专业的股市分析助手，擅长股市技术分析、K线图分析和投资建议。

你的能力：
1. 分析K线图，识别技术形态和趋势
2. 给出关键支撑位、阻力位、止损位和目标位
3. 提供操作建议（做多/做空/观望）
4. 回答用户关于股市的各种问题
5. 基于历史经验提供更准确的预测

${historicalContext}

对话要求：
- 用专业但易懂的语言回答
- 如果用户上传了K线图，仔细分析图表
- 回答要具体、有依据，避免模糊表述
- 给出操作建议时，明确说明风险
- 保持对话的连贯性，记住之前讨论的内容`;

  try {
    // 构建消息列表
    const apiMessages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      }
    ];

    // 添加历史消息
    for (const msg of messages) {
      if (msg.role === 'user') {
        const content: any[] = [];

        // 如果有图片
        if (msg.imageUrl) {
          // 如果是 base64，直接使用；否则需要读取
          if (msg.imageUrl.startsWith('data:image')) {
            content.push({
              type: 'image_url',
              image_url: { url: msg.imageUrl }
            });
          }
        }

        // 添加文字内容
        content.push({
          type: 'text',
          text: msg.content
        });

        apiMessages.push({
          role: 'user',
          content: content.length === 1 ? content[0].text : content
        });
      } else {
        apiMessages.push({
          role: 'assistant',
          content: msg.content
        });
      }
    }

    // 如果当前有新图片，添加到最后一条用户消息
    if (imageBase64 && apiMessages.length > 0) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (lastMsg.role === 'user') {
        const content = Array.isArray(lastMsg.content) ? lastMsg.content : [{ type: 'text', text: lastMsg.content }];
        content.unshift({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${imageBase64}` }
        });
        lastMsg.content = content;
      }
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek 对话失败:', error);
    throw error;
  }
}

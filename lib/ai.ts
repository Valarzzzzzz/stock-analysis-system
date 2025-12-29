import { AIAnalysis, Message } from '@/types';
import { getHistoricalContext } from './storage';

type AIModel = 'deepseek' | 'qwen';

interface ModelConfig {
  apiUrl: string;
  modelName: string;
  supportsVision: boolean;
  apiKeyEnv: string;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  qwen: {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelName: 'qwen-vl-plus',
    supportsVision: true,
    apiKeyEnv: 'QWEN_API_KEY',
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    modelName: 'deepseek-chat',
    supportsVision: false,
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
};

// 对话式聊天（支持多轮对话和多模型）
export async function chat(
  messages: Message[],
  imageBase64?: string,
  model: AIModel = 'qwen'
): Promise<string> {
  const config = MODEL_CONFIGS[model];
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} 未配置`);
  }

  // 如果有图片但模型不支持,返回错误
  if (imageBase64 && !config.supportsVision) {
    throw new Error(`${model} 模型不支持图片输入，请使用通义千问模型或仅发送文字`);
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
        // 如果支持多模态且有图片
        if (config.supportsVision && msg.imageUrl) {
          const content: any[] = [];

          // 添加图片
          if (msg.imageUrl.startsWith('data:image')) {
            content.push({
              type: 'image_url',
              image_url: { url: msg.imageUrl }
            });
          }

          // 添加文字
          content.push({
            type: 'text',
            text: msg.content
          });

          apiMessages.push({
            role: 'user',
            content
          });
        } else {
          // 纯文本消息
          apiMessages.push({
            role: 'user',
            content: msg.content
          });
        }
      } else {
        apiMessages.push({
          role: 'assistant',
          content: msg.content
        });
      }
    }

    // 如果当前有新图片，添加到最后一条用户消息
    if (imageBase64 && config.supportsVision && apiMessages.length > 0) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (lastMsg.role === 'user') {
        const content = Array.isArray(lastMsg.content)
          ? lastMsg.content
          : [{ type: 'text', text: lastMsg.content }];

        content.unshift({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${imageBase64}` }
        });

        lastMsg.content = content;
      }
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${model} API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`${model} 对话失败:`, error);
    throw error;
  }
}

// 兼容旧的 analyzeStock 函数（使用千问）
export async function analyzeStock(
  imageBase64: string,
  userInput: string
): Promise<AIAnalysis> {
  const messages: Message[] = [
    {
      id: 'temp',
      role: 'user',
      content: userInput || '请分析这张股市K线图，给出操作建议',
      timestamp: new Date().toISOString(),
    }
  ];

  const response = await chat(messages, imageBase64, 'qwen');

  // 尝试解析JSON
  let analysis: AIAnalysis;
  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    analysis = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('JSON解析失败，使用备用方案:', parseError);
    analysis = {
      keyLevels: {
        support: 0,
        resistance: 0,
      },
      direction: '观望',
      stopLoss: 0,
      target: 0,
      reasoning: response,
    };
  }

  return analysis;
}

// 分析复盘图片，提取实际价格数据（使用 Qwen VL Plus）
export async function analyzeReviewImage(
  imageBase64: string,
  originalPrediction: AIAnalysis
): Promise<{ actualHigh: number; actualLow: number; actualClose: number; analysis: string }> {
  const config = MODEL_CONFIGS.qwen;
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} 未配置`);
  }

  const systemPrompt = `你是一位专业的股市K线图数据提取专家。你的任务是：
1. 仔细识别K线图中的价格数据
2. 提取最后一根K线（或指定时间段）的实际价格：最高价、最低价、收盘价
3. 返回JSON格式的数据，确保数字精确

输出格式：
\`\`\`json
{
  "actualHigh": 具体数字,
  "actualLow": 具体数字,
  "actualClose": 具体数字,
  "analysis": "简要说明：从图中识别到的关键信息，如时间范围、整体走势等"
}
\`\`\`

注意：
- 必须返回有效的JSON格式
- 价格必须是数字，不要包含货币符号
- 如果图片不清晰或无法识别，在analysis中说明原因
- 仔细观察坐标轴和价格标注`;

  const userPrompt = `请分析这张K线图，提取实际的价格数据。

原始预测参考：
- 预测最高价: ${originalPrediction.keyLevels.resistance || '未预测'}
- 预测最低价: ${originalPrediction.keyLevels.support || '未预测'}
- 预测目标位: ${originalPrediction.target || '未预测'}

请从图中提取实际的最高价、最低价和收盘价。`;

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.modelName,
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
                image_url: { url: `data:image/png;base64,${imageBase64}` }
              },
              {
                type: 'text',
                text: userPrompt
              }
            ]
          }
        ],
        temperature: 0.3, // 降低温度以提高准确性
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 解析JSON响应
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('AI未返回有效的JSON格式数据');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const result = JSON.parse(jsonStr);

    // 验证数据有效性
    if (typeof result.actualHigh !== 'number' ||
        typeof result.actualLow !== 'number' ||
        typeof result.actualClose !== 'number') {
      throw new Error('提取的价格数据格式不正确');
    }

    return result;
  } catch (error) {
    console.error('图片价格提取失败:', error);
    throw error;
  }
}

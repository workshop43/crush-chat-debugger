/**
 * 多 LLM 服务商配置 + 统一调用层。
 *
 * 三家（通义千问 / MiniMax / DeepSeek）都提供 OpenAI ChatCompletion 兼容接口，
 * 请求体、鉴权头（Bearer）、响应结构都一致，所以共用一个 generateReport。
 * 想再加 provider，只需在 PROVIDERS 里加一条配置。
 *
 * 提示词与 schema 由各报告模块提供，这里与具体诊断风格无关。
 */

export const PROVIDERS = {
  qwen: {
    label: '通义千问 (Qwen)',
    model: 'qwen3.5-flash',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    applyUrl: 'https://bailian.console.aliyun.com/?apiKey=1',
    applyLabel: '阿里云百炼',
    placeholder: '粘贴阿里云百炼平台申请的 API Key...',
  },
  minimax: {
    label: 'MiniMax',
    model: 'minimax-m2.7',
    apiUrl: 'https://api.minimaxi.com/v1/text/chatcompletion_v2',
    applyUrl: 'https://platform.minimaxi.com/',
    applyLabel: 'MiniMax 开放平台',
    placeholder: '粘贴 MiniMax 开放平台申请的 API Key...',
  },
  deepseek: {
    label: 'DeepSeek',
    model: 'deepseek-v4-flash',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    applyUrl: 'https://platform.deepseek.com/api_keys',
    applyLabel: 'DeepSeek 开放平台',
    placeholder: '粘贴 DeepSeek 开放平台申请的 API Key...',
  },
};

export const DEFAULT_PROVIDER = 'qwen';

/** 取 provider 配置，非法 id 回退到默认。 */
export function getProvider(id) {
  return PROVIDERS[id] ?? PROVIDERS[DEFAULT_PROVIDER];
}

/**
 * 调用指定 provider，按报告模块把聊天记录诊断为结构化数据。
 * @param {{ apiKey: string, provider: object, report: object, chatLog: string }} params
 * @returns {Promise<object>} 解析并校验后的诊断数据
 */
export async function generateReport({ apiKey, provider, report, chatLog }) {
  const response = await fetch(provider.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: report.buildPrompt(chatLog) }],
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || `接口请求失败（HTTP ${response.status}）`);
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('接口响应为空或格式异常，请重试');
  }

  const parsed = parseJson(text);

  const missing = report.required.filter((field) => !(field in parsed));
  if (missing.length > 0) {
    throw new Error(`返回数据缺少字段：${missing.join('、')}`);
  }

  return parsed;
}

/** 剥离可能存在的 Markdown 包裹并解析 JSON。 */
function parseJson(text) {
  let json = text.trim();
  if (json.startsWith('```')) {
    json = json
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();
  }

  try {
    return JSON.parse(json);
  } catch {
    throw new Error('返回内容不是合法 JSON，请重试');
  }
}

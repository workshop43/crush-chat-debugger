/**
 * 通义千问接口调用层（传输层）。
 *
 * 走 DashScope 的「OpenAI 兼容模式」端点，请求/响应结构跟 OpenAI ChatCompletion 一致，
 * 之后想再换别的兼容模型（DeepSeek、智谱等）只改 baseURL / model 就行。
 *
 * 提示词与 schema 都由各报告模块自己提供，这里与具体风格完全无关。
 */

/** 默认模型。若账号下不可用，可换成 qwen-turbo / qwen-plus / qwen-max 等。 */
const QWEN_MODEL = 'qwen3.5-flash';

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 调用通义千问，按指定报告模块把聊天记录诊断为结构化数据。
 * @param {{ apiKey: string, report: object, chatLog: string }} params
 * @returns {Promise<object>} 解析并校验后的诊断数据
 */
export async function generateReport({ apiKey, report, chatLog }) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
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

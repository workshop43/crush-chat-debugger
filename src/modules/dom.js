/**
 * 渲染层共用的 DOM 小工具。
 */

/**
 * 创建一个带类名与文本的元素。
 * 文本一律走 textContent，从根上杜绝 AI / 用户输入造成的 XSS。
 */
export function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** 把非数组安全地转成数组，避免 forEach 抛错。 */
export function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/** 把任意值收敛为 0–100 的百分比数字。 */
export function toPercent(value) {
  const num = parseFloat(String(value).replace('%', ''));
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

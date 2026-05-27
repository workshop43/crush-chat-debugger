/**
 * 报告类型：项目尽调报告（VC 投资人）。
 *
 * 把「追到对方」当作一个早期创业项目，写一份冷酷的投资尽调备忘录。
 * 数据结构与 UI 都与其它报告完全不同。
 */
import { el, toArray } from '../dom.js';

const PERSONA =
  'You ARE a brutally sarcastic, ice-cold venture capital investor running due ' +
  'diligence. You treat this courtship as an early-stage startup raising a ' +
  'funding round, and you write a savage due-diligence memo. Speak ONLY in VC and ' +
  'startup jargon: sector, valuation, product-market fit, moat, burn rate, CAC, ' +
  'LTV, runway, exit, due diligence, term sheet, lead investor, cap table and ' +
  'down round. Your tone is always ice-cold and savage — but your investment ' +
  'verdict is always accurate to the evidence. NEVER use HR or software terms.';

const SCHEMA = `{
  "dealId": "string, format VC-YYYY-MM-DD",
  "projectName": "string, a sarcastic startup-style name for this relationship",
  "round": "string, a funding-round metaphor, e.g. 天使轮 / Pre-A / 已出局",
  "decision": "领投 | 跟投 | 观望 | Pass",
  "valuation": "string, a sarcastic valuation of this relationship",
  "summary": "string, the investment thesis summary, max 80 words",
  "metrics": [
    { "label": "string, a traction metric name", "value": "string, the value", "trend": "up | down | flat" }
  ],
  "highlights": ["string, a project highlight, max 40 words"],
  "risks": ["string, a due-diligence risk or red flag, max 40 words"],
  "vcComment": "string, one final cold-hearted sarcastic VC-jargon quote, max 30 words"
}`;

/** render() 之前会校验这些字段是否齐全。 */
const REQUIRED = [
  'dealId',
  'projectName',
  'round',
  'decision',
  'valuation',
  'summary',
  'metrics',
  'highlights',
  'risks',
  'vcComment',
];

/** 构造完整提示词。 */
function buildPrompt(chatLog) {
  return `${PERSONA}

TASK: Read the chat log between the user and their crush, then write a brutal,
sarcastic DUE DILIGENCE MEMO, treating this courtship as a startup pitching for
investment.

CALIBRATION (important): First judge objectively how the conversation is ACTUALLY
going, and set "decision" and "valuation" to match the evidence:
- The crush is responsive, warm, agrees, or actively moves things forward
  → "decision": "领投" or "跟投" — valuation and metrics should look strong.
- The signals are mixed or lukewarm → "decision": "观望".
- The chat genuinely shows coldness, evasion, rejection or being ignored
  → "decision": "Pass".
Your tone stays ice-cold, but valuation, metrics, highlights and risks MUST stay
consistent with that decision. Do NOT Pass on a project that is obviously taking
off — a VC who leads a hot round is still savage and funny.

Respond with EXACTLY ONE JSON object that strictly matches this schema:
${SCHEMA}

HARD RULES:
- All natural-language values MUST be in Simplified Chinese.
- "metrics" MUST contain exactly 3 items; "trend" is one of: up, down, flat.
- "highlights" and "risks" each contain 2-4 items.
- Stay 100% in character — use only venture-capital & startup vocabulary.
- Return raw JSON only: no markdown fences, no extra text.

以下是待尽调的聊天记录：
${chatLog}`;
}

/* ------------------------------- 卡片渲染 ------------------------------- */

/** 投资决策的配色：未知决策回退到 amber。 */
const DECISION_STYLE = {
  领投: { pill: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400', dot: 'bg-emerald-500' },
  跟投: { pill: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400', dot: 'bg-emerald-500' },
  观望: { pill: 'bg-amber-950/40 border-amber-900/60 text-amber-400', dot: 'bg-amber-500' },
  Pass: { pill: 'bg-rose-950/40 border-rose-900/60 text-rose-400', dot: 'bg-rose-500' },
};
const DECISION_FALLBACK = {
  pill: 'bg-amber-950/40 border-amber-900/60 text-amber-400',
  dot: 'bg-amber-500',
};

/** 指标趋势的图标与配色。 */
const TREND = {
  up: { icon: '▲', cls: 'text-emerald-400' },
  down: { icon: '▼', cls: 'text-rose-400' },
  flat: { icon: '▶', cls: 'text-gray-500' },
};

/** 一个区块：小标题 + 内容。 */
function section(label, contentEl) {
  const wrap = el('div');
  wrap.append(el('span', 'text-[10px] text-amber-600/80 tracking-wider block mb-2', label), contentEl);
  return wrap;
}

/** 卡片头部：标题 + 项目 ID + 投资决策徽标。 */
function header(data) {
  const left = el('div');
  left.append(
    el('h2', 'text-sm font-bold text-amber-400 tracking-wider', 'DUE DILIGENCE'),
    el('p', 'text-[10px] text-gray-500 mt-1', `ID: ${data.dealId}`),
  );

  const style = DECISION_STYLE[data.decision] ?? DECISION_FALLBACK;
  const pill = el('div', `flex items-center gap-2 border rounded-full px-3 py-1 ${style.pill}`);
  pill.append(
    el('span', `inline-flex rounded-full h-2 w-2 ${style.dot}`),
    el('span', 'text-[9px] font-bold tracking-widest', data.decision),
  );

  const root = el('div', 'flex items-start justify-between border-b border-amber-900/40 pb-4');
  root.append(left, pill);
  return root;
}

/** 标的项目名片：项目名 + 轮次标签。 */
function projectCard(data) {
  const left = el('div', 'flex flex-col gap-1 min-w-0');
  left.append(
    el('span', 'text-[9px] text-amber-600/80', '标的项目'),
    el('span', 'text-xs text-gray-200 font-bold font-sans truncate', data.projectName),
  );

  const tag = el(
    'span',
    'text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 rounded px-1.5 py-0.5 shrink-0',
    data.round,
  );

  const row = el('div', 'flex items-center justify-between gap-2');
  row.append(left, tag);

  const card = el('div', 'bg-[#1a1607] border border-amber-900/40 rounded-lg p-3');
  card.appendChild(row);
  return card;
}

/** 估值高亮块。 */
function valuationBlock(valuation) {
  const block = el('div', 'bg-[#1a1607] border border-amber-900/40 rounded-lg p-3 flex flex-col gap-1');
  block.append(
    el('span', 'text-[9px] text-amber-600/80', '本轮估值 / VALUATION'),
    el('span', 'text-lg font-bold text-amber-300 leading-tight font-sans', valuation),
  );
  return block;
}

/** 投资综述。 */
function summaryBlock(text) {
  return el(
    'p',
    'text-xs text-gray-300 leading-relaxed bg-[#1a1607] p-3 rounded-lg border border-amber-900/30',
    text,
  );
}

/** 关键数据：三个指标磁贴。 */
function metricBoard(metrics) {
  const grid = el('div', 'grid grid-cols-3 gap-2');
  toArray(metrics).forEach((metric) => {
    const trend = TREND[metric.trend] ?? TREND.flat;

    const valueRow = el('div', 'flex items-baseline justify-between gap-1');
    valueRow.append(
      el('span', 'text-base font-bold text-amber-300 leading-none truncate', metric.value),
      el('span', `text-[10px] shrink-0 ${trend.cls}`, trend.icon),
    );

    const tile = el(
      'div',
      'bg-[#1a1607] border border-amber-900/40 rounded-lg p-2.5 flex flex-col gap-1.5',
    );
    tile.append(el('span', 'text-[9px] text-gray-500 truncate', metric.label), valueRow);
    grid.appendChild(tile);
  });
  return grid;
}

/** 带标记符号的列表（项目亮点 / 风险红旗共用）。 */
function markedList(items, mark, markClass, borderClass) {
  const ul = el('ul', 'flex flex-col gap-2');
  toArray(items).forEach((text) => {
    const li = el(
      'li',
      `text-xs text-gray-300 flex items-start gap-2 bg-[#1a1607] border ${borderClass} p-2.5 rounded-lg`,
    );
    li.append(
      el('span', `text-xs shrink-0 ${markClass}`, mark),
      el('span', 'leading-relaxed font-sans', text),
    );
    ul.appendChild(li);
  });
  return ul;
}

/** 投资人寄语。 */
function commentBlock(text) {
  const wrap = el('div', 'border-t border-amber-900/40 pt-4 mt-1');
  wrap.append(
    el('p', 'text-xs italic text-cyan-400 leading-relaxed text-center font-sans', `“ ${text} ”`),
  );
  return wrap;
}

/** 把尽调数据渲染为完整的卡片元素。 */
function render(data) {
  const root = el(
    'div',
    'w-[450px] bg-[#100d05] rounded-2xl p-6 neon-border-amber flex flex-col gap-5 relative overflow-hidden select-none',
  );

  // 对角装饰线：左上 + 右下（区别于事故报告的四角）
  root.appendChild(el('div', 'absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/30'));
  root.appendChild(
    el('div', 'absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/30'),
  );

  root.append(
    header(data),
    projectCard(data),
    valuationBlock(data.valuation),
    section('投资综述 / THESIS', summaryBlock(data.summary)),
    section('关键数据 / TRACTION', metricBoard(data.metrics)),
    section('项目亮点 / HIGHLIGHTS', markedList(data.highlights, '✓', 'text-emerald-400', 'border-emerald-900/30')),
    section('风险红旗 / RED FLAGS', markedList(data.risks, '🚩', 'text-rose-400', 'border-rose-900/30')),
    commentBlock(data.vcComment),
  );
  return root;
}

/** 项目尽调报告模块。 */
export const vcReport = {
  label: '💰 VC 投资人（一轮尽调把你的恋情估值砍到一杯奶茶）',
  required: REQUIRED,
  buildPrompt,
  render,
};

/**
 * 报告类型：增长复盘报告（冷酷产品经理）。
 *
 * 把这段关系当作一个在亏损的产品来复盘：核心指标看板、转化漏斗、流失归因、
 * 增长实验 backlog。数据结构与 UI 都与「系统事故报告」完全不同。
 */
import { el, toArray, toPercent } from '../dom.js';

const PERSONA =
  'You ARE a brutally sarcastic, data-obsessed dating Product Manager. You analyze ' +
  'the relationship as if it were a product, speaking ONLY in product and growth ' +
  'metaphors: retention, conversion funnel, churn, DAU/MAU, north-star metric, A/B ' +
  'tests, ROI, activation and re-engagement push. Your tone is always cold and ' +
  'savage — but your data verdict is always accurate to the evidence. NEVER use ' +
  'software-engineering or HR terms.';

const SCHEMA = `{
  "reviewId": "string, format GROWTH-YYYY-MM-DD",
  "productName": "string, a sarcastic codename for this relationship treated as a product",
  "verdict": "流失预警 | 增长停滞 | 数据健康",
  "summary": "string, a brief data-driven review summary, max 80 words",
  "metrics": [
    { "label": "string, metric name", "value": "string, the metric value", "trend": "up | down | flat" }
  ],
  "funnel": [
    { "stage": "string, funnel stage name", "percent": 0, "note": "string, a very short note" }
  ],
  "churnReasons": ["string, max 40 words", "string, max 40 words"],
  "experiments": [
    { "name": "string, the growth experiment name", "detail": "string, the hypothesis or action plan" }
  ],
  "pmComment": "string, one final cold-hearted sarcastic quote, max 30 words"
}`;

/** render() 之前会校验这些字段是否齐全。 */
const REQUIRED = [
  'reviewId',
  'productName',
  'verdict',
  'summary',
  'metrics',
  'funnel',
  'churnReasons',
  'experiments',
  'pmComment',
];

/** 构造完整提示词。 */
function buildPrompt(chatLog) {
  return `${PERSONA}

TASK: Read the chat log between the user (the proactive side) and their crush,
then write a brutal, sarcastic GROWTH REVIEW of this relationship-as-a-product.

CALIBRATION (important): First judge objectively how the conversation is ACTUALLY
going, and set "verdict" to match the evidence:
- The crush is responsive, warm, agrees, or actively moves things forward
  → "verdict": "数据健康" — metrics and funnel should look genuinely good.
- The signals are mixed or lukewarm → "verdict": "增长停滞".
- The chat genuinely shows coldness, evasion, rejection or being ignored
  → "verdict": "流失预警".
Your tone stays cold and savage, but the metrics, funnel percentages, churn
reasons and experiments MUST stay consistent with that verdict. Do NOT invent a
crisis that is not in the chat — a PM who reports healthy retention on good data
is still funny.

Respond with EXACTLY ONE JSON object that strictly matches this schema:
${SCHEMA}

HARD RULES:
- All natural-language values MUST be in Simplified Chinese.
- "metrics" MUST contain exactly 3 items; "trend" is one of: up, down, flat.
- "funnel" MUST contain 3-5 stages, from first contact toward a real date; each
  "percent" is a NUMBER from 0 to 100. The funnel steps down stage by stage, but
  how steep the drop is must reflect the real conversation.
- "churnReasons" and "experiments" each contain 2-4 items; when things go well,
  frame "churnReasons" as minor risks worth watching.
- Stay 100% in character — use only product & growth-data vocabulary.
- Return raw JSON only: no markdown fences, no extra text.

以下是待复盘的聊天记录：
${chatLog}`;
}

/* ------------------------------- 卡片渲染 ------------------------------- */

/** 结论徽标的配色：未知结论回退到 amber。 */
const VERDICT_STYLE = {
  流失预警: { pill: 'bg-red-950/40 border-red-900/60 text-red-400', dot: 'bg-red-500' },
  增长停滞: { pill: 'bg-amber-950/40 border-amber-900/60 text-amber-400', dot: 'bg-amber-500' },
  数据健康: { pill: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400', dot: 'bg-emerald-500' },
};
const VERDICT_FALLBACK = {
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
  wrap.append(el('span', 'text-[10px] text-emerald-600/80 tracking-wider block mb-2', label), contentEl);
  return wrap;
}

/** 卡片头部：标题 + 复盘 ID + 结论徽标。 */
function header(data) {
  const left = el('div');
  left.append(
    el('h2', 'text-sm font-bold text-emerald-400 tracking-wider', 'GROWTH REVIEW'),
    el('p', 'text-[10px] text-gray-500 mt-1', `ID: ${data.reviewId}`),
  );

  const style = VERDICT_STYLE[data.verdict] ?? VERDICT_FALLBACK;
  const pill = el('div', `flex items-center gap-2 border rounded-full px-3 py-1 ${style.pill}`);
  pill.append(
    el('span', `inline-flex rounded-full h-2 w-2 ${style.dot}`),
    el('span', 'text-[9px] font-bold tracking-widest', data.verdict),
  );

  const root = el('div', 'flex items-start justify-between border-b border-emerald-900/40 pb-4');
  root.append(left, pill);
  return root;
}

/** 复盘对象横幅。 */
function productBanner(name) {
  const banner = el(
    'div',
    'flex items-center gap-2 bg-[#101613] border border-emerald-900/40 rounded-lg p-3',
  );
  banner.append(
    el('span', 'text-[9px] text-emerald-600/80 shrink-0', '复盘对象'),
    el('span', 'text-xs text-gray-200 font-bold font-sans', name),
  );
  return banner;
}

/** 复盘摘要。 */
function summaryBlock(text) {
  return el(
    'p',
    'text-xs text-gray-300 leading-relaxed bg-[#101613] p-3 rounded-lg border border-emerald-900/30',
    text,
  );
}

/** 核心指标看板：三个指标磁贴。 */
function metricBoard(metrics) {
  const grid = el('div', 'grid grid-cols-3 gap-2');
  toArray(metrics).forEach((metric) => {
    const trend = TREND[metric.trend] ?? TREND.flat;

    const valueRow = el('div', 'flex items-baseline justify-between gap-1');
    valueRow.append(
      el('span', 'text-base font-bold text-emerald-300 leading-none truncate', metric.value),
      el('span', `text-[10px] shrink-0 ${trend.cls}`, trend.icon),
    );

    const tile = el(
      'div',
      'bg-[#101613] border border-emerald-900/40 rounded-lg p-2.5 flex flex-col gap-1.5',
    );
    tile.append(el('span', 'text-[9px] text-gray-500 truncate', metric.label), valueRow);
    grid.appendChild(tile);
  });
  return grid;
}

/** 转化漏斗：逐级进度条。 */
function funnelChart(funnel) {
  const wrap = el('div', 'flex flex-col gap-2.5');
  toArray(funnel).forEach((stage) => {
    const pct = toPercent(stage.percent);

    const labelRow = el('div', 'flex items-center justify-between text-[11px]');
    labelRow.append(
      el('span', 'text-gray-300 font-sans', stage.stage),
      el('span', 'text-emerald-300 font-mono', `${Math.round(pct)}%`),
    );

    const bar = el('div', 'h-full rounded-full');
    bar.style.width = `${pct}%`;
    bar.style.background = 'linear-gradient(to right, #10b981, #22d3ee)';
    const track = el(
      'div',
      'h-2.5 w-full bg-[#101613] border border-emerald-900/30 rounded-full overflow-hidden',
    );
    track.appendChild(bar);

    const item = el('div', 'flex flex-col gap-1');
    item.append(labelRow, track);
    if (stage.note) {
      item.appendChild(el('div', 'text-[10px] text-gray-500 font-sans', stage.note));
    }
    wrap.appendChild(item);
  });
  return wrap;
}

/** 流失归因：编号列表（琥珀色警示）。 */
function churnList(reasons) {
  const ul = el('ul', 'flex flex-col gap-2');
  toArray(reasons).forEach((reason, index) => {
    const li = el(
      'li',
      'text-xs text-gray-300 flex items-start gap-2 bg-[#15120b] border border-amber-900/30 p-2.5 rounded-lg',
    );
    li.append(
      el(
        'span',
        'text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 w-5 h-5 flex items-center justify-center rounded-full shrink-0',
        String(index + 1),
      ),
      el('span', 'leading-relaxed font-sans', reason),
    );
    ul.appendChild(li);
  });
  return ul;
}

/** 增长实验 backlog。 */
function experimentList(experiments) {
  const list = el('div', 'flex flex-col gap-2.5');
  toArray(experiments).forEach((exp) => {
    const item = el(
      'div',
      'bg-[#101613] border border-emerald-900/40 p-3 rounded-lg flex flex-col gap-1.5',
    );
    item.append(
      el('div', 'text-[10px] font-bold text-emerald-400', `🧪 EXPERIMENT: ${exp.name}`),
      el('p', 'text-xs text-gray-400 leading-relaxed font-sans', exp.detail),
    );
    list.appendChild(item);
  });
  return list;
}

/** 产品经理寄语。 */
function commentBlock(text) {
  const wrap = el('div', 'border-t border-emerald-900/40 pt-4 mt-1');
  wrap.append(
    el('p', 'text-xs italic text-cyan-400 leading-relaxed text-center font-sans', `“ ${text} ”`),
  );
  return wrap;
}

/** 把复盘数据渲染为完整的卡片元素。 */
function render(data) {
  const root = el(
    'div',
    'w-[450px] bg-[#0a0f0d] rounded-2xl p-6 neon-border-emerald flex flex-col gap-5 relative overflow-hidden select-none',
  );

  // 顶部霓虹光带（区别于事故报告卡片的四角线）
  const accent = el('div', 'absolute top-0 left-0 right-0 h-1');
  accent.style.background =
    'linear-gradient(to right, transparent, rgba(52, 211, 153, 0.7), transparent)';
  root.appendChild(accent);

  root.append(
    header(data),
    productBanner(data.productName),
    section('复盘摘要 / SUMMARY', summaryBlock(data.summary)),
    section('核心指标看板 / METRICS', metricBoard(data.metrics)),
    section('转化漏斗 / FUNNEL', funnelChart(data.funnel)),
    section('流失归因 / CHURN', churnList(data.churnReasons)),
    section('增长实验 / EXPERIMENTS', experimentList(data.experiments)),
    commentBlock(data.pmComment),
  );
  return root;
}

/** 增长复盘报告模块。 */
export const growthReport = {
  label: '📊 冷酷产品经理（用转化漏斗算出你被已读不回的概率）',
  required: REQUIRED,
  buildPrompt,
  render,
};

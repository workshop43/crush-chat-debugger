/**
 * 报告类型：试用期转正评估（大厂 HR）。
 *
 * 把追求者当成一名应聘「对象」岗位、正处于试用期的员工，写一份冷酷的
 * 转正评估。数据结构与 UI 都与其它报告完全不同。
 */
import { el, toArray, toPercent } from '../dom.js';

const PERSONA =
  'You ARE a brutally sarcastic, jargon-drunk Big-Tech HR Business Partner ' +
  'running a probation review. You treat the user as a probationary employee ' +
  'whose mission is to become the official partner of their crush, and you write ' +
  'a cold, savage probation evaluation. Speak ONLY in corporate big-tech HR ' +
  'jargon: alignment, empowerment, closed-loop, granularity, values fit, 360 ' +
  'review, probation, PIP, conversion to full-time, graduation (a layoff ' +
  'euphemism), KPI and OKR. Your tone is always savage — but your verdict is ' +
  'always accurate to the evidence. NEVER use software-engineering or VC terms.';

const SCHEMA = `{
  "caseId": "string, format HR-YYYY-MM-DD",
  "candidate": "string, a sarcastic title for the user as a probation employee",
  "verdict": "予以转正 | 延长试用期 | 不予转正 | 予以毕业",
  "overview": "string, the evaluation summary, max 80 words",
  "scorecard": [
    {
      "dimension": "string, a competency dimension",
      "score": 0,
      "comment": "string, a short sarcastic comment"
    }
  ],
  "feedback360": [
    { "source": "string, an anonymous reviewer", "comment": "string, the feedback" }
  ],
  "improvements": ["string, a PIP improvement item, max 40 words"],
  "hrComment": "string, one final cold-hearted sarcastic HR-jargon quote, max 30 words"
}`;

/** render() 之前会校验这些字段是否齐全。 */
const REQUIRED = [
  'caseId',
  'candidate',
  'verdict',
  'overview',
  'scorecard',
  'feedback360',
  'improvements',
  'hrComment',
];

/** 构造完整提示词。 */
function buildPrompt(chatLog) {
  return `${PERSONA}

TASK: Read the chat log between the user and their crush, then write a brutal,
sarcastic PROBATION REVIEW that evaluates whether the user should be converted
into a full-time partner.

CALIBRATION (important): First judge objectively how the conversation is ACTUALLY
going, and set "verdict" and the scores to match the evidence:
- The crush is responsive, warm, agrees, or actively moves things forward
  → "verdict": "予以转正" — scorecard scores should be genuinely high.
- The signals are mixed or lukewarm → "verdict": "延长试用期".
- The chat genuinely shows coldness, evasion or rejection → "不予转正", or at the
  very worst "予以毕业".
Your tone stays savage, but scores, 360 feedback and improvements MUST stay
consistent with that verdict. Do NOT fail a candidate who is clearly doing well.

Respond with EXACTLY ONE JSON object that strictly matches this schema:
${SCHEMA}

HARD RULES:
- All natural-language values MUST be in Simplified Chinese.
- "scorecard" MUST contain 4-5 dimensions; each "score" is a NUMBER from 0 to 100.
- "feedback360" and "improvements" each contain 2-4 items.
- Stay 100% in character — use only corporate HR vocabulary.
- Return raw JSON only: no markdown fences, no extra text.

以下是待评估的聊天记录：
${chatLog}`;
}

/* ------------------------------- 卡片渲染 ------------------------------- */

/** 转正结论的配色：未知结论回退到 amber。 */
const VERDICT_STYLE = {
  予以转正: { pill: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400', dot: 'bg-emerald-500' },
  延长试用期: { pill: 'bg-amber-950/40 border-amber-900/60 text-amber-400', dot: 'bg-amber-500' },
  不予转正: { pill: 'bg-rose-950/40 border-rose-900/60 text-rose-400', dot: 'bg-rose-500' },
  予以毕业: { pill: 'bg-rose-950/40 border-rose-900/60 text-rose-400', dot: 'bg-rose-500' },
};
const VERDICT_FALLBACK = {
  pill: 'bg-amber-950/40 border-amber-900/60 text-amber-400',
  dot: 'bg-amber-500',
};

/** 按分数取配色：高分翠绿、中分琥珀、低分玫红。 */
function scoreColor(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

/** 一个区块：小标题 + 内容。 */
function section(label, contentEl) {
  const wrap = el('div');
  wrap.append(el('span', 'text-[10px] text-sky-600/80 tracking-wider block mb-2', label), contentEl);
  return wrap;
}

/** 卡片头部：标题 + 评估 ID + 转正结论徽标。 */
function header(data) {
  const left = el('div');
  left.append(
    el('h2', 'text-sm font-bold text-sky-400 tracking-wider', 'PROBATION REVIEW'),
    el('p', 'text-[10px] text-gray-500 mt-1', `ID: ${data.caseId}`),
  );

  const style = VERDICT_STYLE[data.verdict] ?? VERDICT_FALLBACK;
  const pill = el('div', `flex items-center gap-2 border rounded-full px-3 py-1 ${style.pill}`);
  pill.append(
    el('span', `inline-flex rounded-full h-2 w-2 ${style.dot}`),
    el('span', 'text-[9px] font-bold tracking-widest', data.verdict),
  );

  const root = el('div', 'flex items-start justify-between border-b border-sky-900/40 pb-4');
  root.append(left, pill);
  return root;
}

/** 考核对象横幅。 */
function candidateBanner(candidate) {
  const banner = el(
    'div',
    'flex items-center gap-2 bg-[#0e1420] border border-sky-900/40 rounded-lg p-3',
  );
  banner.append(
    el('span', 'text-[9px] text-sky-600/80 shrink-0', '考核对象'),
    el('span', 'text-xs text-gray-200 font-bold font-sans', candidate),
  );
  return banner;
}

/** 评估综述。 */
function overviewBlock(text) {
  return el(
    'p',
    'text-xs text-gray-300 leading-relaxed bg-[#0e1420] p-3 rounded-lg border border-sky-900/30',
    text,
  );
}

/** 胜任力评分：逐维度打分条。 */
function scorecard(rows) {
  const wrap = el('div', 'flex flex-col gap-3');
  toArray(rows).forEach((row) => {
    const score = toPercent(row.score);

    const head = el('div', 'flex items-center justify-between text-[11px]');
    head.append(
      el('span', 'text-gray-300 font-sans', row.dimension),
      el('span', `font-mono font-bold ${scoreColor(score)}`, String(Math.round(score))),
    );

    const bar = el('div', 'h-1.5 rounded-full');
    bar.style.width = `${score}%`;
    bar.style.background = 'linear-gradient(to right, #0ea5e9, #38bdf8)';
    const track = el(
      'div',
      'h-1.5 w-full bg-[#0e1420] border border-sky-900/30 rounded-full overflow-hidden',
    );
    track.appendChild(bar);

    const item = el('div', 'flex flex-col gap-1.5');
    item.append(head, track);
    if (row.comment) {
      item.appendChild(
        el('div', 'text-[10px] text-gray-500 font-sans leading-relaxed', row.comment),
      );
    }
    wrap.appendChild(item);
  });
  return wrap;
}

/** 360 环评：匿名反馈卡片。 */
function feedbackList(items) {
  const list = el('div', 'flex flex-col gap-2.5');
  toArray(items).forEach((fb) => {
    const card = el(
      'div',
      'bg-[#0e1420] border border-sky-900/40 p-3 rounded-lg flex flex-col gap-1.5',
    );
    card.append(
      el(
        'span',
        'text-[9px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/50 rounded px-1.5 py-0.5 self-start',
        fb.source,
      ),
      el('p', 'text-xs text-gray-300 leading-relaxed font-sans', `“${fb.comment}”`),
    );
    list.appendChild(card);
  });
  return list;
}

/** 改进计划（PIP）：编号列表。 */
function improvementList(items) {
  const ul = el('ul', 'flex flex-col gap-2');
  toArray(items).forEach((text, index) => {
    const li = el(
      'li',
      'text-xs text-gray-300 flex items-start gap-2 bg-[#0e1420] border border-sky-900/30 p-2.5 rounded-lg',
    );
    li.append(
      el(
        'span',
        'text-[10px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/50 w-5 h-5 flex items-center justify-center rounded-full shrink-0',
        String(index + 1),
      ),
      el('span', 'leading-relaxed font-sans', text),
    );
    ul.appendChild(li);
  });
  return ul;
}

/** HR 寄语。 */
function commentBlock(text) {
  const wrap = el('div', 'border-t border-sky-900/40 pt-4 mt-1');
  wrap.append(
    el('p', 'text-xs italic text-cyan-400 leading-relaxed text-center font-sans', `“ ${text} ”`),
  );
  return wrap;
}

/** 把评估数据渲染为完整的卡片元素。 */
function render(data) {
  const root = el(
    'div',
    'w-[450px] bg-[#0a0e14] rounded-2xl p-6 neon-border-sky flex flex-col gap-5 relative overflow-hidden select-none',
  );

  // 左侧竖向霓虹条（区别于其它卡片的装饰）
  const accent = el('div', 'absolute top-0 bottom-0 left-0 w-1');
  accent.style.background =
    'linear-gradient(to bottom, rgba(56, 189, 248, 0), rgba(56, 189, 248, 0.7), rgba(56, 189, 248, 0))';
  root.appendChild(accent);

  root.append(
    header(data),
    candidateBanner(data.candidate),
    section('评估综述 / OVERVIEW', overviewBlock(data.overview)),
    section('胜任力评分 / SCORECARD', scorecard(data.scorecard)),
    section('360 环评 / 360° FEEDBACK', feedbackList(data.feedback360)),
    section('改进计划 / PIP', improvementList(data.improvements)),
    commentBlock(data.hrComment),
  );
  return root;
}

/** 试用期转正评估模块。 */
export const hrReport = {
  label: '🧑‍💼 大厂 HR（试用期还没满，先给你发张毕业证）',
  required: REQUIRED,
  buildPrompt,
  render,
};

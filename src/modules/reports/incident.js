/**
 * 报告类型：系统事故诊断报告（毒舌系统架构师）。
 *
 * 这是一个自包含的「报告模块」，对外只暴露 label / required / buildPrompt /
 * render 四样东西，把提示词、JSON schema、卡片渲染全部收在一个文件里。
 */
import { el, toArray } from '../dom.js';

const PERSONA =
  'You ARE a brutally sarcastic, cold-hearted Senior System Architect. You analyze ' +
  'the relationship as if it were a software system under review, speaking ONLY in ' +
  'software-engineering metaphors: stack traces, race conditions, deadlocks, memory ' +
  'leaks, null pointers, HTTP status codes, timeouts, deployments and `kill -9`. ' +
  'Your tone is always savage and sarcastic — but your technical verdict is always ' +
  'accurate to the evidence. NEVER use product, growth or HR terms.';

const SCHEMA = `{
  "incidentId": "string, format ERR-YYYY-MM-DD",
  "severity": "CRITICAL | WARNING | INFO",
  "component": "string, the failing module or area",
  "status": "string, the current status",
  "overview": "string, a brief overview of the crash, max 80 words",
  "traceback": [
    {
      "role": "Client | Server",
      "content": "string, the original chat line",
      "diagnosis": "string, a sharp, sarcastic tech diagnosis of this line"
    }
  ],
  "rootCauses": ["string, max 40 words", "string, max 40 words"],
  "patches": [
    { "name": "string, the patch name", "code": "string, a code or command snippet" }
  ],
  "architectComment": "string, one final cold-hearted sarcastic quote, max 30 words"
}`;

/** render() 之前会校验这些字段是否齐全。 */
const REQUIRED = [
  'incidentId',
  'severity',
  'component',
  'status',
  'overview',
  'traceback',
  'rootCauses',
  'patches',
  'architectComment',
];

/** 构造完整提示词。 */
function buildPrompt(chatLog) {
  return `${PERSONA}

TASK: Read the chat log between the user and their crush, then write the whole
report in your own voice and metaphors.

CALIBRATION (important): First judge objectively how the conversation is ACTUALLY
going, and set "severity" to match the evidence:
- The crush is responsive, warm, agrees, or actively moves things forward
  → "severity": "INFO" — the system is basically healthy; admit it honestly.
- The signals are mixed or lukewarm → "severity": "WARNING".
- The chat genuinely shows coldness, evasion, rejection or being ignored
  → "severity": "CRITICAL".
Your tone stays savage and sarcastic, but "status", "overview", every "diagnosis",
"rootCauses" and "patches" MUST stay consistent with that severity. A sarcastic
architect who admits the system returned 200 OK is funny; one who screams CRITICAL
over a healthy handshake is just wrong. Do NOT invent failures that are not in the
chat.

The "traceback" array breaks the conversation down line by line. role "Client" is
the user themselves; role "Server" is the other person (the crush). Give every
line a short, sharp, on-theme diagnosis.

Respond with EXACTLY ONE JSON object that strictly matches this schema:
${SCHEMA}

HARD RULES:
- All natural-language values MUST be in Simplified Chinese (short technical
  labels, commands and code may stay in English).
- "incidentId" format: ERR-YYYY-MM-DD. "severity" is CRITICAL, WARNING or INFO.
- Stay 100% in character — use only software-engineering vocabulary.
- Return raw JSON only: no markdown fences, no extra text.

以下是待 Debug 的聊天记录：
${chatLog}`;
}

/* ------------------------------- 卡片渲染 ------------------------------- */

/** 严重度的配色：未知值回退到 WARNING。 */
const SEVERITY_STYLE = {
  CRITICAL: {
    pill: 'bg-red-950/40 border-red-900/60',
    text: 'text-red-400',
    dotPulse: 'bg-red-400',
    dotCore: 'bg-red-500',
  },
  WARNING: {
    pill: 'bg-amber-950/40 border-amber-900/60',
    text: 'text-amber-400',
    dotPulse: 'bg-amber-400',
    dotCore: 'bg-amber-500',
  },
  INFO: {
    pill: 'bg-emerald-950/40 border-emerald-900/60',
    text: 'text-emerald-400',
    dotPulse: 'bg-emerald-400',
    dotCore: 'bg-emerald-500',
  },
};
const SEVERITY_FALLBACK = SEVERITY_STYLE.WARNING;

/** 一个区块：小标题 + 内容。 */
function section(label, contentEl) {
  const wrap = el('div');
  wrap.append(el('span', 'text-[10px] text-gray-500 block mb-2', label), contentEl);
  return wrap;
}

/** 卡片头部：标题 + 事故 ID + 严重度徽标。 */
function header(data) {
  const left = el('div');
  left.append(
    el('h2', 'text-sm font-bold text-indigo-400 tracking-wider', 'SYSTEM INCIDENT REPORT'),
    el('p', 'text-[10px] text-gray-500 mt-1', `ID: ${data.incidentId}`),
  );

  const style = SEVERITY_STYLE[data.severity] ?? SEVERITY_FALLBACK;
  const dot = el('span', 'relative flex h-2 w-2');
  dot.append(
    el(
      'span',
      `animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dotPulse}`,
    ),
    el('span', `relative inline-flex rounded-full h-2 w-2 ${style.dotCore}`),
  );
  const pill = el(
    'div',
    `flex items-center gap-2 border rounded-full px-3 py-1 ${style.pill} ${style.text}`,
  );
  pill.append(dot, el('span', 'text-[9px] font-bold tracking-widest', data.severity));

  const root = el('div', 'flex items-start justify-between border-b border-gray-800/80 pb-4');
  root.append(left, pill);
  return root;
}

/** 元数据区：组件 / 状态。 */
function metaGrid(data) {
  const style = SEVERITY_STYLE[data.severity] ?? SEVERITY_FALLBACK;
  const grid = el(
    'div',
    'grid grid-cols-2 gap-4 text-[10px] bg-[#11121b] border border-gray-800/50 p-3 rounded-lg',
  );
  grid.append(
    metaCell('COMPONENT', data.component, 'text-gray-300'),
    metaCell('STATUS', data.status, style.text),
  );
  return grid;
}

function metaCell(label, value, valueClass) {
  const cell = el('div');
  cell.append(
    el('span', 'text-gray-500 block mb-0.5', label),
    el('span', `${valueClass} font-bold`, value),
  );
  return cell;
}

/** 诊断概述。 */
function overviewBlock(text) {
  return el(
    'p',
    'text-xs text-gray-300 leading-relaxed bg-[#11121b] p-3 rounded-lg border border-gray-800/30',
    text,
  );
}

/** 追踪调试详情。 */
function tracebackList(traceback) {
  const list = el('div', 'flex flex-col gap-3');
  toArray(traceback).forEach((item) => {
    const isClient = item.role === 'Client';
    const badgeClass = isClient
      ? 'text-indigo-400 bg-indigo-950/30 border border-indigo-900/50'
      : 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/50';

    const head = el('div', 'flex items-center gap-1.5');
    head.append(
      el('span', `text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`, isClient ? 'CLIENT' : 'SERVER'),
      el('span', 'text-xs text-gray-300 font-sans', item.content),
    );

    const row = el(
      'div',
      'flex flex-col gap-1 bg-[#11121b] border border-gray-800/30 p-2.5 rounded-lg',
    );
    row.append(
      head,
      el(
        'div',
        'text-[10px] text-rose-400 font-mono mt-1 border-t border-gray-800/20 pt-1',
        `⚡ DIAGNOSIS: ${item.diagnosis}`,
      ),
    );
    list.appendChild(row);
  });
  return list;
}

/** 根本原因分析。 */
function rootCauseList(causes) {
  const ul = el('ul', 'flex flex-col gap-2');
  toArray(causes).forEach((cause, index) => {
    const li = el(
      'li',
      'text-xs text-gray-300 flex items-start gap-2 bg-[#11121b] border border-gray-800/20 p-2.5 rounded-lg',
    );
    li.append(
      el(
        'span',
        'text-[10px] font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-900/50 w-5 h-5 flex items-center justify-center rounded-full shrink-0',
        String(index + 1),
      ),
      el('span', 'leading-relaxed font-sans', cause),
    );
    ul.appendChild(li);
  });
  return ul;
}

/** 紧急修复补丁。 */
function patchList(patches) {
  const list = el('div', 'flex flex-col gap-3');
  toArray(patches).forEach((patch) => {
    const item = el(
      'div',
      'bg-[#11121b] border border-gray-800/40 p-3 rounded-lg flex flex-col gap-1.5',
    );
    item.append(
      el('div', 'text-[10px] font-bold text-emerald-400', `⚡ PATCH: ${patch.name}`),
      el(
        'code',
        'text-xs text-gray-400 bg-[#0c0d14] p-2 rounded border border-gray-800 block whitespace-pre-wrap',
        patch.code,
      ),
    );
    list.appendChild(item);
  });
  return list;
}

/** 架构师寄语。 */
function commentBlock(text) {
  const wrap = el('div', 'border-t border-gray-800/80 pt-4 mt-2');
  wrap.append(
    el('p', 'text-xs italic text-cyan-400 leading-relaxed text-center font-sans', `“ ${text} ”`),
  );
  return wrap;
}

/** 把诊断数据渲染为完整的卡片元素。 */
function render(data) {
  const root = el(
    'div',
    'w-[450px] bg-[#0c0d14] rounded-2xl p-6 neon-border flex flex-col gap-6 relative overflow-hidden select-none',
  );

  // 四角装饰线
  const corners = [
    'top-0 left-0 border-t-2 border-l-2',
    'top-0 right-0 border-t-2 border-r-2',
    'bottom-0 left-0 border-b-2 border-l-2',
    'bottom-0 right-0 border-b-2 border-r-2',
  ];
  corners.forEach((pos) => root.appendChild(el('div', `absolute w-8 h-8 border-indigo-500/30 ${pos}`)));

  root.append(
    header(data),
    metaGrid(data),
    section('OVERVIEW', overviewBlock(data.overview)),
    section('TRACEBACK_LOG', tracebackList(data.traceback)),
    section('ROOT_CAUSE_ANALYSIS', rootCauseList(data.rootCauses)),
    section('PATCH_LOG', patchList(data.patches)),
    commentBlock(data.architectComment),
  );
  return root;
}

/** 系统事故诊断报告模块。 */
export const incidentReport = {
  label: '💻 毒舌系统架构师（把你的心动鉴定成一场 P0 级线上事故）',
  required: REQUIRED,
  buildPrompt,
  render,
};

/**
 * 应用入口：tab 切换 + 按需注入 DOM，串联「调用 → 渲染 → 导出」流程。
 *
 * 「设置」tab 的 API Key input 仅在该 tab 激活时存在于 DOM，
 * 切走时被物理移除。这样主功能 tab 加载时页面里没有任何疑似凭证字段，
 * Chrome 内置密码管理器的启发式扫描无目标可接管 —— 否则它会吞掉
 * 整个页面的回车键，导致 textarea 中文/英文都无法换行。
 */
import './styles/main.css';
import { REPORTS, getReport } from './modules/reports/index.js';
import { PROVIDERS, DEFAULT_PROVIDER, getProvider, generateReport } from './modules/providers.js';
import { exportCard } from './modules/exporter.js';

const PROVIDER_STORAGE = 'crush-debugger:provider';
/** 每个 provider 的 API Key 分开存，互不覆盖。 */
const apiKeyStorageKey = (id) => `crush-debugger:api-key:${id}`;

/** 主功能 tab 的临时输入状态，跨 tab 切换时不丢失 */
const state = {
  chatLog: '',
  style: Object.keys(REPORTS)[0],
};

const shell = {
  tabContent: document.getElementById('tabContent'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  cardSlot: document.getElementById('cardSlot'),
  exportBtn: document.getElementById('exportBtn'),
  exportBar: document.getElementById('exportBar'),
  resultPlaceholder: document.getElementById('resultPlaceholder'),
};

init();

function init() {
  migrateLegacyKey();

  shell.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  shell.exportBtn.addEventListener('click', runExport);

  // 首次进入：当前 provider 没存 Key 就先去设置 tab 引导填入
  const providerId = localStorage.getItem(PROVIDER_STORAGE) || DEFAULT_PROVIDER;
  const hasKey = !!localStorage.getItem(apiKeyStorageKey(providerId));
  switchTab(hasKey ? 'main' : 'settings');
}

/** 把旧版单一存储键（只有通义千问时代）迁移到按 provider 区分的新键。 */
function migrateLegacyKey() {
  const legacy = localStorage.getItem('crush-debugger:api-key');
  if (legacy && !localStorage.getItem(apiKeyStorageKey('qwen'))) {
    localStorage.setItem(apiKeyStorageKey('qwen'), legacy);
    localStorage.removeItem('crush-debugger:api-key');
  }
}

/** 切换 tab：先把当前 tab 的临时输入暂存，再物理重建目标 tab 的 DOM。 */
function switchTab(name) {
  captureCurrentTab();
  shell.tabContent.replaceChildren();

  shell.tabBtns.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('text-indigo-300', active);
    btn.classList.toggle('border-indigo-400', active);
    btn.classList.toggle('text-gray-400', !active);
    btn.classList.toggle('border-transparent', !active);
  });

  if (name === 'main') renderMainTab();
  else renderSettingsTab();
}

/** 离开当前 tab 前抓走用户输入，避免 DOM 重建丢失。 */
function captureCurrentTab() {
  const chatLog = document.getElementById('chatLog');
  if (chatLog) {
    state.chatLog = chatLog.value;
    state.style = document.getElementById('styleSelect').value;
  }
  const apiKey = document.getElementById('apiKey');
  if (apiKey) {
    const id = document.getElementById('providerSelect').value;
    localStorage.setItem(apiKeyStorageKey(id), apiKey.value.trim());
  }
}

function renderMainTab() {
  shell.tabContent.innerHTML = `
    <div class="mb-4">
      <label class="block text-xs text-indigo-300 mb-1" for="styleSelect">
        STEP 1: 选择你的诊断视角
      </label>
      <select
        id="styleSelect"
        class="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
      ></select>
    </div>
    <div class="mb-6">
      <label class="block text-xs text-indigo-300 mb-1" for="chatLog">
        STEP 2: 粘贴你和 Crush 的聊天记录
      </label>
      <textarea
        id="chatLog"
        rows="4"
        placeholder="我：今晚一起吃饭吗？&#10;对方：改天吧，今天太累了。"
        class="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
      ></textarea>
    </div>
    <button
      id="runBtn"
      type="button"
      class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded text-sm transition duration-200"
    >
      RUN_SYSTEM_DEBUG (开始诊断)
    </button>
  `;

  const select = document.getElementById('styleSelect');
  for (const [value, report] of Object.entries(REPORTS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = report.label;
    select.appendChild(option);
  }
  select.value = state.style;

  document.getElementById('chatLog').value = state.chatLog;
  document.getElementById('runBtn').addEventListener('click', runDiagnosis);
}

function renderSettingsTab() {
  shell.tabContent.innerHTML = `
    <div class="mb-4">
      <label class="block text-xs text-indigo-300 mb-1" for="providerSelect">
        STEP 1: 选择 AI 服务商
      </label>
      <select
        id="providerSelect"
        class="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
      ></select>
    </div>
    <div class="mb-4">
      <label class="block text-xs text-indigo-300 mb-1" for="apiKey">
        STEP 2: 填入该服务商的 API Key
      </label>
      <input
        type="text"
        id="apiKey"
        name="apiKey"
        autocomplete="off"
        spellcheck="false"
        class="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
      />
      <p class="text-[10px] text-gray-500 mt-1 leading-relaxed">
        * API Key 仅保存在本浏览器的 localStorage，
        <span class="text-emerald-400">不会上传到任何服务器</span>。
        刷新页面不丢失，清除浏览器数据时会一并删除。
      </p>
      <p class="text-[10px] text-gray-500 mt-1">
        * 没有 Key 可以去
        <a
          id="applyLink"
          href="#"
          target="_blank"
          class="text-indigo-400 underline"
          rel="noopener noreferrer"
        ></a>
        申请。
      </p>
    </div>
  `;

  const providerSelect = document.getElementById('providerSelect');
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${p.label} · ${p.model}`;
    providerSelect.appendChild(option);
  }

  const input = document.getElementById('apiKey');
  const applyLink = document.getElementById('applyLink');

  // 按选中 provider 刷新输入框内容、占位符、申请链接
  const syncProviderUI = (id) => {
    const p = getProvider(id);
    input.value = localStorage.getItem(apiKeyStorageKey(id)) || '';
    input.placeholder = p.placeholder;
    applyLink.textContent = p.applyLabel;
    applyLink.href = p.applyUrl;
  };

  const currentId = localStorage.getItem(PROVIDER_STORAGE) || DEFAULT_PROVIDER;
  providerSelect.value = currentId;
  syncProviderUI(currentId);

  providerSelect.addEventListener('change', () => {
    const id = providerSelect.value;
    localStorage.setItem(PROVIDER_STORAGE, id);
    syncProviderUI(id);
  });

  input.addEventListener('input', () => {
    localStorage.setItem(apiKeyStorageKey(providerSelect.value), input.value.trim());
  });
}

async function runDiagnosis() {
  const providerId = localStorage.getItem(PROVIDER_STORAGE) || DEFAULT_PROVIDER;
  const provider = getProvider(providerId);
  const apiKey = (localStorage.getItem(apiKeyStorageKey(providerId)) || '').trim();
  const chatLog = document.getElementById('chatLog').value.trim();
  const report = getReport(document.getElementById('styleSelect').value);

  if (!apiKey) {
    alert(`请先到「设置」tab 填入 ${provider.label} 的 API Key！`);
    switchTab('settings');
    return;
  }
  if (!chatLog) {
    alert('请粘贴几句聊天记录！');
    return;
  }

  state.chatLog = chatLog;
  state.style = document.getElementById('styleSelect').value;

  const runBtn = document.getElementById('runBtn');
  setBusy(runBtn, true, 'COMPILING... (诊断生成中...)');

  try {
    const data = await generateReport({ apiKey, provider, report, chatLog });
    shell.cardSlot.replaceChildren(report.render(data));
    shell.resultPlaceholder.classList.add('hidden');
    shell.exportBar.classList.remove('hidden');
    // 窄屏堆叠时把卡片滚动进视野；宽屏左右布局下卡片已可见，block:nearest 不会乱跳
    shell.cardSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    alert(`诊断失败：${error.message}`);
  } finally {
    setBusy(runBtn, false, 'RUN_SYSTEM_DEBUG (重新诊断)');
  }
}

async function runExport() {
  const card = shell.cardSlot.firstElementChild;
  if (!card) {
    alert('请先生成一张诊断卡片');
    return;
  }

  setBusy(shell.exportBtn, true, 'GENERATING... (正在生成图片...)');
  try {
    await exportCard(card);
  } catch (error) {
    alert(`导出失败：${error.message}`);
  } finally {
    setBusy(shell.exportBtn, false, '📥 导出无损诊断卡片 (PNG)');
  }
}

/** 切换按钮禁用状态与文案；busy 时整体脉动 + 前缀滚动进度条，避免用户以为卡死。 */
function setBusy(button, busy, text) {
  if (button._spinTimer) {
    clearInterval(button._spinTimer);
    button._spinTimer = null;
  }
  button.disabled = busy;
  button.classList.toggle('busy-glow', busy);

  if (!busy) {
    button.textContent = text;
    return;
  }
  const frames = ['▰▱▱▱▱', '▰▰▱▱▱', '▰▰▰▱▱', '▰▰▰▰▱', '▰▰▰▰▰'];
  let i = 0;
  const tick = () => {
    button.textContent = `${frames[i]} ${text}`;
    i = (i + 1) % frames.length;
  };
  tick();
  button._spinTimer = setInterval(tick, 150);
}

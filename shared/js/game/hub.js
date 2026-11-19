// shared/js/game/hub.js

import { mountMinesweeper } from './minesweeper.js';
import { mountGame2048 } from './game2048.js';
import { mountReactionGame } from './reaction.js';

const GAMES = [
    { id: 'minesweeper', label: '💣 지뢰찾기', mount: mountMinesweeper },
    { id: 'game2048',    label: '🔢 2048',    mount: mountGame2048 },
    { id: 'reaction',    label: '⚡ 반응속도',  mount: mountReactionGame }
];

let containerEl = null;
let activeGameId = 'minesweeper';
let activeCleanup = null;
let rankData = {};

let hubContext = {
    getUserName: () => null,
    onSaveRank: async () => ({ isNewRecord: false }),
    onNotify: () => {}
};

function switchGame(gameId) {
    if (!containerEl) return;
    activeGameId = gameId;

    if (typeof activeCleanup === 'function') {
        activeCleanup();
        activeCleanup = null;
    }

    containerEl.querySelectorAll('[data-game-tab]').forEach(btn => {
        const isCurrent = btn.dataset.gameTab === gameId;
        btn.className = isCurrent
            ? "px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-sm transition-all"
            : "px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-all";
    });

    const stageEl = containerEl.querySelector('#game-stage');
    const gameDef = GAMES.find(g => g.id === gameId) || GAMES[0];
    if (stageEl && gameDef) {
        stageEl.innerHTML = '';
        activeCleanup = gameDef.mount(stageEl, {
            ...hubContext,
            getRanks: () => rankData,
            renderRankBar
        }) || null;
    }
}

export function renderRankBar({ title, scores = {}, unit = '', lowerIsBetter = true, emptyText = '아직 기록이 없습니다. 첫 기록을 세워보세요!' }) {
    if (!containerEl) return;
    const titleEl = containerEl.querySelector('#game-rank-title');
    const listEl = containerEl.querySelector('#game-rank-list');
    if (!titleEl || !listEl) return;

    titleEl.textContent = `🏆 ${title}`;

    const entries = Object.entries(scores)
        .filter(([, val]) => typeof val === 'number' && !isNaN(val))
        .sort((a, b) => (lowerIsBetter ? a[1] - b[1] : b[1] - a[1]));

    if (entries.length === 0) {
        listEl.innerHTML = `<span class="text-xs text-slate-400">${emptyText}</span>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    listEl.innerHTML = entries.map(([name, val], idx) => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span>${medals[idx] || `${idx + 1}위`}</span>
            <span>${name}</span>
            <span class="text-indigo-600 dark:text-indigo-400 font-black">${val.toLocaleString()}${unit}</span>
        </span>
    `).join('');
}

export function initGameHub(containerId, opts = {}) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) return;

    hubContext = { ...hubContext, ...opts };
    if (containerEl.dataset.initialized === 'true') return;
    containerEl.dataset.initialized = 'true';

    containerEl.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <span class="text-lg font-black text-slate-800 dark:text-white">🎮 대기실 미니게임</span>
                    <span class="text-[11px] font-bold text-slate-400 hidden sm:inline">모임 대기 중 가볍게 기록을 겨뤄보세요</span>
                </div>
                <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    ${GAMES.map(g => `<button type="button" data-game-tab="${g.id}">${g.label}</button>`).join('')}
                </div>
            </div>

            <div id="game-stage" class="min-h-[280px]"></div>

            <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span id="game-rank-title" class="text-xs font-black text-slate-500 dark:text-slate-400">🏆 랭킹</span>
                <div id="game-rank-list" class="flex flex-wrap gap-2"></div>
            </div>
        </div>
    `;

    containerEl.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-game-tab]');
        if (tabBtn && tabBtn.dataset.gameTab !== activeGameId) {
            switchGame(tabBtn.dataset.gameTab);
        }
    });

    switchGame(activeGameId);
}

export function updateGameRanks(newRanks) {
    rankData = newRanks || {};
    if (!containerEl || containerEl.dataset.initialized !== 'true') return;

    const stageEl = containerEl.querySelector('#game-stage');
    if (stageEl && typeof stageEl._onRankUpdate === 'function') {
        stageEl._onRankUpdate(rankData);
    }
}
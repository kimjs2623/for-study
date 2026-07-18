// shared/js/ui.js

import { state } from './state.js';
import { renderPage } from './pdfCore.js';

export function initUI() {
    const omrGrid = document.getElementById('omr-grid-container');
    if (omrGrid) {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `<div class="space-y-1 text-center"><label class="text-[9px] font-black text-slate-400 uppercase">${i}</label><input type="text" id="omr-${i}" class="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-center outline-none uppercase shadow-sm"></div>`;
        }
        omrGrid.innerHTML = html;
    }
    const essayGrid = document.getElementById('essay-grid-container');
    if (essayGrid) {
        let html = '';
        for (let i = 1; i <= 2; i++) {
            html += `<div class="shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all focus-within:ring-2 focus-within:ring-brand-500/10"><div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 border-b border-slate-200 dark:border-slate-800"><span class="text-[9px] font-black text-slate-400 uppercase ml-1">서술형 0${i}</span><input type="text" id="essay-num-${i}" placeholder="번호" class="w-14 bg-white dark:bg-slate-950 border border-slate-200 text-[10px] text-center rounded py-1 outline-none"></div><textarea id="essay-ans-${i}" placeholder="서술형 답안을 작성하세요..." class="w-full h-32 p-4 bg-white dark:bg-slate-950 text-xs resize-none outline-none custom-scrollbar border-none transition-all"></textarea></div>`;
        }
        essayGrid.innerHTML = html;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    const sidebar = document.getElementById('library-sidebar');
    if (state.sidebarOpen) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
    } else {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
    }
    
    setTimeout(() => {
        if (state.pdfDoc) {
            state.userZoomed = false;
            renderPage(state.pageNum);
        }
    }, 300);
}

export function toggleFullScreen() {
    const viewer = document.getElementById('viewer-container');
    const isFull = viewer.classList.toggle('viewer-fullscreen');
    document.body.style.overflow = isFull ? 'hidden' : '';
    document.getElementById('exit-fullscreen-fab').classList.toggle('hidden', !isFull);
    if (state.pdfDoc) renderPage(state.pageNum);
}
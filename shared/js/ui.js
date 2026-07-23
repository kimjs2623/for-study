// shared/js/ui.js

import { state } from './state.js';
import { renderPage } from './pdfCore.js';
import { saveTodayTargets, completeProgressToDay, completeTodayTargets } from './firebase.js';

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

// --- 진도 캘린더 & 팝업 렌더링 로직 ---

let tempSelectedDays = [];

export function renderProgressUI() {
    renderMyProgressHeader();
    if(document.getElementById('my-progress-modal') && !document.getElementById('my-progress-modal').classList.contains('hidden')) {
        renderProgressModalGrid();
    }
}

function formatTargetRange(days) {
    if(!days || days.length === 0) return "선택 안 됨";
    const sorted = [...days].sort((a,b)=>a-b);
    const minDay = sorted[0], maxDay = sorted[sorted.length-1];
    
    let dayStr = sorted.length === 1 ? `Day ${minDay}` : (sorted.length === maxDay - minDay + 1 ? `Day ${minDay}-${maxDay}` : `Day ${sorted.join(',')}`);
    const minWork = parseInt(state.dayMap[minDay-1].split('-')[0], 10);
    const maxRange = state.dayMap[maxDay-1].split('-');
    const maxWork = parseInt(maxRange[maxRange.length-1], 10);

    return `${dayStr} <span class="opacity-70">[${minWork}번~${maxWork}번]</span>`;
}

function renderMyProgressHeader() {
    if(!state.userName || !state.dayMap) return;

    let headerEl = document.getElementById('top-progress-header');
    if(!headerEl) {
        headerEl = document.createElement('div');
        headerEl.id = 'top-progress-header';
        headerEl.className = "mr-3 flex items-center shrink-0 transition-all duration-300 z-50";
        const navRightContainer = document.querySelector('nav .flex.items-center.space-x-3.shrink-0');
        if(navRightContainer) navRightContainer.insertBefore(headerEl, navRightContainer.firstChild);
    }

    const targets = state.myTodayTargets?.[state.subjectName] || [];

    if(targets.length === 0) {
        headerEl.innerHTML = `
            <div onclick="window.openProgressModal(event)" class="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 cursor-pointer shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <i data-lucide="calendar-plus" class="w-4 h-4 text-slate-500"></i>
                <span class="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">학습 목표 설정</span>
            </div>
        `;
    } else {
        headerEl.innerHTML = `
            <div class="flex items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/80 rounded-lg pl-3 pr-1 py-1 shadow-sm">
                <div class="flex items-center cursor-pointer mr-3" onclick="window.openProgressModal(event)">
                    <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-2"></div>
                    <span class="text-xs font-black text-indigo-700 dark:text-indigo-300 mt-0.5 tracking-tight">${formatTargetRange(targets)}</span>
                </div>
                <div class="w-px h-4 bg-indigo-200 dark:bg-indigo-800 mr-2"></div>
                <button onclick="window.completeTodayTargetsHandler(event)" class="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded text-[10px] font-black transition-all shadow-sm active:scale-95 flex items-center">
                    <i data-lucide="check-circle" class="w-3 h-3 mr-1"></i> 완료
                </button>
            </div>
        `;
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

// 🌟 그룹 일정 = 배경색 / 개인 일정 = 뱃지와 테두리 역발상 적용
function renderProgressModalGrid() {
    const gridContainer = document.getElementById('modal-grid-container');
    if(!gridContainer) return;

    let myProg = (state.progressData && state.progressData[state.userName]) ? (state.progressData[state.userName][state.subjectName] || 0) : 0;
    let myCompDay = 0;
    for(let i=0; i<state.dayMap.length; i++) {
        const parts = String(state.dayMap[i]).split('-');
        const e = parseInt(parts[1] || parts[0], 10);
        if(myProg >= e) myCompDay = i + 1;
        else break;
    }

    const groupCompleted = new Set();
    const groupThisWeek = new Set();
    const uncompletedWeeks = (state.scheduleWeeks || []).filter(w => !w.isCompleted).sort((a,b)=>a.weekNum - b.weekNum);
    const thisWeekNum = uncompletedWeeks.length > 0 ? uncompletedWeeks[0].weekNum : -1;

    (state.scheduleWeeks || []).forEach(w => {
        if(w.isCompleted) (w.days || []).forEach(d => groupCompleted.add(d));
        else if (w.weekNum === thisWeekNum) (w.days || []).forEach(d => groupThisWeek.add(d));
    });

    let gridHtml = '';
    state.dayMap.forEach((range, i) => {
        const dayNum = i + 1;
        const isMyComp = dayNum <= myCompDay;
        const isMyTarget = tempSelectedDays.includes(dayNum);
        
        // 베이스 배경색 (그룹 일정 중심)
        let bgClasses = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400 cursor-pointer transition-all";
        
        if (groupCompleted.has(dayNum)) {
            bgClasses = "bg-emerald-500 border-emerald-600 text-white opacity-80 hover:opacity-100 cursor-pointer transition-all";
        } else if (groupThisWeek.has(dayNum)) {
            bgClasses = "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold hover:bg-indigo-200 cursor-pointer transition-all";
        }

        // 오버레이 효과 (개인 일정 중심)
        if (isMyTarget) {
            bgClasses += " ring-2 ring-rose-500 transform scale-110 z-10 shadow-lg !opacity-100";
        }

        // 개인 일정 뱃지
        let personalBadge = '';
        if (isMyTarget) {
            personalBadge = `<span class="absolute top-1.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse whitespace-nowrap tracking-tighter pointer-events-none">내 목표</span>`;
        } else if (isMyComp) {
            personalBadge = `<span class="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap tracking-tighter pointer-events-none">내 완료</span>`;
        }

        gridHtml += `
        <div onclick="window.toggleModalDay(${dayNum})" class="flex flex-col items-center justify-center pt-6 pb-2 rounded-xl border select-none relative group ${bgClasses}">
            ${personalBadge}
            <span class="text-[12px] font-black tracking-tighter pointer-events-none">D${dayNum < 10 ? '0'+dayNum : dayNum}</span>
            <span class="text-[9px] font-bold opacity-90 mt-0.5 pointer-events-none">${range}</span>
        </div>`;
    });
    gridContainer.innerHTML = gridHtml;
}

// 이벤트 핸들러 글로벌 등록 (할당량 모달)
window.openProgressModal = (e) => {
    if(e) e.stopPropagation();
    let modal = document.getElementById('my-progress-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'my-progress-modal';
        modal.className = "hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4 fade-in";
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div class="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h2 class="text-lg font-black flex items-center text-slate-900 dark:text-white"><i data-lucide="calendar-check" class="w-5 h-5 mr-2 text-indigo-500"></i> 오늘의 학습 목표</h2>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold">진행할 Day를 클릭해 할당량으로 만드세요. 여러 개 선택 가능합니다.</p>
                        </div>
                        <button onclick="document.getElementById('my-progress-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full p-1"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 gap-3">
                        <div class="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500">
                           <span class="flex items-center"><div class="w-3.5 h-3.5 rounded bg-emerald-500 opacity-80 mr-1.5"></div> 그룹 완료</span>
                           <span class="flex items-center"><div class="w-3.5 h-3.5 rounded bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 mr-1.5"></div> 그룹 이번주</span>
                           <span class="flex items-center"><span class="bg-slate-800 dark:bg-slate-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black mr-1.5 shadow-sm">내 완료</span></span>
                           <span class="flex items-center"><span class="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black mr-1.5 shadow-sm animate-pulse">내 목표</span></span>
                        </div>
                        <button onclick="window.openEditProgressModal()" class="shrink-0 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center shadow-sm">
                            <i data-lucide="edit-3" class="w-3 h-3 mr-1"></i> 내 진도 직접 수정
                        </button>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100/50 dark:bg-slate-900/50">
                    <div id="modal-grid-container" class="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-3"></div>
                </div>
                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <button onclick="window.saveModalTargets()" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center">
                        선택한 분량을 목표로 저장
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    tempSelectedDays = [...(state.myTodayTargets?.[state.subjectName] || [])];
    document.getElementById('my-progress-modal').classList.remove('hidden');
    renderProgressModalGrid();
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.toggleModalDay = (dayNum) => {
    if(tempSelectedDays.includes(dayNum)) tempSelectedDays = tempSelectedDays.filter(d => d !== dayNum);
    else tempSelectedDays.push(dayNum);
    renderProgressModalGrid();
};


// 🌟 드롭다운을 대체하는 캘린더 형식의 '수정 팝업'
window.openEditProgressModal = () => {
    let modal = document.getElementById('edit-progress-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-progress-modal';
        modal.className = "hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[2000000] flex items-center justify-center p-4 fade-in";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
                <h2 class="text-lg font-black flex items-center text-slate-900 dark:text-white"><i data-lucide="check-square" class="w-5 h-5 mr-2 text-rose-500"></i> 내 진도 덮어쓰기</h2>
                <button onclick="document.getElementById('edit-progress-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            
            <div class="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <button onclick="window.confirmEditProgress(0)" class="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl text-sm transition-colors border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                    <i data-lucide="rotate-ccw" class="w-4 h-4 mr-2 text-slate-500"></i> 진도 완전 초기화 (0번으로 되돌리기)
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100/50 dark:bg-slate-900/50">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 text-center">어디까지 완료하셨나요? 완료한 마지막 Day를 클릭하면 해당 진도로 강제 덮어씁니다.</p>
                <div id="edit-modal-grid-container" class="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-3"></div>
            </div>
        </div>
    `;
    document.getElementById('edit-progress-modal').classList.remove('hidden');
    renderEditProgressGrid();
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

function renderEditProgressGrid() {
    const gridContainer = document.getElementById('edit-modal-grid-container');
    if(!gridContainer) return;
    
    let myProg = (state.progressData && state.progressData[state.userName]) ? (state.progressData[state.userName][state.subjectName] || 0) : 0;
    let myCompDay = 0;
    for(let i=0; i<state.dayMap.length; i++) {
        const e = parseInt(String(state.dayMap[i]).split('-').pop(), 10);
        if(myProg >= e) myCompDay = i + 1;
        else break;
    }

    let gridHtml = '';
    state.dayMap.forEach((range, i) => {
        const dayNum = i + 1;
        const isComp = dayNum <= myCompDay;
        
        let classes = isComp 
            ? "bg-slate-800 border-slate-900 text-white shadow-sm hover:bg-slate-700" 
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-300";

        gridHtml += `
        <div onclick="window.confirmEditProgress(${dayNum})" class="flex flex-col items-center justify-center py-4 rounded-xl border transition-all select-none relative cursor-pointer ${classes}">
            <span class="text-[12px] font-black tracking-tighter">D${dayNum < 10 ? '0'+dayNum : dayNum}</span>
            <span class="text-[9px] font-bold opacity-90 mt-0.5">${range}</span>
        </div>`;
    });
    gridContainer.innerHTML = gridHtml;
}


// --- 파이어베이스 연동 브릿지 함수들 ---

window.saveModalTargets = () => {
    saveTodayTargets(tempSelectedDays);
    document.getElementById('my-progress-modal').classList.add('hidden');
};

window.confirmEditProgress = (dayNum) => {
    completeProgressToDay(dayNum);
    document.getElementById('edit-progress-modal').classList.add('hidden');
};

window.completeTodayTargetsHandler = (e) => {
    if(e) e.stopPropagation();
    completeTodayTargets();
};
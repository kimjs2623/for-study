// shared/js/search.js

import { state } from './state.js';
import { showToast } from './utils.js';
import { loadMaterial, jumpToPage } from './pdfCore.js';

export async function scanGitHub() {
    const config = state.githubConfig;
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.folder}?ref=${config.branch}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`GitHub 오류 (${res.status})`);
        const data = await res.json();
        state.allFiles = data.filter(f => f.name.toLowerCase().endsWith('.pdf') && !f.name.includes('정답'));
        state.filteredFiles = [...state.allFiles]; 
        renderFileList();
    } catch (e) { 
        document.getElementById('material-list').innerHTML = `<p class="text-[10px] text-amber-600 p-6 text-center font-bold break-words">${e.message}<br><br>번호/명을 수동 입력하면 정상 작동합니다.</p>`; 
    }
}

export function filterFiles() {
    const q = document.getElementById('file-search').value.toLowerCase().replace(/\s+/g, '');
    const container = document.getElementById('material-list');
    
    if (!q) {
        state.filteredFiles = [...state.allFiles];
        renderFileList();
    } else {
        const paddedQ = q.padStart(3, '0');
        const matchedWorks = Object.keys(state.workIndex).filter(k => {
            const cleanKey = k.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
            const rawKeyNum = k.split('.')[0];
            
            if (k.startsWith(q) || k.startsWith(paddedQ + '.')) return true;
            if (rawKeyNum.includes(q)) return true;
            if (cleanKey.includes(q)) return true;
            if (cleanKey.length >= 3 && q.length >= 3) {
                if (cleanKey.substring(0, 2) === q.substring(0, 2) && 
                    cleanKey.substring(cleanKey.length - 2) === q.substring(q.length - 2)) return true;
            }
            return false;
        });

        if (matchedWorks.length === 0) {
            container.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-4 font-bold">검색 결과가 없습니다.</p>`;
            return;
        }
        container.innerHTML = matchedWorks.map(w => {
            const info = state.workIndex[w];
            return `<button onclick="window.StudyApp.findAndGoToWorkByString('${w}')" class="w-full flex flex-col p-2.5 rounded-xl border border-brand-100 bg-white dark:bg-slate-900 text-left transition-all hover:bg-brand-50 shadow-sm mb-1.5 dark:border-slate-800 dark:hover:bg-slate-800">
                <div class="flex items-center mb-1">
                    <i data-lucide="search" class="w-3 h-3 mr-1.5 text-brand-500"></i>
                    <div class="truncate font-black text-[11px] text-slate-700 dark:text-slate-200">${w}</div>
                </div>
                <div class="text-[9px] text-slate-400 ml-4.5 font-bold tracking-tight">📄 ${info.file.replace('.pdf','')} | ${info.bookPage}p</div>
            </button>`;
        }).join('');
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

export function renderFileList() {
    const container = document.getElementById('material-list');
    container.innerHTML = state.filteredFiles.map(f => `
        <button onclick="window.StudyApp.loadMaterial('${f.name}', '${f.download_url}')" id="btn-${f.name.replace(/\s+/g, '')}" class="file-btn w-full flex items-center p-2.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-900 text-left transition-all hover:bg-brand-50/10 shadow-sm mb-1.5">
            <i data-lucide="file-text" class="w-3.5 h-3.5 mr-2 text-slate-300"></i>
            <div class="truncate font-bold text-[10px] uppercase">${f.name}</div>
        </button>
    `).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function getWeekByWorkNum(workNum) {
    let targetDay = null;
    for(let i = 0; i < state.dayMap.length; i++) {
        const range = String(state.dayMap[i]).split('-');
        const start = parseInt(range[0], 10);
        const end = parseInt(range[1] || range[0], 10);
        if(workNum >= start && workNum <= end) {
            targetDay = i + 1;
            break;
        }
    }
    if(!targetDay) return null;
    
    for(const wk of state.scheduleWeeks) {
        if(wk.days && wk.days.includes(targetDay)) {
            return String(wk.weekNum || wk.week).replace(/[^0-9]/g, '');
        }
    }
    return null;
}

export function autoFillWorkName() {
    const numInput = document.getElementById('omr-work-num').value.trim();
    if(!numInput) return;
    const paddedNum = numInput.padStart(3, '0');
    const targetKey = Object.keys(state.workIndex).find(k => k.startsWith(paddedNum + '.'));
    if(targetKey) {
        const name = targetKey.replace(/^\d+\.\s*/, '');
        document.getElementById('omr-work-name').value = name;
        
        const week = getWeekByWorkNum(parseInt(paddedNum, 10));
        if(week) {
            const weekSelect = document.getElementById('week-select');
            if(weekSelect && weekSelect.value !== week) {
                weekSelect.value = week;
                weekSelect.dispatchEvent(new Event('change'));
            }
        }
    }
}

export function autoFillPromptWorkName() {
    const numInput = document.getElementById('prompt-num-input').value.trim();
    if(!numInput) return;
    
    const paddedNum = numInput.padStart(3, '0');
    const targetKey = Object.keys(state.workIndex).find(k => k.startsWith(paddedNum + '.'));
    
    if(targetKey) {
        const name = targetKey.replace(/^\d+\.\s*/, '');
        document.getElementById('prompt-input').value = name;
        
        const week = getWeekByWorkNum(parseInt(paddedNum, 10));
        if(week) {
            const qaWeekSelect = document.getElementById('qa-week-filter');
            if(qaWeekSelect && qaWeekSelect.value !== week) {
                qaWeekSelect.value = week;
                qaWeekSelect.dispatchEvent(new Event('change'));
            }
        }
    }
}

export function findAndGoToWorkByString(workString) {
    if (!workString) return;
    const cleanInput = workString.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
    const rawKeyNumInput = workString.split('.')[0];
    
    let targetKey = null;

    // 1순위: 번호가 정확히 일치하는 경우 (동명이작 완벽 식별)
    if (rawKeyNumInput && !isNaN(parseInt(rawKeyNumInput))) {
        targetKey = Object.keys(state.workIndex).find(k => k.split('.')[0] === rawKeyNumInput.padStart(3, '0'));
    }

    // 2순위: 제목과 작가명이 사용자 입력에 동시 포함된 경우 (예: "김춘수 꽃")
    if (!targetKey && cleanInput) {
        targetKey = Object.keys(state.workIndex).find(k => {
            const cleanKey = k.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
            const author = (state.workIndex[k].author || '').replace(/\s+/g, '').toLowerCase();
            return cleanKey && author && cleanInput.includes(cleanKey) && cleanInput.includes(author);
        });
    }

    // 3순위: 제목이 정확히 일치하는 경우 (꽃 -> 꽃)
    if (!targetKey && cleanInput) {
        targetKey = Object.keys(state.workIndex).find(k => {
            const cleanKey = k.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
            return cleanKey === cleanInput;
        });
    }

    // 4순위: 제목을 부분 포함하는 경우 (꽃 -> 꽃덤불)
    if (!targetKey && cleanInput) {
        targetKey = Object.keys(state.workIndex).find(k => {
            const cleanKey = k.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
            return cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey);
        });
    }

    const target = targetKey ? state.workIndex[targetKey] : null;

    if (!target) {
        return showToast(`[${workString}] 교재 목차에 등록되지 않은 외부 작품입니다.`, "error");
    }

    let calculatedPdfPage = 1;
    const offsetData = state.fileOffsetMap[target.file];
    if (offsetData) {
        calculatedPdfPage = target.bookPage - offsetData.bookPage + offsetData.pdfPage;
    }
    if (calculatedPdfPage < 1) calculatedPdfPage = 1; 

    const currentFileName = document.getElementById('viewer-filename').textContent.replace(/\s+/g, '');
    const targetFileNameClean = target.file.replace('.pdf', '').replace(/\s+/g, '');

    if (currentFileName === targetFileNameClean && state.pdfDoc) {
        jumpToPage(calculatedPdfPage);
        showToast(`[${targetKey}] 본문으로 이동했습니다.`, "success");
    } else {
        const fileObj = state.allFiles.find(f => f.name.replace(/\s+/g, '') === target.file.replace(/\s+/g, ''));
        if (fileObj) {
            showToast(`[${target.file}] 파일을 열고 본문으로 이동합니다...`, "info");
            loadMaterial(fileObj.name, fileObj.download_url, calculatedPdfPage);
        } else {
            showToast(`[${target.file}] 파일을 라이브러리에서 찾을 수 없습니다. 파일명을 확인해주세요.`, "error");
        }
    }
}
export function findAndGoToWork(inputId) {
    const workName = document.getElementById(inputId).value.trim();
    if(!workName) return showToast("작품명이나 번호를 입력하고 검색을 눌러주세요.", "error");
    findAndGoToWorkByString(workName);
}

export function getCurrentPageWorks() {
    if (!state.pdfDoc) return [];
    const currentFileName = document.getElementById('viewer-filename').textContent + '.pdf';
    
    const cleanCurrentFileName = currentFileName.replace(/\s+/g, '');
    let offsetData = null;
    let matchedFileKey = null;
    
    for (const key of Object.keys(state.fileOffsetMap)) {
        if (key.replace(/\s+/g, '') === cleanCurrentFileName) {
            offsetData = state.fileOffsetMap[key];
            matchedFileKey = key;
            break;
        }
    }
    
    if (!offsetData) return [];

    const currentBookPage = state.pageNum - offsetData.pdfPage + offsetData.bookPage;
    const worksOnPage = [];
    
    for (const [workName, data] of Object.entries(state.workIndex)) {
        if (data.file === matchedFileKey && Math.abs(data.bookPage - currentBookPage) <= 1) {
            worksOnPage.push(workName);
        }
    }
    return worksOnPage;
}
// shared/js/pdfCore.js

import { state } from './state.js';
import { showToast } from './utils.js';
import { toggleSidebar } from './ui.js';

export async function loadGlobalAnswerKey() {
    const config = state.githubConfig;
    const url = `https://raw.githubusercontent.com/${config.username}/${config.repo}/${config.branch}/${config.folder}/${config.answerKeyFileName}`;
    const badge = document.getElementById('answer-key-badge');
    try {
        const res = await fetch(url);
        if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            state.answerKeyPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            badge.innerHTML = `<i data-lucide="check-circle" class="w-3 h-3 mr-1"></i> Key Ready`;
            badge.className = "hidden sm:flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded text-[9px] font-black uppercase transition-all";
        } else throw new Error();
    } catch (e) {
        badge.innerHTML = `<i data-lucide="x-circle" class="w-3 h-3 mr-1"></i> Key Load Failed`;
        badge.className = "hidden sm:flex items-center bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-[9px] font-black uppercase transition-all";
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export async function loadMaterial(name, url, targetPage = 1) {
    if (state.isFetching) return;
    state.isFetching = true;
    
    const cleanName = name.replace('.pdf', '');
    document.getElementById('viewer-filename').textContent = cleanName;
    document.getElementById('viewer-placeholder').classList.add('hidden');
    document.querySelectorAll('.file-btn').forEach(b => b.classList.remove('border-brand-500', 'bg-brand-50/30'));
    
    const targetBtn = document.getElementById(`btn-${name.replace(/\s+/g, '')}`);
    if (targetBtn) targetBtn.classList.add('border-brand-500', 'bg-brand-50/30');

    if (state.sidebarOpen) toggleSidebar();

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        state.pdfDoc = await loadingTask.promise;
        
        document.getElementById('page_count').textContent = state.pdfDoc.numPages;
        document.getElementById('pdf-controls').classList.remove('hidden');
        document.getElementById('pdf-canvas-container').classList.remove('hidden');
        
        state.pageNum = targetPage; 
        state.userZoomed = false;
        renderPage(state.pageNum);
        showToast(`${cleanName} 로드 완료`);
    } catch (e) { 
        showToast("PDF 로드 실패: " + e.message, "error"); 
    } finally { 
        state.isFetching = false; 
    }
}

export function renderPage(num) {
    if (!state.pdfDoc) return;
    
    state.pdfDoc.getPage(num).then((page) => {
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('pdf-canvas-container');
        
        if (state.renderTask) {
            state.renderTask.cancel();
        }

        if (!state.userZoomed) {
            state.pdfScale = (container.clientWidth - 30) / page.getViewport({scale: 1}).width;
        }
        
        const viewport = page.getViewport({scale: state.pdfScale});
        const outputScale = window.devicePixelRatio || 2;
        
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const renderContext = { canvasContext: ctx, transform: transform, viewport: viewport };
        state.renderTask = page.render(renderContext);

        state.renderTask.promise.then(() => {
            canvas.classList.remove('hidden');
            state.renderTask = null; 
        }).catch((err) => {
            if (err.name !== 'RenderingCancelledException') console.error('렌더링 에러:', err);
        });
        
        document.getElementById('page_num_input').value = num;
    });
}

export function jumpToPage(val) {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (state.pdfDoc && num > state.pdfDoc.numPages) num = state.pdfDoc.numPages;
    if (state.pageNum !== num) {
        state.pageNum = num;
        renderPage(state.pageNum);
    } else {
        document.getElementById('page_num_input').value = state.pageNum;
    }
}

export function prevPage() { if (state.pageNum > 1) { state.pageNum--; renderPage(state.pageNum); } }
export function nextPage() { if (state.pdfDoc && state.pageNum < state.pdfDoc.numPages) { state.pageNum++; renderPage(state.pageNum); } }
export function zoomIn() { state.userZoomed = true; state.pdfScale += 0.25; renderPage(state.pageNum); }
export function zoomOut() { if (state.pdfScale > 0.5) { state.userZoomed = true; state.pdfScale -= 0.25; renderPage(state.pageNum); } }

// --- 정답 해설 뷰어 로직 ---

export function renderAnswerPage(num) {
    if (!state.answerKeyPdfDoc) return;
    state.answerKeyPdfDoc.getPage(num).then((page) => {
        const canvas = document.getElementById('answer-pdf-canvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({scale: state.answerPdfScale});
        
        const outputScale = window.devicePixelRatio || 2;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        page.render({ canvasContext: ctx, transform: transform, viewport: viewport });
        document.getElementById('ans_page_num_input').value = num;
    });
}

export function jumpToAnswerPage(val) {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > state.answerKeyPdfDoc.numPages) num = state.answerKeyPdfDoc.numPages;
    if (state.answerPageNum !== num) {
        state.answerPageNum = num;
        renderAnswerPage(state.answerPageNum);
    } else {
        document.getElementById('ans_page_num_input').value = state.answerPageNum;
    }
}

export function prevAnswerPage() { if (state.answerPageNum > 1) { state.answerPageNum--; renderAnswerPage(state.answerPageNum); } }
export function nextAnswerPage() { if (state.answerPageNum < state.answerKeyPdfDoc.numPages) { state.answerPageNum++; renderAnswerPage(state.answerPageNum); } }
export function zoomInAnswer() { state.answerPdfScale += 0.25; renderAnswerPage(state.answerPageNum); }
export function zoomOutAnswer() { if (state.answerPdfScale > 0.5) { state.answerPdfScale -= 0.25; renderAnswerPage(state.answerPageNum); } }

export function showOfficialAnswer() {
    if (!state.answerKeyPdfDoc) {
        return showToast("정답 해설지 PDF가 아직 로드되지 않았습니다.", "error");
    }
    document.getElementById('ans_page_count').textContent = state.answerKeyPdfDoc.numPages;
    document.getElementById('answer-modal').classList.remove('hidden');
    
    if (!state.answerPageNum) state.answerPageNum = 1;
    renderAnswerPage(state.answerPageNum);
}
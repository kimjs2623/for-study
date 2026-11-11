// shared/js/main.js

import { state } from './state.js';
import { initUI, toggleDarkMode, toggleSidebar, toggleFullScreen, renderProgressUI } from './ui.js';
import { loadGlobalAnswerKey, prevPage, nextPage, zoomIn, zoomOut, jumpToPage, showOfficialAnswer, prevAnswerPage, nextAnswerPage, zoomInAnswer, zoomOutAnswer, jumpToAnswerPage, loadMaterial } from './pdfCore.js';
import { scanGitHub, filterFiles, autoFillWorkName, findAndGoToWork, findAndGoToWorkByString, autoFillPromptWorkName } from './search.js';
import { submitOMR, editSubmission, deleteSubmission, renderCommunityRecords, updateCommunityWorks, onWeekChange, updateGlobalWeeks } from './firebase.js';
import { updateQAWorksDropdown, setQAWork, promptQAWork, confirmPromptNewQAWork, confirmEditQAWork, deleteQAWork, submitQAQuestion, deleteQAQuestion, submitQAAnswer, editQAAnswer, requestAIFeedback, submitMockAnswer, generateMockExam, updateMockView, editMockAnswer, deleteMockExam, renderQAQuestions, toggleEditQAQuestion, saveEditedQAQuestion } from './aiService.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, onSnapshot, doc, query, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function setMode(mode) {
    state.mode = mode;
    ['omr', 'community', 'qa', 'mock'].forEach(m => {
        const el = document.getElementById(`view-${m}`);
        if(el) el.classList.toggle('hidden', m !== mode);
        const tab = document.getElementById(`tab-${m}`);
        if(tab) {
            if(m === mode) { tab.classList.add('tab-active'); tab.classList.remove('text-slate-500'); }
            else { tab.classList.remove('tab-active'); tab.classList.add('text-slate-500'); }
        }
    });
    
    document.getElementById('week-selector-bar').classList.toggle('hidden', mode === 'qa' || mode === 'mock');

    const sidebar = document.getElementById('library-sidebar');
    const pdfSec = document.getElementById('pdf-section');
    const rightPanel = document.getElementById('right-panel');
    
    if (sidebar && pdfSec && rightPanel) {
        if (mode === 'mock') {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex');
            pdfSec.classList.add('hidden');
            pdfSec.classList.remove('flex');
            rightPanel.classList.remove('lg:w-[480px]');
            rightPanel.classList.add('flex-1', 'max-w-4xl', 'mx-auto');
        } else {
            if (state.sidebarOpen) {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('flex');
            }
            pdfSec.classList.remove('hidden');
            pdfSec.classList.add('flex');
            rightPanel.classList.add('lg:w-[480px]');
            rightPanel.classList.remove('flex-1', 'max-w-4xl', 'mx-auto');
        }
    }

    if(mode === 'community') renderCommunityRecords();
    if(mode === 'qa') updateQAWorksDropdown(); 
    if(mode === 'mock') updateMockView();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function bindStaticEventListeners() {
    document.getElementById('dark-mode-btn')?.addEventListener('click', toggleDarkMode);
    document.getElementById('tab-omr')?.addEventListener('click', () => setMode('omr'));
    document.getElementById('tab-community')?.addEventListener('click', () => setMode('community'));
    document.getElementById('tab-qa')?.addEventListener('click', () => setMode('qa'));
    document.getElementById('tab-mock')?.addEventListener('click', () => setMode('mock'));

    document.getElementById('refresh-files-btn')?.addEventListener('click', scanGitHub);
    document.getElementById('file-search')?.addEventListener('input', filterFiles);

    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullScreen);
    document.getElementById('exit-fullscreen-fab')?.addEventListener('click', toggleFullScreen);
    document.getElementById('pdf-search-work')?.addEventListener('keypress', (e) => { if(e.key==='Enter') findAndGoToWork('pdf-search-work') });
    document.getElementById('pdf-search-btn')?.addEventListener('click', () => findAndGoToWork('pdf-search-work'));
    document.getElementById('pdf-prev-btn')?.addEventListener('click', prevPage);
    document.getElementById('pdf-next-btn')?.addEventListener('click', nextPage);
    document.getElementById('pdf-zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('pdf-zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('page_num_input')?.addEventListener('change', (e) => jumpToPage(e.target.value));

    document.getElementById('week-select')?.addEventListener('change', onWeekChange);
    document.getElementById('omr-work-num')?.addEventListener('input', autoFillWorkName);
    document.getElementById('omr-search-btn')?.addEventListener('click', () => findAndGoToWork('omr-work-name'));
    document.getElementById('submit-omr-btn')?.addEventListener('click', submitOMR);

    document.getElementById('comm-week-filter')?.addEventListener('change', updateCommunityWorks);
    document.getElementById('comm-work-filter')?.addEventListener('change', renderCommunityRecords);
    document.getElementById('show-answer-comm-btn')?.addEventListener('click', showOfficialAnswer);

    document.getElementById('ans-prev-btn')?.addEventListener('click', prevAnswerPage);
    document.getElementById('ans-next-btn')?.addEventListener('click', nextAnswerPage);
    document.getElementById('ans-zoom-in-btn')?.addEventListener('click', zoomInAnswer);
    document.getElementById('ans-zoom-out-btn')?.addEventListener('click', zoomOutAnswer);
    document.getElementById('ans_page_num_input')?.addEventListener('change', (e) => jumpToAnswerPage(e.target.value));
    document.getElementById('close-answer-modal-btn')?.addEventListener('click', () => document.getElementById('answer-modal').classList.add('hidden'));

    document.getElementById('qa-week-filter')?.addEventListener('change', updateQAWorksDropdown);
    document.getElementById('qa-work-filter')?.addEventListener('change', (e) => setQAWork(e.target.value));
    document.getElementById('qa-new-work-btn')?.addEventListener('click', () => promptQAWork(false));
    document.getElementById('qa-work-edit-btn')?.addEventListener('click', () => promptQAWork(true));
    document.getElementById('qa-work-delete-btn')?.addEventListener('click', deleteQAWork);
    document.getElementById('qa-find-work-btn')?.addEventListener('click', () => findAndGoToWorkByString(state.qaCurrentWork));
    document.getElementById('submit-qa-q-btn')?.addEventListener('click', submitQAQuestion);
    
    document.getElementById('prompt-num-input')?.addEventListener('input', autoFillPromptWorkName);
    
    document.getElementById('cancel-delete-btn')?.addEventListener('click', () => document.getElementById('delete-modal').classList.add('hidden'));
    document.getElementById('cancel-prompt-btn')?.addEventListener('click', () => document.getElementById('prompt-modal').classList.add('hidden'));
    document.getElementById('prompt-confirm-btn')?.addEventListener('click', () => {
        const title = document.getElementById('prompt-modal-title').innerText;
        if(title.includes("수정")) confirmEditQAWork();
        else confirmPromptNewQAWork();
    });

    document.getElementById('mock-week-filter')?.addEventListener('change', updateMockView);
    document.getElementById('generate-mock-btn')?.addEventListener('click', generateMockExam);
}

function exposeGlobalApp() {
    window.StudyApp = {
        loadMaterial, findAndGoToWorkByString, editSubmission, deleteSubmission,
        submitQAAnswer, editQAAnswer, requestAIFeedback, deleteQAQuestion,
        submitMockAnswer, editMockAnswer, deleteMockExam, setMode,
        toggleEditQAQuestion, saveEditedQAQuestion, renderQAQuestions, toggleQAForm
    };
}

function startFirebaseListeners() {
    onSnapshot(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'studyInfo', 'schedule'), (snap) => {
        state.docWeeks = []; state.scheduleWeeks = []; 
        if (snap.exists()) {
            const data = snap.data();
            const subjectData = data[state.subjectName];
            if(subjectData && subjectData.weeks && Array.isArray(subjectData.weeks)) {
                state.scheduleWeeks = subjectData.weeks;
                subjectData.weeks.forEach(w => {
                    let val = w.weekNum || w.week;
                    if(val !== undefined && val !== null) {
                        val = String(val).replace(/[^0-9]/g, '');
                        if (val) state.docWeeks.push(val);
                    }
                });
            }
        }
        updateGlobalWeeks();
        renderProgressUI(); 
    });

    onSnapshot(query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'submissions')), (snap) => {
        const subs = []; snap.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
        subs.sort((a, b) => b.timestamp - a.timestamp);
        state.allSubmissions = subs; 
        updateGlobalWeeks();
    });

    onSnapshot(query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions')), (snap) => {
        const qs = []; snap.forEach(doc => qs.push({ id: doc.id, ...doc.data() }));
        state.qaQuestions = qs.sort((a,b) => b.timestamp - a.timestamp);
        updateQAWorksDropdown();
        if(state.mode === 'qa') renderQAQuestions();
    });

    onSnapshot(query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_answers')), (snap) => {
        const ans = []; snap.forEach(doc => ans.push({ id: doc.id, ...doc.data() }));
        state.qaAnswers = ans;
        if(state.mode === 'qa') renderQAQuestions();
    });

    onSnapshot(query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_exams')), (snap) => {
        const mocks = []; snap.forEach(doc => mocks.push({ id: doc.id, ...doc.data() }));
        state.mockExams = mocks.sort((a, b) => b.timestamp - a.timestamp);
        if(state.mode === 'mock') updateMockView();
    });

    onSnapshot(query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_answers')), (snap) => {
        const ans = []; snap.forEach(doc => ans.push({ id: doc.id, ...doc.data() }));
        state.mockAnswers = ans.sort((a, b) => b.timestamp - a.timestamp);
        if(state.mode === 'mock') updateMockView();
    });

    onSnapshot(doc(state.db, 'artifacts', state.appId, 'users', state.user.uid, 'profile', 'data'), (snap) => {
        if(snap.exists()) {
            const data = snap.data();
            state.userName = data.name;
            state.myTodayTargets = data.todayTargets || {}; 
            renderProgressUI(); 
        }
    });

    onSnapshot(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'studyInfo', 'progress'), (snap) => {
        if(snap.exists()) state.progressData = snap.data();
        else state.progressData = {};
        renderProgressUI(); 
    });
}

export function initApp(config) {
    state.subjectName = config.SUBJECT_NAME;
    state.githubConfig = config.GITHUB_CONFIG;
    state.workIndex = config.WORK_INDEX;
    state.fileStartPage = config.FILE_START_PAGE;
    state.fileOffsetMap = config.FILE_OFFSET_MAP;
    state.dayMap = config.DAY_MAP;

    exposeGlobalApp();
    bindStaticEventListeners();

    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "AIzaSyD2jQ_ElbhPq2ycvS_FTu3Uel5FFLoC8oA", projectId: "study-99725", appId: "1:850626154259:web:c3307473b7fbb09d9554e6" };
    const appAuth = initializeApp(firebaseConfig);
    state.auth = getAuth(appAuth);
    state.db = getFirestore(appAuth);

    onAuthStateChanged(state.auth, async (user) => {
        if (user) { 
            state.user = user; 
            initUI(); 
            scanGitHub(); 
            loadGlobalAnswerKey(); 
            startFirebaseListeners();
            setMode('omr'); 
        }
    });

    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) signInWithCustomToken(state.auth, __initial_auth_token);
        else signInAnonymously(state.auth);
    } catch(e) { console.error("Auth init error:", e); }
    
}

export function toggleQAForm(forceClose = false) {
    const body = document.getElementById('qa-new-form-body');
    const chevron = document.getElementById('qa-form-chevron');
    if (!body || !chevron) return;
    
    if (forceClose || !body.classList.contains('hidden')) {
        body.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    } else {
        body.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
        document.getElementById('qa-new-q-text').focus();
    }
}

// ✨ [추가된 부분] 전체 신규 로직 ✨

// 1. 사다리타기(랜덤 배정) 실행 함수
// ✨ [수정된 부분] window.StudyApp 안전 방어 코드 적용 ✨
window.StudyApp = window.StudyApp || {};

// 1. 사다리타기(랜덤 배정) 실행 함수
window.StudyApp.runQALadder = async function() {
    const week = document.getElementById('qa-week-filter').value;
    if (!week) return alert('주차를 먼저 선택해주세요.');

    let members = ["김국어", "이교육", "박문학"]; 
    if (members.length < 3) return alert('사다리를 돌리려면 스터디원이 최소 3명 이상이어야 합니다.');

    if (confirm(`이번 주(${week}) 출제 파트를 랜덤 배정하시겠습니까?`)) {
        let shuffled = [...members].sort(() => Math.random() - 0.5);
        const parts = ['Day 1, 2', 'Day 3, 4', 'Day 5, 6'];
        const assignment = {};
        
        for (let i = 0; i < 3; i++) {
            assignment[shuffled[i]] = parts[i];
        }

        if (!state.qaAssignments) state.qaAssignments = {};
        state.qaAssignments[week] = assignment;
        
        alert('🎲 배정이 완료되었습니다!');
        window.StudyApp.updateQABanner(week);
        window.StudyApp.showQAAssignments();
    }
};

// 2. 내 배정 상태를 배너에 업데이트
window.StudyApp.updateQABanner = function(week) {
    const banner = document.getElementById('qa-assignment-banner');
    const bannerText = document.getElementById('qa-my-assignment');
    
    if (!banner || !bannerText) return;
    if (!week) return banner.classList.add('hidden');
    banner.classList.remove('hidden');

    const assignment = state.qaAssignments ? state.qaAssignments[week] : null;
    const myName = state.user?.displayName || '김진성';
    
    if (assignment) {
        const myPart = assignment[myName];
        if (myPart) {
            bannerText.innerHTML = `내 담당 파트: <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black ml-1">${myPart}</span>`;
        } else {
            bannerText.innerHTML = `<span class="text-slate-400">이번 주 담당 파트가 없습니다 (출제 면제)</span>`;
        }
    } else {
        bannerText.innerHTML = `<span class="text-rose-500 font-bold">아직 사다리타기가 진행되지 않았습니다.</span>`;
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// 3. 할당 결과 전체 보기 모달 오픈
window.StudyApp.showQAAssignments = function() {
    const week = document.getElementById('qa-week-filter').value;
    if (!week) return alert('주차를 먼저 선택해주세요.');

    const assignment = state.qaAssignments ? state.qaAssignments[week] : null;
    if (!assignment) return alert('이번 주차는 아직 출제 파트가 배정되지 않았습니다.');

    const container = document.getElementById('ladder-result-container');
    if (!container) return;
    
    container.innerHTML = Object.entries(assignment).map(([name, part]) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <span class="text-xs font-bold text-slate-700 flex items-center">
                <i data-lucide="user" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i> ${name}
            </span>
            <span class="text-[11px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">
                ${part}
            </span>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const modal = document.getElementById('ladder-modal');
    if (modal) modal.classList.remove('hidden');
};

// 모의 출제 주차 변경 시 배너 업데이트 이벤트 바인딩
const qaWeekFilterEl = document.getElementById('qa-week-filter');
if (qaWeekFilterEl) {
    qaWeekFilterEl.addEventListener('change', (e) => {
        const selectedWeek = e.target.value;
        if (window.StudyApp && window.StudyApp.updateQABanner) {
            window.StudyApp.updateQABanner(selectedWeek);
        }
    });
}
// 2. 내 배정 상태를 배너에 업데이트
window.StudyApp.updateQABanner = function(week) {
    const banner = document.getElementById('qa-assignment-banner');
    const bannerText = document.getElementById('qa-my-assignment');
    
    if (!week) return banner.classList.add('hidden');
    banner.classList.remove('hidden');

    const assignment = state.qaAssignments ? state.qaAssignments[week] : null;
    const myName = state.user.displayName;
    
    if (assignment) {
        const myPart = assignment[myName];
        if (myPart) {
            bannerText.innerHTML = `내 담당 파트: <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black ml-1">${myPart}</span>`;
        } else {
            bannerText.innerHTML = `<span class="text-slate-400">이번 주 담당 파트가 없습니다 (출제 면제)</span>`;
        }
    } else {
        bannerText.innerHTML = `<span class="text-rose-500 font-bold">아직 사다리타기가 진행되지 않았습니다.</span>`;
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// 3. 할당 결과 전체 보기 모달 오픈
window.StudyApp.showQAAssignments = function() {
    const week = document.getElementById('qa-week-filter').value;
    if (!week) return alert('주차를 먼저 선택해주세요.');

    const assignment = state.qaAssignments ? state.qaAssignments[week] : null;
    if (!assignment) return alert('이번 주차는 아직 출제 파트가 배정되지 않았습니다.');

    const container = document.getElementById('ladder-result-container');
    container.innerHTML = Object.entries(assignment).map(([name, part]) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <span class="text-xs font-bold text-slate-700 flex items-center">
                <i data-lucide="user" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i> ${name}
            </span>
            <span class="text-[11px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">
                ${part}
            </span>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('ladder-modal').classList.remove('hidden');
};

// ✨ [추가] 모의 출제 주차 변경 시 배너(담당 파트) 업데이트 이벤트
const qaWeekFilter = document.getElementById('qa-week-filter');
if (qaWeekFilter) {
    qaWeekFilter.addEventListener('change', (e) => {
        const selectedWeek = e.target.value;
        if (window.StudyApp && window.StudyApp.updateQABanner) {
            window.StudyApp.updateQABanner(selectedWeek);
        }
    });
}
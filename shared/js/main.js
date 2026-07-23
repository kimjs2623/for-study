// shared/js/main.js

import { state } from './state.js';
import { initUI, toggleDarkMode, toggleSidebar, toggleFullScreen, renderProgressUI } from './ui.js';
import { loadGlobalAnswerKey, prevPage, nextPage, zoomIn, zoomOut, jumpToPage, showOfficialAnswer, prevAnswerPage, nextAnswerPage, zoomInAnswer, zoomOutAnswer, jumpToAnswerPage, loadMaterial } from './pdfCore.js';
import { scanGitHub, filterFiles, autoFillWorkName, findAndGoToWork, findAndGoToWorkByString, autoFillPromptWorkName } from './search.js';
import { submitOMR, editSubmission, deleteSubmission, renderCommunityRecords, updateCommunityWorks, onWeekChange, updateGlobalWeeks } from './firebase.js';
import { updateQAWorksDropdown, setQAWork, promptQAWork, confirmPromptNewQAWork, confirmEditQAWork, deleteQAWork, submitQAQuestion, deleteQAQuestion, submitQAAnswer, editQAAnswer, requestAIFeedback, submitMockAnswer, generateMockExam, updateMockView, editMockAnswer, deleteMockExam, renderQAQuestions } from './aiService.js';

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
        submitMockAnswer, editMockAnswer, deleteMockExam, setMode 
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
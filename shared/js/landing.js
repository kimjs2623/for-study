// shared/js/landing.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 🌟 1. 각 과목의 config.js에서 진도 데이터(DAY_MAP)를 불러와 하나로 합칩니다.
// (※ 01 폴더에도 config.js가 반드시 존재하고 DAY_MAP을 export 해야 합니다.)
import { DAY_MAP as map01 } from '../../01/config.js';
import { DAY_MAP as map02 } from '../../02/config.js';
import { DAY_MAP as map03 } from '../../03/config.js';

// 🚨 2. 환경 설정 변수 (추후 유지보수 시 여기서만 수정하세요)
const ADMIN_ID = "kimjs2623"; 
const EXAM_DATE_STRING = '2027-11-20T00:00:00';

const DAY_MAPS = {
    '고전시가': map01,
    '현대시': map02,
    '고전산문': map03
};

const state = {
    isDarkMode: false, user: null, appAccount: null, allMembers: [],
    currentScheduleTab: '고전시가',
    scheduleData: { '고전시가': { weeks: [] }, '현대시': { weeks: [] }, '고전산문': { weeks: [] } },
    isEditingSchedule: false, editScheduleForm: [],
    
    pickerMode: 'schedule',
    pickerEditingId: null, 
    tempSelectedDays: [], 
    chatMessages: [],
    
    todos: {}, activeTodoTab: '',
    progressData: {},

    finesData: { records: [] }, isAddingFine: false, newFine: { memberName: '', reason: '지각', amount: 1000 },
    driveFiles: [], authMode: 'login'
};

const els = {
    loading: document.getElementById('loading-screen'), auth: document.getElementById('auth-screen'),
    dashboard: document.getElementById('dashboard-screen'), authNameContainer: document.getElementById('auth-name-container'),
    authName: document.getElementById('auth-name'), authId: document.getElementById('auth-id'),
    authPw: document.getElementById('auth-pw'), authSubmitText: document.getElementById('auth-submit-text'),
    authSubmitIcon: document.getElementById('auth-submit-icon'), tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'), dDayDisplay: document.getElementById('d-day-display'),
    navUsername: document.getElementById('nav-username'), scheduleContainer: document.getElementById('schedule-container'),
    finesContainer: document.getElementById('fines-container'), driveContainer: document.getElementById('drive-files-container'), 
    toast: document.getElementById('toast-container'), profileModal: document.getElementById('profile-modal'), 
    editProfileName: document.getElementById('edit-profile-name'), editProfilePw: document.getElementById('edit-profile-pw'),
    dayPickerModal: document.getElementById('day-picker-modal'), dayPickerGrid: document.getElementById('day-picker-grid'),
    dayPickerSubtitle: document.getElementById('day-picker-subtitle'), chatContainer: document.getElementById('chat-container'),
    todosContainer: document.getElementById('todos-container'), adminPanel: document.getElementById('admin-panel'),
    adminMemberList: document.getElementById('admin-member-list'), headerProgressContainer: document.getElementById('header-progress-container')
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-xl shadow-lg border text-sm font-bold animate-fade-in-down flex items-center ${type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`;
    toast.textContent = message; els.toast.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyD2jQ_ElbhPq2ycvS_FTu3Uel5FFLoC8oA", authDomain: "study-99725.firebaseapp.com",
    projectId: "study-99725", storageBucket: "study-99725.firebasestorage.app", messagingSenderId: "850626154259", appId: "1:850626154259:web:c3307473b7fbb09d9554e6"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-study-app';
let firebaseApp, auth, db;
try { firebaseApp = initializeApp(firebaseConfig); auth = getAuth(firebaseApp); db = getFirestore(firebaseApp); } catch(e) { console.warn("Firebase Init Waiting..."); }

async function init() {
    const examDate = new Date(EXAM_DATE_STRING);
    const diffDays = Math.ceil(Math.abs(examDate - new Date()) / (1000 * 60 * 60 * 24));
    els.dDayDisplay.textContent = `D-${diffDays}`;

    state.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', state.isDarkMode); updateDarkModeIcon();

    try {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
    else await signInAnonymously(auth);
    } catch (error) { showToast("인증 오류", "error"); }

    onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user) setupListeners(user.uid);
    else updateView();
    });
}

function setupListeners(uid) {
    onSnapshot(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), (snap) => {
    if (snap.exists() && snap.data().appAccountId) { state.appAccount = snap.data(); } 
    else { state.appAccount = null; } updateView();
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => {
    state.allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
    if(state.appAccount && !state.activeTodoTab) state.activeTodoTab = state.appAccount.name;
    renderTodos(); renderFines(); renderAdminPanel();
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sharedDrive'), (snap) => {
    state.driveFiles = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp); renderDriveFiles();
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'schedule'), (snap) => {
    if (snap.exists()) {
        const data = snap.data();
        state.scheduleData = { 
            '고전시가': data['고전시가'] || { weeks: [] }, 
            '현대시': data['현대시'] || { weeks: [] },
            '고전산문': data['고전산문'] || { weeks: [] }
        };
        if(data.weeks && !data['고전시가']) { state.scheduleData['고전시가'].weeks = data.weeks; } 
    } else { 
        state.scheduleData = { '고전시가': { weeks: [] }, '현대시': { weeks: [] }, '고전산문': { weeks: [] } }; 
    }
    renderSchedule();
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'progress'), (snap) => {
    if (snap.exists()) state.progressData = snap.data();
    renderTodos();
    renderHeaderProgress();
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'chatMessages'), (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    msgs.sort((a,b) => a.timestamp - b.timestamp);
    state.chatMessages = msgs;
    renderChat();
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'todos'), (snap) => { if (snap.exists()) state.todos = snap.data(); renderTodos(); });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'fines'), (snap) => { if (snap.exists()) state.finesData = snap.data(); renderFines(); });
}

function updateView() {
    els.loading.classList.add('hidden');
    if (state.user && !state.appAccount) { els.auth.classList.remove('hidden'); els.dashboard.classList.add('hidden'); } 
    else if (state.user && state.appAccount) {
    els.auth.classList.add('hidden'); els.dashboard.classList.remove('hidden'); els.navUsername.textContent = state.appAccount.name;
    renderSchedule(); renderChat(); renderFines(); renderDriveFiles(); renderTodos(); renderHeaderProgress(); lucide.createIcons();
    }
}

function checkIsAdmin() {
    return state.appAccount && state.appAccount.appAccountId === ADMIN_ID;
}

window.app = {
    toggleDarkMode: () => { state.isDarkMode = !state.isDarkMode; document.documentElement.classList.toggle('dark', state.isDarkMode); updateDarkModeIcon(); },
    setAuthMode: (mode) => {
    state.authMode = mode; const isLogin = mode === 'login';
    els.tabLogin.className = isLogin ? "flex-1 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm" : "flex-1 py-2 text-sm font-bold text-slate-500 hover:text-slate-700";
    els.tabSignup.className = !isLogin ? "flex-1 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm" : "flex-1 py-2 text-sm font-bold text-slate-500 hover:text-slate-700";
    els.authNameContainer.classList.toggle('hidden', isLogin); els.authSubmitText.textContent = isLogin ? '로그인' : '가입하고 시작하기'; els.authSubmitIcon.setAttribute('data-lucide', isLogin ? 'log-in' : 'user-plus'); lucide.createIcons();
    },
    logout: async () => { await setDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'profile', 'data'), { appAccountId: null, name: null }); state.appAccount = null; updateView(); },
    
    openProfileModal: () => { 
        els.editProfileName.value = state.appAccount.name; 
        els.editProfilePw.value = ''; 
        els.profileModal.classList.remove('hidden'); 
        renderAdminPanel();
        lucide.createIcons(); 
    },
    closeProfileModal: () => { els.profileModal.classList.add('hidden'); },
    updateProfile: async () => {
    const newName = els.editProfileName.value.trim(), newPw = els.editProfilePw.value.trim();
    if(!newName) return showToast('이름을 입력해주세요.', 'error');
    try {
        const updateData = { name: newName }; if(newPw) updateData.password = newPw;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', state.appAccount.appAccountId), updateData);
        await updateDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'profile', 'data'), { name: newName });
        showToast('정보가 수정되었습니다.', 'success'); app.closeProfileModal();
    } catch(e) { showToast('수정 실패', 'error'); }
    },
    withdrawAccount: async () => {
    if(!confirm('정말 탈퇴하시겠습니까? 데이터가 모두 삭제됩니다.')) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', state.appAccount.appAccountId));
        await deleteDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'profile', 'data'));
        showToast('탈퇴가 완료되었습니다.', 'success'); state.appAccount = null; app.closeProfileModal(); updateView();
    } catch(e) { showToast('탈퇴 실패', 'error'); }
    },
    
    adminKickMember: async (targetId, targetName) => {
        if(!checkIsAdmin()) return;
        if(!confirm(`정말 '${targetName}' 선생님을 명단에서 삭제(강제탈퇴)하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', targetId));
            showToast(`${targetName} 님이 명단에서 삭제되었습니다.`, 'success');
        } catch(e) { showToast('삭제 실패', 'error'); }
    },

    handleDriveUpload: (input) => {
    const file = input.files[0]; if(!file) return;
    if(file.size > 1024 * 1024 * 2) return showToast('2MB 이하만 가능합니다.', 'error');
    showToast('업로드 중...', 'info'); const reader = new FileReader();
    reader.onloadend = async () => {
        try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sharedDrive'), {
            fileName: file.name, fileType: file.type || 'application/octet-stream', base64: reader.result.split(',')[1], size: file.size,
            uploadedBy: state.appAccount?.name || '익명', date: new Date().toLocaleDateString('ko-KR'), timestamp: Date.now()
        }); showToast('업로드 완료!', 'success');
        } catch(e) { showToast('업로드 실패', 'error'); } finally { input.value = ''; }
    }; reader.readAsDataURL(file);
    },
    downloadDriveFile: (id) => {
    const file = state.driveFiles.find(f => f.id === id); if(!file) return;
    const link = document.createElement('a'); link.href = `data:${file.fileType};base64,${file.base64}`; link.download = file.fileName;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    },
    deleteDriveFile: async (id) => { if(confirm('삭제하시겠습니까?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sharedDrive', id)); },

    switchScheduleTab: (dir) => {
        const tabs = ['고전시가', '현대시', '고전산문'];
        let idx = tabs.indexOf(state.currentScheduleTab);
        if (dir === 'next') idx = (idx + 1) % tabs.length;
        else idx = (idx - 1 + tabs.length) % tabs.length;
        state.currentScheduleTab = tabs[idx];
        if (state.isEditingSchedule) {
            state.editScheduleForm = JSON.parse(JSON.stringify(state.scheduleData[tabs[idx]]?.weeks || []));
        }
        renderSchedule();
    },
    toggleEditSchedule: () => { 
        state.isEditingSchedule = !state.isEditingSchedule; 
        const subj = state.currentScheduleTab;
        if(state.isEditingSchedule) state.editScheduleForm = JSON.parse(JSON.stringify(state.scheduleData[subj]?.weeks || [])); 
        renderSchedule(); 
    },
    addScheduleWeek: () => { 
        const subj = state.currentScheduleTab;
        state.editScheduleForm.push({ id: Date.now(), weekNum: state.editScheduleForm.length + 1, meetDate: '', area: subj, days: [], isCompleted: false }); 
        renderSchedule(); 
    },
    removeScheduleWeek: (id) => { 
        state.editScheduleForm = state.editScheduleForm.filter(w => w.id !== id);
        state.editScheduleForm.sort((a,b) => a.weekNum - b.weekNum).forEach((w, i) => w.weekNum = i + 1); 
        renderSchedule(); 
    },
    updateScheduleField: (id, field, val) => { 
        const wk = state.editScheduleForm.find(w => w.id === id);
        if(wk) wk[field] = val; 
    },
    
    openDayPickerForTodo: () => {
        state.pickerMode = 'todo';
        state.pickerEditingId = null;
        state.tempSelectedDays = [];
        els.dayPickerSubtitle.textContent = `출제 범위로 할당할 Day를 터치해서 모두 고르세요.`;
        els.dayPickerModal.classList.remove('hidden');
        renderDayPickerGrid();
    },
    openDayPicker: (id) => {
        state.pickerMode = 'schedule';
        state.pickerEditingId = id;
        const wk = state.editScheduleForm.find(w => w.id === id);
        state.tempSelectedDays = [...(wk.days || [])];
        els.dayPickerSubtitle.textContent = `[${state.currentScheduleTab}] ${wk.weekNum}주차에 진행할 Day를 골라주세요.`;
        els.dayPickerModal.classList.remove('hidden');
        renderDayPickerGrid();
    },
    closeDayPicker: () => { els.dayPickerModal.classList.add('hidden'); state.pickerEditingId = null; },
    toggleDaySelection: (dayNum) => {
        if(state.tempSelectedDays.includes(dayNum)) {
            state.tempSelectedDays = state.tempSelectedDays.filter(d => d !== dayNum);
        } else {
            state.tempSelectedDays.push(dayNum);
        }
        renderDayPickerGrid();
    },
    confirmDaySelection: async () => {
        state.tempSelectedDays.sort((a,b) => a - b);
        if(state.pickerMode === 'schedule' && state.pickerEditingId !== null) {
            const wk = state.editScheduleForm.find(w => w.id === state.pickerEditingId);
            if(wk) wk.days = [...state.tempSelectedDays];
            renderSchedule();
        } else if (state.pickerMode === 'todo') {
            if(state.tempSelectedDays.length === 0) return showToast('할당할 Day를 1개 이상 선택해주세요.', 'error');
            const text = getRangeText(state.tempSelectedDays);
            const finalDesc = `[출제] ${text} 문제 생성`;
            const tasks = state.todos[state.activeTodoTab] || [];
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'todos'), { 
                ...state.todos, 
                [state.activeTodoTab]: [...tasks, { id: Date.now(), type: 'assign', desc: finalDesc, done: false }] 
            });
            showToast('출제 할당이 명단에 추가되었습니다.', 'success');
        }
        app.closeDayPicker();
    },
    toggleWeekCompletion: async (id) => {
        const subj = state.currentScheduleTab;
        const updatedData = { ...state.scheduleData };
        if(!updatedData[subj]) updatedData[subj] = { weeks: [] };
        const weeks = [...(updatedData[subj].weeks || [])];
        const wk = weeks.find(w => w.id === id);
        if(wk) {
            wk.isCompleted = !wk.isCompleted;
            updatedData[subj].weeks = weeks;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'schedule'), updatedData);
            showToast(wk.isCompleted ? '✅ 진도가 완료 처리되었습니다!' : '진도 완료가 취소되었습니다.');
        }
    },
    saveSchedule: async () => { 
        const subj = state.currentScheduleTab;
        const updatedData = { ...state.scheduleData };
        if(!updatedData[subj]) updatedData[subj] = { weeks: [] };
        state.editScheduleForm.sort((a,b) => a.weekNum - b.weekNum);
        updatedData[subj].weeks = state.editScheduleForm;

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'schedule'), updatedData);
        state.isEditingSchedule = false; 
        renderSchedule(); 
        showToast(`[${subj}] 주차별 일정이 저장되었습니다.`, 'success'); 
    },

    setActiveTodoTab: (name) => { state.activeTodoTab = name; renderTodos(); },
    toggleTodoTask: async (taskId) => {
    if(state.activeTodoTab !== state.appAccount.name && !checkIsAdmin()) return;
    const updated = state.todos[state.activeTodoTab].map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'todos'), { ...state.todos, [state.activeTodoTab]: updated });
    },
    deleteTodoTask: async (taskId, event) => {
    event.stopPropagation(); 
    if(state.activeTodoTab !== state.appAccount.name && !checkIsAdmin()) return;
    const updated = state.todos[state.activeTodoTab].filter(t => t.id !== taskId);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'todos'), { ...state.todos, [state.activeTodoTab]: updated });
    },
    
    updateProgress: async () => {
        const subj = document.getElementById('prog-subj-input').value;
        const num = document.getElementById('prog-num-input').value;
        if(num === '' || Number(num) < 0) return showToast('올바른 작품 번호를 입력하세요.', 'error');
        
        const currentData = { ...state.progressData };
        if(!currentData[state.appAccount.name]) currentData[state.appAccount.name] = { '고전시가': 0, '현대시': 0, '고전산문': 0 };
        currentData[state.appAccount.name][subj] = Number(num);
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'progress'), currentData);
        showToast(`${subj} 진도가 업데이트 되었습니다. (No.${num})`, 'success');
    },

    submitChat: async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;
        input.value = '';
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chatMessages'), {
                text, userName: state.appAccount.name, timestamp: Date.now()
            });
        } catch(err) { showToast('메시지 전송 실패', 'error'); }
    },

    toggleAddingFine: () => { state.isAddingFine = !state.isAddingFine; if(state.isAddingFine) state.newFine = { memberName: '', reason: '', amount: 1000 }; renderFines(); },
    updateFineField: (field, val) => { state.newFine[field] = val; },
    submitFine: async (e) => {
    e.preventDefault(); if(!state.newFine.memberName) return;
    const records = state.finesData.records || [];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'fines'), { records: [{ id: Date.now(), ...state.newFine, amount: Number(state.newFine.amount), date: new Date().toLocaleDateString('ko-KR'), isPaid: false }, ...records] });
    state.isAddingFine = false; showToast('추가되었습니다.', 'success');
    },
    toggleFinePaid: async (id) => { const updated = state.finesData.records.map(r => r.id === id ? { ...r, isPaid: !r.isPaid } : r); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'fines'), { records: updated }); },
    deleteFine: async (id) => { const updated = state.finesData.records.filter(r => r.id !== id); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'studyInfo', 'fines'), { records: updated }); }
};

function updateDarkModeIcon() { const icon = document.getElementById('dark-mode-icon'); if(icon) { icon.setAttribute('data-lucide', state.isDarkMode ? 'sun' : 'moon'); lucide.createIcons(); } }

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = els.authId.value.trim(), pw = els.authPw.value.trim(), name = els.authName.value.trim();
    const btn = document.getElementById('auth-submit-btn'); btn.disabled = true;
    try {
    const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'members'));
    const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.authMode === 'signup') {
        if (members.some(m => m.id === id)) throw new Error('이미 사용 중인 아이디입니다.');
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { password: pw, name: name });
        await setDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'profile', 'data'), { appAccountId: id, name: name });
        state.appAccount = { appAccountId: id, name: name }; updateView();
    } else {
        const member = members.find(m => m.id === id && m.password === pw);
        if (member) {
        await setDoc(doc(db, 'artifacts', appId, 'users', state.user.uid, 'profile', 'data'), { appAccountId: member.id, name: member.name });
        state.appAccount = { appAccountId: member.id, name: member.name }; updateView();
        } else { throw new Error('아이디/비번 불일치'); }
    }
    } catch(err) { document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').classList.remove('hidden'); }
    finally { btn.disabled = false; }
});

function getDayStatus(dayNum) {
    const subj = state.currentScheduleTab;
    const weeks = state.isEditingSchedule ? state.editScheduleForm : (state.scheduleData[subj]?.weeks || []);
    for(let wk of weeks) {
        if(wk.days && wk.days.includes(dayNum)) {
            return { status: wk.isCompleted ? 'completed' : 'planned', weekNum: wk.weekNum };
        }
    }
    return { status: 'none' };
}

function getRangeText(daysArray) {
    if(!daysArray || daysArray.length === 0) return '진도 범위를 선택해주세요.';
    const sortedDays = [...daysArray].map(Number).sort((a, b) => a - b);
    const first = sortedDays[0];
    const last = sortedDays[sortedDays.length - 1];
    const currentMap = DAY_MAPS[state.currentScheduleTab] || DAY_MAPS['고전시가'];
    
    if (!currentMap[first-1] || !currentMap[last-1]) return `Day ${first}~${last} (데이터 오류)`;
    const minWorks = currentMap[first-1].split('-')[0];
    const maxWorks = currentMap[last-1].split('-')[1] || currentMap[last-1];
    if(first === last) return `Day ${first} (${minWorks}~${maxWorks}번)`;
    return `Day ${first}~${last} (${minWorks}~${maxWorks}번)`;
}

function renderHeaderProgress() {
    if(!els.headerProgressContainer || !state.appAccount) return;
    const myProg = state.progressData[state.appAccount.name] || { '고전시가': 0, '현대시': 0, '고전산문': 0 };
    els.headerProgressContainer.innerHTML = `
        <div class="flex space-x-4 sm:space-x-6 items-center justify-center w-full px-2">
            <div class="text-center">
                <p class="text-indigo-200 text-[10px] font-bold mb-1"><i data-lucide="book-open" class="w-3 h-3 inline pb-0.5"></i> 고전시가</p>
                <div class="text-xl sm:text-2xl font-black text-white">No.${myProg['고전시가'] || 0}</div>
            </div>
            <div class="w-px h-10 bg-white/20"></div>
            <div class="text-center">
                <p class="text-blue-200 text-[10px] font-bold mb-1"><i data-lucide="feather" class="w-3 h-3 inline pb-0.5"></i> 현대시</p>
                <div class="text-xl sm:text-2xl font-black text-white">No.${myProg['현대시'] || 0}</div>
            </div>
            <div class="w-px h-10 bg-white/20"></div>
            <div class="text-center">
                <p class="text-emerald-200 text-[10px] font-bold mb-1"><i data-lucide="book-open-check" class="w-3 h-3 inline pb-0.5"></i> 고전산문</p>
                <div class="text-xl sm:text-2xl font-black text-white">No.${myProg['고전산문'] || 0}</div>
            </div>
        </div>
    `;
    els.headerProgressContainer.classList.remove('hidden');
    lucide.createIcons();
}

function renderAdminPanel() {
    if(!els.adminPanel || !els.adminMemberList) return;
    if(checkIsAdmin()) {
        els.adminPanel.classList.remove('hidden');
        let html = '';
        state.allMembers.forEach(m => {
            const isMe = m.id === state.appAccount.appAccountId;
            html += `
            <div class="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div class="flex items-center">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 mr-2">${m.name}</span>
                    <span class="text-[9px] text-slate-400">ID: ${m.id}</span>
                </div>
                ${!isMe ? `<button onclick="app.adminKickMember('${m.id}', '${m.name}')" class="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-black transition-colors">강제탈퇴</button>` : `<span class="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">나 (스터디장)</span>`}
            </div>`;
        });
        els.adminMemberList.innerHTML = html;
    } else {
        els.adminPanel.classList.add('hidden');
    }
}

function renderDayPickerGrid() {
    let html = '';
    const currentMap = DAY_MAPS[state.currentScheduleTab] || DAY_MAPS['고전시가'];
    
    currentMap.forEach((range, i) => {
        const day = i + 1;
        const isSelected = state.tempSelectedDays.includes(day);
        const status = getDayStatus(day); 
        
        let classes = "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer";
        if(isSelected) {
            classes = "bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-105 transition-transform z-10";
        } else if(state.pickerMode === 'schedule' && status.status !== 'none') {
            const currentEditingWeekNum = state.editScheduleForm.find(w => w.id === state.pickerEditingId)?.weekNum;
            if (currentEditingWeekNum !== status.weekNum) {
                classes = "bg-slate-100 dark:bg-slate-900 text-slate-300 border-dashed cursor-not-allowed opacity-50";
            }
        }

        html += `
        <div onclick="${classes.includes('cursor-not-allowed') ? '' : `app.toggleDaySelection(${day})`}" 
                class="flex flex-col items-center py-2.5 rounded-xl border ${classes} transition-all select-none">
            <span class="text-[11px] font-black tracking-tighter">D${day < 10 ? '0'+day : day}</span>
            <span class="text-[9px] font-medium opacity-80 mt-0.5">${range}</span>
        </div>`;
    });
    els.dayPickerGrid.innerHTML = html;
}

function renderSchedule() {
    if(!els.scheduleContainer) return;
    const subj = state.currentScheduleTab;
    const currentMap = DAY_MAPS[subj] || DAY_MAPS['고전시가'];
    
    let html = `
    <div class="flex items-center justify-between mb-4 shrink-0">
        <div class="flex items-center space-x-1 bg-indigo-50 dark:bg-indigo-900/30 p-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
            <button onclick="app.switchScheduleTab('prev')" class="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
            <h2 class="text-sm font-black text-indigo-700 dark:text-indigo-300 px-2 w-20 text-center tracking-tight">${subj}</h2>
            <button onclick="app.switchScheduleTab('next')" class="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
        </div>
        <button onclick="${state.isEditingSchedule?'app.saveSchedule()':'app.toggleEditSchedule()'}" class="text-slate-400 text-sm hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"><i data-lucide="${state.isEditingSchedule?'save':'edit-2'}" class="w-4 h-4 ${state.isEditingSchedule?'text-emerald-500':''}"></i></button>
    </div>`;

    html += `<div class="grid grid-cols-7 gap-1 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800 shadow-inner shrink-0">`;
    currentMap.forEach((range, i) => {
        const day = i + 1;
        const status = getDayStatus(day);
        let classes = "bg-white dark:bg-slate-800 text-slate-300 border-slate-200 dark:border-slate-700"; 
        if(status.status === 'completed') classes = "bg-emerald-500 text-white shadow-sm border-emerald-600";
        else if (status.status === 'planned') classes = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 font-bold";
        
        html += `<div class="flex flex-col items-center py-1.5 rounded-lg border ${classes}">
            <span class="text-[9px] tracking-tighter ${status.status==='completed'?'font-black':'font-bold'}">D${day < 10 ? '0'+day : day}</span>
            <span class="text-[7px] opacity-90">${range}</span>
        </div>`;
    });
    html += `</div>`;

    html += `<div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">`;
    if(state.isEditingSchedule) {
    const sortedEditWeeks = [...state.editScheduleForm].sort((a,b) => b.weekNum - a.weekNum);
    sortedEditWeeks.forEach((wk) => {
        html += `<div class="flex flex-col bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 relative">
        <div class="flex justify-between items-center mb-3">
            <span class="font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-md">${wk.weekNum}주차</span>
            <button onclick="app.removeScheduleWeek(${wk.id})" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        <input value="${wk.meetDate}" placeholder="만나는 일자 (예: 10/24 수)" onchange="app.updateScheduleField(${wk.id},'meetDate',this.value)" class="w-full text-sm p-2.5 rounded-xl border dark:bg-slate-600 dark:text-white dark:border-slate-500 mb-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
        
        <select onchange="app.updateScheduleField(${wk.id},'area',this.value)" class="w-full text-sm p-2.5 rounded-xl border dark:bg-slate-600 dark:text-white dark:border-slate-500 mb-2 outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="고전시가" ${wk.area === '고전시가' ? 'selected' : ''}>고전시가</option>
            <option value="현대시" ${wk.area === '현대시' ? 'selected' : ''}>현대시</option>
            <option value="고전산문" ${wk.area === '고전산문' ? 'selected' : ''}>고전산문</option>
        </select>
        
        <button onclick="app.openDayPicker(${wk.id})" class="w-full mt-1 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-between px-3">
            <span><i data-lucide="calendar-range" class="w-4 h-4 inline mr-1"></i> ${getRangeText(wk.days)}</span>
            <span class="bg-indigo-500 text-white px-2 py-0.5 rounded text-[10px]">진도 선택</span>
        </button>
        </div>`;
    });
    html += `<button onclick="app.addScheduleWeek()" class="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors rounded-xl text-sm font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-500"><i data-lucide="plus" class="w-4 h-4 mr-1"></i> ${state.editScheduleForm.length + 1}주차 추가</button>`;
    } else {
    const weeks = state.scheduleData[subj]?.weeks || [];
    if(weeks.length === 0) html += `<div class="text-center text-slate-400 text-sm py-4">등록된 일정이 없습니다. 우측 상단 수정 버튼을 눌러보세요.</div>`;
    const sortedWeeks = [...weeks].sort((a,b) => b.weekNum - a.weekNum);
    sortedWeeks.forEach((wk) => {
        html += `<div class="flex flex-col p-4 ${wk.isCompleted ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 opacity-80' : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-800/30 shadow-sm'} rounded-xl border relative transition-all">
        <div class="flex justify-between items-start mb-2">
            <div>
                <span class="font-black ${wk.isCompleted ? 'text-slate-500 bg-slate-200' : 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/50'} px-2 py-0.5 rounded-md text-[10px] uppercase mr-1">${wk.weekNum}주차</span>
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400"><i data-lucide="calendar" class="w-3 h-3 inline pb-0.5"></i> ${wk.meetDate || '미정'}</span>
            </div>
            <button onclick="app.toggleWeekCompletion(${wk.id})" class="flex items-center text-[10px] font-black px-2 py-1 rounded border transition-colors ${wk.isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}">
                ${wk.isCompleted ? '<i data-lucide="check-circle-2" class="w-3 h-3 mr-1"></i> 진도 완료' : '<i data-lucide="circle" class="w-3 h-3 mr-1"></i> 마킹하기'}
            </button>
        </div>
        <div class="font-black text-slate-800 dark:text-slate-200 text-sm mt-1 mb-1">${wk.area || '영역 미지정'}</div>
        <div class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/30 w-fit">📍 ${getRangeText(wk.days)}</div>
        </div>`;
    });
    }
    els.scheduleContainer.innerHTML = html + '</div>'; lucide.createIcons();
}

function renderTodos() {
    if(!state.appAccount || !els.todosContainer) return;
    const isAdmin = checkIsAdmin();
    const members = state.allMembers.length > 0 ? state.allMembers.map(m=>m.name) : [state.appAccount.name];
    const isMyTab = state.activeTodoTab === state.appAccount.name;
    
    let html = `<div class="flex items-center justify-between mb-4 shrink-0"><h2 class="text-lg font-bold flex items-center text-emerald-600 dark:text-emerald-400"><i data-lucide="check-square" class="w-5 h-5 mr-2"></i> 출제 할당 & 진도 트래커</h2></div>`;
    html += `<div class="flex space-x-2 overflow-x-auto hide-scrollbar mb-4 shrink-0 pb-1">`;
    members.forEach(name => { 
        html += `<button onclick="app.setActiveTodoTab('${name}')" class="px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${state.activeTodoTab === name ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700'}">${name}</button>`; 
    });
    html += `</div>`;
    
    const targetName = state.activeTodoTab;
    const targetProg = state.progressData[targetName] || { '고전시가': 0, '현대시': 0, '고전산문': 0 };

    html += `<div class="mb-5 flex bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner shrink-0 gap-2">
    <div class="flex-1 text-center border-r border-slate-200 dark:border-slate-700">
        <p class="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-widest">고전시가</p>
        <p class="text-xl font-black text-slate-800 dark:text-white">No. ${targetProg['고전시가'] || 0}</p>
    </div>
    <div class="flex-1 text-center border-r border-slate-200 dark:border-slate-700">
        <p class="text-[10px] font-bold text-blue-500 dark:text-blue-400 mb-1 uppercase tracking-widest">현대시</p>
        <p class="text-xl font-black text-slate-800 dark:text-white">No. ${targetProg['현대시'] || 0}</p>
    </div>
    <div class="flex-1 text-center">
        <p class="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 mb-1 uppercase tracking-widest">고전산문</p>
        <p class="text-xl font-black text-slate-800 dark:text-white">No. ${targetProg['고전산문'] || 0}</p>
    </div>
    </div>`;

    if(isMyTab) {
        html += `
        <div class="flex flex-col sm:flex-row items-center gap-2 mb-6 shrink-0 bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0"><i data-lucide="edit-3" class="w-4 h-4 inline pb-0.5"></i> 진도 기록:</span>
            <select id="prog-subj-input" class="w-full sm:w-auto flex-1 p-2 rounded-lg border text-xs font-bold bg-slate-50 dark:bg-slate-800 dark:border-slate-500 dark:text-white outline-none">
                <option value="고전시가">고전시가</option>
                <option value="현대시">현대시</option>
                <option value="고전산문">고전산문</option>
            </select>
            <input type="number" id="prog-num-input" placeholder="작품번호" class="w-full sm:w-24 p-2 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-500 dark:text-white outline-none font-bold text-center" />
            <button onclick="app.updateProgress()" class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors">기록하기</button>
        </div>`;
    }

    html += `<div class="flex items-center justify-between mb-2 shrink-0">
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300"><i data-lucide="pin" class="w-4 h-4 inline pb-0.5"></i> 출제 범위 할당 현황</h3>
    </div>`;

    html += `<div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">`;
    const tasks = state.todos[state.activeTodoTab] || [];
    const assignTasks = tasks.filter(t => t.type === 'assign');
    
    if(assignTasks.length === 0) {
        html += `<div class="text-center text-slate-400 text-sm py-6">등록된 출제 할당이 없습니다.</div>`;
    }
    
    assignTasks.forEach(t => {
    html += `<div onclick="${isMyTab || isAdmin ? `app.toggleTodoTask(${t.id})` : ''}" class="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 ${isMyTab || isAdmin ? 'cursor-pointer hover:border-emerald-300' : ''} transition-colors ${t.done?'opacity-50 bg-slate-50':''}">
        <div class="flex items-center flex-1 pr-2 overflow-hidden">
            <div class="w-4 h-4 rounded border-2 flex items-center justify-center mr-3 shrink-0 ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}">
                ${t.done ? '<i data-lucide="check" class="w-3 h-3 text-white"></i>' : ''}
            </div>
            <span class="text-xs font-bold dark:text-slate-200 truncate ${t.done?'line-through text-slate-400':''}">${t.desc}</span>
        </div>
        ${isMyTab || isAdmin ? `<button onclick="app.deleteTodoTask(${t.id}, event)" class="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
    </div>`;
    });
    html += `</div>`;

    if(isMyTab || isAdmin) {
        html += `<button onclick="app.openDayPickerForTodo()" class="w-full mt-3 py-2.5 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0"><i data-lucide="plus" class="w-4 h-4 inline pb-0.5 mr-1"></i> 새 출제 할당 추가 (Day 선택)</button>`;
    }
    els.todosContainer.innerHTML = html; lucide.createIcons();
}

function renderChat() {
    if(!els.chatContainer) return;
    let html = `
    <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <h2 class="text-lg font-bold flex items-center text-emerald-600 dark:text-emerald-400"><i data-lucide="message-square" class="w-5 h-5 mr-2"></i> 스터디 커뮤니티</h2>
    </div>
    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-900">
    `;
    
    if(state.chatMessages.length === 0) {
    html += `<div class="flex h-full items-center justify-center text-slate-400 text-sm font-bold">첫 메시지를 남겨보세요!</div>`;
    } else {
    state.chatMessages.forEach(msg => {
        const isMe = msg.userName === state.appAccount?.name;
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        if(isMe) {
        html += `
            <div class="flex flex-col items-end">
            <span class="text-[10px] text-slate-400 mb-0.5 mr-1">${msg.userName}</span>
            <div class="flex items-end space-x-1.5">
                <span class="text-[9px] text-slate-400 mb-1">${timeStr}</span>
                <div class="bg-indigo-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-sm max-w-[250px] sm:max-w-[400px] break-words leading-relaxed">${msg.text}</div>
            </div>
            </div>
        `;
        } else {
        html += `
            <div class="flex flex-col items-start">
            <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 ml-1">${msg.userName}</span>
            <div class="flex items-end space-x-1.5">
                <div class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm shadow-sm border border-slate-200 dark:border-slate-700 max-w-[250px] sm:max-w-[400px] break-words leading-relaxed">${msg.text}</div>
                <span class="text-[9px] text-slate-400 mb-1">${timeStr}</span>
            </div>
            </div>
        `;
        }
    });
    }
    
    html += `
    </div>
    <div class="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <form onsubmit="app.submitChat(event)" class="flex items-center space-x-2">
        <input type="text" id="chat-input" placeholder="스터디원들과 대화해보세요..." class="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all" autocomplete="off" />
        <button type="submit" class="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors"><i data-lucide="send" class="w-5 h-5"></i></button>
        </form>
    </div>
    `;
    els.chatContainer.innerHTML = html;
    lucide.createIcons();
    
    const msgDiv = document.getElementById('chat-messages');
    if(msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;
}

function renderDriveFiles() {
    if(!els.driveContainer) return;
    if(state.driveFiles.length === 0) { els.driveContainer.innerHTML = `<div class="py-8 text-slate-400 text-center text-sm">파일이 없습니다.</div>`; return; }
    els.driveContainer.innerHTML = state.driveFiles.map(f => `
    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 group">
        <div class="flex items-center overflow-hidden mr-2">
        <i data-lucide="file" class="w-5 h-5 text-blue-500 mr-3 flex-shrink-0"></i>
        <div class="overflow-hidden"><p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline" onclick="app.downloadDriveFile('${f.id}')">${f.fileName}</p><p class="text-[10px] text-slate-400">${f.uploadedBy} · ${f.date}</p></div>
        </div>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="app.downloadDriveFile('${f.id}')" class="p-1.5 text-blue-500"><i data-lucide="download" class="w-4 h-4"></i></button>
        <button onclick="app.deleteDriveFile('${f.id}')" class="p-1.5 text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    </div>`).join(''); lucide.createIcons();
}

function renderFines() {
    if(!els.finesContainer) return;
    const records = state.finesData.records || [];
    const unpaid = {}; state.allMembers.forEach(m => unpaid[m.name] = 0);
    records.forEach(r => { if(!r.isPaid) unpaid[r.memberName] = (unpaid[r.memberName]||0) + Number(r.amount); });
    let html = `<div class="flex justify-between items-center mb-5"><h2 class="text-lg font-bold flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-2 text-rose-500"></i> 벌금 현황</h2><button onclick="app.toggleAddingFine()" class="text-xs bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-lg dark:bg-rose-900/30 dark:text-rose-400">+ 추가</button></div>`;
    html += `<div class="flex flex-wrap gap-2 mb-5">`;
    state.allMembers.forEach(m => { html += `<div class="text-xs font-bold bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 p-2 rounded-lg flex items-center">${m.name}: <span class="ml-1 ${unpaid[m.name]>0?'text-rose-500':'text-slate-400'}">${unpaid[m.name].toLocaleString()}원</span></div>`; });
    html += `</div>`;
    
    if(state.isAddingFine) {
    let opts = `<option value="" disabled selected>대상자 선택</option>`; state.allMembers.forEach(m => opts+=`<option value="${m.name}">${m.name}</option>`);
    html += `<form onsubmit="app.submitFine(event)" class="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex flex-col gap-2">
        <select required onchange="app.updateFineField('memberName', this.value)" class="p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">${opts}</select>
        <div class="flex gap-2">
        <input required type="text" placeholder="사유" onchange="app.updateFineField('reason', this.value)" class="flex-1 p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        <input required type="number" value="1000" onchange="app.updateFineField('amount', this.value)" class="w-24 p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <button type="submit" class="w-full py-2 bg-rose-500 text-white rounded text-sm font-bold">등록</button>
    </form>`;
    }

    html += `<div class="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">`;
    if(records.length===0) html += `<div class="text-center text-slate-400 text-sm py-4">벌금 내역이 없습니다.</div>`;
    records.forEach(r => {
    html += `<div class="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 text-sm">
        <div class="flex items-center overflow-hidden">
        <input type="checkbox" ${r.isPaid?'checked':''} onchange="app.toggleFinePaid(${r.id})" class="mr-3 w-4 h-4 cursor-pointer accent-rose-500" /> 
        <span class="truncate dark:text-slate-200 ${r.isPaid?'line-through text-slate-400 dark:text-slate-500':''}"><span class="font-bold mr-1">${r.memberName}</span>${r.reason} <span class="text-rose-500 font-bold ml-1">${Number(r.amount).toLocaleString()}원</span></span>
        </div>
        <button onclick="app.deleteFine(${r.id})" class="text-slate-300 hover:text-red-500 ml-2 flex-shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>`;
    });
    els.finesContainer.innerHTML = html + '</div>'; lucide.createIcons();
}

init();
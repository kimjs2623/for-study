// shared/js/firebase.js

import { state } from './state.js';
import { showToast, getUserName, getRangeText } from './utils.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function updateGlobalWeeks() {
    state.weeks = [...new Set([...state.docWeeks])].filter(w => w && w !== 'undefined');
    state.weeks.sort((a, b) => parseInt(a) - parseInt(b));

    ['week-select', 'comm-week-filter', 'mock-week-filter', 'qa-week-filter'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        const prev = el.value;
        el.innerHTML = `<option value="">주차 선택</option>` + state.weeks.map(w => {
            return `<option value="${w}">${w}주차</option>`;
        }).join('');
        if(state.weeks.includes(prev)) el.value = prev;
    });
    onWeekChange();
}

export function onWeekChange() {
    const weekVal = document.getElementById('week-select')?.value;
    const infoEl = document.getElementById('week-days-info');
    
    if (infoEl) {
        const weekObj = state.scheduleWeeks.find(w => {
            const num = String(w.weekNum || w.week).replace(/[^0-9]/g, '');
            return num === weekVal;
        });
        
        if (weekObj && weekObj.days && Array.isArray(weekObj.days) && weekObj.days.length > 0) {
            const badgeText = getRangeText(weekObj.days);
            infoEl.innerHTML = `<i data-lucide="check-square" class="w-3 h-3 mr-1"></i> ${badgeText}`;
            infoEl.classList.remove('hidden');
            infoEl.classList.add('flex');
            if(typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            infoEl.classList.add('hidden');
            infoEl.classList.remove('flex');
        }
    }
    updateCommunityWorks();
}

export function updateCommunityWorks() {
    const w = document.getElementById('comm-week-filter')?.value;
    const prevWork = document.getElementById('comm-work-filter')?.value;
    const works = [...new Set(state.allSubmissions.filter(s => s.subject === state.subjectName && String(s.week) === String(w) && !s.isDeleted).map(s => s.workName))];
    
    const el = document.getElementById('comm-work-filter');
    if(!el) return;
    
    el.innerHTML = works.length ? `<option value="">작품 선택</option>` + works.map(w => `<option value="${w}">${w}</option>`).join('') : `<option value="">기록 없음</option>`;
    if (works.includes(prevWork)) el.value = prevWork;
    renderCommunityRecords();
}

export async function submitOMR() {
    const week = document.getElementById('week-select').value;
    if(!week) return showToast("주차를 먼저 선택해 주세요.", "error");
    const workName = document.getElementById('omr-work-name').value.trim();
    if(!workName) return showToast("작품 이름을 입력해주세요.", "error");
    
    const ans = [];
    for(let i=1; i<=10; i++) {
        const v = document.getElementById(`omr-${i}`).value.trim();
        if(v) ans.push(`[객관식 ${i}번] ${v}`);
    }
    for(let i=1; i<=2; i++) {
        const n = document.getElementById(`essay-num-${i}`).value.trim();
        const a = document.getElementById(`essay-ans-${i}`).value.trim();
        if(a) ans.push(`[서술형 ${n || i}번]\n${a}`);
    }

    if(!ans.length) return showToast("답안을 입력해 주세요. (객관식 또는 서술형)", "error");

    const btn = document.getElementById('submit-omr-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin-custom"></i> 기록 중...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const userName = await getUserName(state.db);
        const recordData = { subject: state.subjectName, week, workName, type: "답안", userAnswers: ans, userId: state.user.uid, userName, isDeleted: false, timestamp: Date.now() };
        
        const existing = state.allSubmissions.find(s => s.userId === state.user.uid && s.subject === state.subjectName && String(s.week) === String(week) && s.workName === workName && s.type === "답안");

        if (state.editingDocId) {
            await updateDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'submissions', state.editingDocId), { ...recordData, isEdited: true, editedAt: Date.now() });
            showToast("수정된 답안이 성공적으로 기록되었습니다.", "success");
        } else if (existing) {
            const mergedAnswers = [...existing.userAnswers, "\n[추가 제출]", ...ans];
            await updateDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'submissions', existing.id), { userAnswers: mergedAnswers, isEdited: true, editedAt: Date.now() });
            showToast("기존 답안에 새로운 답안이 추가로 병합되었습니다.", "success");
        } else {
            await addDoc(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'submissions'), recordData);
            showToast("답안 기록 완료! 이제 해설을 볼 수 있습니다.", "success");
        }
        
        state.editingDocId = null; 
        document.getElementById('editing-badge').classList.add('hidden');
        
        for(let i=1; i<=10; i++) document.getElementById(`omr-${i}`).value = '';
        for(let i=1; i<=2; i++) {
            document.getElementById(`essay-num-${i}`).value = '';
            document.getElementById(`essay-ans-${i}`).value = '';
        }
        
        // setMode를 호출하기 위해 전역 객체 접근
        window.StudyApp.setMode('community');
    } catch(e) {
        showToast(`오류 발생: ${e.message}`, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

export function editSubmission(docId, type) {
    const record = state.allSubmissions.find(s => s.id === docId);
    if(!record) return;
    state.editingDocId = docId; 
    document.getElementById('editing-badge').classList.remove('hidden');
    
    document.getElementById('week-select').value = record.week;
    document.getElementById('omr-work-name').value = record.workName;
    
    for(let i=1; i<=10; i++) document.getElementById(`omr-${i}`).value = '';
    for(let i=1; i<=2; i++) {
        document.getElementById(`essay-num-${i}`).value = '';
        document.getElementById(`essay-ans-${i}`).value = '';
    }

    let essayCount = 1;
    record.userAnswers.forEach(ans => {
        if (ans === "\n[추가 제출]") return; 
        const omrMatch = ans.match(/^\[객관식 (\d+)번\]\s*(.*)$/);
        if (omrMatch) {
            const el = document.getElementById(`omr-${omrMatch[1]}`);
            if (el) el.value = omrMatch[2];
        }
        const essayMatch = ans.match(/^\[서술형 (.*?)번\]\n([\s\S]*)$/);
        if (essayMatch && essayCount <= 2) {
            document.getElementById(`essay-num-${essayCount}`).value = essayMatch[1];
            document.getElementById(`essay-ans-${essayCount}`).value = essayMatch[2];
            essayCount++;
        }
    });

    window.StudyApp.setMode('omr');
    showToast("수정 모드로 전환되었습니다. 작성하셨던 답안을 복원했습니다.");
}

export function deleteSubmission(docId) {
    const modal = document.getElementById('delete-modal');
    document.getElementById('delete-modal-desc').textContent = "해당 기록을 영구적으로 삭제하시겠습니까?";
    modal.classList.remove('hidden');
    
    document.getElementById('confirm-delete-btn').onclick = async () => {
        modal.classList.add('hidden');
        await deleteDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'submissions', docId));
        showToast("삭제 완료");
    };
}

export function renderCommunityRecords() {
    const w = document.getElementById('comm-week-filter')?.value;
    const work = document.getElementById('comm-work-filter')?.value;
    const container = document.getElementById('community-container');
    
    if(!w || !work) { 
        container.innerHTML = `<p class="text-center py-10 text-[10px] text-slate-400">조회할 주차와 작품을 선택하세요.</p>`; 
        return; 
    }
    
    const subs = state.allSubmissions.filter(s => s.subject === state.subjectName && String(s.week) === String(w) && s.workName === work);
    
    container.innerHTML = subs.map(r => `
        <div class="bg-white dark:bg-slate-900 border ${r.userId === state.user.uid ? 'border-brand-400 shadow-sm' : 'border-slate-200 dark:border-slate-800'} rounded-xl overflow-hidden mb-2 transition-all">
            <div onclick="this.nextElementSibling.classList.toggle('hidden')" class="p-3.5 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <div class="flex items-center space-x-2">
                    <span class="text-[11px] font-black">${r.userId === state.user.uid ? '🌟 나의 답안 (' + (r.userName || '익명') + ')' : (r.userName || '익명')}</span>
                    <span class="text-[9px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded uppercase">${r.type}</span>
                </div>
                <div class="flex space-x-1">
                    ${r.userId === state.user.uid ? `<button onclick="window.StudyApp.editSubmission('${r.id}', '${r.type}'); event.stopPropagation();" class="text-[9px] font-bold text-brand-500 bg-brand-50 px-2 py-1 rounded transition-all hover:bg-brand-100">수정</button>` : ''}
                    <button onclick="window.StudyApp.deleteSubmission('${r.id}'); event.stopPropagation();" class="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded transition-all hover:bg-red-100">삭제</button>
                </div>
            </div>
            <div class="hidden border-t p-4 bg-slate-50/30 dark:bg-slate-800/20 space-y-3 transition-all">
                <p class="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-3 border-l-2 border-brand-400 leading-relaxed">${r.userAnswers.join('\n\n')}</p>
            </div>
        </div>
    `).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
}
// shared/js/aiService.js

import { state } from './state.js';
import { showToast, startCooldown, getUserName } from './utils.js';
import { getCurrentPageWorks } from './search.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// API Key 디코딩 (프론트엔드 레벨)
const encodedKey = "QUl6YVN5RFhPcDVWSVFhdHNoendNNWswbHBOV1U5V2tuZ05zVWpV";
const apiKey = atob(encodedKey);

// --- Q&A (모의 출제) 관련 로직 ---

export function updateQAWorksDropdown() {
    const w = document.getElementById('qa-week-filter')?.value;
    let filteredQs = w ? state.qaQuestions.filter(q => q.subject === state.subjectName && String(q.week) === String(w)) : [];
    const qWorks = [...new Set(filteredQs.map(q => q.workName))].sort();
    
    const select = document.getElementById('qa-work-filter');
    if(!select) return;
    const currentVal = select.value;
    
    if (currentVal && state.qaCurrentWork === currentVal && !qWorks.includes(currentVal)) {
        qWorks.push(currentVal);
        qWorks.sort();
    }
    
    let html = '<option value="">작품 선택</option>';
    qWorks.forEach(work => { html += `<option value="${work}">${work}</option>`; });
    
    select.innerHTML = html;
    
    if (qWorks.includes(currentVal)) {
        select.value = currentVal;
    } else if (state.qaCurrentWork && qWorks.includes(state.qaCurrentWork)) {
        select.value = state.qaCurrentWork;
    } else {
        select.value = "";
        setQAWork(""); 
    }
}

export function addQAWorkOption(workName) {
    if(!workName) return;
    const select = document.getElementById('qa-work-filter');
    let exists = false;
    for(let i=0; i<select.options.length; i++) {
        if(select.options[i].value === workName) exists = true;
    }
    if(!exists) select.innerHTML += `<option value="${workName}">${workName}</option>`;
}

export function promptQAWork(isEdit = false) {
    const w = document.getElementById('qa-week-filter').value;
    if (!isEdit && !w) return showToast("주차를 먼저 선택해주세요.", "error");

    const titleEl = document.getElementById('prompt-modal-title');
    const descEl = document.getElementById('prompt-modal-desc');
    const numEl = document.getElementById('prompt-num-input');
    const inputEl = document.getElementById('prompt-input');
    const btnEl = document.getElementById('prompt-confirm-btn');

    if (isEdit) {
        if (!state.qaCurrentWork) return showToast("선택된 작품이 없습니다.", "error");
        titleEl.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-blue-500 mr-2"></i> 작품명 수정`;
        descEl.textContent = "수정할 작품의 번호와 이름을 입력하세요.";
        
        const match = state.qaCurrentWork.match(/^(\d{3})\.\s(.*)$/);
        if(match) {
            numEl.value = parseInt(match[1], 10);
            inputEl.value = match[2];
        } else {
            numEl.value = "";
            inputEl.value = state.qaCurrentWork;
        }
        btnEl.onclick = confirmEditQAWork;
    } else {
        titleEl.innerHTML = `<i data-lucide="folder-plus" class="w-5 h-5 text-blue-500 mr-2"></i> 모의 출제 새 작품 등록`;
        descEl.textContent = "문제를 출제할 작품의 번호와 이름을 입력하세요.";
        numEl.value = "";
        inputEl.value = "";
        btnEl.onclick = confirmPromptNewQAWork;
    }
    
    document.getElementById('prompt-modal').classList.remove('hidden');
    inputEl.focus();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

export function confirmPromptNewQAWork() {
    const num = document.getElementById('prompt-num-input').value.trim();
    const text = document.getElementById('prompt-input').value.trim();
    if(!text) return showToast("작품명을 입력해주세요.", "error");
    
    const finalWorkName = num ? `${num.padStart(3, '0')}. ${text}` : text;
    
    document.getElementById('prompt-modal').classList.add('hidden');
    addQAWorkOption(finalWorkName);
    
    const select = document.getElementById('qa-work-filter');
    select.value = finalWorkName;
    setQAWork(finalWorkName);
}

export async function confirmEditQAWork() {
    const num = document.getElementById('prompt-num-input').value.trim();
    const text = document.getElementById('prompt-input').value.trim();
    if(!text) return showToast("작품명을 입력해주세요.", "error");
    
    const finalWorkName = num ? `${num.padStart(3, '0')}. ${text}` : text;
    
    if(finalWorkName === state.qaCurrentWork) {
        document.getElementById('prompt-modal').classList.add('hidden');
        return;
    }

    const oldName = state.qaCurrentWork;
    document.getElementById('prompt-modal').classList.add('hidden');
    showToast("작품명을 수정 중입니다...", "info");

    try {
        const qQuery = query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions'), where('workName', '==', oldName), where('subject', '==', state.subjectName));
        const qSnap = await getDocs(qQuery);
        const qPromises = [];
        qSnap.forEach(d => qPromises.push(updateDoc(d.ref, { workName: finalWorkName })));

        const aQuery = query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_answers'), where('workName', '==', oldName));
        const aSnap = await getDocs(aQuery);
        const aPromises = [];
        aSnap.forEach(d => aPromises.push(updateDoc(d.ref, { workName: finalWorkName })));

        await Promise.all([...qPromises, ...aPromises]);

        state.qaCurrentWork = finalWorkName;
        updateQAWorksDropdown();
        document.getElementById('qa-work-filter').value = finalWorkName;
        showToast("작품명이 성공적으로 수정되었습니다.", "success");
    } catch(e) {
        showToast("작품명 수정 실패: " + e.message, "error");
    }
}

export function deleteQAWork() {
    if(!state.qaCurrentWork) return;
    const modal = document.getElementById('delete-modal');
    document.getElementById('delete-modal-desc').innerHTML = `<span class="font-bold text-red-500">[${state.qaCurrentWork}]</span> 작품과 관련된 <br>모든 문제 및 답안이 영구 삭제됩니다.`;
    modal.classList.remove('hidden');

    document.getElementById('confirm-delete-btn').onclick = async () => {
        modal.classList.add('hidden');
        showToast("작품을 삭제 중입니다...", "info");
        try {
            const oldName = state.qaCurrentWork;

            const qQuery = query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions'), where('workName', '==', oldName), where('subject', '==', state.subjectName));
            const qSnap = await getDocs(qQuery);
            const qPromises = [];
            qSnap.forEach(d => qPromises.push(deleteDoc(d.ref)));

            const aQuery = query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_answers'), where('workName', '==', oldName));
            const aSnap = await getDocs(aQuery);
            const aPromises = [];
            aSnap.forEach(d => aPromises.push(deleteDoc(d.ref)));

            await Promise.all([...qPromises, ...aPromises]);

            state.qaCurrentWork = "";
            updateQAWorksDropdown();
            setQAWork("");
            showToast("작품이 삭제되었습니다.", "success");
        } catch(e) {
            showToast("작품 삭제 실패: " + e.message, "error");
        }
    };
}

export function setQAWork(workName) {
    state.qaCurrentWork = workName;
    const area = document.getElementById('qa-content-area');
    const empty = document.getElementById('qa-empty-state');
    const editBtn = document.getElementById('qa-work-edit-btn');
    const deleteBtn = document.getElementById('qa-work-delete-btn');
    
    if(workName) {
        area.classList.remove('hidden');
        area.classList.add('flex');
        empty.classList.add('hidden');
        editBtn.classList.remove('hidden');
        deleteBtn.classList.remove('hidden');
        renderQAQuestions();
    } else {
        area.classList.add('hidden');
        area.classList.remove('flex');
        empty.classList.remove('hidden');
        editBtn.classList.add('hidden');
        deleteBtn.classList.add('hidden');
    }
}

export async function submitQAQuestion() {
    if(!state.user) return;
    const textInput = document.getElementById('qa-new-q-text');
    const linkInput = document.getElementById('qa-new-q-link');
    const text = textInput.value.trim();
    const link = linkInput?.value.trim() || '';
    const w = document.getElementById('qa-week-filter').value;
    
    if(!w) return showToast("주차를 먼저 선택해주세요.", "error");
    if(!state.qaCurrentWork) return showToast("먼저 작품을 선택해주세요.", "error");
    if(!text) return showToast("문제 내용을 입력해주세요.", "error");

    const relatedWorks = getCurrentPageWorks();

    try {
        const userName = await getUserName(state.db);
        await addDoc(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions'), {
            subject: state.subjectName,
            week: w,
            workName: state.qaCurrentWork,
            questionText: text,
            externalLink: link,
            relatedWorks: relatedWorks, 
            authorId: state.user.uid,
            authorName: userName,
            timestamp: Date.now()
        });
        
        textInput.value = '';
        if(linkInput) linkInput.value = '';
        
        const worksHint = relatedWorks.length > 0 ? `\n(연결된 작품: ${relatedWorks.join(', ')})` : '';
        showToast("새로운 문제가 등록되었습니다." + worksHint, "success");
    } catch(e) {
        showToast("문제 등록 실패: " + e.message, "error");
    }
}

export function deleteQAQuestion(questionId) {
    const modal = document.getElementById('delete-modal');
    document.getElementById('delete-modal-desc').textContent = "해당 문제를 영구적으로 삭제하시겠습니까?";
    modal.classList.remove('hidden');
    
    document.getElementById('confirm-delete-btn').onclick = async () => {
        modal.classList.add('hidden');
        try {
            await deleteDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions', questionId));
            showToast("문제가 삭제되었습니다.");
        } catch(e) {
            showToast("문제 삭제 실패: " + e.message, "error");
        }
    };
}

export async function submitQAAnswer(questionId) {
    if(!state.user) return;
    const textarea = document.getElementById(`qa-ans-${questionId}`);
    const text = textarea.value.trim();
    if(!text) return showToast("답안을 입력해주세요.", "error");

    try {
        const userName = await getUserName(state.db);
        await addDoc(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_answers'), {
            questionId: questionId,
            workName: state.qaCurrentWork,
            userId: state.user.uid,
            userName: userName,
            answerText: text,
            timestamp: Date.now()
        });
        showToast("답안이 등록되었습니다.", "success");
    } catch(e) {
        showToast("답안 등록 실패: " + e.message, "error");
    }
}

export async function editQAAnswer(answerId, questionId) {
    const answer = state.qaAnswers.find(a => a.id === answerId);
    if(!answer) return;
    const text = answer.answerText;
    try {
        await deleteDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_answers', answerId));
        showToast("수정 모드: 작성하신 답안을 입력칸에 복원했습니다.");
        setTimeout(() => {
            const ta = document.getElementById(`qa-ans-${questionId}`);
            if(ta) {
                ta.value = text;
                ta.focus();
            }
        }, 300);
    } catch(e) {
        showToast("수정 모드 전환 실패", "error");
    }
}

export function renderQAQuestions() {
    if(state.mode !== 'qa' || !state.qaCurrentWork) return;
    const container = document.getElementById('qa-list-container');
    const w = document.getElementById('qa-week-filter').value;
    
    const currentInputs = {};
    const textareas = container.querySelectorAll('textarea');
    textareas.forEach(ta => currentInputs[ta.id] = ta.value);
    const activeEl = document.activeElement;
    const activeId = activeEl?.id;
    let cursorStart = 0, cursorEnd = 0;
    let shouldRestoreSelection = false;

    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') && currentInputs[activeId] !== undefined) {
        cursorStart = activeEl.selectionStart;
        cursorEnd = activeEl.selectionEnd;
        shouldRestoreSelection = true;
    }
    
    const qs = state.qaQuestions.filter(q => q.subject === state.subjectName && String(q.week) === String(w) && q.workName === state.qaCurrentWork);
    
    if(qs.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-[10px] text-slate-400 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">아직 출제된 문제가 없습니다.<br>첫 번째 문제를 출제해 보세요!</div>`;
        return;
    }

    container.innerHTML = qs.map(q => {
        const allAnswers = state.qaAnswers.filter(a => a.questionId === q.id);
        const myAnswer = allAnswers.find(a => a.userId === state.user.uid);
        
        let linkButtons = `<button onclick="window.StudyApp.findAndGoToWorkByString('${q.workName}')" class="text-[9px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1.5 rounded border border-indigo-100 transition-colors flex items-center shadow-sm"><i data-lucide="book-open" class="w-3 h-3 mr-1"></i>교재 본문 열기</button>`;
        
        if (q.externalLink) {
            let url = q.externalLink.startsWith('http') ? q.externalLink : 'https://' + q.externalLink;
            linkButtons += `<a href="${url}" target="_blank" class="text-[9px] font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded border border-slate-200 transition-colors flex items-center shadow-sm"><i data-lucide="external-link" class="w-3 h-3 mr-1"></i>외부 작품 링크</a>`;
        }

        let contentHtml = '';

        if (myAnswer) {
            let answersHtml = allAnswers.map(a => `
                <div class="mt-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border ${a.userId === state.user.uid ? 'border-brand-300 dark:border-brand-700' : 'border-slate-100 dark:border-slate-800'} relative">
                    <p class="text-[10px] text-slate-500 font-bold mb-1">${a.userId === state.user.uid ? '🌟 내 답안 (' + (a.userName || '익명') + ')' : (a.userName || '익명') + '님의 답안'}</p>
                    <p class="text-xs text-slate-800 dark:text-slate-300 whitespace-pre-wrap">${a.answerText}</p>
                    ${a.userId === state.user.uid ? `<button onclick="window.StudyApp.editQAAnswer('${a.id}', '${q.id}')" class="mt-2 text-[9px] font-bold text-blue-500 hover:text-blue-700 underline underline-offset-2 transition-colors">답안 수정하기</button>` : ''}
                </div>
            `).join('');

            contentHtml += `
                <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">스터디원 답안 목록 (${allAnswers.length}명 제출)</span>
                    ${answersHtml}
                </div>
            `;
            
            if (q.isAIFetching) {
                contentHtml += `
                    <div class="mt-4 text-center">
                        <button disabled class="bg-slate-400 text-white text-[10px] font-black px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center cursor-not-allowed w-full sm:w-auto mx-auto transition-all">
                            <i data-lucide="loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin"></i> 다른 스터디원이 AI 분석 요청 중...
                        </button>
                    </div>
                `;
            } else if (q.aiFeedback) {
                contentHtml += `
                    <div class="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl relative overflow-hidden">
                        <div class="flex items-center gap-2 mb-3">
                            <i data-lucide="bot" class="w-5 h-5 text-blue-600"></i>
                            <span class="font-black text-blue-900 dark:text-blue-300 text-xs">AI 선생님의 모범 답안 및 총평</span>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-0.5"></i> 모범 답안</p>
                                <div class="prose prose-sm dark:prose-invert max-w-none text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">${marked.parse(q.aiFeedback.modelAnswer)}</div>
                            </div>
                            <div class="border-t border-blue-200/50 dark:border-blue-800/50 pt-3">
                                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-2"><i data-lucide="message-square-text" class="w-3 h-3 inline mr-0.5"></i> 스터디원 학생별 평가 및 총평</p>
                                <div class="prose prose-sm dark:prose-invert max-w-none text-xs text-blue-800 dark:text-blue-200 leading-relaxed">${marked.parse(q.aiFeedback.generalFeedback)}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                contentHtml += `
                    <div class="mt-4 text-center">
                        <button id="req-ai-btn-${q.id}" onclick="window.StudyApp.requestAIFeedback('${q.id}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2.5 rounded-lg shadow-sm transition-all inline-flex items-center">
                            <i data-lucide="sparkles" class="w-3.5 h-3.5 mr-1.5"></i> AI 학생별 코멘트 및 총평 요청하기
                        </button>
                    </div>
                `;
            }

        } else {
            contentHtml += `
                <div class="mt-4 relative bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p class="text-[10px] font-bold text-slate-500 mb-2 flex items-center"><i data-lucide="lock" class="w-3 h-3 mr-1"></i> 나의 답안을 등록해야 스터디원의 답안과 AI 피드백을 확인할 수 있습니다.</p>
                    <textarea id="qa-ans-${q.id}" class="w-full text-[11px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none resize-none focus:border-blue-400 transition-all custom-scrollbar" rows="3" placeholder="문제에 대한 나의 답안을 작성해 보세요..."></textarea>
                    <div class="flex justify-end mt-2">
                        <button id="qa-btn-${q.id}" onclick="window.StudyApp.submitQAAnswer('${q.id}')" class="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-sm transition-all flex items-center">
                            <i data-lucide="pen-tool" class="w-3 h-3 mr-1.5"></i> 내 답안 등록하기
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between space-x-3">
                    <div class="flex items-start space-x-3 flex-1 min-w-0">
                        <div class="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-lg mt-0.5 shrink-0"><i data-lucide="help-circle" class="w-4 h-4"></i></div>
                        <div class="flex-1 min-w-0 pt-0.5">
                            <div class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug whitespace-pre-wrap">${q.questionText}</div>
                            <div class="mt-3 flex items-center gap-1.5 flex-wrap">
                                ${linkButtons}
                            </div>
                            <div class="flex items-center mt-3 space-x-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                                <span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">출제: ${q.authorName}</span>
                                <span class="text-[9px] text-slate-400 font-bold">참여: ${allAnswers.length}명</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.StudyApp.deleteQAQuestion('${q.id}')" class="shrink-0 p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="문제 삭제">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                ${contentHtml}
            </div>
        `;
    }).join('');

    if(typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
        for (const [id, val] of Object.entries(currentInputs)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
        if (activeId && shouldRestoreSelection) {
            const el = document.getElementById(activeId);
            if (el && typeof el.setSelectionRange === 'function') {
                el.focus();
                el.setSelectionRange(cursorStart, cursorEnd);
            }
        }
    }, 0);
}

export async function requestAIFeedback(questionId) {
    if(!state.user) return;
    const btn = document.getElementById(`req-ai-btn-${questionId}`);
    if(!btn) return;
    
    const qRef = doc(state.db, 'artifacts', state.appId, 'public', 'data', 'qa_questions', questionId);
    const qSnap = await getDoc(qRef);
    
    if (qSnap.data().isAIFetching) {
        return showToast("이미 다른 스터디원이 분석을 요청 중입니다.", "info");
    }

    await updateDoc(qRef, { isAIFetching: true });

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin-custom"></i> AI 분석 요청 중...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const questionDoc = state.qaQuestions.find(q => q.id === questionId);
    const allAnswers = state.qaAnswers.filter(a => a.questionId === questionId);
    
    const answersPrompt = allAnswers.map(a => `- ${a.userName}: ${a.answerText}`).join('\n');

    let contextWorks = questionDoc.relatedWorks || [];
    let authorHint = "";

    // 🌟 작가명 힌트 주입 로직
    if (contextWorks.length === 0 && questionDoc.workName) {
        const cleanInput = questionDoc.workName.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
        let targetKey = Object.keys(state.workIndex).find(k => {
            const cleanKey = k.replace(/^\d+\.\s*/, '').replace(/\s+/g, '').toLowerCase();
            const rawKeyNum = k.split('.')[0];
            if(cleanKey === cleanInput || cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey)) return true;
            if (rawKeyNum === cleanInput.padStart(3, '0')) return true;
            if(cleanKey.length >= 3 && cleanInput.length >= 3 && cleanKey.substring(0,2) === cleanInput.substring(0,2) && cleanKey.substring(cleanKey.length-2) === cleanInput.substring(cleanInput.length-2)) return true;
            return false;
        });
        
        const targetData = targetKey ? state.workIndex[targetKey] : null;
        
        if (targetData) {
            if (targetData.author) authorHint = `\n작가: ${targetData.author}`;

            for (const [wName, wData] of Object.entries(state.workIndex)) {
                if (wData.file === targetData.file && Math.abs(wData.bookPage - targetData.bookPage) <= 1) {
                    contextWorks.push(wName);
                }
            }
        }
    }

    const labels = ['가', '나', '다', '라', '마', '바'];
    const mapping = contextWorks.map((w, i) => `(${labels[i]})='${w}'`).join(', ');
    const contextHint = contextWorks.length > 0 
        ? `\n[※시스템 자동 매칭: 출제자 질문에 (가), (나), (다) 기호가 있다면 반드시 다음 순서대로 작품을 매칭하여 채점할 것: ${mapping}]` 
        : '';

    const promptText = `
과목: ${state.subjectName}
메인 작품: ${state.qaCurrentWork}${authorHint}${contextHint}
문제: ${questionDoc.questionText}
답안:
${answersPrompt}

[지시사항]
1. 당신은 국어 임용고시 출제위원입니다.
2. 위 '메인 작품' 및 문제에 제시된 '외부 연계 작품'의 **실제 원문 텍스트와 문학사적 맥락**을 당신의 지식 베이스에서 명확히 검색하고 파악해 낸 후, 이를 바탕으로 엄격히 채점하세요. (단순히 제목만 보고 유추하여 엉뚱한 해설을 하지 마십시오.)
3. 학생들의 답안을 평가하여 JSON으로 응답하세요.

{"modelAnswer":"명쾌한 모범 답안(Markdown)","generalFeedback":"각 학생별(- **이름**:) 짧은 핵심 피드백(1~2줄)"}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                startCooldown(`req-ai-btn-${questionId}`, 60, originalHtml);
                throw new Error("분당 요청 한도가 초과되었습니다. 60초 후에 자동으로 활성화됩니다.");
            } else if (response.status === 503) {
                throw new Error("구글 서버가 일시적으로 혼잡합니다. 잠시 후 다시 눌러주세요.");
            }
            throw new Error("AI 서버 통신 오류가 발생했습니다.");
        }
        
        const data = await response.json();
        const resultJson = JSON.parse(data.candidates[0].content.parts[0].text);

        await updateDoc(qRef, {
            aiFeedback: {
                modelAnswer: resultJson.modelAnswer,
                generalFeedback: resultJson.generalFeedback,
                requestedBy: state.user.uid,
                timestamp: Date.now()
            },
            isAIFetching: false
        });

        showToast("AI 선생님의 피드백이 도착했습니다!", "success");

    } catch(e) {
        await updateDoc(qRef, { isAIFetching: false });
        showToast(e.message, "error");
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// --- 기출 연계 모의고사 관련 로직 ---

export function updateMockView() {
    const w = document.getElementById('mock-week-filter').value;
    const empty = document.getElementById('mock-empty-state');
    const container = document.getElementById('mock-list-container');
    const info = document.getElementById('mock-works-info');

    if (!w) {
        empty.classList.remove('hidden');
        container.innerHTML = '';
        info.innerHTML = '';
        return;
    }

    empty.classList.add('hidden');
    const works = [...new Set(state.allSubmissions.filter(s => s.subject === state.subjectName && String(s.week) === String(w) && !s.isDeleted).map(s => s.workName))];
    
    if (works.length > 0) {
        info.innerHTML = `<i data-lucide="book-open" class="w-3 h-3 inline mr-1"></i> 이번 주차 학습 작품: ${works.join(', ')}`;
    } else {
        info.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3 inline mr-1 text-amber-500"></i> 이 주차에 등록된 작품 기록이 없어 모의고사를 생성할 수 없습니다.`;
    }

    renderMockExams();
}

export async function generateMockExam() {
    if(!state.user) return;
    const w = document.getElementById('mock-week-filter').value;
    if(!w) return showToast("주차를 먼저 선택해주세요.", "error");

    const works = [...new Set(state.allSubmissions.filter(s => s.subject === state.subjectName && String(s.week) === String(w) && !s.isDeleted).map(s => s.workName))];
    if (works.length === 0) {
        return showToast("이 주차에 등록된 작품이 없어 모의고사를 만들 수 없습니다.", "error");
    }
    
    const lockRef = doc(state.db, 'artifacts', state.appId, 'public', 'data', 'studyInfo', 'mockLock');
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists() && lockSnap.data().isGenerating && (Date.now() - lockSnap.data().timestamp < 40000)) {
        return showToast("현재 다른 스터디원이 모의고사를 출제 중입니다. 잠시만 기다려주세요.", "error");
    }
    await setDoc(lockRef, { isGenerating: true, timestamp: Date.now() });

    const btn = document.getElementById('generate-mock-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin-custom"></i> 출제 중...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const promptText = `대상 과목: ${state.subjectName}
대상 작품: [${works.join(', ')}]
위 작품을 활용하여 전공 국어 임용 서술형 모의고사(3~4문항) 출제 요망.

[조건]
1. 지문/보기는 마크다운 인용구(>) 사용
2. 문항 제목은 "### [문제 n]" 형식
3. 아래 JSON 형식으로 응답

{"examText":"지문(> 사용) 및 문제","rubricText":"문제별 출제 의도, 모범답안, 채점기준"}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                startCooldown('generate-mock-btn', 60, originalHtml);
                throw new Error("분당 요청 한도가 초과되었습니다. 60초 후에 자동으로 활성화됩니다.");
            } else if (response.status === 503) {
                throw new Error("구글 서버가 일시적으로 혼잡합니다. 잠시 후 다시 눌러주세요.");
            }
            throw new Error("AI 서버 통신 오류가 발생했습니다.");
        }
        const data = await response.json();
        const resultJson = JSON.parse(data.candidates[0].content.parts[0].text);

        await addDoc(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_exams'), {
            subject: state.subjectName,
            week: w,
            works: works,
            examText: resultJson.examText,
            rubricText: resultJson.rubricText,
            requestedBy: state.user.uid,
            timestamp: Date.now()
        });

        showToast(`${state.subjectName} AI 기출 연계 모의고사가 성공적으로 생성되었습니다!`, "success");
    } catch(e) {
        showToast(e.message, "error");
    } finally {
        await setDoc(lockRef, { isGenerating: false, timestamp: Date.now() }); 
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

export async function submitMockAnswer(examId) {
    if(!state.user) return;
    const textarea = document.getElementById(`mock-ans-${examId}`);
    const btn = document.getElementById(`mock-btn-${examId}`);
    const answerText = textarea.value.trim();

    if(!answerText) return showToast("답안을 입력해주세요.", "error");

    const exam = state.mockExams.find(m => m.id === examId);
    if(!exam) return;

    const originalHtml = btn.innerHTML;
    textarea.disabled = true;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin-custom"></i> AI 채점 중...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const promptText = `
[채점 기준]
${exam.rubricText}

[학생 답안]
${answerText}

위 채점 기준에 따라 학생 답안을 엄격히 평가하고 JSON으로 응답.
{"score":정수(0~100),"feedback":"잘한 점과 부족한 점 피드백(3~4문장)"}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                startCooldown(`mock-btn-${examId}`, 60, originalHtml);
                throw new Error("분당 요청 한도가 초과되었습니다. 60초 후에 자동으로 활성화됩니다.");
            } else if (response.status === 503) {
                throw new Error("구글 서버가 일시적으로 혼잡합니다. 잠시 후 다시 눌러주세요.");
            }
            throw new Error("채점 API 오류가 발생했습니다.");
        }
        const data = await response.json();
        const resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
        const userName = await getUserName(state.db);

        await addDoc(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_answers'), {
            examId: examId,
            userId: state.user.uid,
            userName: userName,
            answerText: answerText,
            score: resultJson.score,
            feedback: resultJson.feedback,
            timestamp: Date.now()
        });
        
        showToast("답안 제출 및 채점이 완료되었습니다!", "success");
    } catch(e) {
        showToast(e.message, "error");
        textarea.disabled = false;
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

export function renderMockExams() {
    const w = document.getElementById('mock-week-filter').value;
    if (!w) return;
    const container = document.getElementById('mock-list-container');
    const mocks = state.mockExams.filter(m => m.subject === state.subjectName && String(m.week) === String(w));

    if (mocks.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-[10px] text-slate-400 font-bold border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl">생성된 기출 연계 모의고사가 없습니다.<br>위 버튼을 눌러 AI를 통해 새 모의고사를 출제해보세요.</div>`;
        return;
    }

    container.innerHTML = mocks.map(m => {
        const allAnswers = state.mockAnswers.filter(a => a.examId === m.id);
        const myAnswer = allAnswers.find(a => a.userId === state.user.uid);
        const isAuthor = m.requestedBy === state.user.uid;
        
        const examText = m.examText || m.examContent;
        const rubricText = m.rubricText || "구버전 데이터입니다. 모범 답안이 분리되어 있지 않습니다.";

        let contentHtml = '';

        if (myAnswer) {
            contentHtml = `
                <div class="mt-4 border-t border-emerald-200 dark:border-emerald-800/50 pt-4">
                    <h4 class="font-black text-emerald-800 dark:text-emerald-300 text-sm mb-3 flex items-center"><i data-lucide="check-circle" class="w-4 h-4 mr-1.5"></i> 출제 의도 및 모범 답안</h4>
                    <div class="prose prose-slate prose-sm dark:prose-invert max-w-none text-xs break-words bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                        ${marked.parse(rubricText)}
                    </div>
                </div>
                
                <div class="mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center"><i data-lucide="user" class="w-3.5 h-3.5 mr-1 text-emerald-600"></i>🌟 내 제출 답안 및 결과</span>
                        <span class="text-[11px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">AI 점수: ${myAnswer.score}점</span>
                    </div>
                    <p class="text-xs text-slate-800 dark:text-slate-300 whitespace-pre-wrap mb-4 pl-3 border-l-2 border-emerald-400 leading-relaxed">${myAnswer.answerText}</p>
                    <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50 leading-relaxed">
                        <i data-lucide="bot" class="w-3.5 h-3.5 inline mb-0.5 mr-1 text-emerald-600"></i> ${myAnswer.feedback}
                    </div>
                    <div class="flex justify-end mt-3">
                        <button onclick="window.StudyApp.editMockAnswer('${myAnswer.id}', '${m.id}')" class="text-[10px] font-bold text-emerald-500 hover:text-emerald-700 underline underline-offset-2 transition-colors">답안 수정하기</button>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="mt-4 relative bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p class="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center"><i data-lucide="lock" class="w-3.5 h-3.5 mr-1 text-emerald-500"></i> 나의 답안을 제출해야 AI 모범 답안을 확인할 수 있습니다. (다른 사람의 답안은 보이지 않습니다.)</p>
                    <textarea id="mock-ans-${m.id}" class="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none resize-none focus:border-emerald-500 transition-all custom-scrollbar" rows="5" placeholder="실제 시험처럼 답안을 작성해 보세요..."></textarea>
                    <div class="flex justify-end mt-2">
                        <button id="mock-btn-${m.id}" onclick="window.StudyApp.submitMockAnswer('${m.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center">
                            <i data-lucide="pen-tool" class="w-3.5 h-3.5 mr-1.5"></i> 답안 제출 및 AI 자동 채점
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 shadow-md mb-4">
                <div class="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div class="flex items-center space-x-2">
                        <div class="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 p-1.5 rounded"><i data-lucide="graduation-cap" class="w-4 h-4"></i></div>
                        <span class="font-black text-sm text-slate-800 dark:text-slate-100">AI 기출 연계 모의고사</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-[10px] text-slate-400 font-bold">${new Date(m.timestamp).toLocaleDateString()}</span>
                        ${isAuthor ? `<button onclick="window.StudyApp.deleteMockExam('${m.id}')" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="기출 삭제"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
                    </div>
                </div>
                <div class="exam-paper prose prose-slate prose-sm dark:prose-invert max-w-none text-xs break-words mb-6">
                    ${marked.parse(examText)}
                </div>
                ${contentHtml}
            </div>
        `;
    }).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

export async function editMockAnswer(answerId, examId) {
    const answer = state.mockAnswers.find(a => a.id === answerId);
    if(!answer) return;
    const text = answer.answerText;
    try {
        await deleteDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_answers', answerId));
        showToast("수정 모드: 작성하신 답안을 입력칸에 복원했습니다.");
        setTimeout(() => {
            const ta = document.getElementById(`mock-ans-${examId}`);
            if(ta) {
                ta.value = text;
                ta.focus();
            }
        }, 300);
    } catch(e) {
        showToast("수정 모드 전환 실패", "error");
    }
}

export function deleteMockExam(examId) {
    const modal = document.getElementById('delete-modal');
    document.getElementById('delete-modal-desc').textContent = "이 모의고사와 관련된 모든 학생의 답안 기록이 함께 영구 삭제됩니다. 계속하시겠습니까?";
    modal.classList.remove('hidden');
    
    document.getElementById('confirm-delete-btn').onclick = async () => {
        modal.classList.add('hidden');
        showToast("삭제 중입니다...", "info");
        try {
            const ansQuery = query(collection(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_answers'), where('examId', '==', examId));
            const ansSnap = await getDocs(ansQuery);
            const deletePromises = [];
            ansSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
            
            deletePromises.push(deleteDoc(doc(state.db, 'artifacts', state.appId, 'public', 'data', 'mock_exams', examId)));
            await Promise.all(deletePromises);
            
            showToast("모의고사가 삭제되었습니다.", "success");
        } catch(e) {
            showToast("삭제 실패: " + e.message, "error");
        }
    };
}
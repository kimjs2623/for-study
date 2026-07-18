// shared/js/utils.js

import { state } from './state.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// 주의: db 객체는 추후 생성할 firebaseCore.js에서 가져와야 하므로 일단 전역에서 주입받거나 넘겨받도록 설계합니다.

export function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl shadow-2xl border text-[10px] font-black transition-all duration-300 z-[1000000] pointer-events-auto flex items-center ${type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-brand-50 text-brand-600 border-brand-200'}`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'info'}" class="w-4 h-4 mr-2"></i><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
}

export function startCooldown(btnId, seconds, originalHtml) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    let timeLeft = seconds;
    btn.disabled = true;
    
    const originalClasses = btn.className;
    btn.className = btn.className.replace(/bg-\w+-\d00/g, 'bg-red-500').replace(/hover:bg-\w+-\d00/g, '');

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            btn.className = originalClasses;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            btn.innerHTML = `<i data-lucide="timer" class="w-3.5 h-3.5 mr-1.5"></i> 한도 초과: ${timeLeft}초 대기...`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }, 1000);
}

export function getRangeText(daysArray) {
    if (!daysArray || daysArray.length === 0) return '진도 범위를 선택해주세요.';
    
    const sortedDays = [...daysArray].map(Number).sort((a, b) => a - b);
    const first = sortedDays[0];
    const last = sortedDays[sortedDays.length - 1];
    
    if (!state.dayMap[first - 1] || !state.dayMap[last - 1]) return `Day ${first}~${last} (진도 매핑 필요)`;

    const minWorks = state.dayMap[first - 1].split('-')[0];
    const maxWorks = state.dayMap[last - 1].split('-')[1] || state.dayMap[last - 1];
    
    if (first === last) return `Day ${first} (${minWorks}~${maxWorks}번)`;
    return `Day ${first}~${last} (${minWorks}~${maxWorks}번)`;
}

export async function getUserName(db) {
    if (!state.user) return "익명";
    
    if (state.user.displayName) return state.user.displayName;

    const localName = localStorage.getItem('userName') || localStorage.getItem('nickname');
    if (localName) return localName;

    try {
        const profileRef = doc(db, 'artifacts', state.appId, 'users', state.user.uid, 'profile', 'data');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().name) return profileSnap.data().name;
    } catch (e) {
        console.error("이름 가져오기 실패:", e);
    }
    
    return "스터디원";
}
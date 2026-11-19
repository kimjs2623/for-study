// shared/js/game/reaction.js

const TOTAL_ROUNDS = 5;

export function mountReactionGame(stageEl, ctx) {
    let status = 'idle'; // 'idle' | 'waiting' | 'ready' | 'early' | 'done'
    let round = 0;
    let records = [];
    let greenTimestamp = 0;
    let waitTimer = null;

    function syncRankBar() {
        const allRanks = ctx.getRanks() || {};
        ctx.renderRankBar({
            title: '반응속도 (5회 평균) 최단 기록',
            scores: allRanks.reaction || {},
            unit: 'ms',
            lowerIsBetter: true
        });
    }

    function startWaiting() {
        clearTimeout(waitTimer);
        status = 'waiting';
        render();

        const delay = 1400 + Math.floor(Math.random() * 2400);
        waitTimer = setTimeout(() => {
            status = 'ready';
            greenTimestamp = performance.now();
            render();
        }, delay);
    }

    async function handlePadTrigger() {
        if (status === 'idle' || status === 'done') {
            round = 1;
            records = [];
            startWaiting();
            return;
        }

        if (status === 'waiting') {
            clearTimeout(waitTimer);
            status = 'early';
            render();
            return;
        }

        if (status === 'early') {
            startWaiting();
            return;
        }

        if (status === 'ready') {
            const diff = Math.max(1, Math.round(performance.now() - greenTimestamp));
            records.push(diff);

            if (round < TOTAL_ROUNDS) {
                round++;
                startWaiting();
            } else {
                status = 'done';
                const avg = Math.round(records.reduce((a, b) => a + b, 0) / records.length);
                render(avg);

                const res = await ctx.onSaveRank(['reaction'], avg, true);
                if (res?.isNewRecord) {
                    ctx.onNotify(`⚡ [반응속도] 신기록 달성! 평균 ${avg}ms`, 'success');
                } else if (res?.best !== undefined) {
                    ctx.onNotify(`⚡ 측정 완료! 평균 ${avg}ms (내 최고: ${res.best}ms)`, 'success');
                }
            }
        }
    }

    function render(finalAvg = null) {
        const padEl = stageEl.querySelector('#rx-pad');
        const infoEl = stageEl.querySelector('#rx-rounds');
        if (!padEl) return;

        infoEl.innerHTML = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
            const val = records[i];
            return `<span class="px-2.5 py-1 rounded-lg text-xs font-bold ${val !== undefined ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400'}">
                ${i + 1}회: ${val !== undefined ? `${val}ms` : '-'}
            </span>`;
        }).join('');

        const styles = {
            idle:    'bg-indigo-600 hover:bg-indigo-700 text-white',
            waiting: 'bg-rose-500 text-white',
            early:   'bg-amber-500 text-white',
            ready:   'bg-emerald-500 text-white',
            done:    'bg-slate-800 dark:bg-slate-900 text-white border-2 border-indigo-500'
        };

        const contents = {
            idle:    `<p class="text-xl font-black mb-1">⚡ 터치하여 시작</p><p class="text-xs opacity-85">화면이 초록색으로 바뀌는 순간 즉시 클릭하세요 (총 5회 평균)</p>`,
            waiting: `<p class="text-xs font-bold opacity-80 mb-1">${round} / ${TOTAL_ROUNDS} 라운드</p><p class="text-2xl font-black">기다리세요...</p><p class="text-xs opacity-85 mt-1">초록색이 되면 누르세요</p>`,
            early:   `<p class="text-2xl font-black mb-1">⚠️ 너무 빨랐습니다!</p><p class="text-xs opacity-90">초록색으로 바뀐 뒤에 눌러야 합니다. 터치해서 다시 시도</p>`,
            ready:   `<p class="text-3xl font-black tracking-tight">지금 클릭!!</p>`,
            done:    `<p class="text-xs font-bold text-indigo-300 mb-1">5라운드 평균 반응속도</p><p class="text-3xl font-black text-emerald-400 mb-2">${finalAvg} ms</p><p class="text-xs text-slate-300">다시 측정하려면 박스를 터치하세요</p>`
        };

        padEl.className = `w-full h-52 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none shadow-md transition-colors ${styles[status]}`;
        padEl.innerHTML = contents[status];
    }

    stageEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div id="rx-rounds" class="flex flex-wrap gap-1.5"></div>
            <button type="button" id="rx-reset" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200">초기화</button>
        </div>
        <div id="rx-pad"></div>
    `;

    const padEl = stageEl.querySelector('#rx-pad');
    const resetBtn = stageEl.querySelector('#rx-reset');

    const onPointerDown = (e) => {
        e.preventDefault();
        handlePadTrigger();
    };
    const onReset = () => {
        clearTimeout(waitTimer);
        status = 'idle';
        round = 0;
        records = [];
        render();
    };

    padEl.addEventListener('pointerdown', onPointerDown);
    resetBtn.addEventListener('click', onReset);
    stageEl._onRankUpdate = syncRankBar;

    render();
    syncRankBar();

    return () => {
        clearTimeout(waitTimer);
        padEl.removeEventListener('pointerdown', onPointerDown);
        resetBtn.removeEventListener('click', onReset);
        delete stageEl._onRankUpdate;
    };
}
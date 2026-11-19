// shared/js/game/game2048.js

export function mountGame2048(stageEl, ctx) {
    let grid = [];
    let score = 0;
    let gameOver = false;
    let hasAnnouncedRecord = false;

    function syncRankBar() {
        const allRanks = ctx.getRanks() || {};
        ctx.renderRankBar({
            title: '2048 최고 점수 랭킹',
            scores: allRanks.game2048 || {},
            unit: '점',
            lowerIsBetter: false
        });
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) empty.push([r, c]);
            }
        }
        if (empty.length === 0) return;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    function resetGame() {
        grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
        score = 0;
        gameOver = false;
        hasAnnouncedRecord = false;
        addRandomTile();
        addRandomTile();
        render();
        syncRankBar();
    }

    function slideRow(row) {
        const arr = row.filter(v => v !== 0);
        let gained = 0;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                gained += arr[i];
                arr.splice(i + 1, 1);
            }
        }
        while (arr.length < 4) arr.push(0);
        return { row: arr, gained };
    }

    function checkCanMove() {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) return true;
                if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
                if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
            }
        }
        return false;
    }

    async function move(dir) {
        if (gameOver) return;
        const prev = JSON.stringify(grid);
        let totalGained = 0;

        if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < 4; r++) {
                const target = dir === 'right' ? [...grid[r]].reverse() : [...grid[r]];
                const { row, gained } = slideRow(target);
                totalGained += gained;
                grid[r] = dir === 'right' ? row.reverse() : row;
            }
        } else {
            for (let c = 0; c < 4; c++) {
                const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
                const target = dir === 'down' ? col.reverse() : col;
                const { row, gained } = slideRow(target);
                totalGained += gained;
                const finalCol = dir === 'down' ? row.reverse() : row;
                for (let r = 0; r < 4; r++) grid[r][c] = finalCol[r];
            }
        }

        if (JSON.stringify(grid) === prev) return;

        score += totalGained;
        addRandomTile();

        if (!checkCanMove()) {
            gameOver = true;
        }
        render();

        if (score > 0) {
            const res = await ctx.onSaveRank(['game2048'], score, false);
            if (res?.isNewRecord && !hasAnnouncedRecord) {
                hasAnnouncedRecord = true;
                ctx.onNotify(`🎉 [2048] 개인 최고 기록 갱신 중! (${score.toLocaleString()}점)`, 'success');
            }
        }
    }

    function getTileStyle(val) {
        const map = {
            0:    'bg-slate-200/70 dark:bg-slate-800 text-transparent',
            2:    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100',
            4:    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
            8:    'bg-orange-300 text-white',
            16:   'bg-orange-500 text-white',
            32:   'bg-rose-500 text-white',
            64:   'bg-red-600 text-white',
            128:  'bg-amber-400 text-white shadow-md',
            256:  'bg-yellow-500 text-white shadow-md',
            512:  'bg-emerald-500 text-white shadow-md',
            1024: 'bg-indigo-500 text-white shadow-lg',
            2048: 'bg-purple-600 text-white shadow-lg ring-2 ring-amber-300'
        };
        return map[val] || 'bg-slate-900 text-amber-300 shadow-lg';
    }

    function render() {
        const scoreEl = stageEl.querySelector('#g2048-score');
        const boardEl = stageEl.querySelector('#g2048-board');
        const overEl = stageEl.querySelector('#g2048-over');
        if (!boardEl) return;

        scoreEl.textContent = score.toLocaleString();
        overEl.classList.toggle('hidden', !gameOver);

        boardEl.innerHTML = grid.map(row => row.map(val => `
            <div class="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl flex items-center justify-center font-black ${val >= 1000 ? 'text-lg' : 'text-xl'} select-none transition-colors ${getTileStyle(val)}">
                ${val > 0 ? val : ''}
            </div>
        `).join('')).join('');
    }

    stageEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">키보드 방향키 또는 보드 드래그(스와이프)로 합치세요</span>
            <div class="flex items-center gap-2">
                <span class="text-xs font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3.5 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/40">점수: <span id="g2048-score">0</span></span>
                <button type="button" id="g2048-reset" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200">새 게임</button>
            </div>
        </div>

        <div class="flex flex-col items-center justify-center py-1">
            <div class="relative touch-none" id="g2048-touch-area">
                <div id="g2048-board" class="grid grid-cols-4 gap-2 bg-slate-300 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner"></div>
                <div id="g2048-over" class="hidden absolute inset-0 bg-slate-900/75 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4">
                    <p class="text-lg font-black mb-1">게임 오버!</p>
                    <p class="text-xs text-slate-300 mb-3">더 이상 움직일 칸이 없습니다.</p>
                    <button type="button" id="g2048-retry" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black">다시 도전</button>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-1.5 mt-3 sm:hidden">
                <div></div>
                <button type="button" data-dir="up" class="w-11 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200">↑</button>
                <div></div>
                <button type="button" data-dir="left" class="w-11 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200">←</button>
                <button type="button" data-dir="down" class="w-11 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200">↓</button>
                <button type="button" data-dir="right" class="w-11 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200">→</button>
            </div>
        </div>
    `;

    const onKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        if (keyMap[e.key]) {
            e.preventDefault();
            move(keyMap[e.key]);
        }
    };

    let touchStartX = 0, touchStartY = 0;
    const touchArea = stageEl.querySelector('#g2048-touch-area');
    const onTouchStart = (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    };
    const onTouchEnd = (e) => {
        if (e.changedTouches.length === 1) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
            if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
            else move(dy > 0 ? 'down' : 'up');
        }
    };

    const onClick = (e) => {
        if (e.target.closest('#g2048-reset') || e.target.closest('#g2048-retry')) {
            resetGame();
            return;
        }
        const dirBtn = e.target.closest('[data-dir]');
        if (dirBtn) move(dirBtn.dataset.dir);
    };

    window.addEventListener('keydown', onKeyDown);
    touchArea.addEventListener('touchstart', onTouchStart, { passive: true });
    touchArea.addEventListener('touchend', onTouchEnd, { passive: true });
    stageEl.addEventListener('click', onClick);
    stageEl._onRankUpdate = syncRankBar;

    resetGame();

    return () => {
        window.removeEventListener('keydown', onKeyDown);
        touchArea.removeEventListener('touchstart', onTouchStart);
        touchArea.removeEventListener('touchend', onTouchEnd);
        stageEl.removeEventListener('click', onClick);
        delete stageEl._onRankUpdate;
    };
}
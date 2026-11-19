// shared/js/game/minesweeper.js

const DIFFICULTIES = {
    easy:   { label: '초급', rows: 9,  cols: 9,  mines: 10 },
    medium: { label: '중급', rows: 16, cols: 16, mines: 40 },
    hard:   { label: '고급', rows: 16, cols: 30, mines: 99 }
};

export function mountMinesweeper(stageEl, ctx) {
    const game = {
        difficulty: 'easy',
        board: [],
        started: false,
        over: false,
        won: false,
        flagMode: false,
        elapsed: 0,
        timerId: null
    };

    const getConfig = () => DIFFICULTIES[game.difficulty] || DIFFICULTIES.easy;

    function syncRankBar() {
        const allRanks = ctx.getRanks() || {};
        const msRanks = allRanks.minesweeper || {};
        const { label } = getConfig();
        ctx.renderRankBar({
            title: `지뢰찾기 [${label}] 최단 기록`,
            scores: msRanks[game.difficulty] || {},
            unit: '초',
            lowerIsBetter: true
        });
    }

    function resetBoard() {
        clearInterval(game.timerId);
        game.timerId = null;
        game.started = false;
        game.over = false;
        game.won = false;
        game.elapsed = 0;

        const { rows, cols } = getConfig();
        game.board = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => ({
                r, c, isMine: false, revealed: false, flagged: false, count: 0, exploded: false
            }))
        );
        renderBoard();
        syncRankBar();
    }

    function placeMines(safeR, safeC) {
        const { rows, cols, mines } = getConfig();
        let placed = 0;
        while (placed < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
            if (!game.board[r][c].isMine) {
                game.board[r][c].isMine = true;
                placed++;
            }
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (game.board[r][c].isMine) continue;
                let cnt = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && game.board[nr][nc].isMine) cnt++;
                    }
                }
                game.board[r][c].count = cnt;
            }
        }
    }

    function revealCell(r, c) {
        const { rows, cols } = getConfig();
        const cell = game.board[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        if (cell.isMine) {
            cell.exploded = true;
            finishGame(false);
            return;
        }

        if (cell.count === 0) {
            const queue = [[r, c]];
            while (queue.length > 0) {
                const [cr, cc] = queue.shift();
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = cr + dr, nc = cc + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            const next = game.board[nr][nc];
                            if (!next.revealed && !next.flagged && !next.isMine) {
                                next.revealed = true;
                                if (next.count === 0) queue.push([nr, nc]);
                            }
                        }
                    }
                }
            }
        }
        checkWin();
    }

    function chordReveal(r, c) {
        const { rows, cols } = getConfig();
        const cell = game.board[r][c];
        if (!cell.revealed || cell.count === 0) return;

        let flagCount = 0;
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const nCell = game.board[nr][nc];
                    if (nCell.flagged) flagCount++;
                    else if (!nCell.revealed) neighbors.push([nr, nc]);
                }
            }
        }
        if (flagCount === cell.count) {
            for (const [nr, nc] of neighbors) {
                if (!game.over) revealCell(nr, nc);
            }
        }
    }

    function checkWin() {
        if (game.over) return;
        const { rows, cols, mines } = getConfig();
        let revealedSafe = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (game.board[r][c].revealed && !game.board[r][c].isMine) revealedSafe++;
            }
        }
        if (revealedSafe === rows * cols - mines) finishGame(true);
    }

    async function finishGame(isWin) {
        game.over = true;
        game.won = isWin;
        clearInterval(game.timerId);
        game.timerId = null;

        const { rows, cols, label } = getConfig();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = game.board[r][c];
                if (cell.isMine) {
                    if (isWin) cell.flagged = true;
                    else cell.revealed = true;
                }
            }
        }
        renderBoard();

        if (isWin) {
            const res = await ctx.onSaveRank(['minesweeper', game.difficulty], game.elapsed, true);
            if (res?.isNewRecord) {
                ctx.onNotify(`🎉 [지뢰찾기 ${label}] 신기록 달성! (${game.elapsed}초)`, 'success');
            } else if (res?.best !== undefined) {
                ctx.onNotify(`[지뢰찾기 ${label}] 클리어! (${game.elapsed}초 / 내 최고: ${res.best}초)`, 'success'); } } }  function renderBoard() { const gridEl = stageEl.querySelector('#ms-grid'); const flagLeftEl = stageEl.querySelector('#ms-flags'); const timerEl = stageEl.querySelector('#ms-timer'); const resetBtn = stageEl.querySelector('#ms-reset'); const flagBtn = stageEl.querySelector('#ms-flag-mode'); if (!gridEl) return;  const { cols, mines } = getConfig(); let flagsUsed = 0; game.board.forEach(row => row.forEach(c => { if (c.flagged) flagsUsed++; }));  flagLeftEl.textContent = String(mines - flagsUsed).padStart(2, '0'); timerEl.textContent = String(Math.min(game.elapsed, 999)).padStart(3, '0'); resetBtn.textContent = game.over ? (game.won ? '😎' : '😵') : '🙂';  stageEl.querySelectorAll('[data-ms-diff]').forEach(btn => { const active = btn.dataset.msDiff === game.difficulty; btn.className = active ? "px-3 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-sm" : "px-3 py-1 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700"; });  flagBtn.className = game.flagMode ? "px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white shadow-sm" : "px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200";  const numColors = ['', 'text-blue-600 dark:text-blue-400', 'text-emerald-600 dark:text-emerald-400', 'text-rose-600 dark:text-rose-400', 'text-indigo-700 dark:text-indigo-400', 'text-amber-700', 'text-cyan-600', 'text-slate-800', 'text-slate-500'];  gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        gridEl.innerHTML = game.board.map(row => row.map(cell => {
            if (!cell.revealed) {
                return `<button type="button" data-r="${cell.r}" data-c="${cell.c}"
                    class="w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-black select-none shadow-sm active:scale-95 transition-transform">
                    ${cell.flagged ? '🚩' : ''}
                </button>`;
            }
            if (cell.isMine) {
                return `<div class="w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-md ${cell.exploded ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800'} border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs select-none">💣</div>`;
            }
            return `<div data-r="${cell.r}" data-c="${cell.c}"
                class="w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-md bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-xs font-black select-none cursor-default ${numColors[cell.count] || ''}">
                ${cell.count > 0 ? cell.count : ''}
            </div>`;
        }).join('')).join('');
    }

    stageEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button type="button" data-ms-diff="easy">초급 (9×9)</button>
                <button type="button" data-ms-diff="medium">중급 (16×16)</button>
                <button type="button" data-ms-diff="hard">고급 (30×16)</button>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-black bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-800/40">🚩 <span id="ms-flags">10</span></span>
                <span class="text-xs font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/40">⏱ <span id="ms-timer">000</span>s</span>
                <button type="button" id="ms-flag-mode">🚩 깃발 모드</button>
                <button type="button" id="ms-reset" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-base shadow-sm" title="새 게임">🙂</button>
            </div>
        </div>
        <div class="w-full overflow-x-auto py-2 flex justify-center">
            <div id="ms-grid" class="inline-grid gap-1 bg-slate-300/70 dark:bg-slate-900 p-2 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner"></div>
        </div>
    `;

    const onClick = (e) => {
        const diffBtn = e.target.closest('[data-ms-diff]');
        if (diffBtn) {
            game.difficulty = diffBtn.dataset.msDiff;
            resetBoard();
            return;
        }
        if (e.target.closest('#ms-flag-mode')) {
            game.flagMode = !game.flagMode;
            renderBoard();
            return;
        }
        if (e.target.closest('#ms-reset')) {
            resetBoard();
            return;
        }
        const cellEl = e.target.closest('[data-r][data-c]');
        if (cellEl && !game.over) {
            const r = Number(cellEl.dataset.r), c = Number(cellEl.dataset.c);
            const cell = game.board[r][c];
            if (!game.started) {
                game.started = true;
                placeMines(r, c);
                game.timerId = setInterval(() => {
                    game.elapsed++;
                    const t = stageEl.querySelector('#ms-timer');
                    if (t) t.textContent = String(Math.min(game.elapsed, 999)).padStart(3, '0');
                }, 1000);
            }
            if (cell.revealed) chordReveal(r, c);
            else if (game.flagMode) cell.flagged = !cell.flagged;
            else revealCell(r, c);

            if (!game.over) renderBoard();
        }
    };

    const onContextMenu = (e) => {
        const cellEl = e.target.closest('[data-r][data-c]');
        if (cellEl) {
            e.preventDefault();
            if (game.over) return;
            const cell = game.board[Number(cellEl.dataset.r)][Number(cellEl.dataset.c)];
            if (!cell.revealed) {
                cell.flagged = !cell.flagged;
                renderBoard();
            }
        }
    };

    stageEl.addEventListener('click', onClick);
    stageEl.addEventListener('contextmenu', onContextMenu);
    stageEl._onRankUpdate = syncRankBar;

    resetBoard();

    return () => {
        clearInterval(game.timerId);
        stageEl.removeEventListener('click', onClick);
        stageEl.removeEventListener('contextmenu', onContextMenu);
        delete stageEl._onRankUpdate;
    };
}
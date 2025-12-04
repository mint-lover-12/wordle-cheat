// ==UserScript==
// @name         Wordle Solver
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  yippeee i cheat in wordle!
// @author       mintlover12
// @match        https://www.nytimes.com/games/wordle/*
// @icon         https://www.nytimes.com/games/wordle/images/favicon-32x32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      gist.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const WORDLIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/6bfa15d263d6d5b63840a8e5b64e04b382fdb079/valid-wordle-words.txt';

    let fullWordList = [];
    let possibleWords = [];
    let isBotRunning = false;
    let blacklistedWords = new Set();

    // confgi :#
    let useEntropy = false;
    let usePresets = false;
    let presetString = GM_getValue('wg_preset_str', 'salet, audio');

    const css = `
        #wg-container {
            position: fixed; top: 20px; right: 20px; width: 280px;
            background: rgba(18, 18, 19, 0.95);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            border-radius: 12px; color: #fff;
            font-family: 'Helvetica Neue', Arial, sans-serif; z-index: 999999;
            transition: 0.3s;
        }
        #wg-header {
            padding: 12px 15px; background: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex; justify-content: space-between; align-items: center;
            cursor: grab; user-select: none;
        }
        #wg-content { padding: 15px; }
        .wg-btn {
            border: none; padding: 10px; border-radius: 6px; width: 100%;
            font-weight: bold; cursor: pointer; margin-bottom: 10px;
            text-transform: uppercase; font-size: 11px; letter-spacing: 1px;
            color: white; transition: 0.2s;
        }
        #wg-bot-btn { background: #538d4e; box-shadow: 0 4px 15px rgba(83, 141, 78, 0.3); }
        #wg-bot-btn:hover { background: #467a42; transform: translateY(-1px); }

        .wg-setting-row {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 8px; font-size: 12px; color: #ccc;
        }
        .wg-switch { position: relative; display: inline-block; width: 34px; height: 18px; }
        .wg-switch input { opacity: 0; width: 0; height: 0; }
        .wg-slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: #3a3a3c; transition: .4s; border-radius: 34px;
        }
        .wg-slider:before {
            position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px;
            background-color: white; transition: .4s; border-radius: 50%;
        }
        input:checked + .wg-slider { background-color: #538d4e; }
        input:checked + .wg-slider:before { transform: translateX(16px); }

        #wg-preset-input {
            width: 100%; background: #222; border: 1px solid #444; color: #ddd;
            padding: 5px; border-radius: 4px; font-size: 11px; margin-bottom: 10px;
            box-sizing: border-box; display: none;
        }
        .show-presets #wg-preset-input { display: block; }

        .wg-row {
            display: flex; justify-content: space-between; padding: 6px 8px;
            background: rgba(255,255,255,0.05); margin-bottom: 4px; border-radius: 4px;
            cursor: pointer; transition: background 0.1s;
        }
        .wg-row:hover { background: rgba(255,255,255,0.15); }
        .wg-bar-bg { width: 60px; height: 4px; background: #333; border-radius: 2px; align-self: center; }
        .wg-bar-fill { height: 100%; background: #6aaa64; border-radius: 2px; }
        .minimized #wg-content { display: none; }
    `;
    const style = document.createElement('style');
    style.innerText = css;
    document.head.appendChild(style);

    const ui = document.createElement('div');
    ui.id = 'wg-container';
    ui.innerHTML = `
        <div id="wg-header">
            <strong style="font-size:13px;">wowdle sowver :3</strong>
            <span id="wg-count" style="font-size:10px; background:#121213; border:1px solid #333; padding:2px 6px; border-radius:4px;">Init</span>
        </div>
        <div id="wg-content">
            <div class="wg-setting-row">
                <span>Entropy Math (light lag)</span>
                <label class="wg-switch"><input type="checkbox" id="wg-entropy-toggle"><span class="wg-slider"></span></label>
            </div>
            <div class="wg-setting-row">
                <span>Use Presets</span>
                <label class="wg-switch"><input type="checkbox" id="wg-preset-toggle"><span class="wg-slider"></span></label>
            </div>
            <input id="wg-preset-input" type="text" value="${presetString}" placeholder="salet, crane, ..." autocomplete="off" spellcheck="false">
            <button id="wg-bot-btn" class="wg-btn">start bot</button>
            <div id="wg-status" style="font-size: 11px; color: #818384; margin-bottom: 8px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">...</div>
            <div id="wg-results" style="max-height: 200px; overflow-y: auto; padding-right:5px;"></div>
        </div>
    `;
    document.body.appendChild(ui);

    const elResults = document.getElementById('wg-results');
    const elCount = document.getElementById('wg-count');
    const elBtn = document.getElementById('wg-bot-btn');
    const elStatus = document.getElementById('wg-status');
    const elContainer = document.getElementById('wg-container');
    const elHeader = document.getElementById('wg-header');
    const elEntropyToggle = document.getElementById('wg-entropy-toggle');
    const elPresetToggle = document.getElementById('wg-preset-toggle');
    const elPresetInput = document.getElementById('wg-preset-input');

    usePresets = GM_getValue('wg_preset_enabled', false);
    elPresetToggle.checked = usePresets;
    if(usePresets) elContainer.classList.add('show-presets');

    elEntropyToggle.addEventListener('change', (e) => { useEntropy = e.target.checked; runAnalysis(); });
    elPresetToggle.addEventListener('change', (e) => {
        usePresets = e.target.checked;
        GM_setValue('wg_preset_enabled', usePresets);
        elContainer.classList.toggle('show-presets', usePresets);
    });
    elPresetInput.addEventListener('input', (e) => {
        presetString = e.target.value;
        GM_setValue('wg_preset_str', presetString);
    });

    GM_xmlhttpRequest({
        method: "GET",
        url: WORDLIST_URL,
        onload: res => {
            fullWordList = res.responseText.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length === 5);
            possibleWords = [...fullWordList];
            elCount.innerText = fullWordList.length;
            elStatus.innerText = "Ready";
            runAnalysis();
        }
    });

    elHeader.addEventListener('dblclick', () => elContainer.classList.toggle('minimized'));
    let isDragging = false, startX, startY, initX = 0, initY = 0;
    elHeader.addEventListener('mousedown', e => { if(e.target.tagName !== 'INPUT') { isDragging=true; startX=e.clientX-initX; startY=e.clientY-initY; } });
    document.addEventListener('mouseup', () => isDragging=false);
    document.addEventListener('mousemove', e => {
        if(!isDragging) return;
        e.preventDefault();
        initX = e.clientX - startX;
        initY = e.clientY - startY;
        elContainer.style.transform = `translate(${initX}px, ${initY}px)`;
    });

    function getBoard() {
        const tiles = Array.from(document.querySelectorAll('div[data-state]')).slice(0, 30);
        const guesses = [];
        for(let i=0; i<6; i++) {
            const row = tiles.slice(i*5, (i+1)*5);
            const word = row.map(t => t.textContent.trim().toLowerCase()).join('');
            const states = row.map(t => t.getAttribute('data-state'));
            if(word.length === 5 && !states.includes('empty') && !states.includes('tbd')) guesses.push({ word, states });
        }
        return guesses;
    }

    function runAnalysis() {
        if(fullWordList.length === 0) return;
        const history = getBoard();
        let candidates = fullWordList;

        if (history.length > 0) {
            candidates = fullWordList.filter(w => {
                if (blacklistedWords.has(w)) return false;
                for(const turn of history) {
                    const sim = getFeedback(w, turn.word);
                    for(let i=0; i<5; i++) if(sim[i] !== turn.states[i]) return false;
                }
                return true;
            });
        }
        // we do NOT force 'salet' here anymore so the UI shows the actual math.

        possibleWords = [...candidates];
        elCount.innerText = possibleWords.length;

        if (useEntropy && possibleWords.length > 1 && possibleWords.length < 800) {
            elStatus.innerText = "Computing Entropy...";
            setTimeout(() => { possibleWords = entropySort(possibleWords); render(true); elStatus.innerText = "Entropy Ready"; }, 10);
        } else {
            possibleWords = smartSort(candidates);
            render(false);
        }
        return history;
    }

    function smartSort(words) {
        if(words.length <= 1) return words;
        const freq = Array.from({length:5}, ()=>({}));
        words.forEach(w => { for(let i=0; i<5; i++) freq[i][w[i]] = (freq[i][w[i]]||0)+1; });
        return words.map(w => {
            let score = 0, seen = new Set();
            for(let i=0; i<5; i++) {
                score += freq[i][w[i]];
                if(seen.has(w[i])) score *= 0.5;
                seen.add(w[i]);
            }
            return { w, score };
        }).sort((a,b)=>b.score-a.score).map(o=>o.w);
    }

    function entropySort(words) {
        return words.map(candidate => {
            const patternCounts = {};
            for (const actual of words) {
                const pattern = getFeedbackString(actual, candidate);
                patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            }
            let entropy = 0;
            const total = words.length;
            for (const key in patternCounts) {
                const p = patternCounts[key] / total;
                entropy += p * -Math.log2(p);
            }
            return { w: candidate, score: entropy };
        }).sort((a,b) => b.score - a.score).map(o => o.w);
    }

    function getFeedback(target, guess) {
        const res = Array(5).fill('absent');
        const tArr = target.split(''), gArr = guess.split('');
        for(let i=0; i<5; i++) if(gArr[i]===tArr[i]) { res[i]='correct'; tArr[i]=null; gArr[i]=null; }
        for(let i=0; i<5; i++) if(gArr[i]!==null) { const idx = tArr.indexOf(gArr[i]); if(idx > -1) { res[i]='present'; tArr[idx]=null; } }
        return res;
    }

    function getFeedbackString(target, guess) {
        const res = [0,0,0,0,0];
        const tArr = target.split(''); const gArr = guess.split('');
        for(let i=0; i<5; i++) { if(gArr[i]===tArr[i]) { res[i]=2; tArr[i]=null; gArr[i]=null; } }
        for(let i=0; i<5; i++) { if(gArr[i]!==null) { const idx = tArr.indexOf(gArr[i]); if(idx > -1) { res[i]=1; tArr[idx]=null; } } }
        return res.join('');
    }

    function render(isEntropy) {
        if(possibleWords.length === 0) { elResults.innerHTML = '<div style="padding:10px; color:salmon;">No words found</div>'; return; }
        elResults.innerHTML = possibleWords.slice(0,15).map((w,i) => `
            <div class="wg-row" onclick="window.wgType('${w}')">
                <span style="font-family:monospace; font-weight:bold; letter-spacing:2px; ${i===0?'color:#6aaa64':''}">${w.toUpperCase()}</span>
                <div class="wg-bar-bg"><div class="wg-bar-fill" style="width:${100-(i*4)}%; background:${isEntropy ? '#4c8bf5' : '#6aaa64'}"></div></div>
            </div>
        `).join('');
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    function focusGame() { (document.querySelector('game-app') || document.body).focus(); window.focus(); }
    async function sendKey(key) {
        const keys = { 'Enter': 13, 'Backspace': 8 };
        const keyCode = keys[key] || key.toUpperCase().charCodeAt(0);
        for(const type of ['keydown', 'keypress', 'keyup'])
            window.dispatchEvent(new KeyboardEvent(type, { key: key, code: key, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true }));
    }

    window.wgType = async (word) => { focusGame(); for(const c of word) { await sendKey(c); await sleep(30); } };

    async function autoBot() {
        if(isBotRunning) return;
        isBotRunning = true;
        elBtn.innerText = "paused";
        elBtn.style.background = "#b59f3b";

        let history = runAnalysis();
        let attempts = 0;
        const presets = presetString.split(',').map(s=>s.trim().toLowerCase()).filter(s=>s.length===5);

        while(attempts < 6) {
            if(history.length > 0 && history[history.length-1].states.every(s => s === 'correct')) {
                elStatus.innerText = "VICTORY"; break;
            }

            let targetWord = null;

            // presets
            if (usePresets && attempts < presets.length) {
                const pWord = presets[attempts];
                if (!blacklistedWords.has(pWord)) {
                    targetWord = pWord;
                    elStatus.innerText = `Preset ${attempts+1}: ${targetWord.toUpperCase()}`;
                }
            }

            //ran start
            if (!targetWord && attempts === 0 && !usePresets) {
                 const rnd = Math.floor(Math.random() * possibleWords.length);
                 targetWord = possibleWords[rnd];
                 elStatus.innerText = `Random: ${targetWord.toUpperCase()}`;
            }

            // feedback
            if (!targetWord) {
                runAnalysis();
                await sleep(50);
                if(possibleWords.length === 0) { elStatus.innerText = "Stuck"; break; }
                targetWord = possibleWords[0];
                elStatus.innerText = `Solver: ${targetWord.toUpperCase()}`;
            }

            focusGame();
            for(const char of targetWord) { await sendKey(char); await sleep(40); }
            await sleep(50);
            await sendKey('Enter');
            elStatus.innerText = "watching...";
            await sleep(2200);

            const newHistory = getBoard();
            if (newHistory.length === history.length) {
                elStatus.innerText = `Rejected: ${targetWord}`;
                blacklistedWords.add(targetWord);
                for(let k=0; k<5; k++) { await sendKey('Backspace'); await sleep(40); }
                await sleep(200);
                continue;
            }
            history = newHistory;
            attempts++;
        }
        isBotRunning = false;
        elBtn.innerText = "start bot";
        elBtn.style.background = "#538d4e";
    }

    elBtn.addEventListener('click', autoBot);
})();

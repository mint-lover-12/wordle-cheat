// ==UserScript==
// @name         Wordle Solver
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  free win .
// @author       mintlover12
// @match        https://www.nytimes.com/games/wordle/*
// @icon         https://www.nytimes.com/games/wordle/images/favicon-32x32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      gist.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const OPTIMAL_OPENER = "salet";   //idk i think this word is good, slate and audio are decent aswell, but i feel like a's and e's appear commonly in slot 2 and 4 more than 3 and 5.
    const WORDLIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/6bfa15d263d6d5b63840a8e5b64e04b382fdb079/valid-wordle-words.txt';

    let fullWordList = [];
    let possibleWords = [];
    let isBotRunning = false;
    let isMinimized = false;
    let blacklistedWords = new Set(); // store reject for sess

    const css = `
        #wg-container {
            position: fixed; top: 20px; right: 20px; width: 260px;
            background: rgba(15, 15, 15, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            border-radius: 12px; color: white;
            font-family: sans-serif; z-index: 999999;
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
            font-weight: bold; cursor: pointer; margin-bottom: 8px;
            text-transform: uppercase; font-size: 11px; letter-spacing: 1px;
            color: white; transition: 0.2s;
        }
        #wg-bot-btn { background: #538d4e; }
        #wg-bot-btn:hover { background: #467a42; }
        .wg-row {
            display: flex; justify-content: space-between; padding: 6px 8px;
            background: rgba(255,255,255,0.05); margin-bottom: 4px; border-radius: 4px;
            cursor: pointer;
        }
        .wg-row:hover { background: rgba(255,255,255,0.1); }
        .wg-bar-bg { width: 50px; height: 4px; background: #333; border-radius: 2px; align-self: center; }
        .wg-bar-fill { height: 100%; background: #6aaa64; border-radius: 2px; }
        .minimized #wg-content { display: none; }
    `;
    const style = document.createElement('style');
    style.innerText = css;
    document.head.appendChild(style);

    // guiuiuiui
    const ui = document.createElement('div');
    ui.id = 'wg-container';
    ui.innerHTML = `
        <div id="wg-header">
            <strong>WORDLE SOLVER</strong>
            <span id="wg-count" style="font-size:11px; background:#333; padding:2px 6px; border-radius:4px;">Wait</span>
        </div>
        <div id="wg-content">
            <button id="wg-bot-btn" class="wg-btn">bot on</button>
            <div id="wg-status" style="font-size: 11px; color: #aaa; margin-bottom: 8px; text-align: center;">...</div>
            <div id="wg-results" style="max-height: 200px; overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(ui);

    const elResults = document.getElementById('wg-results');
    const elCount = document.getElementById('wg-count');
    const elBtn = document.getElementById('wg-bot-btn');
    const elStatus = document.getElementById('wg-status');
    const elContainer = document.getElementById('wg-container');
    const elHeader = document.getElementById('wg-header');

    // get latest dict  (whoever made the dict is goated)
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

    // drag shenanigans
    elHeader.addEventListener('dblclick', () => elContainer.classList.toggle('minimized'));
    let isDragging = false, startX, startY, initX = 0, initY = 0;
    elHeader.addEventListener('mousedown', e => { isDragging=true; startX=e.clientX-initX; startY=e.clientY-initY; });
    document.addEventListener('mouseup', () => isDragging=false);
    document.addEventListener('mousemove', e => {
        if(!isDragging) return;
        e.preventDefault();
        initX = e.clientX - startX;
        initY = e.clientY - startY;
        elContainer.style.transform = `translate(${initX}px, ${initY}px)`;
    });


    function getBoard() {
        // get all tiles
        const tiles = Array.from(document.querySelectorAll('div[data-state]')).slice(0, 30);
        const guesses = [];
        for(let i=0; i<6; i++) {
            const row = tiles.slice(i*5, (i+1)*5);
            const word = row.map(t => t.textContent.trim().toLowerCase()).join('');
            const states = row.map(t => t.getAttribute('data-state'));
            // get all complete rows (not empty or tbd)
            if(word.length === 5 && !states.includes('empty') && !states.includes('tbd')) {
                guesses.push({ word, states });
            }
        }
        return guesses;
    }

    function runAnalysis() {
        if(fullWordList.length === 0) return;
        const history = getBoard();

        let candidates = fullWordList;

        if (history.length > 0) {
            candidates = fullWordList.filter(w => {
                // if fore some reason a word is rejected filter it (cba to test)
                if (blacklistedWords.has(w)) return false;

                for(const turn of history) {
                    const sim = getFeedback(w, turn.word);
                    for(let i=0; i<5; i++) if(sim[i] !== turn.states[i]) return false;
                }
                return true;
            });
        } else {
            // first turn ONLY
            if(!blacklistedWords.has(OPTIMAL_OPENER)) candidates = [OPTIMAL_OPENER];
        }

        possibleWords = smartSort(candidates);
        render();
        elCount.innerText = possibleWords.length;
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
                if(seen.has(w[i])) score *= 0.5; // penalties for double letters (to account for them potentially being both wrong and wasting a letter)
                seen.add(w[i]);
            }
            return { w, score };
        }).sort((a,b)=>b.score-a.score).map(o=>o.w);
    }

    function getFeedback(target, guess) {
        const res = Array(5).fill('absent');
        const tArr = target.split(''), gArr = guess.split('');
        for(let i=0; i<5; i++) if(gArr[i]===tArr[i]) { res[i]='correct'; tArr[i]=null; gArr[i]=null; }
        for(let i=0; i<5; i++) if(gArr[i]!==null) {
            const idx = tArr.indexOf(gArr[i]);
            if(idx > -1) { res[i]='present'; tArr[idx]=null; }
        }
        return res;
    }

    function render() {
        if(possibleWords.length === 0) { elResults.innerHTML = '<div style="padding:10px; color:salmon;">No words found</div>'; return; }
        elResults.innerHTML = possibleWords.slice(0,15).map((w,i) => `
            <div class="wg-row" onclick="window.wgType('${w}')">
                <span style="font-family:monospace; font-weight:bold; letter-spacing:2px; ${i===0?'color:#6aaa64':''}">${w.toUpperCase()}</span>
                <div class="wg-bar-bg"><div class="wg-bar-fill" style="width:${100-(i*5)}%"></div></div>
            </div>
        `).join('');
    }

    // bot exec
    const sleep = ms => new Promise(r => setTimeout(r, ms));

//fixed niche issue
    function focusGame() {
        const gameApp = document.querySelector('game-app') || document.body;
        gameApp.focus();
        window.focus();
    }

    async function sendKey(key) {
        const keys = { 'Enter': 13, 'Backspace': 8 };
        const keyCode = keys[key] || key.toUpperCase().charCodeAt(0);

        // put out multiple events incase for some reason they move over to diff system
        const evts = ['keydown', 'keypress', 'keyup'];
        for(const type of evts) {
            window.dispatchEvent(new KeyboardEvent(type, {
                key: key, code: key, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true
            }));
        }
    }

    window.wgType = async (word) => {
        focusGame();
        for(const c of word) { await sendKey(c); await sleep(30); }
    };

    async function autoBot() {
        if(isBotRunning) return;
        isBotRunning = true;
        elBtn.innerText = "⏹ paused";
        elBtn.style.background = "#b59f3b";

        let history = runAnalysis(); // refresh
        let attempts = 0;

        while(attempts < 6) {
            // check 4 win
            if(history.length > 0) {
                const last = history[history.length-1];
                if(last.states.every(s => s === 'correct')) {
                    elStatus.innerText = "yippee";
                    break;
                }
            }

            runAnalysis();
            if(possibleWords.length === 0) { elStatus.innerText = "Stuck (Empty List)"; break; }

            const targetWord = possibleWords[0];
            elStatus.innerText = `Trying: ${targetWord.toUpperCase()}`;

            //type Word
            focusGame();
            for(const char of targetWord) {
                await sendKey(char);
                await sleep(50);
            }
            await sleep(100);

            // input
            await sendKey('Enter');

            // wait for it to work + animations (fix!)
            elStatus.innerText = "Waiting for game...";
            await sleep(2800); //todo: dynamically get animation state

            const newHistory = getBoard();

            // if history length is SAME as before, the word was rejected (not in list).
            if (newHistory.length === history.length) {
                elStatus.innerText = `Rejected: ${targetWord}. Retrying...`;

                // add words to blacklist
                blacklistedWords.add(targetWord);

                // bye bye the word (not tested)
                for(let k=0; k<5; k++) {
                    await sendKey('Backspace');
                    await sleep(50);
                }
                await sleep(500);

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

let id = '';
let hide = false;
let of = 0;
let vttContent = '';
let selectedLevel = 'middle';

let player;
let ytApiReady = false;
let intervalId = null;

function initModal() {
    const style = document.createElement('style');
    style.innerHTML = `
        #configModalOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        }
        #configModal {
            background: #222; padding: 20px; border-radius: 8px; color: white;
            display: flex; flex-direction: column; gap: 15px; width: 350px;
            font-family: Arial, sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        #configModal input, #configModal button { padding: 8px; font-size: 16px; border-radius: 4px; border: none; }
        #configModal input[type="file"] { background: white; color: black; }
        #configModal button { background: #4caf50; color: white; cursor: pointer; font-weight: bold; }
        #configModal button:hover { background: #45a049; }
        #openModalBtn {
            position: fixed; top: 10px; right: 10px; width: 50px; height: 50px;
            z-index: 10001; cursor: pointer; border-radius: 5px;
            background: #4caf50; color: white; border: none; font-size: 24px;
            display: flex; justify-content: center; align-items: center;
        }
        #configModal label { font-size: 14px; }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'openModalBtn';
    btn.innerHTML = '⚙️';
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'configModalOverlay';

    overlay.innerHTML = `
        <div id="configModal">
            <h2 style="margin:0;text-align:center;">Configuración</h2>
            <label style="display:flex;flex-direction:column;">YouTube ID: 
                <input type="text" id="modalVideoId" placeholder="Ej: dQw4w9WgXcQ">
            </label>
            <label style="display:flex;align-items:center;">Ocultar Video: 
                <input type="checkbox" id="modalHide" style="margin-left:10px;width:20px;height:20px;">
            </label>
            <label style="display:flex;flex-direction:column;">Offset (s): 
                <input type="number" id="modalOffset" value="0" step="0.1">
            </label>
            <label style="display:flex;flex-direction:column;">Dificultad:
                <select id="modalLevel">
                    <option value="easy">Fácil</option>
                    <option value="middle" selected>Medio</option>
                    <option value="hard">Difícil</option>
                    <option value="imposible">Imposible</option>
                </select>
            </label>
            <label style="display:flex;flex-direction:column;">Subtítulos (VTT): 
                <input type="file" id="modalVttFile" accept=".vtt">
            </label>
            <button id="modalApplyBtn">Aplicar y Empezar</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const fileInput = document.getElementById('modalVttFile');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                vttContent = evt.target.result;
            };
            reader.readAsText(file);
        }
    });

    btn.addEventListener('click', () => {
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }
        // Sync values to existing states before showing
        document.getElementById('modalVideoId').value = id;
        document.getElementById('modalHide').checked = hide;
        document.getElementById('modalOffset').value = of;
        document.getElementById('modalLevel').value = selectedLevel;
        overlay.style.display = 'flex';
    });

    document.getElementById('modalApplyBtn').addEventListener('click', () => {
        const newId = document.getElementById('modalVideoId').value.trim();
        hide = document.getElementById('modalHide').checked;
        of = parseFloat(document.getElementById('modalOffset').value) || 0;
        selectedLevel = document.getElementById('modalLevel').value;

        if (!newId || (!vttContent && !id)) {
            alert("Por favor, introduce el ID del video y sube el archivo VTT.");
            return;
        }
        id = newId;

        overlay.style.display = 'none';
        applySettings();
    });
}

document.addEventListener('DOMContentLoaded', initModal);

function onYouTubeIframeAPIReady() {
    ytApiReady = true;
}

function applySettings() {
    if (!ytApiReady) {
        setTimeout(applySettings, 500);
        return;
    }

    if (!player) {
        player = new YT.Player('player', {
            height: '720',
            width: '100%',
            videoId: id,
            playerVars: {
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(id);
        const playerdiv = document.getElementById("player");
        if (hide) {
            playerdiv.style.display = 'none';
        } else {
            playerdiv.style.display = 'block';
        }
        onPlayerReady();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        document.getElementById('configModalOverlay').style.display = 'flex';
    }
}

function str2time(stringTiempo) {
    let [horas, minutos, segundos, milisegundos] = stringTiempo.split(/[:.,]/).map(parseFloat);
    let tiempoTotal = horas * 3600 + minutos * 60 + segundos + milisegundos / 1000;
    return tiempoTotal;
}

function word2punt(word, twords) {
    let regex = /[^a-zA-Z0-9]/g

    const matches = [...word.matchAll(regex)];
    const idxs = matches.map(match => match.index);

    twords.push(word.replace(/[^a-zA-Z0-9]/g, ''));

    word = word.split('').map((c, x) =>
        idxs.includes(x) ? c : '·'
    ).join('');

    return word;
}

function hidewords(text, difficult) {
    if (text.startsWith("(") || text.endsWith(")")) return [text, 'None'];
    if (text.startsWith("[") || text.endsWith("]")) return [text, 'None'];
    if (text.includes("<") && text.includes(">")) text = text.replace(/♪\s|\s♪/g, '');
    if (text.includes("♪")) text = text.replace(/♪\s|\s♪/g, '');

    let tw = [];
    let words = text.split(' ');
    let nw = Math.ceil(words.length * difficult);

    let conWords = new Set();
    while (conWords.size < nw) {
        let i = Math.floor(Math.random() * words.length);
        conWords.add(i);
    }

    words = words.map((w, x) =>
        conWords.has(x) ? word2punt(w, tw) : w
    );

    return [words.join(' '), tw.join('')];
}

function parseVTT(data) {
    const lines = data.split('\n');
    const entries = [];
    let currentEntry = null;
    let lastend = 0;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('-->')) {
            const [start, end] = trimmedLine.split(' --> ');
            currentEntry = {
                start: str2time(start.trim()),
                end: '',
                text: '',
                hidden: '',
                div: null
            };
            entries.push(currentEntry);
            lastend = str2time(end.trim());
        } else if (trimmedLine === '' && currentEntry) {
            currentEntry = null;
        } else if (currentEntry) {
            currentEntry.text += (currentEntry.text ? ' ' : '') + trimmedLine;
        }
    }

    for (let i = 0; i < entries.length - 1; i++) {
        entries[i].end = entries[i + 1].start;
    }

    if (entries.length > 0) {
        entries[entries.length - 1].end = lastend; // or any suitable end value for the last entry
    }

    return entries;
}

async function onPlayerReady(event) {
    const oldSubdiv = document.getElementById("subtitles");
    const subdiv = oldSubdiv.cloneNode(false);
    oldSubdiv.parentNode.replaceChild(subdiv, oldSubdiv);

        const oldRewind = document.getElementById("rewind");
        const rewind = oldRewind.cloneNode(true);
        oldRewind.parentNode.replaceChild(rewind, oldRewind);

        const oldHint = document.getElementById("hint");
        const hint = oldHint.cloneNode(true);
        oldHint.parentNode.replaceChild(hint, oldHint);

        const playerdiv = document.getElementById("player");
        if (hide) {
            playerdiv.style.display = 'none';
        } else {
            playerdiv.style.display = 'block';
        }

        subdiv.focus();

        const levelDiv = selectedLevel;
        const level = {
            'easy': 0.2,
            'middle': 0.4,
            'hard': 0.6,
            'imposible': 1
        }

        try {
            const vtt = vttContent;
            const subtitles = parseVTT(vtt);

            subtitles.map(entry => {
                hiddenData = hidewords(entry.text, level[levelDiv]);
                entry.text = hiddenData[0];
                entry.hidden = hiddenData[1];

                entry.div = document.createElement("p");
                entry.div.textContent = entry.text;
                entry.div.style.display = "none";

                subdiv.appendChild(entry.div)

                return entry;
            });

            if (window.keydownAbortController) window.keydownAbortController.abort();
            window.keydownAbortController = new AbortController();
            const signal = window.keydownAbortController.signal;

            document.addEventListener('keydown', (event) => {
                const currentTime = player.getCurrentTime() + of;
                const i = subtitles.findIndex(sub => currentTime >= sub.start && currentTime <= sub.end);

                const prevprevSubtitle = i > 1 ? subtitles[i - 2] : null;
                const prevSubtitle = i > 0 ? subtitles[i - 1] : null;
                const currentSubtitle = i >= 0 ? subtitles[i] : null;
                const nextSubtitle = i >= 0 && i + 1 < subtitles.length ? subtitles[i + 1] : null;

                if (event.key == ' ') player.playVideo();
                if (event.key == 'ArrowUp') player.setVolume(player.getVolume() + 20);
                if (event.key == 'ArrowDown') player.setVolume(player.getVolume() - 20);


                if (prevprevSubtitle != null && prevprevSubtitle.div.textContent.includes('·')) {
                    let c = prevprevSubtitle.hidden[0];
                    if (c.toLowerCase() == event.key || c.toUpperCase() == event.key) {
                        prevprevSubtitle.div.textContent = prevprevSubtitle.div.textContent.replace("·", c);
                        prevprevSubtitle.hidden = prevprevSubtitle.hidden.substring(1);
                    }
                }
                else if (prevSubtitle != null && prevSubtitle.div.textContent.includes('·')) {
                    let c = prevSubtitle.hidden[0];
                    if (c.toLowerCase() == event.key || c.toUpperCase() == event.key) {
                        prevSubtitle.div.textContent = prevSubtitle.div.textContent.replace("·", c);
                        prevSubtitle.hidden = prevSubtitle.hidden.substring(1);
                    }
                }
                else if (currentSubtitle != null && currentSubtitle.div.textContent.includes('·')) {
                    let c = currentSubtitle.hidden[0];
                    if (c.toLowerCase() == event.key || c.toUpperCase() == event.key) {
                        currentSubtitle.div.textContent = currentSubtitle.div.textContent.replace("·", c);
                        currentSubtitle.hidden = currentSubtitle.hidden.substring(1);
                    }
                }
                else if (nextSubtitle != null && nextSubtitle.div.textContent.includes('·')) {
                    let c = nextSubtitle.hidden[0];
                    if (c.toLowerCase() == event.key || c.toUpperCase() == event.key) {
                        nextSubtitle.div.textContent = nextSubtitle.div.textContent.replace("·", c);
                        nextSubtitle.hidden = nextSubtitle.hidden.substring(1);
                    }
                }

                if (
                    prevSubtitle != null
                    && prevSubtitle.hidden == ''
                    && !prevSubtitle.div.textContent.includes('·')
                ) {
                    prevSubtitle.hidden = 'done';

                    if (player.getPlayerState() == YT.PlayerState.PAUSED) {
                        player.seekTo(prevSubtitle.end - 0.1, true);
                        player.playVideo();
                    }
                }
            }, { capture: true, signal });

            rewind.addEventListener('click', () => {
                const currentTime = player.getCurrentTime() + of + 0.8;
                const i = subtitles.findIndex(sub => currentTime >= sub.start && currentTime <= sub.end);

                const prevprevSubtitle = i > 1 ? subtitles[i - 2] : null;
                const prevSubtitle = i > 0 ? subtitles[i - 1] : null;
                const currentSubtitle = i >= 0 ? subtitles[i] : null;
                const nextSubtitle = i >= 0 && i + 1 < subtitles.length ? subtitles[i + 1] : null;

                let ctrl = false;
                do {
                    if (prevprevSubtitle != null && prevprevSubtitle.div.style.display == "block") {
                        player.seekTo(prevprevSubtitle.start - 0.1 - of);
                        player.playVideo();
                        ctrl = true;
                    }
                    else if (prevSubtitle != null && prevSubtitle.div.style.display == "block") {
                        player.seekTo(prevSubtitle.start - 0.1 - of);
                        player.playVideo();
                        ctrl = true;
                    }
                    else if (currentSubtitle != null && currentSubtitle.div.style.display == "block") {
                        player.seekTo(currentSubtitle.start - 0.1 - of);
                        player.playVideo();
                        ctrl = true;
                    }
                } while (false);
            });

            hint.addEventListener('click', () => {
                const currentTime = player.getCurrentTime() + of + 0.8;
                const i = subtitles.findIndex(sub => currentTime >= sub.start && currentTime <= sub.end);

                const prevprevSubtitle = i > 1 ? subtitles[i - 2] : null;
                const prevSubtitle = i > 0 ? subtitles[i - 1] : null;
                const currentSubtitle = i >= 0 ? subtitles[i] : null;

                if (prevprevSubtitle != null && prevprevSubtitle.div.textContent.includes('·')) {
                    let c = prevprevSubtitle.hidden[0];
                    prevprevSubtitle.div.textContent = prevprevSubtitle.div.textContent.replace("·", c);
                    prevprevSubtitle.hidden = prevprevSubtitle.hidden.substring(1);
                    if (prevprevSubtitle.hidden == '') player.playVideo();
                }
                else if (prevSubtitle != null && prevSubtitle.div.textContent.includes('·')) {
                    let c = prevSubtitle.hidden[0];
                    prevSubtitle.div.textContent = prevSubtitle.div.textContent.replace("·", c);
                    prevSubtitle.hidden = prevSubtitle.hidden.substring(1);
                    if (prevSubtitle.hidden == '') player.playVideo();
                }
                else if (currentSubtitle != null && currentSubtitle.div.textContent.includes('·')) {
                    let c = currentSubtitle.hidden[0];
                    currentSubtitle.div.textContent = currentSubtitle.div.textContent.replace("·", c);
                    currentSubtitle.hidden = currentSubtitle.hidden.substring(1);
                    if (currentSubtitle.hidden == '') player.playVideo();
                }
            });

            if (typeof intervalId !== 'undefined' && intervalId !== null) clearInterval(intervalId);
            intervalId = setInterval(() => {
                const currentTime = player.getCurrentTime() + of + 0.8;
                const i = subtitles.findIndex(sub => currentTime >= sub.start && currentTime <= sub.end);

                const prevprevSubtitle = i > 1 ? subtitles[i - 2] : null;
                const currentSubtitle = i >= 0 ? subtitles[i] : null;

                if (prevprevSubtitle != null && prevprevSubtitle.div.style.display == "block") {
                    if (prevprevSubtitle.div.textContent.includes('·') && player.getCurrentTime() > prevprevSubtitle.end) {
                        player.pauseVideo();
                        return 0;
                    }
                    else prevprevSubtitle.div.style.display = "none";
                }

                if (currentSubtitle != null && currentTime > currentSubtitle.start && currentTime < currentSubtitle.end) {
                    currentSubtitle.div.style.display = "block";
                }
            }, 100);
        } catch (error) {
            console.error('Error:', error);
        }
    }

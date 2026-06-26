document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    lucide.createIcons();

    // 2. State Management
    const state = {
        theme: 'blue',
        timer: 0,
        telemetry: {
            distance: 384400,
            latency: 1.28,
            attenuation: -262
        },
        logs: [],
        online: false
    };

    // 3. Audio Handlers
    const sounds = {
        click: document.getElementById('sfx-click'),
        ping: document.getElementById('sfx-ping'),
        hover: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-mechanical-button-flick-297.mp3'),
        startup: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-light-impact-on-the-computer-screen-2262.mp3')
    };

    function playSound(name) {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].volume = 0.3;
            sounds[name].play().catch(e => console.log('Audio error:', e));
        }
    }

    // 4. Mission Timer
    const timerEl = document.getElementById('timer-value');
    setInterval(() => {
        state.timer++;
        const hrs = Math.floor(state.timer / 3600).toString().padStart(2, '0');
        const mins = Math.floor((state.timer % 3600) / 60).toString().padStart(2, '0');
        const secs = (state.timer % 60).toString().padStart(2, '0');
        timerEl.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);

    // 5. Telemetry Updates (Subtle jitter for realism)
    const distVal = document.getElementById('dist-val');
    const latVal = document.getElementById('latency-val');
    setInterval(() => {
        const jitter = (Math.random() - 0.5) * 5;
        const newDist = (state.telemetry.distance + jitter).toFixed(1);
        distVal.innerHTML = `${newDist} <small>km</small>`;
        
        const latJitter = (Math.random() - 0.5) * 0.02;
        latVal.innerHTML = `${(state.telemetry.latency + latJitter).toFixed(3)} <small>sec</small>`;
    }, 2000);

    // 6. Theme Switcher
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.setAttribute('data-theme', theme);
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playSound('click');
            
            // AI feedback for theme
            speakAI(`Shifting visual spectrum to ${theme} configuration.`);
        });
    });

    // 7. Blockchain Logging
    const blockchainTbody = document.getElementById('blockchain-tbody');
    const sources = ['EARTH-DSNO', 'MOON-STATION', 'ORBITER-4', 'GROUND-S7'];
    const statuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'WARNING', 'PENDING'];

    function addBlockchainEntry() {
        const row = document.createElement('tr');
        const src = sources[Math.floor(Math.random() * sources.length)];
        const dest = sources[Math.floor(Math.random() * sources.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const time = new Date().toLocaleTimeString();

        row.innerHTML = `
            <td>${src}</td>
            <td>${dest}</td>
            <td style="color: ${status === 'SUCCESS' ? 'var(--accent-green)' : status === 'WARNING' ? 'var(--accent-yellow)' : 'var(--text-secondary)'}">${status}</td>
            <td>${time}</td>
        `;
        
        blockchainTbody.prepend(row);
        if (blockchainTbody.children.length > 8) {
            blockchainTbody.lastElementChild.remove();
        }
    }

    // Add initial log entries
    for (let i = 0; i < 5; i++) addBlockchainEntry();
    setInterval(addBlockchainEntry, 8000);

    // 8. Interactive Buttons
    const heroImg = document.querySelector('.hero-image');
    document.getElementById('ping-btn').addEventListener('click', () => {
        playSound('ping');
        addLedgerLog('EARTH', 'MOON', 'Q-PING_SENT', 'ok');
        speakAI("Quantum ping sequence initiated. Photon handshake in progress.");
        
        // Trigger glitch effect
        if (heroImg) {
            heroImg.classList.add('glitch');
            setTimeout(() => heroImg.classList.remove('glitch'), 600);
        }

        setTimeout(() => {
            addLedgerLog('MOON', 'EARTH', 'ACK_RECV', 'ok');
            speakAI("Acknowledgment received from Moon Station. Parity verified.");
        }, 1500);
    });

    // 13. Dynamic Signal Monitor
    const signalMonitor = document.getElementById('signal-monitor');
    if (signalMonitor) {
        for (let i = 0; i < 30; i++) {
            const bar = document.createElement('div');
            bar.className = 'signal-bar';
            bar.style.animationDelay = `${i * 0.05}s`;
            signalMonitor.appendChild(bar);
        }
    }

    // 9. Ledger Logging
    const ledgerLogs = document.getElementById('ledger-logs');
    function addLedgerLog(src, dst, status, type) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="time">${time}</span>
            <span class="tag src">${src}</span>
            <span class="arrow">→</span>
            <span class="tag dst">${dst}</span>
            <span class="status ${type}">${status}</span>
        `;
        ledgerLogs.prepend(entry);
    }

    // 11. Typing Animation for Terminal
    const termFeed = document.getElementById('terminal-feed');
    function typeMessage(element, text, isSystem = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${isSystem ? 'system' : 'station'}`;
        const time = new Date().toLocaleTimeString();
        msgDiv.innerHTML = `<span class="timestamp">[${time}]</span> `;
        element.appendChild(msgDiv);
        
        let i = 0;
        const speed = 20;
        function type() {
            if (i < text.length) {
                msgDiv.innerHTML += text.charAt(i);
                i++;
                element.scrollTop = element.scrollHeight;
                setTimeout(type, speed);
            }
        }
        type();
    }

    // Command Transmit Logic
    document.getElementById('transmit-secure-btn').addEventListener('click', () => {
        const cmd = document.getElementById('command-select').value;
        if (!cmd) return;
        
        playSound('ping');
        speakAI(`Transmitting secure command sequence: ${cmd}. Standing by for execution.`);
        
        const inbox = document.getElementById('inbox-feed');
        const newMsg = document.createElement('div');
        newMsg.innerHTML = `> [OVERRIDE]: Command ${cmd} sent... ACK_WAIT.`;
        inbox.appendChild(newMsg);
        inbox.scrollTop = inbox.scrollHeight;
    });

    // 10. AI Voice Assistant
    function speakAI(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; // Slightly faster for efficiency feel
        utterance.pitch = 0.85;
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Male')) || voices[0];
        window.speechSynthesis.speak(utterance);
    }

    // 12. Cinematic Boot Sequence
    function bootSequence() {
        console.log("Initializing Space-Link Boot...");
        sounds.startup.volume = 0.4;
        sounds.startup.play().catch(() => {});
        
        typeMessage(termFeed, "CORE OS v4.2.0 INITIALIZING...", true);
        
        setTimeout(() => {
            typeMessage(termFeed, "LINKING TO QUANTUM TRANSCEIVER...", true);
            state.online = true;
        }, 1200);

        setTimeout(() => {
            typeMessage(termFeed, "EARTH-MOON SYNC ESTABLISHED. PARITY OK.", true);
            speakAI("Quantum link established. All systems nominal. Dashboard ready.");
        }, 3000);
    }

    // Add Hover Sounds to all buttons and panels
    document.querySelectorAll('.btn, .glass-panel, .theme-btn, select').forEach(el => {
        el.addEventListener('mouseenter', () => {
            sounds.hover.volume = 0.1;
            sounds.hover.currentTime = 0;
            sounds.hover.play().catch(() => {});
        });
    });

    // Realistic Terminal Data Stream
    const randomFeedMessages = [
        "Received telemetry packet #XJ99",
        "Moon Station: Lunar dawn observed. Adjusting sensors.",
        "Signal strength fluctuation: Solar wind interference detected.",
        "Packet parity bit verified.",
        "Secure handshake refreshed (TTL: 3600s)"
    ];

    setInterval(() => {
        if (state.online && Math.random() > 0.7) {
            const msg = randomFeedMessages[Math.floor(Math.random() * randomFeedMessages.length)];
            typeMessage(termFeed, msg, false);
        }
    }, 10000);

    // Initial Start
    bootSequence();

    // Global clear logs function (for the button in HTML)
    window.clearLogs = () => {
        ledgerLogs.innerHTML = '';
        playSound('click');
    };
});

// --- Enhanced Sovereign Audio Engine (Cyber-Sonics) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Global Activation Listeners
['click', 'mousedown', 'touchstart', 'keydown'].forEach(type => {
    document.addEventListener(type, initAudio, { once: true });
});

function playUISound(type) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    console.log("[AUDIO] Triggering system sound: " + type + ", mode: " + (audioCtx.state));
    
    // Check for physical assets as priority fallback
    const htmlAudio = document.getElementById('audio-' + type);
    if (htmlAudio && htmlAudio.readyState >= 2) {
        htmlAudio.currentTime = 0;
        htmlAudio.play().catch(() => playSynthesizedFallback(type));
        return;
    }
    
    playSynthesizedFallback(type);
}

function playSynthesizedFallback(type) {
    const now = audioCtx.currentTime;
    
    if (type === 'hover') {
        createOsc(880, 'sine', 0.1, 0.05); // High-freq beep
        createOsc(440, 'sine', 0.05, 0.05); // Mid-freq resonance
    } else if (type === 'select') {
        createOsc(1200, 'square', 0.15, 0.1);
        setTimeout(() => createOsc(800, 'square', 0.1, 0.1), 50);
    } else if (type === 'open') {
        createOsc(200, 'triangle', 0.2, 0.3, 600); // Swoosh sweep
    } else if (type === 'transmit') {
        // Data blips
        for(let i=0; i<3; i++) {
            setTimeout(() => createOsc(1500 + (i*200), 'sine', 0.1, 0.05), i*100);
        }
    } else if (type === 'alert' || type === 'siren') {
        createOsc(400, 'sawtooth', 0.2, 0.4, 800);
    } else if (type === 'success') {
        createOsc(600, 'sine', 0.1, 0.2, 1200);
    } else if (type === 'vista') {
        createOsc(100, 'sine', 0.3, 0.8, 40); // Deep bass sweep
    }
}

function createOsc(freq, type, gain, duration, endFreq = null) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
    
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(g);
    g.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const canvasContainer = document.getElementById('canvas-container');
const distSlider = document.getElementById('dist-slider');
const distDisplay = document.getElementById('dist-display');
const distVal = document.getElementById('distance-val');
const owltVal = document.getElementById('owlt-val');
const transmitBtn = document.getElementById('transmit-btn');
const clearBtn = document.getElementById('clear-btn');
const logsContainer = document.getElementById('logs-container');
const modeSelect = document.getElementById('mode-select');
const attenuationVal = document.getElementById('attenuation-val');
const historyBody = document.getElementById('history-body');
const refreshBtn = document.getElementById('refresh-db-btn');
const solarVal = document.getElementById('solar-val');
const secureInbox = document.querySelector('.secure-inbox-content'); // Changed to class for stability
const jepaConfidenceVal = document.getElementById('jepa-confidence');
const ipGuardStatusVal = document.getElementById('ip-guard-status');
const blockchainStatusVal = document.getElementById('blockchain-status');
const missionTimer = document.getElementById('mission-timer');
const qberVal = document.getElementById('qber-val');

// --- Timer Logic ---
let secondsElapsed = 0;
setInterval(() => {
    secondsElapsed++;
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    if (missionTimer) missionTimer.textContent = `T+ ${hrs}:${mins}:${secs}`;
}, 1000);

// --- Three.js Setup ---
const scene = new THREE.Scene();

// We need an orthographic or perspective camera
const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
camera.position.z = 25;
camera.position.y = 5;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x00e6ff, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x00e6ff, 3.0, 100);
pointLight.position.set(5, 10, 15);
scene.add(pointLight);

const fillLight = new THREE.DirectionalLight(0xffb700, 1.5);
fillLight.position.set(-10, -5, 5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x0044ff, 2.0);
rimLight.position.set(0, 5, -10);
scene.add(rimLight);

// --- Planets ---
const textureLoader = new THREE.TextureLoader();

// Background Vistas Initialization
const vistas = {
    'cosmos': 'https://images.unsplash.com/photo-1543722530-d2c311894d03?q=80&w=2674&auto=format&fit=crop',
    'deep-space': 'https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?q=80&w=2670&auto=format&fit=crop',
    'galaxy': 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop',
    'nebula': 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2000&auto=format&fit=crop',
    'starfield': 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2000&auto=format&fit=crop'
};

const vistaSelect = document.getElementById('vista-select');
if (vistaSelect) {
    vistaSelect.addEventListener('change', (e) => {
        playUISound('vista');
        const bgUrl = vistas[e.target.value];
        if (bgUrl) {
            textureLoader.load(bgUrl, function(texture) {
                scene.background = texture;
            });
        }
    });
    // Init default
    textureLoader.load(vistas['cosmos'], function(texture) {
        scene.background = texture;
    });
}

// Earth (Hyper-Realistic)
const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x224488, // Blue fallback
    bumpScale: 0.15,
    shininess: 35
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.position.set(-8, 0, 0);
scene.add(earth);

// Safe Texture Loading to prevent black-hole effect
textureLoader.load('https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73531/world.topo.bathy.200407.3x5400x2700.jpg', 
    (tex) => { earthMaterial.map = tex; earthMaterial.needsUpdate = true; },
    undefined, 
    (err) => console.warn("Earth texture failed, using spectral fallback")
);

// Earth Clouds Layer
const cloudGeometry = new THREE.SphereGeometry(2.03, 64, 64);
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds10k.png'),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
earth.add(clouds);

// Earth Atmosphere Glow
const atmoGeom = new THREE.SphereGeometry(2.15, 64, 64);
const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x00e6ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
});
const atmosphere = new THREE.Mesh(atmoGeom, atmoMat);
earth.add(atmosphere);

// Moon (Hyper-Realistic)
const marsGeometry = new THREE.SphereGeometry(1.0, 64, 64);
const marsMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888, // Gray fallback
    roughness: 0.85,
    metalness: 0.2
});
const mars = new THREE.Mesh(marsGeometry, marsMaterial);
mars.position.set(8, 0, 0);
scene.add(mars);

textureLoader.load('https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg', 
    (tex) => { marsMaterial.map = tex; marsMaterial.needsUpdate = true; },
    undefined,
    (err) => console.warn("Moon texture failed, using lunar fallback")
);

// Particles for data stream ambiance
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 800;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 30;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMat = new THREE.PointsMaterial({
    size: 0.06,
    color: 0x00e6ff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMat);
scene.add(particlesMesh);

// Rings / Orbits (visual flair)
const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.1 });
const orbitGeometry = new THREE.BufferGeometry();
const orbitPoints = [];
for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    orbitPoints.push(new THREE.Vector3(Math.cos(angle) * 8, 0, Math.sin(angle) * 8));
}
orbitGeometry.setFromPoints(orbitPoints);
const earthOrbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
earth.add(earthOrbit);

// Photons Array
let photons = [];

// --- Functions ---
function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toISOString().substring(11, 19);
    entry.textContent = `[${timestamp}] > ${message}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function updateTelemetry() {
    const dKm = parseFloat(distSlider.value);
    distDisplay.textContent = Math.round(dKm);
    distVal.textContent = `${Math.round(dKm).toLocaleString()} km`;

    // Light time delay 
    const distanceKm = dKm;
    const delaySec = distanceKm / SPEED_OF_LIGHT;
    owltVal.textContent = `${delaySec.toFixed(2)} sec`;

    // Visual distance adjustment
    const mappedX = ((dKm - 350000) / 56000) * 10;
    mars.position.set(8 + mappedX, 0, 0);

    // Attenuation calculation (Inverse square law approximation)
    const attenuation = 150 + 20 * Math.log10(distanceKm);
    attenuationVal.textContent = `-${Math.round(attenuation)} dB`;
    if (attenuation > 320) {
        attenuationVal.className = 'value warn';
    } else {
        attenuationVal.className = 'value good';
    }
}

function createPhoton(direction = 'uplink') {
    const isQuantum = modeSelect.value === 'quantum';
    const isUplink = direction === 'uplink';

    // Cyan for Uplink (Earth->Moon), Purple for Downlink (Moon->Earth)
    const color = isUplink ? 0x00f0ff : 0xbf00ff;
    const size = isQuantum ? 0.3 : 0.6;

    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const photon = new THREE.Mesh(geometry, material);

    const startPos = isUplink ? earth.position.clone() : mars.position.clone();
    const endPos = isUplink ? mars.position.clone() : earth.position.clone();

    photon.position.copy(startPos);

    // Glow effect
    const glowMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(createGlowTexture(color)),
        color: color, transparent: true, blending: THREE.AdditiveBlending,
        opacity: 0.8
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(size * 6, size * 6, 1);
    photon.add(glow);

    scene.add(photon);
    photons.push({
        mesh: photon,
        start: startPos,
        end: endPos,
        direction: direction,
        progress: 0,
        speed: 0.02
    });
}

function createGlowTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.2, colorStr);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return canvas;
}

// --- Event Listeners ---
distSlider.addEventListener('input', updateTelemetry);

let lastSystemMsgId = null;

async function refreshDatabase() {
    try {
        // Cache-busting fetch to ensure we get live data from cloud
        const response = await fetch('data.json?t=' + Date.now());
        if (!response.ok) return;

        const payload = await response.json();
        const data = payload.transmissions || payload; // Backwards compatibility

        // Update Mission History Table
        const historyBody = document.getElementById('history-body');
        historyBody.innerHTML = ''; // Clear current

        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align: center;">No transmissions recorded.</td>`;
            historyBody.appendChild(tr);
            if (solarVal) solarVal.textContent = "Nominal";
        } else {
            let activeAnomaly = false;
            let anomalyText = "Nominal";
            let latestTextPayload = null;

            data.forEach(row => {
                // Check if this row is a system alert
                if (row.protocol === "SYSTEM" && !activeAnomaly) {
                    activeAnomaly = true;
                    const isNew = row.id !== lastSystemMsgId;
                    if (isNew) {
                        if (row.status === "SYS-ALERT") {
                            anomalyText = "STORM DETECTED";
                            solarVal.className = "value warn";
                            addLog(`${row.data_bits}`, 'error');
                        } else if (row.status === "SYS-WARN") {
                            anomalyText = "INTERFERENCE";
                            solarVal.className = "value highlight";
                            addLog(`${row.data_bits}`, 'warning');
                        } else if (row.status === "SEC-BREACH") {
                            anomalyText = "SPOOFING HACK";
                            solarVal.className = "value warn";
                            addLog(`SECURITY: ${row.data_bits}`, 'error');
                        } else if (row.status === "NOMINAL") {
                            anomalyText = "Nominal";
                            solarVal.className = "value good";
                            addLog(`${row.data_bits}`, 'success');
                        }
                        if (data.indexOf(row) === 0) lastSystemMsgId = row.id;
                    } else {
                        // Keep current text even if not logging again
                        if (row.status === "SYS-ALERT") anomalyText = "STORM DETECTED";
                        else if (row.status === "SYS-WARN") anomalyText = "INTERFERENCE";
                        else if (row.status === "SEC-BREACH") anomalyText = "SPOOFING HACK";
                        else if (row.status === "NOMINAL") anomalyText = "Nominal";
                    }
                }

                // Check if this row is a successful text payload from the Moon
                if ((row.protocol === "Quantum-SDC-Text" || row.protocol === "Quantum-SDC-SLM") && row.status === "SUCCESS" && !latestTextPayload) {
                    if (row.data_bits.includes("Final Msg:")) {
                        latestTextPayload = row.data_bits.replace("Final Msg:", "");
                    } else if (row.data_bits.includes("User Command: ")) {
                        latestTextPayload = row.data_bits.replace("User Command: ", "");
                    }
                }

                const tr = document.createElement('tr');
                const statusClass = `status-${row.status.toLowerCase()}`;
                const secClass = row.integrity_ok ? 'sec-ok' : 'sec-fail';
                const secLabel = row.integrity_ok ? 'V-OK' : 'X-ERR';

                tr.innerHTML = `
                    <td>${row.source}</td>
                    <td>${row.destination}</td>
                    <td class="${statusClass}">${row.status}</td>
                    <td>${row.data_bits}</td>
                    <td class="${secClass}">${secLabel}</td>
                `;
                historyBody.appendChild(tr);
            });

            if (!activeAnomaly) {
                solarVal.textContent = "Nominal";
                solarVal.className = "value good";
            } else {
                solarVal.textContent = anomalyText;
            }

            // Multimedia & User Message Display Logic
            const mediaOutput = document.getElementById('media-output');
            const payloadImage = document.getElementById('payload-image');
            const payloadVideo = document.getElementById('payload-video');
            const payloadAudio = document.getElementById('payload-audio');
            const decodedDisplay = document.getElementById('decoded-display');

            let latestMedia = null;
            let foundText = null;

            data.forEach(row => {
                if (row.status === "SUCCESS") {
                    if (row.protocol.includes("Image") && !latestMedia) latestMedia = { type: 'IMAGE', data: row.data_bits };
                    else if (row.protocol.includes("Video") && !latestMedia) latestMedia = { type: 'VIDEO', data: row.data_bits };
                    else if (row.protocol.includes("Audio") && !latestMedia) latestMedia = { type: 'AUDIO', data: row.data_bits };
                    else if ((row.protocol.includes("Text") || row.protocol.includes("SLM")) && !foundText) foundText = row.data_bits;
                }
            });

            if (latestMedia || foundText || latestTextPayload) {
                mediaOutput.style.display = 'block';

                // Reset sub-elements
                payloadImage.style.display = 'none';
                payloadVideo.style.display = 'none';
                payloadAudio.style.display = 'none';

                if (latestMedia) {
                    if (latestMedia.type === 'IMAGE') {
                        payloadImage.style.display = 'block';
                        payloadImage.src = 'assets/lunar_image.png';
                        decodedDisplay.textContent = "Lunar surface imagery decrypted.";
                    } else if (latestMedia.type === 'VIDEO') {
                        payloadVideo.style.display = 'flex';
                        decodedDisplay.textContent = "Live video stream packet received.";
                    } else if (latestMedia.type === 'AUDIO') {
                        payloadAudio.style.display = 'flex';
                        decodedDisplay.textContent = "Mission comms audio decrypted.";
                    }
                } else if (foundText) {
                    decodedDisplay.textContent = foundText.replace("User Command: ", "").replace("Final Msg: ", "");
                } else if (latestTextPayload) {
                    decodedDisplay.textContent = latestTextPayload;
                }
            } else {
                mediaOutput.style.display = 'none';
            }
        }


        // Update Sovereign EcoSystem Panel if available
        if (jepaConfidenceVal) {
            // Randomly fluctuate confidence to simulate live model thinking
            const jitter = (Math.random() * 0.4) - 0.2;
            const newConf = (98.2 + jitter).toFixed(1);
            jepaConfidenceVal.textContent = `${newConf}%`;
        }

        // Process Sovereign Audit Logs for IP-Guard & Blockchain
        data.forEach(row => {
            if (row.protocol === "SOVEREIGN_AUDIT") {
                if (ipGuardStatusVal) {
                    const isTamper = row.data_bits.includes("TAMPER_DETECTED");
                    ipGuardStatusVal.textContent = isTamper ? "TAMPER DETECTED" : "SECURED";
                    ipGuardStatusVal.className = isTamper ? "value warn" : "value good";
                }
                if (blockchainStatusVal && row.data_bits.includes("BLOCKCHAIN_ID:")) {
                    const idPart = row.data_bits.split("BLOCKCHAIN_ID:")[1].trim().substring(0, 12);
                    blockchainStatusVal.textContent = `NODE-${idPart}`;
                }
            }
        });

        // Fleet Jitter
        const fleetNodes = document.querySelectorAll('.fleet-mesh .value');
        fleetNodes.forEach(node => {
            if (Math.random() > 0.95) {
                node.style.opacity = '0.4';
                setTimeout(() => node.style.opacity = '1', 100);
            }
        });

    } catch (error) {
        console.error("Database fetch failed", error);
    }
}

refreshBtn.addEventListener('click', () => {
    addLog("Updating mission database cache...", "info");
    refreshDatabase();
});

transmitBtn.addEventListener('click', () => {
    const mode = modeSelect.value;
    
    if (mode === 'jamming') {
        playUISound('siren');
        addLog("[SEC] WARNING: Forcing unauthorized jamming signature into data stream!", "error");
        fetch('/', { method: 'POST', body: 'INJECT_JAMMING' }).catch(e=>console.error(e));
        
        // Auto-toggle Threat Mitigation UI switch if available
        const injectSwitch = document.getElementById('inject-btn');
        if (injectSwitch && !injectSwitch.checked) injectSwitch.checked = true;
    } else {
        playUISound('transmit');
        addLog(`UPLINK: Sending ${mode} payload...`, 'info');
        createPhoton('uplink');

        // Simulate automatic downlink response for "Two-Way" feel
        setTimeout(() => {
            addLog(`DOWNLINK: Lunar station responding...`, 'warning');
            createPhoton('downlink');
        }, 1500);
    }
});

clearBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
});

window.addEventListener('resize', () => {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
});

const resolveBtn = document.getElementById('resolve-btn');
const injectBtn = document.getElementById('inject-btn');

resolveBtn.addEventListener('click', async () => {
    addLog("[SYS] Sending clear command to quantum link...", "info");
    try {
        await fetch('/', { method: 'POST', body: 'RESOLVE' });
        // Give the cloud a moment to register before refreshing
        setTimeout(refreshDatabase, 1500);
    } catch (e) { console.error(e); }
});

injectBtn.addEventListener('click', async () => {
    addLog("[SEC] WARNING: Forcing unauthorized jamming signature into data stream!", "error");
    try {
        await fetch('/', { method: 'POST', body: 'INJECT_JAMMING' });
        setTimeout(refreshDatabase, 1500);
    } catch (e) { console.error(e); }
});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Rotate planets & particles
    earth.rotation.y += 0.004;
    mars.rotation.y += 0.006;
    particlesMesh.rotation.y -= 0.001;
    particlesMesh.rotation.x += 0.0005;

    // Animate photons
    for (let i = photons.length - 1; i >= 0; i--) {
        let p = photons[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
            // Reached destination
            scene.remove(p.mesh);
            photons.splice(i, 1);

            // Log reception and show bits
            const isQuantum = modeSelect.value === 'quantum';
            const bits = isQuantum ? (Math.random() > 0.5 ? "10" : "01") : "1";
            const dirLabel = p.direction === 'uplink' ? 'MOON RECEIVED' : 'EARTH RECEIVED';

            addLog(`${dirLabel}: Data [${bits}] verified.`, 'success');
        } else {
            // Interpolate position
            p.mesh.position.lerpVectors(p.start, p.end, p.progress);
        }
    }

    renderer.render(scene, camera);
}

// --- User Uplink ---
const sendUserBtn = document.getElementById('send-user-btn');
const userInput = document.getElementById('user-input');
const decodedDisplay = document.getElementById('decoded-display');
const mediaOutput = document.getElementById('media-output');

sendUserBtn.addEventListener('click', async () => {
    const msg = userInput.value.trim();
    if (!msg) return;

    addLog(`[UPLINK] User command staged: ${msg}`, 'info');
    userInput.value = ''; // Clear input

    try {
        await fetch('/', { method: 'POST', body: 'USER_MSG:' + msg });
        addLog("[SYS] Command transmitted to Quantum Link Relay.", "success");
        // Trigger a refresh to see the echo soon
        setTimeout(refreshDatabase, 2000);
    } catch (e) {
        console.error(e);
        addLog("[ERR] Uplink offline.", "error");
    }
});

// --- 3D Combo Box Logic ---
const customSelect = document.getElementById('custom-3d-select');
if (customSelect) {
    const trigger = document.getElementById('select-trigger');
    const options = document.querySelectorAll('.select-option');
    const triggerText = trigger.querySelector('span');
    
    trigger.addEventListener('mouseenter', () => playUISound('hover'));

    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        customSelect.classList.toggle('open');
        playUISound('open');
    });

    options.forEach(option => {
        option.addEventListener('mouseenter', () => playUISound('hover'));

        option.addEventListener('click', function(e) {
            e.stopPropagation();
            triggerText.textContent = this.textContent;
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            customSelect.classList.remove('open');
            modeSelect.value = this.getAttribute('data-value');
            playUISound('select');
        });
    });

    document.addEventListener('click', function(e) {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });
}

// Init
updateTelemetry();
refreshDatabase(); // Initial load
animate();

// --- Global Cybernetic UI Sound Effects ---
document.addEventListener('mouseover', (e) => {
    // Play light electronic hover sound on ANY interactable interface component
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || 
        e.target.classList.contains('tab') || e.target.classList.contains('dot-theme') || 
        e.target.classList.contains('slider') || e.target.classList.contains('action-btn')) {
        playUISound('hover');
    }
});

document.addEventListener('mousedown', (e) => {
    // Prevent duplicate sound if it's explicitly handled
    if (e.target.id === 'transmit-btn') return;
    
    // Play firm selection sound on ANY interactable component click
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('tab') || 
        e.target.classList.contains('dot-theme') || e.target.classList.contains('slider') || 
        e.target.classList.contains('action-btn')) {
        
        // Custom sound for Jamming/Resolve
        if(e.target.id === 'inject-btn' || e.target.closest('#inject-btn')) {
            playUISound('alert');
        } else if (e.target.id === 'resolve-btn' || e.target.closest('#resolve-btn')) {
            playUISound('success');
        } else if (e.target.id === 'clear-btn' || e.target.closest('#clear-btn')) {
            playUISound('open');
        } else {
            playUISound('select');
        }
    }
});

// Explicit listener for when Vistas or Modes are changed via standard Select HTML Dropdown
document.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT' && e.target.id !== 'vista-select') {
        playUISound('select');
    }
});

// --- Payload Override Specific Functionality ---
const overrideBtn = document.getElementById('payload-override-btn');
const overrideSelect = document.getElementById('payload-override-select');
if (overrideBtn && overrideSelect) {
    overrideBtn.addEventListener('click', async () => {
        const cmd = overrideSelect.value;
        if (!cmd) return playUISound('alert');
        
        if (cmd === 'FORCE_JAMMING') {
            playUISound('siren');
            addLog(`[UPLINK] Initiating payload override: ${cmd}...`, 'warning');
            addLog("[SEC] CRITICAL WARNING: Force Jamming signature deployed!", "error");
            try {
                await fetch('/', { method: 'POST', body: 'INJECT_JAMMING' });
                setTimeout(refreshDatabase, 1500);
            } catch(e) {}
            const injectSwitch = document.getElementById('inject-btn');
            if (injectSwitch && !injectSwitch.checked) injectSwitch.checked = true;
        } else {
            playUISound('transmit');
            addLog(`[UPLINK] Initiating payload override: ${cmd}...`, 'info');
            setTimeout(() => addLog("> Command verified by quantum hash check.", "success"), 1000);
        }
    });
}

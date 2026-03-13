// --- Config and Utils ---
const SPEED_OF_LIGHT = 299792.458; // km/s

// DOM Elements
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
const secureInbox = document.getElementById('secure-inbox');
const inboxMessage = document.getElementById('inbox-message');
const jepaConfidenceVal = document.getElementById('jepa-confidence');
const ipGuardStatusVal = document.getElementById('ip-guard-status');
const blockchainStatusVal = document.getElementById('blockchain-status');

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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Higher intensity
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2.0, 100);
pointLight.position.set(5, 10, 15);
scene.add(pointLight);

// Add a secondary fill light
const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.5);
fillLight.position.set(-10, -5, 5);
scene.add(fillLight);

// --- Planets ---
const textureLoader = new THREE.TextureLoader();

// Earth
const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x2233ff,
    emissive: 0x112244,
    specular: 0x333333,
    shininess: 15,
    flatShading: false
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.position.set(-8, 0, 0);
scene.add(earth);

// Earth Atmosphere Glow
const atmoGeom = new THREE.SphereGeometry(2.1, 64, 64);
const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide
});
const atmosphere = new THREE.Mesh(atmoGeom, atmoMat);
earth.add(atmosphere);

// Moon (Mars Geometry used as Moon)
const marsGeometry = new THREE.SphereGeometry(1.0, 64, 64);
const marsMaterial = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa,
    emissive: 0x111111,
    specular: 0x222222,
    shininess: 5
});
const mars = new THREE.Mesh(marsGeometry, marsMaterial);
mars.position.set(8, 0, 0);
scene.add(mars);

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
    addLog(`UPLINK: Sending ${mode} payload...`, 'info');
    createPhoton('uplink');

    // Simulate automatic downlink response for "Two-Way" feel
    setTimeout(() => {
        addLog(`DOWNLINK: Lunar station responding...`, 'warning');
        createPhoton('downlink');
    }, 1500);
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

    // Rotate planets
    earth.rotation.y += 0.005;
    mars.rotation.y += 0.008;

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

// Init
updateTelemetry();
refreshDatabase(); // Initial load
animate();

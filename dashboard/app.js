// --- Config and Utils ---
const SPEED_OF_LIGHT = 299792.458; // km/s

// --- Synthesized Web Audio API Implementation ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playUISound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const types = {
        'hover': { type: 'sine', freq: 800, nextFreq: 1200, dur: 0.05, gain: 0.02 },
        'select': { type: 'square', freq: 1200, nextFreq: 400, dur: 0.1, gain: 0.05 },
        'transmit': { type: 'triangle', freq: 1500, nextFreq: 2000, dur: 0.4, gain: 0.05 },
        'alert': { type: 'sawtooth', freq: 400, nextFreq: 200, dur: 0.3, gain: 0.1 },
        'success': { type: 'sine', freq: 600, nextFreq: 900, dur: 0.2, gain: 0.08 }
    };

    const t = types[type] || types['hover'];
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(t.nextFreq, audioCtx.currentTime + t.dur);
    gainNode.gain.setValueAtTime(t.gain, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t.dur);
    
    osc.start();
    osc.stop(audioCtx.currentTime + t.dur);
}

// DOM Elements
const canvasContainer = document.getElementById('canvas-container');
const distSlider = document.getElementById('dist-slider');
const distVal = document.getElementById('distance-val');
const owltVal = document.getElementById('owlt-val');
const attenVal = document.getElementById('attenuation-val');
const solarVal = document.getElementById('solar-val');
const transmitBtn = document.getElementById('transmit-btn');
const clearBtn = document.getElementById('clear-btn');
const logsContainer = document.getElementById('logs-container');
const modeSelect = document.getElementById('mode-select');
const historyBody = document.getElementById('history-body');
const refreshBtn = document.getElementById('refresh-db-btn');
const userInput = document.getElementById('user-input');
const sendUserBtn = document.getElementById('send-user-btn');
const decodedDisplay = document.getElementById('decoded-display');
const vistaSelect = document.getElementById('vista-select');

// --- GSAP Animations ---
function initGSAP() {
    gsap.from(".app-header", { y: -100, opacity: 0, duration: 1, ease: "power4.out" });
    
    gsap.to(".glass-panel", {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: "back.out(1.2)",
        onComplete: () => {
            document.querySelectorAll('.glass-panel').forEach(p => p.style.opacity = 1);
        }
    });

    // Count-up initial values
    animateMetric(distVal, 384400, "km");
    animateMetric(owltVal, 1.28, "sec");
}

function animateMetric(el, val, unit) {
    if (!el) return;
    const obj = { value: parseFloat(el.textContent) || 0 };
    gsap.to(obj, {
        value: val,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
            el.innerHTML = `${unit === 'km' ? Math.floor(obj.value).toLocaleString() : obj.value.toFixed(2)} ${unit}`;
        }
    });
}

// --- Three.js Setup ---
let scene, camera, renderer, earth, mars, particlesMesh, clouds;
let photons = [];

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();

    // Lighting
    scene.add(new THREE.AmbientLight(0x00f0ff, 0.4));
    const pointLight = new THREE.PointLight(0x00f0ff, 2.0, 100);
    pointLight.position.set(5, 10, 15);
    scene.add(pointLight);

    // Planets
    const earthGeo = new THREE.SphereGeometry(2, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
        bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
        bumpScale: 0.15,
        specular: new THREE.Color(0x333333),
        shininess: 25
    });
    earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(-8, 0, 0);
    scene.add(earth);

    const moonGeo = new THREE.SphereGeometry(1, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
        map: textureLoader.load('https://upload.wikimedia.org/wikipedia/commons/d/db/Moonmap_from_clementine_data.png'),
        roughness: 0.9
    });
    mars = new THREE.Mesh(moonGeo, moonMat);
    mars.position.set(8, 0, 0);
    scene.add(mars);

    // Particles
    const partGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(800 * 3);
    for(let i=0; i<800*3; i++) posArr[i] = (Math.random() - 0.5) * 40;
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    particlesMesh = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.05, color: 0x00f0ff, transparent: true, opacity: 0.3 }));
    scene.add(particlesMesh);

    // Animated 3D Backgrounds - Efficient Caching
    const videoCache = {};
    let activeVideo = null;

    function transitionBackground(filename) {
        if (!videoCache[filename]) {
            const vid = document.createElement('video');
            vid.muted = true;
            vid.defaultMuted = true;
            vid.setAttribute('muted', '');
            vid.loop = true;
            vid.crossOrigin = 'anonymous';
            vid.playsInline = true;
            vid.autoplay = true;
            vid.style.display = 'none';
            
            // Essential: Attach to DOM so the browser reliably streams the source
            document.body.appendChild(vid);
            
            vid.src = `assets/${filename}`;
            vid.load();
            
            const tex = new THREE.VideoTexture(vid);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            videoCache[filename] = { video: vid, texture: tex };
        }

        const target = videoCache[filename];

        // Ensure the scene background shifts instantly for the user
        scene.background = target.texture;

        const playPromise = target.video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (activeVideo && activeVideo !== target.video) {
                    activeVideo.pause();
                }
                activeVideo = target.video;
            }).catch(err => {
                console.error("Video stream pending user interaction:", err);
                if (activeVideo && activeVideo !== target.video) {
                    activeVideo.pause();
                }
                activeVideo = target.video;
            });
        }
    }

    vistaSelect.addEventListener('change', (e) => {
        playUISound('select');
        transitionBackground(e.target.value);
    });

    if (vistaSelect.options.length > 0) {
        transitionBackground(vistaSelect.options[0].value);
    }

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if(earth) earth.rotation.y += 0.002;
    if(mars) mars.rotation.y += 0.003;
    if(particlesMesh) particlesMesh.rotation.y -= 0.0005;

    for (let i = photons.length - 1; i >= 0; i--) {
        let p = photons[i];
        p.progress += 0.02;
        if (p.progress >= 1) {
            scene.remove(p.mesh);
            photons.splice(i, 1);
            addLog(`SIGNAL RECEIVED: Packet verified [${Math.random() > 0.5 ? '10' : '01'}].`, 'success');
        } else {
            p.mesh.position.lerpVectors(p.start, p.end, p.progress);
        }
    }
    renderer.render(scene, camera);
}

// --- Logic ---
function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    entry.innerHTML = `[${ts}] > ${message}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

async function refreshDatabase() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        const txs = data.transmissions || data;

        historyBody.innerHTML = '';
        txs.slice(0, 15).forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.source}</td>
                <td class="${row.status.toLowerCase().includes('success') ? 'good' : 'warn'}">${row.status}</td>
                <td class="mono">${row.data_bits.substring(0, 10)}...</td>
                <td class="${row.integrity_ok ? 'good' : 'warn'}">${row.integrity_ok ? 'OK' : 'ERR'}</td>
            `;
            historyBody.appendChild(tr);
        });

        const latest = txs[0];
        if (latest && solarVal) {
            solarVal.textContent = latest.status === 'SYS-ALERT' ? 'STORM DETECTED' : 'NOMINAL';
            solarVal.className = `value ${latest.status === 'SYS-ALERT' ? 'warn' : 'good'}`;
        }
    } catch (e) { console.error(e); }
}

function updateTelemetry() {
    const dKm = parseFloat(distSlider.value);
    const delay = dKm / SPEED_OF_LIGHT;
    animateMetric(distVal, dKm, "km");
    animateMetric(owltVal, delay, "sec");
    
    const atten = 150 + 20 * Math.log10(dKm);
    attenVal.textContent = `-${Math.round(atten)} dB`;
    
    const mappedX = ((dKm - 350000) / 56000) * 10;
    if(mars) mars.position.set(8 + mappedX, 0, 0);
}

// Events
transmitBtn.addEventListener('click', () => {
    playUISound('transmit');
    addLog(`UPLINK: Sending ${modeSelect.value} payload...`, 'info');
    
    const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    pMesh.position.copy(earth.position);
    scene.add(pMesh);
    photons.push({ mesh: pMesh, start: earth.position.clone(), end: mars.position.clone(), progress: 0 });

    setTimeout(() => {
        addLog("DOWNLINK: Lunar station responding...", "warning");
        const respMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xbf00ff }));
        respMesh.position.copy(mars.position);
        scene.add(respMesh);
        photons.push({ mesh: respMesh, start: mars.position.clone(), end: earth.position.clone(), progress: 0 });
    }, 1500);
});

sendUserBtn.addEventListener('click', async () => {
    const msg = userInput.value.trim();
    if(!msg) return;
    playUISound('transmit');
    addLog(`[UPLINK] User command: ${msg}`, 'info');
    try {
        await fetch('/', { method: 'POST', body: 'USER_MSG:' + msg });
        userInput.value = '';
        setTimeout(refreshDatabase, 2000);
    } catch(e) { addLog("ERR: Connection lost.", "warn"); }
});

refreshBtn.addEventListener('click', () => {
    playUISound('select');
    addLog("Synchronizing mission data...", "info");
    refreshDatabase();
});

clearBtn.addEventListener('click', () => {
    playUISound('alert');
    logsContainer.innerHTML = '';
});

// Init
window.addEventListener('load', () => {
    initThree();
    initGSAP();
    refreshDatabase();
    setInterval(refreshDatabase, 2500);
});

window.addEventListener('resize', () => {
    if(!camera || !renderer) return;
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
});

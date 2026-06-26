/**
 * 🌌 Space-Link: Neural Mission Assistant Engine
 * Redesigned for the Restored AI Control Center Layout.
 */

class MissionAI {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.isVoiceEnabled = true;
        this.voice = null;
        this.isTalking = false;

        // Element Hooks
        this.statusPanel = null;
        this.aiStatusText = null;

        this.init();
    }

    async init() {
        // Wait for voices to load
        this.synth.onvoiceschanged = () => {
            this.voices = this.synth.getVoices();
            // Try to find a professional sounding voice (UK/US English Male)
            this.voice = this.voices.find(v => v.lang === 'en-GB' || v.name.includes('Google US English') || v.name.includes('Male')) || this.voices[0];
            console.log("Mission AI Voice Active:", this.voice?.name);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindElements());
        } else {
            this.bindElements();
        }
    }

    bindElements() {
        this.statusPanel = document.querySelector('.ai-panel');
        this.aiStatusText = document.querySelector('.ai-sub-label');

        const voiceToggle = document.getElementById('ai-voice-toggle');
        if (voiceToggle) {
            voiceToggle.addEventListener('change', (e) => {
                this.isVoiceEnabled = e.target.checked;
                this.say(this.isVoiceEnabled ? "Neural Voice Engine Active." : "Voice mode dormant.");
            });
        }

        // Functional Hooks (RESTORED ALIGNMENT)
        const hooks = [
            { id: 'transmit-btn', text: 'Uplink ping staged. Measuring quantum latency...' },
            { id: 'mode-select', text: 'Protocol shifted. Optimization online.', isSelect: true },
            { id: 'inject-btn', text: 'Critical Alert! Unauthorized jamming signature detected!', isCheckbox: true, triggerOn: true },
            { id: 'spoof-btn', text: 'Warning! Satellite spoofing active. Source origin forged.', isCheckbox: true, triggerOn: true },
            { id: 'resolve-btn', text: 'Counter-measures engaged. Link integrity restored.', isCheckbox: true, triggerOn: true },
            { id: 'refresh-db-btn', text: 'Synchronizing Mission History with the sovereign ledger.' },
            { id: 'clear-btn', text: 'Terminal output purged.' },
            { id: 'scan-firmware-btn', text: 'Scanning firmware logic for structural integrity.' },
            { id: 'payload-override-btn', text: 'Manual override sequence engaged. Transmitting securely.' }
        ];

        hooks.forEach(hook => {
            const el = document.getElementById(hook.id);
            if (!el) return;

            if (hook.isSelect) {
                el.addEventListener('change', (e) => {
                    const mode = e.target.options[e.target.selectedIndex].text;
                    this.say(`Switching to ${mode} mode.`);
                });
            } else if (hook.isCheckbox) {
                el.addEventListener('change', (e) => {
                    if (e.target.checked === hook.triggerOn) this.say(hook.text);
                });
            } else {
                el.addEventListener('click', () => {
                    this.say(hook.text);
                });
            }
        });

        // Initialize welcome message
        setTimeout(() => this.say("Mission AI Specialist initialized. Welcome back, Commander."), 1500);

        // Reactive Status Observer
        const statusEl = document.getElementById('solar-val');
        if (statusEl) {
            const observer = new MutationObserver((mutationsList) => {
                const newStatus = statusEl.textContent.trim();
                if (newStatus === "STORM DETECTED") {
                    this.say("Warning! Massive Solar Flare detected. Expect signal degradation.");
                } else if (newStatus === "NOMINAL") {
                    this.say("Environment conditions stabilized. Signal throughput nominal.");
                }
            });
            observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
        }
    }

    say(text) {
        if (!this.isVoiceEnabled) return;
        if (this.isTalking) this.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 1.0; 
        utterance.pitch = 0.9;
        utterance.volume = 0.8;

        utterance.onstart = () => {
            this.isTalking = true;
            if (this.statusPanel) this.statusPanel.classList.add('talking');
            if (this.aiStatusText) {
                gsap.to(this.aiStatusText, { opacity: 0, duration: 0.1, onComplete: () => {
                    this.aiStatusText.textContent = text;
                    gsap.to(this.aiStatusText, { opacity: 1, duration: 0.2 });
                }});
            }
        };

        utterance.onend = () => {
            this.isTalking = false;
            if (this.statusPanel) this.statusPanel.classList.remove('talking');
            setTimeout(() => {
                if (this.aiStatusText && !this.isTalking) {
                    gsap.to(this.aiStatusText, { opacity: 0.5, duration: 0.5, onComplete: () => {
                        this.aiStatusText.textContent = "Listening for command...";
                    }});
                }
            }, 5000);
        };

        this.synth.speak(utterance);
    }

    stop() {
        this.synth.cancel();
        this.isTalking = false;
        if (this.statusPanel) this.statusPanel.classList.remove('talking');
    }
}

// Global instance
window.missionAI = new MissionAI();

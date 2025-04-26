/**
 * SoundAnalyzer - A reusable class for audio visualization
 * Provides real-time frequency spectrum and spectrogram visualization
 */
class SoundAnalyzer {
    /**
     * Create a new SoundAnalyzer instance
     * @param {Object} options - Configuration options
     * @param {HTMLCanvasElement} options.frequencyCanvas - Canvas for frequency graph
     * @param {HTMLCanvasElement} options.spectrogramCanvas - Canvas for spectrogram
     * @param {Number} options.fftSize - FFT size (must be power of 2)
     * @param {Number} options.minDecibels - Minimum decibel value
     * @param {Number} options.maxDecibels - Maximum decibel value
     * @param {Boolean} options.verticalSpectrogram - Whether to display spectrogram vertically (default: true)
     * @param {Number} options.targetFrequency - Target frequency to highlight with vertical line (optional)
     */
    constructor(options) {
        // Set up canvas elements
        this.frequencyCanvas = options.frequencyCanvas;
        this.spectrogramCanvas = options.spectrogramCanvas;
        this.freqCtx = this.frequencyCanvas.getContext('2d');
        this.spectCtx = this.spectrogramCanvas.getContext('2d');
        
        // Initialize audio properties
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.audioSource = null;
        this.audioElement = null;
        
        // FFT settings
        this.fftSize = options.fftSize || 2048;
        this.minDecibels = options.minDecibels || -100;
        this.maxDecibels = options.maxDecibels || 0;
        
        // Target frequency to highlight
        this.targetFrequency = options.targetFrequency || null;
        
        // Visualization state
        this.isRunning = false;
        this.animationId = null;
        this.spectrogramOffset = 0;
        
        // Spectrogram orientation (vertical by default)
        this.verticalSpectrogram = options.verticalSpectrogram !== false;
        
        // Set up canvas dimensions
        this.setupCanvas();
        
        // Demo mode components
        this.demoOscillator = null;
        this.demoLfo = null;
        this.sweepLfo = null;
    }
    
    /**
     * Draw grid lines on the frequency canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // Vertical lines (frequency)
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        frequencies.forEach(freq => {
            const minLog = Math.log10(20);
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050); // Nyquist frequency
            
            if (freq < 20 || freq > (this.audioContext ? (this.audioContext.sampleRate / 2) : 22050)) return;
            
            const xPos = (Math.log10(freq) - minLog) / (maxLog - minLog) * width;
            
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, height);
            ctx.stroke();
            
            // Add frequency label
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            let freqLabel = freq >= 1000 ? (freq / 1000) + 'k' : freq;
            ctx.fillText(freqLabel, xPos, height - 5);
        });
        
        // Highlight the 21Hz reference mark in cyan (demo mode)
        if (this.demoOscillator) {
            const refFreq = 21;
            const minLog = Math.log10(20);
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const xPos = (Math.log10(Math.max(20, refFreq)) - minLog) / (maxLog - minLog) * width;
            
            ctx.strokeStyle = '#4FC3F7'; // Cyan color
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, height);
            ctx.stroke();
            
            ctx.fillStyle = '#4FC3F7';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('21', xPos, height - 5);
        }
        
        // Draw target frequency line if set
        if (this.targetFrequency) {
            const minLog = Math.log10(20);
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const xPos = (Math.log10(Math.max(20, this.targetFrequency)) - minLog) / (maxLog - minLog) * width;
            
            // Draw vertical line for target frequency
            ctx.strokeStyle = '#00FF00'; // Bright green
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, height);
            ctx.stroke();
            
            // Add frequency label
            ctx.fillStyle = '#00FF00';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.targetFrequency} Hz`, xPos, 20);
            
            // Add "Target" label
            ctx.fillText('TARGET', xPos, 35);
        }
        
        // Horizontal lines (dB)
        const minDb = this.analyser ? this.analyser.minDecibels : this.minDecibels;
        const maxDb = this.analyser ? this.analyser.maxDecibels : this.maxDecibels;
        const dbStep = 20;
        
        for (let db = maxDb; db >= minDb; db -= dbStep) {
            const yPos = ((db - maxDb) / (minDb - maxDb)) * height;
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(width, yPos);
            ctx.stroke();
            
            // Add dB label
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(db + ' dB', 5, yPos - 3);
        }
    }
    
    /**
     * Handle canvas hover for frequency display
     * @param {MouseEvent} event - Mouse event
     * @returns {Object} - Frequency and dB values at mouse position
     */
    handleCanvasHover(event) {
        if (!this.analyser) return { frequency: 0, db: 0 };
        
        const rect = this.frequencyCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert x position to frequency (logarithmic scale)
        const xRatio = x / rect.width;
        const minLog = Math.log10(20);  // 20Hz
        const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
        const freqLog = minLog + xRatio * (maxLog - minLog);
        const frequency = Math.round(Math.pow(10, freqLog));
        
        // Convert y position to decibels
        const yRatio = 1 - (y / rect.height);
        const minDb = this.analyser ? this.analyser.minDecibels : this.minDecibels;
        const maxDb = this.analyser ? this.analyser.maxDecibels : this.maxDecibels;
        const db = Math.round(minDb + yRatio * (maxDb - minDb));
        
        return { frequency, db };
    }
    
    /**
     * Set or update the target frequency
     * @param {Number} frequency - Target frequency in Hz
     */
    setTargetFrequency(frequency) {
        this.targetFrequency = frequency;
    }
    
    /**
     * Convert HSL color to RGB
     * @param {Number} h - Hue [0-1]
     * @param {Number} s - Saturation [0-1]
     * @param {Number} l - Lightness [0-1]
     * @returns {Array} - RGB values [r, g, b] in range [0-255]
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }
    
    /**
     * Set up canvas dimensions and clear spectrogram
     */
    setupCanvas() {
        // Set frequency canvas dimensions
        this.frequencyCanvas.width = this.frequencyCanvas.offsetWidth * window.devicePixelRatio;
        this.frequencyCanvas.height = this.frequencyCanvas.offsetHeight * window.devicePixelRatio;
        
        // Set spectrogram canvas dimensions
        this.spectrogramCanvas.width = this.spectrogramCanvas.offsetWidth * window.devicePixelRatio;
        this.spectrogramCanvas.height = this.spectrogramCanvas.offsetHeight * window.devicePixelRatio;
        
        // Clear the spectrogram
        this.spectCtx.fillStyle = 'black';
        this.spectCtx.fillRect(0, 0, this.spectrogramCanvas.width, this.spectrogramCanvas.height);
        
        // Reset spectrogram position
        this.spectrogramOffset = 0;
    }
    
    /**
     * Update analyzer settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        if (!this.analyser && settings.targetFrequency) {
            this.targetFrequency = settings.targetFrequency;
            return;
        }
        
        if (!this.analyser) return;
        
        if (settings.fftSize) {
            this.fftSize = settings.fftSize;
            this.analyser.fftSize = parseInt(settings.fftSize);
        }
        
        if (settings.minDecibels) {
            this.minDecibels = settings.minDecibels;
            this.analyser.minDecibels = parseInt(settings.minDecibels);
        }
        
        if (settings.maxDecibels) {
            this.maxDecibels = settings.maxDecibels;
            this.analyser.maxDecibels = parseInt(settings.maxDecibels);
        }
        
        if (settings.targetFrequency !== undefined) {
            this.targetFrequency = settings.targetFrequency;
        }
        
        if (settings.verticalSpectrogram !== undefined) {
            this.verticalSpectrogram = settings.verticalSpectrogram;
            // Reset the spectrogram when changing orientation
            this.resetSpectrogram();
        }
    }
    
    /**
     * Start microphone audio analysis
     * @returns {Promise} - Resolves when microphone is set up
     */
    async startMicrophoneAudio() {
        if (this.isRunning) {
            this.stopAudio(); // Stop existing audio before starting a new one
        }
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get user microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create nodes
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            
            // Configure analyser
            this.analyser.fftSize = this.fftSize;
            this.analyser.minDecibels = this.minDecibels;
            this.analyser.maxDecibels = this.maxDecibels;
            this.analyser.smoothingTimeConstant = 0.85;
            
            // Connect nodes
            this.microphone.connect(this.analyser);
            
            // Start visualization
            this.isRunning = true;
            this.visualize();
            
            return stream;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    }
    
    /**
     * Start audio file analysis
     * @param {File} file - Audio file to analyze
     * @returns {Promise} - Resolves when file is loaded and playing
     */
    async startFileAudio(file) {
        if (this.isRunning) {
            this.stopAudio();
        }
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create audio element for playback
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.controls = false;
                this.audioElement.loop = true;
            }
            
            // Set the file as the source
            const fileURL = URL.createObjectURL(file);
            this.audioElement.src = fileURL;
            
            // Create nodes
            this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
            this.analyser = this.audioContext.createAnalyser();
            
            // Configure analyser
            this.analyser.fftSize = this.fftSize;
            this.analyser.minDecibels = this.minDecibels;
            this.analyser.maxDecibels = this.maxDecibels;
            this.analyser.smoothingTimeConstant = 0.85;
            
            // Connect nodes
            this.audioSource.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination); // Connect to speakers
            
            // Start playback
            this.audioElement.play();
            
            // Start visualization
            this.isRunning = true;
            this.visualize();
            
            return true;
        } catch (error) {
            console.error('Error processing audio file:', error);
            throw error;
        }
    }
    
    /**
     * Start demo mode using oscillators
     */
    startDemoMode() {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for demo
        this.demoOscillator = this.audioContext.createOscillator();
        this.demoOscillator.type = 'sawtooth';
        this.demoOscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        
        // Create gain node to control volume
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.5;
        
        // Create analyser
        this.analyser = this.audioContext.createAnalyser();
        
        // Configure analyser
        this.analyser.fftSize = this.fftSize;
        this.analyser.minDecibels = this.minDecibels;
        this.analyser.maxDecibels = this.maxDecibels;
        this.analyser.smoothingTimeConstant = 0.85;
        
        // Connect nodes
        this.demoOscillator.connect(gainNode);
        gainNode.connect(this.analyser);
        
        // Create LFO for frequency modulation to make it more interesting
        this.demoLfo = this.audioContext.createOscillator();
        this.demoLfo.frequency.value = 0.2; // Slow modulation
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 100; // Modulation depth
        this.demoLfo.connect(lfoGain);
        lfoGain.connect(this.demoOscillator.frequency);
        
        // Additional sweeping LFO to make visualization more interesting
        this.sweepLfo = this.audioContext.createOscillator();
        this.sweepLfo.frequency.value = 0.05; // Very slow sweep
        const sweepGain = this.audioContext.createGain();
        sweepGain.gain.value = 300; // Wide range
        this.sweepLfo.connect(sweepGain);
        sweepGain.connect(this.demoOscillator.frequency);
        
        // Start oscillators
        this.demoOscillator.start();
        this.demoLfo.start();
        this.sweepLfo.start();
        
        // Start visualization
        this.isRunning = true;
        this.visualize();
        
        return true;
    }
    
    /**
     * Stop audio processing and visualization
     */
    stopAudio() {
        if (!this.isRunning) return;
        
        // Stop visualization
        cancelAnimationFrame(this.animationId);
        
        // Disconnect and clean up
        if (this.microphone) {
            this.microphone.disconnect();
        }
        
        if (this.audioSource) {
            this.audioSource.disconnect();
        }
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        
        // Stop demo oscillators if they exist
        if (this.demoOscillator) {
            this.demoOscillator.stop();
            this.demoOscillator.disconnect();
        }
        
        if (this.demoLfo) {
            this.demoLfo.stop();
            this.demoLfo.disconnect();
        }
        
        if (this.sweepLfo) {
            this.sweepLfo.stop();
            this.sweepLfo.disconnect();
        }
        
        // Close the audio context if it exists
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(err => console.error('Error closing AudioContext:', err));
        }
        
        // Reset properties
        this.microphone = null;
        this.audioSource = null;
        this.analyser = null;
        this.audioContext = null;
        this.demoOscillator = null;
        this.demoLfo = null;
        this.sweepLfo = null;
        this.isRunning = false;
    }
    
    /**
     * Reset the spectrogram
     */
    resetSpectrogram() {
        // Clear the spectrogram
        this.spectCtx.fillStyle = 'black';
        this.spectCtx.fillRect(0, 0, this.spectrogramCanvas.width, this.spectrogramCanvas.height);
        this.spectrogramOffset = 0;
    }
    
    /**
     * Main visualization loop
     */
    visualize() {
        if (!this.isRunning) return;
        
        // Request next frame
        this.animationId = requestAnimationFrame(() => this.visualize());
        
        // Create data array for frequency data
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Get frequency data (0-255 range)
        this.analyser.getByteFrequencyData(dataArray);
        
        // Draw frequency spectrum
        this.drawFrequencyGraph(dataArray);
        
        // Draw spectrogram
        this.drawSpectrogram(dataArray);
    }
    
    /**
     * Draw the frequency spectrum graph
     * @param {Uint8Array} dataArray - Frequency data array from analyser
     */
    drawFrequencyGraph(dataArray) {
        const width = this.frequencyCanvas.width;
        const height = this.frequencyCanvas.height;
        const bufferLength = dataArray.length;
        
        // Clear canvas
        this.freqCtx.fillStyle = '#222';
        this.freqCtx.fillRect(0, 0, width, height);
        
        // Draw grid lines
        this.drawGrid(this.freqCtx, width, height);
        
        // Generate some demo data for second trace if in demo mode
        const secondaryData = new Uint8Array(bufferLength);
        if (this.demoOscillator) {
            for (let i = 0; i < bufferLength; i++) {
                // Make second trace intentionally lower
                secondaryData[i] = Math.max(0, dataArray[i] - 20 - Math.random() * 20);
            }
        } else {
            // Just copy with lower values for non-demo mode
            for (let i = 0; i < bufferLength; i++) {
                secondaryData[i] = Math.max(0, dataArray[i] - 30);
            }
        }
        
        // Draw second trace first (yellow line)
        this.freqCtx.beginPath();
        this.freqCtx.strokeStyle = '#FFEB3B';
        this.freqCtx.lineWidth = 1.5;
        
        for (let i = 0; i < bufferLength; i++) {
            // Log scale for x-axis (frequency)
            const freq = i * (this.audioContext ? this.audioContext.sampleRate : 44100) / (2 * bufferLength);
            const minLog = Math.log10(20); // 20Hz
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const xPos = (Math.log10(Math.max(20, freq)) - minLog) / (maxLog - minLog) * width;
            
            // Convert from 0-255 to actual dB
            const minDb = this.analyser ? this.analyser.minDecibels : this.minDecibels;
            const maxDb = this.analyser ? this.analyser.maxDecibels : this.maxDecibels;
            const dbValue = minDb + (secondaryData[i] / 255) * (maxDb - minDb);
            
            // Calculate y position (0 = top of canvas)
            const y = ((dbValue - maxDb) / (minDb - maxDb)) * height;
            
            if (i === 0) {
                this.freqCtx.moveTo(xPos, y);
            } else {
                this.freqCtx.lineTo(xPos, y);
            }
        }
        this.freqCtx.stroke();
        
        // Draw primary frequency line (red)
        this.freqCtx.beginPath();
        this.freqCtx.strokeStyle = '#FF4081';
        this.freqCtx.lineWidth = 2;
        
        for (let i = 0; i < bufferLength; i++) {
            // Log scale for x-axis (frequency)
            const freq = i * (this.audioContext ? this.audioContext.sampleRate : 44100) / (2 * bufferLength);
            const minLog = Math.log10(20); // 20Hz
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const xPos = (Math.log10(Math.max(20, freq)) - minLog) / (maxLog - minLog) * width;
            
            // Convert from 0-255 to actual dB
            const minDb = this.analyser ? this.analyser.minDecibels : this.minDecibels;
            const maxDb = this.analyser ? this.analyser.maxDecibels : this.maxDecibels;
            const dbValue = minDb + (dataArray[i] / 255) * (maxDb - minDb);
            
            // Calculate y position (0 = top of canvas)
            const y = ((dbValue - maxDb) / (minDb - maxDb)) * height;
            
            if (i === 0) {
                this.freqCtx.moveTo(xPos, y);
            } else {
                this.freqCtx.lineTo(xPos, y);
            }
        }
        
        this.freqCtx.stroke();
        
        // Add a peak marker similar to the one in the reference image
        if (this.demoOscillator) {
            // Simulate a peak marker at a specific frequency for demo mode
            const peakFreq = 21; // Hz
            const peakDb = -53;  // dB
            
            const minLog = Math.log10(20);
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const xPos = (Math.log10(Math.max(20, peakFreq)) - minLog) / (maxLog - minLog) * width;
            
            const minDb = this.analyser ? this.analyser.minDecibels : this.minDecibels;
            const maxDb = this.analyser ? this.analyser.maxDecibels : this.maxDecibels;
            const yPos = ((peakDb - maxDb) / (minDb - maxDb)) * height;
            
            // Draw marker
            this.freqCtx.fillStyle = '#4FC3F7'; // Cyan color
            this.freqCtx.font = '12px monospace';
            this.freqCtx.fillText(`${peakDb} dB`, xPos + 5, yPos - 5);
            this.freqCtx.fillText(`${peakFreq}Hz`, xPos + 5, yPos + 15);
            
            // Draw dot
            this.freqCtx.beginPath();
            this.freqCtx.arc(xPos, yPos, 4, 0, Math.PI * 2);
            this.freqCtx.fillStyle = '#FFEB3B';
            this.freqCtx.fill();
        }
    }
    
    /**
     * Draw the spectrogram
     * @param {Uint8Array} dataArray - Frequency data array from analyser
     */
    drawSpectrogram(dataArray) {
        const width = this.spectrogramCanvas.width;
        const height = this.spectrogramCanvas.height;
        const bufferLength = dataArray.length;
        
        // For vertical spectrogram (time flowing from top to bottom)
        // Create image data for a single row
        const imageData = this.spectCtx.createImageData(width, 1);
        
        // Fill image data for current row - ensure low frequencies are on left, high on right
        for (let i = 0; i < width; i++) {
            // Map canvas x position to frequency bin (logarithmic)
            const xRatio = i / width;
            const minLog = Math.log10(20); // 20Hz
            const maxLog = Math.log10(this.audioContext ? (this.audioContext.sampleRate / 2) : 22050);
            const freqLog = minLog + xRatio * (maxLog - minLog);
            const freq = Math.pow(10, freqLog);
            
            // Find the corresponding frequency bin
            const binIndex = Math.min(
                bufferLength - 1, 
                Math.floor(freq * bufferLength * 2 / (this.audioContext ? this.audioContext.sampleRate : 44100))
            );
            
            // Get amplitude value and map to color
            const value = dataArray[binIndex];
            
            // HSL to RGB for nice color gradient (purple-blue to yellow-red)
            const hue = 270 - (value / 255) * 270; // 270 (purple) to 0 (red)
            const saturation = 100;
            const lightness = Math.max(5, Math.min(70, (value / 2.55) + 5));
            
            const color = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
            
            // Set pixel values
            const pixelIndex = i * 4;
            imageData.data[pixelIndex] = color[0];     // R
            imageData.data[pixelIndex + 1] = color[1]; // G
            imageData.data[pixelIndex + 2] = color[2]; // B
            imageData.data[pixelIndex + 3] = 255;      // A
        }
        
        // Add the row to the spectrogram at the current position
        this.spectCtx.putImageData(imageData, 0, this.spectrogramOffset);
        
        // Increment row position (moving top to bottom)
        this.spectrogramOffset++;
        
        // If we reach the bottom edge, scroll up
        if (this.spectrogramOffset >= height) {
            // Shift existing spectrogram up
            this.spectCtx.drawImage(
                this.spectrogramCanvas,
                0, 1, width, height - 1,
                0, 0, width, height - 1
            );
            this.spectrogramOffset = height - 1;
        }
    }
    
    /**
     * Calculate the pitch from audio data
     * @param {Float32Array} audioData - Raw audio data
     * @param {Number} sampleRate - Sample rate of the audio
     * @returns {Object} - Object with frequency and clarity values
     */
    calculatePitch(audioData, sampleRate) {
        // Utiliser seulement un segment de données pour l'analyse
        // Ignorer le début et la fin qui peuvent contenir des transitoires
        const startSample = Math.floor(audioData.length * 0.2); // Ignorer les premiers 20%
        const endSample = Math.floor(audioData.length * 0.8);   // Ignorer les derniers 20%
        const segmentLength = endSample - startSample;
        
        // Taille de la fenêtre pour l'autocorrélation
        const windowSize = Math.min(4096, segmentLength);
        
        // Collecter des mesures de fréquence pour plusieurs fenêtres
        const frequencies = [];
        const clarities = [];
        
        // Nombre de fenêtres à analyser
        const numWindows = Math.min(10, Math.floor(segmentLength / (windowSize / 2)));
        
        for (let i = 0; i < numWindows; i++) {
            const windowStart = startSample + Math.floor(i * (segmentLength - windowSize) / (numWindows - 1));
            const windowData = audioData.slice(windowStart, windowStart + windowSize);
            
            // Appliquer une fenêtre de Hann pour réduire les artefacts
            for (let j = 0; j < windowSize; j++) {
                windowData[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / (windowSize - 1)));
            }
            
            // Autocorrélation
            const correlation = new Float32Array(windowSize);
            let sumSquares = 0;
            
            // Calculer l'énergie du signal
            for (let j = 0; j < windowSize; j++) {
                sumSquares += windowData[j] * windowData[j];
            }
            
            if (sumSquares <= 0) continue; // Éviter la division par zéro
            
            // Calculer l'autocorrélation normalisée
            for (let lag = 0; lag < windowSize; lag++) {
                let sum = 0;
                for (let j = 0; j < windowSize - lag; j++) {
                    sum += windowData[j] * windowData[j + lag];
                }
                correlation[lag] = sum / sumSquares;
            }
            
            // Trouver les pics dans la fonction d'autocorrélation
            // Ignorer les premiers échantillons (fréquences trop élevées)
            const minLag = Math.floor(sampleRate / 1000); // Limite à 1000 Hz
            const maxLag = Math.floor(sampleRate / 80);   // Limite à 80 Hz
            
            let maxCorrelation = 0;
            let bestLag = 0;
            
            for (let lag = minLag; lag < maxLag; lag++) {
                // Vérifier si c'est un pic local
                if (correlation[lag] > correlation[lag - 1] && 
                    correlation[lag] > correlation[lag + 1] && 
                    correlation[lag] > maxCorrelation) {
                    maxCorrelation = correlation[lag];
                    bestLag = lag;
                }
            }
            
            // Si un pic valide a été trouvé
            if (bestLag > 0 && maxCorrelation > 0.3) {
                // Calcul plus précis avec interpolation parabolique
                const y1 = correlation[bestLag - 1];
                const y2 = correlation[bestLag];
                const y3 = correlation[bestLag + 1];
                const d = (y3 - y1) / (2 * (2 * y2 - y1 - y3));
                
                const refinedLag = bestLag + d;
                const frequency = sampleRate / refinedLag;
                
                // Mesure de la clarté (qualité) de la note
                const clarity = maxCorrelation;
                
                frequencies.push(frequency);
                clarities.push(clarity);
            }
        }
        
        // Si aucune fréquence valide n'a été trouvée
        if (frequencies.length === 0) {
            return { frequency: 0, clarity: 0 };
        }
        
        // Trier les fréquences et prendre la médiane pour éviter les valeurs aberrantes
        frequencies.sort((a, b) => a - b);
        clarities.sort((a, b) => a - b);
        
        const medianFrequency = frequencies[Math.floor(frequencies.length / 2)];
        const medianClarity = clarities[Math.floor(clarities.length / 2)];
        
        return { frequency: medianFrequency, clarity: medianClarity };
    }
}

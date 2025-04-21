// Configuration des voyelles et notes
const vowels = ['a', 'e', 'i', 'o', 'u', 'ou'];

// Notes avec leurs fréquences entre 90Hz et 880Hz
// On inclut plusieurs octaves pour chaque note
const notes = [
    // Octave basse (90-175Hz environ)
    { name: 'fa grave', frequency: 87.31, notation: 'F2' },
    { name: 'sol grave', frequency: 98.00, notation: 'G2' },
    { name: 'la grave', frequency: 110.00, notation: 'A2' },
    { name: 'si grave', frequency: 123.47, notation: 'B2' },
    
    // Octave médium basse (175-350Hz environ)
    { name: 'do', frequency: 130.81, notation: 'C3' },
    { name: 'ré', frequency: 146.83, notation: 'D3' },
    { name: 'mi', frequency: 164.81, notation: 'E3' },
    { name: 'fa', frequency: 174.61, notation: 'F3' },
    { name: 'sol', frequency: 196.00, notation: 'G3' },
    { name: 'la', frequency: 220.00, notation: 'A3' },
    { name: 'si', frequency: 246.94, notation: 'B3' },
    
    // Octave médium (350-700Hz environ)
    { name: 'do médium', frequency: 261.63, notation: 'C4' },
    { name: 'ré médium', frequency: 293.66, notation: 'D4' },
    { name: 'mi médium', frequency: 329.63, notation: 'E4' },
    { name: 'fa médium', frequency: 349.23, notation: 'F4' },
    { name: 'sol médium', frequency: 392.00, notation: 'G4' },
    { name: 'la médium', frequency: 440.00, notation: 'A4' },
    { name: 'si médium', frequency: 493.88, notation: 'B4' },
    
    // Octave médium haute (700-880Hz)
    { name: 'do aigu', frequency: 523.25, notation: 'C5' },
    { name: 'ré aigu', frequency: 587.33, notation: 'D5' },
    { name: 'mi aigu', frequency: 659.26, notation: 'E5' },
    { name: 'fa aigu', frequency: 698.46, notation: 'F5' },
    { name: 'sol aigu', frequency: 783.99, notation: 'G5' },
    { name: 'la aigu', frequency: 880.00, notation: 'A5' }
];

// Éléments DOM
const generateBtn = document.getElementById('generate-btn');
const startBtn = document.getElementById('start-btn');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const timerEl = document.getElementById('timer');
const selectedVowelEl = document.getElementById('selected-vowel');
const selectedNoteEl = document.getElementById('selected-note');
const scoreContainerEl = document.getElementById('score-container');
const audioPlayerContainerEl = document.getElementById('audio-player-container');
const pitchAnalysisEl = document.getElementById('pitch-analysis');

// Variables globales
let currentVowel = 'o';
let currentNote = { name: 'mi médium', frequency: 329.63, notation: 'E4' };
let timerInterval;
let mediaRecorder;
let audioChunks = [];
let audioStream;
let analyser;
let audioContext;
let pitchDetectionInterval;
let pitchCanvas;
let pitchCanvasCtx;
let isVisualizing = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser le canvas de visualisation du pitch
    pitchCanvas = document.getElementById('pitch-canvas');
    pitchCanvasCtx = pitchCanvas.getContext('2d');
    
    // Initialiser l'affichage de la notation musicale
    drawMusicNotation(currentNote);
    
    // Initialiser l'audioContext
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    } catch (e) {
        console.error('Web Audio API n\'est pas supportée par ce navigateur.');
        alert('Votre navigateur ne supporte pas les API audio nécessaires. Veuillez utiliser un navigateur récent comme Chrome ou Firefox.');
    }
    
    // Événements
    generateBtn.addEventListener('click', generateExercise);
    startBtn.addEventListener('click', startExercise);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    
    // Dessiner le canvas de visualisation initial
    drawEmptyPitchCanvas();
});

// Générer un nouvel exercice
function generateExercise() {
    // Sélectionner une voyelle aléatoire
    const randomVowelIndex = Math.floor(Math.random() * vowels.length);
    currentVowel = vowels[randomVowelIndex];
    
    // Sélectionner une note aléatoire dans la plage 90-880Hz
    // On filtre les notes qui sont dans cette plage
    const notesInRange = notes.filter(note => note.frequency >= 90 && note.frequency <= 880);
    const randomNoteIndex = Math.floor(Math.random() * notesInRange.length);
    currentNote = notesInRange[randomNoteIndex];
    
    // Mettre à jour l'affichage
    selectedVowelEl.textContent = currentVowel;
    selectedNoteEl.textContent = `${currentNote.name} (${Math.round(currentNote.frequency)} Hz)`;
    
    // Mettre à jour la notation musicale
    drawMusicNotation(currentNote);
    
    // Réinitialiser l'analyse
    pitchAnalysisEl.innerHTML = '';
    
    // Jouer la note de référence brièvement
    playReferenceNote(currentNote.frequency, 0.5);
}

// Démarrer l'exercice avec un compte à rebours
function startExercise() {
    let timeLeft = 10;
    
    // Désactiver les boutons pendant l'exercice
    startBtn.disabled = true;
    generateBtn.disabled = true;
    recordBtn.disabled = true;
    
    // Si un enregistrement est en cours, l'arrêter
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
    }
    
    // Mettre à jour le compte à rebours
    timerEl.textContent = timeLeft;
    
    // Animation du timer
    timerEl.classList.add('active');
    
    // Jouer la note de référence et attendre qu'elle soit terminée
    const noteDuration = playReferenceNote(currentNote.frequency, 2);
    
    // Attendre que la note soit terminée avant de commencer le compte à rebours
    setTimeout(() => {
        // Démarrer automatiquement l'enregistrement
        startRecording(true); // Le paramètre true indique que c'est un enregistrement automatique
        
        // Démarrer le compte à rebours
        timerInterval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            // Visualiser le pitch en temps réel
            if (audioStream && analyser) {
                visualizePitch();
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerEl.textContent = '10';
                timerEl.classList.remove('active');
                
                // Arrêter l'enregistrement automatiquement
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    stopRecording();
                }
                
                // Réactiver les boutons
                startBtn.disabled = false;
                generateBtn.disabled = false;
                recordBtn.disabled = false;
            }
        }, 1000);
    }, noteDuration * 1000);
}

// Jouer une note de référence
function playReferenceNote(frequency, duration = 1) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Si l'audioContext est suspendu (politique d'autoplay), le reprendre
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Utiliser une forme d'onde sinusoïdale pour un son plus proche de la voix
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Appliquer une enveloppe au son pour un effet plus naturel
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    
    // Ajouter un léger vibrato pour rendre le son plus naturel
    const lfoFrequency = 5; // 5Hz - vitesse du vibrato
    const lfoDepth = 3;     // +/- 3Hz - profondeur du vibrato
    
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoFrequency;
    
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = lfoDepth;
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    
    // Connecter les nœuds et démarrer les oscillateurs
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    lfo.start();
    
    oscillator.stop(audioContext.currentTime + duration);
    lfo.stop(audioContext.currentTime + duration);
    
    return duration; // Retourner la durée pour permettre la coordination avec d'autres fonctions
}

// Dessiner la notation musicale
function drawMusicNotation(note, userFrequency = null) {
    // Créer un canvas pour dessiner la portée
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    // Dessiner les lignes de la portée
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#333';
    
    // Dessiner les 5 lignes de la portée
    const lineStart = 40;
    const lineEnd = 360;
    const lineSpacing = 10;
    const firstLineY = 50;
    
    for (let i = 0; i < 5; i++) {
        const y = firstLineY + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(lineStart, y);
        ctx.lineTo(lineEnd, y);
        ctx.stroke();
    }
    
    // Dessiner la clé de sol
    ctx.font = '48px serif';
    ctx.fillText('𝄞', lineStart + 5, firstLineY + 4 * lineSpacing - 3);
    
    // Obtenir la position Y pour la note basée sur sa notation
    // Cette fonction est simplifiée et ne prend pas en compte 
    // toutes les possibilités de notation
    const getNoteY = (notation) => {
        const noteName = notation.charAt(0);
        const octave = parseInt(notation.charAt(1));
        
        // Pour la clé de sol, les positions relatives sont (de bas en haut):
        // E4(4ème ligne), G4(2ème ligne), B4(3ème ligne), D5(4ème ligne), F5(5ème ligne)
        const baseOctave = 4; // Pour la clé de sol standard
        const positions = {
            'C': 9, 'D': 8, 'E': 7, 'F': 6, 'G': 5, 'A': 4, 'B': 3
        };
        
        // Calculer la position relative basée sur l'octave
        const octaveDiff = octave - baseOctave;
        const posY = firstLineY + (positions[noteName] - 7 * octaveDiff) * lineSpacing / 2;
        
        return posY;
    };
    
    // Dessiner la note de référence (en noir)
    const noteX = 200;
    const noteY = getNoteY(note.notation);
    
    // Dessiner une note noire (ellipse remplie)
    ctx.beginPath();
    ctx.ellipse(noteX, noteY, 8, 6, Math.PI / 3, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    
    // Dessiner la hampe (stem)
    if (noteY > firstLineY + 2 * lineSpacing) {
        // Hampe vers le bas pour les notes hautes
        ctx.beginPath();
        ctx.moveTo(noteX + 6, noteY);
        ctx.lineTo(noteX + 6, noteY + 30);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    } else {
        // Hampe vers le haut pour les notes basses
        ctx.beginPath();
        ctx.moveTo(noteX - 6, noteY);
        ctx.lineTo(noteX - 6, noteY - 30);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    // Dessiner des lignes supplémentaires si nécessaire
    if (noteY < firstLineY) {
        // Lignes supplémentaires au-dessus
        const numLines = Math.ceil((firstLineY - noteY) / lineSpacing);
        for (let i = 1; i <= numLines; i++) {
            const y = firstLineY - i * lineSpacing;
            ctx.beginPath();
            ctx.moveTo(noteX - 15, y);
            ctx.lineTo(noteX + 15, y);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    } else if (noteY > firstLineY + 4 * lineSpacing) {
        // Lignes supplémentaires en dessous
        const numLines = Math.ceil((noteY - (firstLineY + 4 * lineSpacing)) / lineSpacing);
        for (let i = 1; i <= numLines; i++) {
            const y = firstLineY + 4 * lineSpacing + i * lineSpacing;
            ctx.beginPath();
            ctx.moveTo(noteX - 15, y);
            ctx.lineTo(noteX + 15, y);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    // Si une fréquence utilisateur est fournie, dessiner une deuxième note (en rouge)
    if (userFrequency) {
        // Trouver la note la plus proche en se basant sur la fréquence
        const closestNote = findClosestNote(userFrequency);
        const userNoteY = getNoteY(closestNote.notation);
        
        // Dessiner la note de l'utilisateur (en rouge)
        const userNoteX = 280;
        
        ctx.beginPath();
        ctx.ellipse(userNoteX, userNoteY, 8, 6, Math.PI / 3, 0, Math.PI * 2);
        ctx.fillStyle = '#e63946';
        ctx.fill();
        
        // Dessiner la hampe (stem)
        if (userNoteY > firstLineY + 2 * lineSpacing) {
            // Hampe vers le bas pour les notes hautes
            ctx.beginPath();
            ctx.moveTo(userNoteX + 6, userNoteY);
            ctx.lineTo(userNoteX + 6, userNoteY + 30);
            ctx.strokeStyle = '#e63946';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            // Hampe vers le haut pour les notes basses
            ctx.beginPath();
            ctx.moveTo(userNoteX - 6, userNoteY);
            ctx.lineTo(userNoteX - 6, userNoteY - 30);
            ctx.strokeStyle = '#e63946';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // Dessiner des lignes supplémentaires si nécessaire
        if (userNoteY < firstLineY) {
            // Lignes supplémentaires au-dessus
            const numLines = Math.ceil((firstLineY - userNoteY) / lineSpacing);
            for (let i = 1; i <= numLines; i++) {
                const y = firstLineY - i * lineSpacing;
                ctx.beginPath();
                ctx.moveTo(userNoteX - 15, y);
                ctx.lineTo(userNoteX + 15, y);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        } else if (userNoteY > firstLineY + 4 * lineSpacing) {
            // Lignes supplémentaires en dessous
            const numLines = Math.ceil((userNoteY - (firstLineY + 4 * lineSpacing)) / lineSpacing);
            for (let i = 1; i <= numLines; i++) {
                const y = firstLineY + 4 * lineSpacing + i * lineSpacing;
                ctx.beginPath();
                ctx.moveTo(userNoteX - 15, y);
                ctx.lineTo(userNoteX + 15, y);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        // Légende
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#000';
        ctx.fillText('Note cible', 120, 130);
        ctx.fillStyle = '#e63946';
        ctx.fillText('Votre note', 280, 130);
    }
    
    // Vider le conteneur et ajouter le canvas
    scoreContainerEl.innerHTML = '';
    scoreContainerEl.appendChild(canvas);
    
    // Ajouter le texte d'information sur la note
    const infoDiv = document.createElement('div');
    infoDiv.style.textAlign = 'center';
    infoDiv.style.marginTop = '10px';
    infoDiv.innerHTML = `
        <span style="font-weight: bold;">${note.name}</span>
        <span style="margin-left: 10px; font-style: italic;">
            ${Math.round(note.frequency)} Hz
        </span>
    `;
    
    if (userFrequency) {
        const closestNote = findClosestNote(userFrequency);
        const centsDiff = calculateCents(userFrequency, closestNote.frequency);
        infoDiv.innerHTML += `
            <div style="margin-top: 5px;">
                <span style="color: #e63946; font-weight: bold;">
                    Votre note: ${closestNote.name} (${Math.round(userFrequency)} Hz)
                </span>
                <span style="margin-left: 10px; font-style: italic;">
                    Différence: ${Math.abs(centsDiff.toFixed(0))} cents 
                    ${centsDiff > 0 ? 'au-dessus' : 'en dessous'}
                </span>
            </div>
        `;
    }
    
    scoreContainerEl.appendChild(infoDiv);
}

// Trouver la note la plus proche d'une fréquence donnée
function findClosestNote(frequency) {
    let closestNote = notes[0];
    let minDifference = Math.abs(Math.log2(frequency / closestNote.frequency));
    
    for (let i = 1; i < notes.length; i++) {
        const difference = Math.abs(Math.log2(frequency / notes[i].frequency));
        if (difference < minDifference) {
            minDifference = difference;
            closestNote = notes[i];
        }
    }
    
    return closestNote;
}

// Calculer la différence en cents entre deux fréquences
function calculateCents(f1, f2) {
    return 1200 * Math.log2(f1 / f2);
}

// Démarrer l'enregistrement
// Démarrer l'enregistrement
async function startRecording(isAutomatic = false) {
    try {
        // Demander l'accès au microphone
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true // Simplifier pour réduire les erreurs potentielles
        });
        
        // Configurer l'analyseur audio
        setupAudioAnalysis(audioStream);
        
        // Configurer l'enregistreur avec détection du format MIME
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
        }
        
        mediaRecorder = new MediaRecorder(audioStream, { mimeType });
        
        audioChunks = [];
        
        // S'assurer que l'événement dataavailable est déclenché
        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Chunk de données audio reçu:', event.data.size, 'bytes');
            }
        });
        
        mediaRecorder.addEventListener('stop', () => {
            console.log('Enregistrement arrêté, chunks:', audioChunks.length);
            
            // Arrêter la visualisation en temps réel
            isVisualizing = false;
            if (pitchDetectionInterval) {
                clearInterval(pitchDetectionInterval);
            }
            
            if (audioChunks.length === 0) {
                console.error('Aucune donnée audio capturée');
                alert('Aucune donnée audio n\'a été capturée. Veuillez vérifier votre microphone.');
                return;
            }
            
            // Créer un blob audio à partir des chunks
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Créer un lecteur audio
            const audioElement = document.createElement('audio');
            audioElement.src = audioUrl;
            audioElement.controls = true;
            audioElement.style.width = '100%';
            
            // Nettoyer le conteneur et ajouter le nouvel élément audio
            audioPlayerContainerEl.innerHTML = '';
            audioPlayerContainerEl.appendChild(audioElement);
            
            // Analyser l'enregistrement
            analyzeRecording(audioBlob);
            
            // Dessiner un canvas vide
            drawEmptyPitchCanvas();
        });
        
        // Démarrer l'enregistrement avec un timeslice pour s'assurer que dataavailable est déclenché
        mediaRecorder.start(1000); // Déclencher dataavailable toutes les secondes
        
        console.log('Enregistrement démarré avec format:', mimeType);
        
        // Démarrer la visualisation en temps réel
        isVisualizing = true;
        startRealtimeVisualization();
        
        // Mettre à jour les boutons (sauf si c'est un enregistrement automatique)
        if (!isAutomatic) {
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.disabled = true;
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'accès au microphone:', error);
        alert('Impossible d\'accéder au microphone: ' + error.message + '. Veuillez vérifier les autorisations et que votre microphone est connecté.');
        
        // Réactiver les boutons en cas d'erreur
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.disabled = false;
    }
}
// Arrêter l'enregistrement
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Arrêter tous les tracks audio
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        
        // Arrêter la visualisation en temps réel
        isVisualizing = false;
        if (pitchDetectionInterval) {
            clearInterval(pitchDetectionInterval);
        }
        
        // Mettre à jour les boutons
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        
        // Dessiner un canvas vide pour la visualisation
        drawEmptyPitchCanvas();
    }
}

// Configurer l'analyse audio en temps réel
function setupAudioAnalysis(stream) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Si l'audioContext est suspendu, le reprendre
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Créer un analyseur avec une bonne résolution fréquentielle
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096; // Taille FFT plus grande pour une meilleure résolution de fréquence
    analyser.smoothingTimeConstant = 0.8; // Lissage temporel pour réduire le bruit
    
    // Créer une source audio à partir du stream
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    // Ne pas connecter à destination pour éviter l'écho
    // analyser.connect(audioContext.destination);
}

// Démarrer la visualisation en temps réel
function startRealtimeVisualization() {
    if (pitchDetectionInterval) {
        clearInterval(pitchDetectionInterval);
    }
    
    // Mettre à jour toutes les 100ms
    pitchDetectionInterval = setInterval(() => {
        if (isVisualizing && analyser) {
            visualizePitch();
        } else {
            clearInterval(pitchDetectionInterval);
        }
    }, 100);
}

// Visualiser la hauteur en temps réel
function visualizePitch() {
    // Obtenir les données audio
    const bufferLength = analyser.fftSize;
    const timeData = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(timeData);
    
    // Calculer la fréquence fondamentale à l'aide de l'autocorrélation
    const frequency = detectPitchFromBuffer(timeData, audioContext.sampleRate);
    
    // Dessiner la visualisation
    drawPitchVisualization(frequency);
}

// Détecter la hauteur à partir d'un buffer audio
function detectPitchFromBuffer(buffer, sampleRate) {
    // Algorithme d'autocorrélation simplifié
    const bufferSize = buffer.length;
    
    // Vérifier si le signal est assez fort
    let rms = 0;
    for (let i = 0; i < bufferSize; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / bufferSize);
    
    // Si le signal est trop faible, retourner 0
    if (rms < 0.01) return 0;
    
    // Appliquer une fenêtre de Hann pour réduire les artefacts
    const hannWindow = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
        hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (bufferSize - 1)));
        buffer[i] *= hannWindow[i];
    }
    
    // Calculer l'autocorrélation
    const correlation = new Float32Array(bufferSize);
    for (let lag = 0; lag < bufferSize; lag++) {
        let sum = 0;
        for (let i = 0; i < bufferSize - lag; i++) {
            sum += buffer[i] * buffer[i + lag];
        }
        correlation[lag] = sum;
    }
    
    // Trouver les pics dans l'autocorrélation
    // Ignorer les premiers échantillons (fréquences trop élevées)
    const minPeriod = Math.floor(sampleRate / 1000); // ~1000 Hz max
    const maxPeriod = Math.floor(sampleRate / 80);  // ~80 Hz min
    
    let maxCorrelation = 0;
    let period = 0;
    
    for (let i = minPeriod; i < maxPeriod; i++) {
        if (correlation[i] > maxCorrelation) {
            maxCorrelation = correlation[i];
            period = i;
        }
    }
    
    // Si aucun pic n'est trouvé, retourner 0
    if (period === 0) return 0;
    
    // Affiner la période par interpolation parabolique
    const y1 = correlation[period - 1];
    const y2 = correlation[period];
    const y3 = correlation[period + 1];
    
    const refinedPeriod = period + 0.5 * (y1 - y3) / (y1 - 2 * y2 + y3);
    
    // Convertir la période en fréquence
    const frequency = sampleRate / refinedPeriod;
    
    return frequency;
}

// Dessiner la visualisation du pitch
// Visualiser la hauteur en temps réel avec des améliorations
function drawPitchVisualization(detectedFrequency) {
    // Effacer le canvas
    pitchCanvasCtx.clearRect(0, 0, pitchCanvas.width, pitchCanvas.height);
    
    // Dessiner l'arrière-plan avec un dégradé
    const gradient = pitchCanvasCtx.createLinearGradient(0, 0, 0, pitchCanvas.height);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    pitchCanvasCtx.fillStyle = gradient;
    pitchCanvasCtx.fillRect(0, 0, pitchCanvas.width, pitchCanvas.height);
    
    // Si aucune fréquence n'est détectée, dessiner un canvas avec indication
    if (!detectedFrequency || detectedFrequency === 0) {
        pitchCanvasCtx.fillStyle = '#6c757d';
        pitchCanvasCtx.font = '16px sans-serif';
        pitchCanvasCtx.textAlign = 'center';
        pitchCanvasCtx.fillText("Aucun son détecté", pitchCanvas.width / 2, pitchCanvas.height / 2);
        
        // Ajouter une animation pour indiquer l'attente
        const radius = 30;
        const centerX = pitchCanvas.width / 2;
        const centerY = pitchCanvas.height / 2 + 30;
        const angle = (Date.now() / 500) % (Math.PI * 2);
        
        pitchCanvasCtx.strokeStyle = '#4a6da7';
        pitchCanvasCtx.lineWidth = 3;
        pitchCanvasCtx.beginPath();
        pitchCanvasCtx.arc(centerX, centerY, radius, 0, angle);
        pitchCanvasCtx.stroke();
        
        // Demander au navigateur d'appeler cette fonction à nouveau au prochain rafraîchissement
        requestAnimationFrame(() => drawPitchVisualization(0));
        return;
    }
    
    // Fréquence cible
    const targetFrequency = currentNote.frequency;
    
    // Variables pour la visualisation
    const minFreq = 80;
    const maxFreq = 1000;
    const canvasHeight = pitchCanvas.height;
    const canvasWidth = pitchCanvas.width;
    
    // Fonction pour convertir une fréquence en position Y
    const freqToY = (freq) => {
        if (freq < minFreq) freq = minFreq;
        if (freq > maxFreq) freq = maxFreq;
        
        const logMinFreq = Math.log(minFreq);
        const logMaxFreq = Math.log(maxFreq);
        const logFreq = Math.log(freq);
        
        // Inverser Y car 0 est en haut dans un canvas
        return canvasHeight - (canvasHeight * (logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    };
    
    // Dessiner des lignes horizontales pour les notes de référence avec un style amélioré
    pitchCanvasCtx.strokeStyle = '#dee2e6';
    pitchCanvasCtx.lineWidth = 1;
    
    for (const note of notes) {
        const y = freqToY(note.frequency);
        
        if (y >= 0 && y <= canvasHeight) {
            pitchCanvasCtx.beginPath();
            
            // Dessiner une ligne pointillée pour les notes
            pitchCanvasCtx.setLineDash([5, 3]);
            pitchCanvasCtx.moveTo(0, y);
            pitchCanvasCtx.lineTo(canvasWidth, y);
            pitchCanvasCtx.stroke();
            pitchCanvasCtx.setLineDash([]);
            
            // Ajouter le nom de la note avec un style amélioré
            if (note.frequency >= minFreq && note.frequency <= maxFreq) {
                pitchCanvasCtx.fillStyle = '#6c757d';
                pitchCanvasCtx.font = '11px sans-serif';
                
                // Ajouter un fond pour une meilleure lisibilité
                const textWidth = pitchCanvasCtx.measureText(note.name).width;
                pitchCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                pitchCanvasCtx.fillRect(3, y - 12, textWidth + 6, 15);
                
                pitchCanvasCtx.fillStyle = '#495057';
                pitchCanvasCtx.textAlign = 'left';
                pitchCanvasCtx.fillText(note.name, 5, y - 2);
            }
        }
    }
    
    // Dessiner la ligne de fréquence cible avec plus d'importance
    const targetY = freqToY(targetFrequency);
    
    // Dessiner d'abord une ligne plus large
    pitchCanvasCtx.strokeStyle = 'rgba(74, 109, 167, 0.3)';
    pitchCanvasCtx.lineWidth = 8;
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.moveTo(0, targetY);
    pitchCanvasCtx.lineTo(canvasWidth, targetY);
    pitchCanvasCtx.stroke();
    
    // Ensuite la ligne principale
    pitchCanvasCtx.strokeStyle = '#4a6da7';
    pitchCanvasCtx.lineWidth = 2;
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.moveTo(0, targetY);
    pitchCanvasCtx.lineTo(canvasWidth, targetY);
    pitchCanvasCtx.stroke();
    
    // Mettre en évidence la note cible
    pitchCanvasCtx.fillStyle = 'rgba(74, 109, 167, 0.8)';
    pitchCanvasCtx.font = 'bold 12px sans-serif';
    pitchCanvasCtx.textAlign = 'left';
    pitchCanvasCtx.fillText(`${currentNote.name} (${Math.round(targetFrequency)} Hz)`, canvasWidth - 150, targetY - 5);
    
    // Ajouter une zone de tolérance avec un dégradé pour une meilleure visualisation
    const tolerance = 25; // cents
    const upperFreq = targetFrequency * Math.pow(2, tolerance / 1200);
    const lowerFreq = targetFrequency * Math.pow(2, -tolerance / 1200);
    
    const upperY = freqToY(upperFreq);
    const lowerY = freqToY(lowerFreq);
    
    // Créer un dégradé pour la zone de tolérance
    const toleranceGradient = pitchCanvasCtx.createLinearGradient(0, upperY, 0, lowerY);
    toleranceGradient.addColorStop(0, 'rgba(74, 109, 167, 0.05)');
    toleranceGradient.addColorStop(0.5, 'rgba(74, 109, 167, 0.2)');
    toleranceGradient.addColorStop(1, 'rgba(74, 109, 167, 0.05)');
    
    pitchCanvasCtx.fillStyle = toleranceGradient;
    pitchCanvasCtx.fillRect(0, upperY, canvasWidth, lowerY - upperY);
    
    // Ajouter des lignes pour marquer les limites de tolérance
    pitchCanvasCtx.strokeStyle = 'rgba(74, 109, 167, 0.4)';
    pitchCanvasCtx.lineWidth = 1;
    pitchCanvasCtx.setLineDash([3, 3]);
    
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.moveTo(0, upperY);
    pitchCanvasCtx.lineTo(canvasWidth, upperY);
    pitchCanvasCtx.stroke();
    
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.moveTo(0, lowerY);
    pitchCanvasCtx.lineTo(canvasWidth, lowerY);
    pitchCanvasCtx.stroke();
    
    pitchCanvasCtx.setLineDash([]);
    
    // Calculer la différence en cents
    const centsDiff = 1200 * Math.log2(detectedFrequency / targetFrequency);
    const inTolerance = Math.abs(centsDiff) <= tolerance;
    
    // Créer un historique des fréquences détectées pour tracer une ligne
    if (!window.frequencyHistory) {
        window.frequencyHistory = [];
    }
    
    // Ajouter la fréquence actuelle à l'historique et limiter la taille
    window.frequencyHistory.push({
        frequency: detectedFrequency,
        timestamp: Date.now()
    });
    
    // Garder seulement les dernières 3 secondes (ou environ 30 points avec un rafraîchissement de 100ms)
    const currentTime = Date.now();
    window.frequencyHistory = window.frequencyHistory.filter(
        item => currentTime - item.timestamp < 3000
    );
    
    // Dessiner l'historique des fréquences comme une ligne continue
    if (window.frequencyHistory.length > 1) {
        pitchCanvasCtx.strokeStyle = inTolerance ? '#4caf50' : '#e63946';
        pitchCanvasCtx.lineWidth = 3;
        pitchCanvasCtx.lineJoin = 'round';
        pitchCanvasCtx.beginPath();
        
        // Calculer l'espacement horizontal
        const timeSpan = currentTime - window.frequencyHistory[0].timestamp;
        const xScale = canvasWidth / Math.max(timeSpan, 3000);
        
        // Commencer par le point le plus ancien
        const firstPoint = window.frequencyHistory[0];
        const firstX = (currentTime - firstPoint.timestamp) * xScale;
        const firstY = freqToY(firstPoint.frequency);
        pitchCanvasCtx.moveTo(canvasWidth - firstX, firstY);
        
        // Tracer le reste des points
        for (let i = 1; i < window.frequencyHistory.length; i++) {
            const point = window.frequencyHistory[i];
            const x = canvasWidth - (currentTime - point.timestamp) * xScale;
            const y = freqToY(point.frequency);
            pitchCanvasCtx.lineTo(x, y);
        }
        
        pitchCanvasCtx.stroke();
    }
    
    // Dessiner le point actuel de fréquence détectée avec un effet de brillance
    const detectedY = freqToY(detectedFrequency);
    
    // Effet de halo
    const gradient2 = pitchCanvasCtx.createRadialGradient(
        canvasWidth - 20, detectedY, 3,
        canvasWidth - 20, detectedY, 15
    );
    gradient2.addColorStop(0, inTolerance ? 'rgba(76, 175, 80, 0.8)' : 'rgba(230, 57, 70, 0.8)');
    gradient2.addColorStop(1, inTolerance ? 'rgba(76, 175, 80, 0)' : 'rgba(230, 57, 70, 0)');
    
    pitchCanvasCtx.fillStyle = gradient2;
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.arc(canvasWidth - 20, detectedY, 15, 0, Math.PI * 2);
    pitchCanvasCtx.fill();
    
    // Point central
    pitchCanvasCtx.fillStyle = inTolerance ? '#4caf50' : '#e63946';
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.arc(canvasWidth - 20, detectedY, 6, 0, Math.PI * 2);
    pitchCanvasCtx.fill();
    
    // Cercle blanc intérieur pour effet de brillance
    pitchCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.arc(canvasWidth - 22, detectedY - 2, 2, 0, Math.PI * 2);
    pitchCanvasCtx.fill();
    
    // Ajouter un panneau d'information
    const infoBoxWidth = 180;
    const infoBoxHeight = 90;
    const infoBoxX = 10;
    const infoBoxY = 10;
    
    // Dessiner le fond du panneau
    pitchCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    pitchCanvasCtx.strokeStyle = inTolerance ? '#4caf50' : '#e63946';
    pitchCanvasCtx.lineWidth = 2;
    
    // Fond avec coins arrondis
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 8);
    pitchCanvasCtx.fill();
    pitchCanvasCtx.stroke();
    
    // Information textuelle
    pitchCanvasCtx.textAlign = 'left';
    pitchCanvasCtx.fillStyle = '#212529';
    pitchCanvasCtx.font = 'bold 12px sans-serif';
    pitchCanvasCtx.fillText('Informations:', infoBoxX + 10, infoBoxY + 20);
    
    pitchCanvasCtx.font = '12px sans-serif';
    pitchCanvasCtx.fillText(`Fréquence: ${Math.round(detectedFrequency)} Hz`, infoBoxX + 10, infoBoxY + 40);
    
    // Afficher la différence avec une couleur correspondant à la précision
    pitchCanvasCtx.fillStyle = inTolerance ? '#4caf50' : '#e63946';
    pitchCanvasCtx.fillText(`Différence: ${Math.round(centsDiff)} cents`, infoBoxX + 10, infoBoxY + 60);
    
    // Ajouter une indication visuelle de la direction
    const arrowX = infoBoxX + 125;
    const arrowY = infoBoxY + 60;
    
    if (Math.abs(centsDiff) > 5) {
        pitchCanvasCtx.beginPath();
        if (centsDiff > 0) {
            // Flèche vers le haut
            pitchCanvasCtx.moveTo(arrowX, arrowY);
            pitchCanvasCtx.lineTo(arrowX - 5, arrowY + 8);
            pitchCanvasCtx.lineTo(arrowX + 5, arrowY + 8);
        } else {
            // Flèche vers le bas
            pitchCanvasCtx.moveTo(arrowX, arrowY + 8);
            pitchCanvasCtx.lineTo(arrowX - 5, arrowY);
            pitchCanvasCtx.lineTo(arrowX + 5, arrowY);
        }
        pitchCanvasCtx.closePath();
        pitchCanvasCtx.fill();
    }
    
    // Ajouter une indication verbale
    let indicationText = "";
    
    if (Math.abs(centsDiff) < 5) {
        indicationText = "Parfait !";
    } else if (Math.abs(centsDiff) < 25) {
        indicationText = inTolerance ? "Très bien !" : (centsDiff > 0 ? "Un peu trop haut" : "Un peu trop bas");
    } else {
        indicationText = centsDiff > 0 ? "Trop haut" : "Trop bas";
    }
    
    pitchCanvasCtx.fillStyle = '#212529';
    pitchCanvasCtx.font = 'bold 14px sans-serif';
    pitchCanvasCtx.textAlign = 'center';
    pitchCanvasCtx.fillText(indicationText, infoBoxX + infoBoxWidth / 2, infoBoxY + 80);
    
    // Jauge visuelle du niveau sonore
    if (analyser) {
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculer le niveau RMS
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] - 128) / 128;
            rms += amplitude * amplitude;
        }
        rms = Math.sqrt(rms / dataArray.length);
        
        // Dessiner la jauge de volume
        const gaugeX = canvasWidth - 100;
        const gaugeY = canvasHeight - 30;
        const gaugeWidth = 80;
        const gaugeHeight = 10;
        
        // Fond de la jauge
        pitchCanvasCtx.fillStyle = '#e9ecef';
        pitchCanvasCtx.beginPath();
        pitchCanvasCtx.roundRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, 5);
        pitchCanvasCtx.fill();
        
        // Niveau de la jauge
        const level = Math.min(rms * 3, 1); // Multiplier par 3 pour amplifier et plafonner à 1
        
        // Couleur basée sur le niveau
        let gaugeColor;
        if (level < 0.3) gaugeColor = '#4a6da7'; // Bleu pour faible
        else if (level < 0.7) gaugeColor = '#4caf50'; // Vert pour bon
        else gaugeColor = '#e63946'; // Rouge pour fort
        
        pitchCanvasCtx.fillStyle = gaugeColor;
        pitchCanvasCtx.beginPath();
        pitchCanvasCtx.roundRect(gaugeX, gaugeY, gaugeWidth * level, gaugeHeight, 5);
        pitchCanvasCtx.fill();
        
        // Étiquette
        pitchCanvasCtx.fillStyle = '#212529';
        pitchCanvasCtx.font = '10px sans-serif';
        pitchCanvasCtx.textAlign = 'right';
        pitchCanvasCtx.fillText('Volume:', gaugeX - 5, gaugeY + 8);
    }
}
// Dessiner un canvas vide avec des instructions
// Dessiner un canvas vide avec des instructions améliorées
function drawEmptyPitchCanvas() {
    pitchCanvasCtx.clearRect(0, 0, pitchCanvas.width, pitchCanvas.height);
    
    // Dessiner l'arrière-plan avec un dégradé
    const gradient = pitchCanvasCtx.createLinearGradient(0, 0, 0, pitchCanvas.height);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    pitchCanvasCtx.fillStyle = gradient;
    pitchCanvasCtx.fillRect(0, 0, pitchCanvas.width, pitchCanvas.height);
    
    // Zone d'instructions avec fond semi-transparent
    const boxWidth = 300;
    const boxHeight = 100;
    const boxX = (pitchCanvas.width - boxWidth) / 2;
    const boxY = (pitchCanvas.height - boxHeight) / 2;
    
    // Fond avec coins arrondis
    pitchCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    pitchCanvasCtx.strokeStyle = '#4a6da7';
    pitchCanvasCtx.lineWidth = 2;
    
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
    pitchCanvasCtx.fill();
    pitchCanvasCtx.stroke();
    
    // Icône de microphone
    pitchCanvasCtx.fillStyle = '#4a6da7';
    const micX = pitchCanvas.width / 2;
    const micY = boxY + 35;
    
    // Dessiner un microphone stylisé
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.arc(micX, micY, 15, 0, Math.PI * 2);
    pitchCanvasCtx.fill();
    
    pitchCanvasCtx.fillStyle = '#ffffff';
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.roundRect(micX - 5, micY - 8, 10, 16, 3);
    pitchCanvasCtx.fill();
    
    pitchCanvasCtx.strokeStyle = '#4a6da7';
    pitchCanvasCtx.lineWidth = 2;
    pitchCanvasCtx.beginPath();
    pitchCanvasCtx.arc(micX, micY + 25, 8, Math.PI, Math.PI * 2);
    pitchCanvasCtx.stroke();
    
    // Texte d'instructions
    pitchCanvasCtx.fillStyle = '#495057';
    pitchCanvasCtx.font = '14px sans-serif';
    pitchCanvasCtx.textAlign = 'center';
    pitchCanvasCtx.fillText("Appuyez sur 'Enregistrer' ou 'Démarrer exercice'", micX, boxY + 70);
    pitchCanvasCtx.fillText("pour voir votre hauteur vocale en temps réel", micX, boxY + 90);
}
// Analyser l'enregistrement
async function analyzeRecording(blob) {
    // Convertir le blob en ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    
    // Décoder l'audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Obtenir les données audio
    const audioData = audioBuffer.getChannelData(0);
    
    // Implémenter l'algorithme YIN simplifié pour la détection de hauteur
    const detectedFrequency = detectPitch(audioData, audioContext.sampleRate);
    
    // Mettre à jour la notation musicale avec la note détectée
    drawMusicNotation(currentNote, detectedFrequency);
    
    // Trouver la note la plus proche
    const closestNote = findClosestNote(detectedFrequency);
    
    // Calculer la différence en cents
    const centsDiff = calculateCents(detectedFrequency, currentNote.frequency);
    const absCentsDiff = Math.abs(centsDiff);
    
    // Évaluation de la précision
    let evaluation = "";
    if (absCentsDiff < 25) {
        evaluation = "Excellent ! Votre note est très précise.";
    } else if (absCentsDiff < 50) {
        evaluation = "Très bien ! Votre note est proche de la cible.";
    } else if (absCentsDiff < 100) {
        evaluation = "Bien. Essayez d'ajuster légèrement votre voix.";
    } else {
        evaluation = "Continuez à pratiquer. Essayez d'écouter attentivement la note cible.";
    }
    
    // Afficher l'analyse
    pitchAnalysisEl.innerHTML = `
        <p>Analyse de l'enregistrement :</p>
        <p>Voyelle prononcée : <strong>${currentVowel}</strong></p>
        <p>Note visée : <strong>${currentNote.name} (${Math.round(currentNote.frequency)} Hz)</strong></p>
        <p>Note détectée : <strong>${closestNote.name} (${Math.round(detectedFrequency)} Hz)</strong></p>
        <p>Différence : <strong>${Math.abs(centsDiff.toFixed(0))} cents ${centsDiff > 0 ? 'au-dessus' : 'en dessous'}</strong></p>
        <p style="margin-top: 10px; font-weight: bold;">${evaluation}</p>
    `;
}

// Algorithme de détection de hauteur YIN simplifié
function detectPitch(audioData, sampleRate) {
    // Paramètres
    const bufferSize = 2048;
    const threshold = 0.2;
    const minFreq = 80;  // Hz
    const maxFreq = 900; // Hz
    
    // Calculer la fonction de différence
    const yinBuffer = new Float32Array(bufferSize / 2);
    
    // Étape 1: Calculer la fonction de différence
    for (let tau = 0; tau < yinBuffer.length; tau++) {
        yinBuffer[tau] = 0;
        
        for (let i = 0; i < bufferSize / 2; i++) {
            const delta = audioData[i] - audioData[i + tau];
            yinBuffer[tau] += delta * delta;
        }
    }
    
    // Étape 2: Fonction de différence cumulative normalisée
    let runningSum = 0;
    yinBuffer[0] = 1;
    
    for (let tau = 1; tau < yinBuffer.length; tau++) {
        runningSum += yinBuffer[tau];
        yinBuffer[tau] = yinBuffer[tau] * tau / runningSum;
    }
    
    // Étape 3: Trouver le premier minimum sous le seuil
    let tau;
    for (tau = 2; tau < yinBuffer.length; tau++) {
        if (yinBuffer[tau] < threshold && yinBuffer[tau - 1] > yinBuffer[tau] && yinBuffer[tau] < yinBuffer[tau + 1]) {
            break;
        }
    }
    
    // Convertir l'indice en fréquence
    let interpolatedTau = refineFrequency(yinBuffer, tau);
    
    // Convertir en Hz
    let frequencyHz = sampleRate / interpolatedTau;
    
    // Vérifier si la fréquence est dans les limites
    if (frequencyHz < minFreq || frequencyHz > maxFreq) {
        // Si hors limites, utiliser une valeur par défaut
        frequencyHz = currentNote.frequency;
    }
    
    return frequencyHz;
}

// Affiner l'estimation de fréquence par interpolation parabolique
function refineFrequency(yinBuffer, tau) {
    if (tau === 0 || tau >= yinBuffer.length - 1) {
        return tau;
    }
    
    const y1 = yinBuffer[tau - 1];
    const y2 = yinBuffer[tau];
    const y3 = yinBuffer[tau + 1];
    
    const a = (y3 - 2 * y2 + y1) / 2;
    const b = (y3 - y1) / 2;
    
    if (a === 0) {
        return tau;
    }
    
    const refinedTau = tau - b / (2 * a);
    return refinedTau;
}
// Ajoutez ce code à la fin de votre fichier main.js
window.addEventListener('load', function() {
    const stopBtnAlt = document.getElementById('stop-btn');
    if (stopBtnAlt) {
        console.log("Bouton d'arrêt trouvé, ajout d'un gestionnaire alternatif");
        stopBtnAlt.onclick = function() {
            console.log("Bouton d'arrêt cliqué");
            stopRecording();
        };
    } else {
        console.error("Bouton d'arrêt non trouvé!");
    }
    console.log("Vérification des boutons...");
    const recordBtnAlt = document.getElementById('record-btn');
    if (recordBtnAlt) {
        console.log("Bouton d'enregistrement trouvé, ajout d'un gestionnaire alternatif");
        recordBtnAlt.onclick = function() {
            console.log("Bouton d'enregistrement cliqué");
            startRecording();
        };
    } else {
        console.error("Bouton d'enregistrement non trouvé!");
    }
});

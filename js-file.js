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
let currentNote = { name: 'mi', frequency: 329.63 };
let timerInterval;
let mediaRecorder;
let audioChunks = [];
let audioStream;
let analyser;
let audioContext;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    drawMusicNotation(currentNote);
    
    // Événements
    generateBtn.addEventListener('click', generateExercise);
    startBtn.addEventListener('click', startExercise);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
});

// Générer un nouvel exercice
function generateExercise() {
    // Sélectionner une voyelle aléatoire
    const randomVowelIndex = Math.floor(Math.random() * vowels.length);
    currentVowel = vowels[randomVowelIndex];
    
    // Sélectionner une note aléatoire
    const randomNoteIndex = Math.floor(Math.random() * notes.length);
    currentNote = notes[randomNoteIndex];
    
    // Mettre à jour l'affichage
    selectedVowelEl.textContent = currentVowel;
    selectedNoteEl.textContent = `${currentNote.name} (${Math.round(currentNote.frequency)} Hz)`;
    
    // Mettre à jour la notation musicale
    drawMusicNotation(currentNote);
}

// Démarrer l'exercice avec un compte à rebours
function startExercise() {
    let timeLeft = 10;
    
    // Désactiver le bouton pendant l'exercice
    startBtn.disabled = true;
    generateBtn.disabled = true;
    
    // Mettre à jour le compte à rebours
    timerEl.textContent = timeLeft;
    
    // Jouer la note de référence
    playReferenceNote(currentNote.frequency);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerEl.textContent = '10';
            startBtn.disabled = false;
            generateBtn.disabled = false;
        }
    }, 1000);
}

// Jouer une note de référence
function playReferenceNote(frequency) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Appliquer une enveloppe au son
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
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
async function startRecording() {
    try {
        // Demander l'accès au microphone
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configurer l'analyseur audio
        setupAudioAnalysis(audioStream);
        
        // Configurer l'enregistreur
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', () => {
            // Créer un blob audio à partir des chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
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
        });
        
        // Démarrer l'enregistrement
        mediaRecorder.start();
        
        // Mettre à jour les boutons
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        
    } catch (error) {
        console.error('Erreur lors de l\'accès au microphone:', error);
        alert('Impossible d\'accéder au microphone. Veuillez vérifier les autorisations.');
    }
}

// Arrêter l'enregistrement
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        audioStream.getTracks().forEach(track => track.stop());
        
        // Mettre à jour les boutons
        recordBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

// Configurer l'analyse audio en temps réel
function setupAudioAnalysis(stream) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 2048;
    
    // On pourrait ajouter ici un visualiseur en temps réel
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

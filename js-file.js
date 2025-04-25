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
let audioContext;
let soundAnalyzer; // Instance de SoundAnalyzer

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser l'analyseur de son avec les canvases
    const frequencyCanvas = document.getElementById('frequency-canvas');
    const spectrogramCanvas = document.getElementById('spectrogram-canvas');
    
    // Initialiser l'audioContext
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    } catch (e) {
        console.error('Web Audio API n\'est pas supportée par ce navigateur.');
        alert('Votre navigateur ne supporte pas les API audio nécessaires. Veuillez utiliser un navigateur récent comme Chrome ou Firefox.');
    }
    
    // Configurer l'analyseur de son
    soundAnalyzer = new SoundAnalyzer({
        frequencyCanvas: frequencyCanvas,
        spectrogramCanvas: spectrogramCanvas,
        fftSize: 4096,
        minDecibels: -100,
        maxDecibels: -30
    });
    
    // Initialiser l'affichage de la notation musicale
    drawMusicNotation(currentNote);
    
    // Événements
    generateBtn.addEventListener('click', generateExercise);
    startBtn.addEventListener('click', startExercise);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    
    // S'assurer que les boutons ont le bon état initial
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    
    console.log('Application initialisée, boutons configurés');
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
        
        // Mapping corrigé des positions des notes sur la portée en clé de sol
        // Correction ici : C (do) doit être au-dessus de B (si), pas en-dessous
        const positions = {
            'C': 12, 'D': 11, 'E': 10, 'F': 9, 'G': 8, 'A': 7, 'B': 6
        };
        
        // Calculer la position relative basée sur l'octave
        const baseOctave = 4; // Pour la clé de sol standard
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
async function startRecording(isAutomatic = false) {
    try {
        // Demander l'accès au microphone
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
        });
        
        // Démarrer l'analyseur de son avec le flux audio du microphone
        if (soundAnalyzer) {
            // Si l'audioContext est suspendu, le reprendre
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Configurer l'analyseur pour mettre en évidence la fréquence cible
            soundAnalyzer.updateSettings({
                minDecibels: -80,
                maxDecibels: -20
            });
            
            // Démarrer l'analyse en temps réel
            await soundAnalyzer.startMicrophoneAudio();
        }
        
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
        
        // CHANGEMENT IMPORTANT: Vérifier si mediaRecorder existe déjà et le nettoyer si c'est le cas
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (e) {
                console.log('Erreur arrêt ancien enregistreur:', e);
            }
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
            
            // Arrêter l'analyseur de son
            if (soundAnalyzer) {
                soundAnalyzer.stopAudio();
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
            
            // AJOUT: Réinitialiser l'interface utilisateur
            recordBtn.disabled = false;
            stopBtn.disabled = true;
        });
        
        // Démarrer l'enregistrement avec un timeslice pour s'assurer que dataavailable est déclenché
        mediaRecorder.start(1000); // Déclencher dataavailable toutes les secondes
        
        console.log('Enregistrement démarré avec format:', mimeType);
        
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
    console.log('Tentative d\'arrêt de l\'enregistrement...');
    console.log('État du mediaRecorder:', mediaRecorder ? mediaRecorder.state : 'non défini');
    
    // CHANGEMENT: Vérification plus robuste
    if (!mediaRecorder) {
        console.error('Aucun enregistreur disponible');
        // Réinitialiser l'interface quand même
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        return;
    }
    
    try {
        // N'arrêter que si l'enregistreur est actif
        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            console.log('MediaRecorder.stop() appelé');
        } else {
            console.warn('Enregistreur déjà inactif');
        }
        
        // Arrêter les pistes du flux audio dans tous les cas
        if (audioStream) {
            audioStream.getTracks().forEach(track => {
                track.stop();
                console.log('Piste audio arrêtée');
            });
        }
        
        // Mettre à jour l'interface - même si l'enregistreur était déjà inactif
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        
    } catch (error) {
        console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
        
        // En cas d'erreur, réinitialiser l'état de l'interface
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        
        // Si l'analyseur est encore actif, l'arrêter
        if (soundAnalyzer) {
            try {
                soundAnalyzer.stopAudio();
            } catch (e) {
                console.error('Erreur lors de l\'arrêt de l\'analyseur:', e);
            }
        }
    }
}

// Analyser l'enregistrement pour obtenir la note fondamentale
function analyzeRecording(audioBlob) {
    console.log('Analyse de l\'enregistrement...');
    
    // Créer un élément audio pour l'analyse
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(audioBlob);
    
    // Créer un contexte audio pour l'analyse
    const analyzerContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyzerSource = analyzerContext.createMediaElementSource(audioElement);
    const analyzer = analyzerContext.createAnalyser();
    
    // Configurer l'analyseur
    analyzer.fftSize = 16384; // Grande taille pour une meilleure précision
    analyzer.smoothingTimeConstant = 0.3;
    
    // Connecter l'audio à l'analyseur
    analyzerSource.connect(analyzer);
    
    // Tableau pour stocker les données de fréquence
    const frequencyData = new Float32Array(analyzer.frequencyBinCount);
    
    // Variables pour l'analyse
    let detectedPitch = 0;
    let detectedVolume = 0;
    let sampleCount = 0;
    
    // Fonction pour analyser le pitch
    const detectPitch = () => {
        // Obtenir les données fréquentielles
        analyzer.getFloatFrequencyData(frequencyData);
        
        // Trouver le pic maximal (fréquence fondamentale)
        let maxValue = -Infinity;
        let maxIndex = 0;
        
        // Omettre les très basses fréquences (< 75Hz)
        const startIndex = Math.floor(75 * analyzer.fftSize / analyzerContext.sampleRate);
        
        for (let i = startIndex; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        
        // Convertir l'index en fréquence
        const

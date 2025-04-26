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

// Fréquence range sliders
let minFrequency = 150;
let maxFrequency = 600;
const minFreqSlider = document.getElementById('min-freq-slider');
const maxFreqSlider = document.getElementById('min-max-freq-slider');
const minFreqDisplay = document.getElementById('min-freq');
const maxFreqDisplay = document.getElementById('max-freq');
const availableNotesCount = document.getElementById('available-notes-count');

// Variables globales
let currentVowel = 'o';
let currentNote = { name: 'mi médium', frequency: 329.63, notation: 'E4' };
let timerInterval;
let mediaRecorder;
let audioChunks = [];
let audioStream;
let audioContext;
let soundAnalyzer; // Instance de SoundAnalyzer
let isRecording = false; // Nouvelle variable pour suivre l'état de l'enregistrement

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
        maxDecibels: -30,
        targetFrequency: currentNote.frequency  // Définir la fréquence cible initiale
    });
    
    // Initialiser l'affichage de la notation musicale
    drawMusicNotation(currentNote);
    
    // Événements
    generateBtn.addEventListener('click', generateExercise);
    startBtn.addEventListener('click', startExercise);
    recordBtn.addEventListener('click', toggleRecording); // Modifié pour utiliser toggleRecording
    
    // Initialize the frequency range sliders
    minFreqSlider.addEventListener('input', updateFrequencyRange);
    maxFreqSlider.addEventListener('input', updateFrequencyRange);
    
    // Update initial available notes count
    updateAvailableNotesCount();
    
    // S'assurer que les boutons ont le bon état initial
    recordBtn.disabled = false;
    
    console.log('Application initialisée, boutons configurés');
});

// Update frequency range based on slider values
function updateFrequencyRange() {
    // Ensure min can't go above max
    if (parseInt(minFreqSlider.value) > parseInt(maxFreqSlider.value)) {
        minFreqSlider.value = maxFreqSlider.value;
    }
    
    // Ensure max can't go below min
    if (parseInt(maxFreqSlider.value) < parseInt(minFreqSlider.value)) {
        maxFreqSlider.value = minFreqSlider.value;
    }
    
    // Update the stored values
    minFrequency = parseInt(minFreqSlider.value);
    maxFrequency = parseInt(maxFreqSlider.value);
    
    // Update the display
    minFreqDisplay.textContent = `${minFrequency} Hz`;
    maxFreqDisplay.textContent = `${maxFrequency} Hz`;
    
    // Update available notes count
    updateAvailableNotesCount();
}

// Update the count of available notes based on current frequency range
function updateAvailableNotesCount() {
    const availableNotes = notes.filter(note => 
        note.frequency >= minFrequency && note.frequency <= maxFrequency
    );
    
    availableNotesCount.textContent = availableNotes.length;
    
    // Disable the generate button if no notes are available
    if (availableNotes.length === 0) {
        generateBtn.disabled = true;
        generateBtn.title = "Aucune note disponible dans cette plage de fréquences";
    } else {
        generateBtn.disabled = false;
        generateBtn.title = "";
    }
}

// Générer un nouvel exercice
function generateExercise() {
    // Sélectionner une voyelle aléatoire
    const randomVowelIndex = Math.floor(Math.random() * vowels.length);
    currentVowel = vowels[randomVowelIndex];
    
    // Sélectionner une note aléatoire dans la plage définie par les sliders
    const notesInRange = notes.filter(note => 
        note.frequency >= minFrequency && note.frequency <= maxFrequency
    );
    
    if (notesInRange.length === 0) {
        alert("Aucune note disponible dans cette plage de fréquences. Veuillez ajuster les curseurs.");
        return;
    }
    
    const randomNoteIndex = Math.floor(Math.random() * notesInRange.length);
    currentNote = notesInRange[randomNoteIndex];
    
    // Mettre à jour l'affichage
    selectedVowelEl.textContent = currentVowel;
    selectedNoteEl.textContent = `${currentNote.name} (${Math.round(currentNote.frequency)} Hz)`;
    
    // Mettre à jour la notation musicale
    drawMusicNotation(currentNote);
    
    // Mettre à jour la fréquence cible dans l'analyseur de son
    if (soundAnalyzer) {
        soundAnalyzer.setTargetFrequency(currentNote.frequency);
    }
    
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
    if (isRecording) {
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
                if (isRecording) {
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
            'C': 10, 'D': 9, 'E': 8, 'F': 7, 'G': 6, 'A': 5, 'B': 4
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

// Nouvelle fonction: bascule entre démarrer et arrêter l'enregistrement
function toggleRecording() {
    if (isRecording) {
        stopRecording();
        recordBtn.textContent = "Enregistrer";
    } else {
        startRecording();
        recordBtn.textContent = "Arrêter";
    }
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
                maxDecibels: -20,
                targetFrequency: currentNote.frequency  // Assurer que la fréquence cible est à jour
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
            
            // Marquer l'enregistrement comme terminé
            isRecording = false;
            
            // Modifier le texte du bouton d'enregistrement
            if (!isAutomatic) {
                recordBtn.textContent = "Enregistrer";
            }
            
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
            startBtn.disabled = false;
        });
        
        // Démarrer l'enregistrement avec un timeslice pour s'assurer que dataavailable est déclenché
        mediaRecorder.start(1000); // Déclencher dataavailable toutes les secondes
        
        console.log('Enregistrement démarré avec format:', mimeType);
        
        // Marquer l'enregistrement comme en cours
        isRecording = true;
        
        // Mettre à jour les boutons (sauf si c'est un enregistrement automatique)
        if (!isAutomatic) {
            recordBtn.textContent = "Arrêter";
            startBtn.disabled = true;
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'accès au microphone:', error);
        alert('Impossible d\'accéder au microphone: ' + error.message + '. Veuillez vérifier les autorisations et que votre microphone est connecté.');
        
        // Réactiver les boutons en cas d'erreur
        recordBtn.disabled = false;
        startBtn.disabled = false;
        isRecording = false;
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
        startBtn.disabled = false;
        isRecording = false;
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
        
    } catch (error) {
        console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
        
        // En cas d'erreur, réinitialiser l'état de l'interface
        recordBtn.disabled = false;
        startBtn.disabled = false;
        isRecording = false;
        
        // Si l'analyseur est encore actif, l'arrêter
        if (soundAnalyzer) {
            try {
                soundAnalyzer.stopAudio();
            } catch (e) {
                console.error('Erreur lors de l\'arrêt de l\'analyseur:', e);
            }
        }
    }
} // Ajout de l'accolade fermante manquante ici

// Fonction pour analyser l'enregistrement audio
async function analyzeRecording(audioBlob) {
    console.log('Analyse de l\'enregistrement...');
    pitchAnalysisEl.innerHTML = '<p>Analyse en cours...</p>';
    
    try {
        // Créer un nouvel audioContext pour l'analyse
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Convertir le blob en ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // Décoder le fichier audio
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Extraire les données audio
        const audioData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Calculer la fréquence fondamentale moyenne avec autocorrélation
        const { frequency, clarity } = calculatePitch(audioData, sampleRate);
        
        // Trouver la note la plus proche
        const detectedNote = findClosestNote(frequency);
        
        // Calculer la différence en cents
        const centsDiff = calculateCents(frequency, currentNote.frequency);
        const absCentsDiff = Math.abs(centsDiff);
        
        // Trouver la note enregistrée et calculer sa différence
        const recordedNote = {
            name: detectedNote.name,
            frequency: frequency,
            notation: detectedNote.notation
        };
        
        // Mettre à jour la notation musicale avec la note de l'utilisateur
        drawMusicNotation(currentNote, frequency);
        
        // Générer le feedback
        let feedback = '';
        let accuracyClass = '';
        
        if (absCentsDiff <= 25) {
            feedback = "Excellent! Votre note est très précise.";
            accuracyClass = 'excellent';
        } else if (absCentsDiff <= 50) {
            feedback = "Bien! Votre note est proche de la cible.";
            accuracyClass = 'good';
        } else if (absCentsDiff <= 100) {
            feedback = "Acceptable. Essayez de vous rapprocher de la note cible.";
            accuracyClass = 'acceptable';
        } else {
            feedback = "À améliorer. Votre note est assez éloignée de la cible.";
            accuracyClass = 'needs-improvement';
        }
        
        // Afficher les résultats
        pitchAnalysisEl.innerHTML = `
            <div class="analysis-result ${accuracyClass}">
                <h3>Résultats de l'analyse</h3>
                <p><strong>Voyelle prononcée:</strong> ${currentVowel}</p>
                <p><strong>Note cible:</strong> ${currentNote.name} (${Math.round(currentNote.frequency)} Hz)</p>
                <p><strong>Votre note:</strong> ${recordedNote.name} (${Math.round(frequency)} Hz)</p>
                <p><strong>Différence:</strong> ${Math.abs(centsDiff.toFixed(0))} cents 
                    ${centsDiff > 0 ? 'au-dessus' : 'en dessous'}</p>
                <p><strong>Clarté de la note:</strong> ${Math.round(clarity * 100)}%</p>
                <p class="feedback"><strong>Évaluation:</strong> ${feedback}</p>
            </div>
        `;
        
        // Appliquer des styles pour la classe d'évaluation
        const style = document.createElement('style');
        style.textContent = `
            .analysis-result {
                border-radius: var(--border-radius);
                padding: 15px;
                margin-top: 10px;
            }
            .excellent {
                background-color: #e8f5e9;
                border-left: 5px solid #4caf50;
            }
            .good {
                background-color: #f1f8e9;
                border-left: 5px solid #8bc34a;
            }
            .acceptable {
                background-color: #fff8e1;
                border-left: 5px solid #ffc107;
            }
            .needs-improvement {
                background-color: #ffebee;
                border-left: 5px solid #f44336;
            }
            .feedback {
                font-weight: bold;
                margin-top: 10px;
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'enregistrement:', error);
        pitchAnalysisEl.innerHTML = `<p>Erreur lors de l'analyse: ${error.message}</p>`;
    }
}

// Fonction pour calculer la fréquence fondamentale avec autocorrélation
function calculatePitch(audioData, sampleRate) {
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

// Styles CSS pour les résultats d'analyse
const analysisStyles = `
.analysis-result {
    border-radius: var(--border-radius);
    padding: 15px;
    margin-top: 10px;
}
.excellent {
    background-color: #e8f5e9;
    border-left: 5px solid #4caf50;
}
.good {
    background-color: #f1f8e9;
    border-left: 5px solid #8bc34a;
}
.acceptable {
    background-color: #fff8e1;
    border-left: 5px solid #ffc107;
}
.needs-improvement {
    background-color: #ffebee;
    border-left: 5px solid #f44336;
}
.feedback {
    font-weight: bold;
    margin-top: 10px;
}
`;

// Ajouter les styles au document
function addAnalysisStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = analysisStyles;
    document.head.appendChild(styleElement);
}

// Appeler cette fonction lors de l'initialisation
document.addEventListener('DOMContentLoaded', () => {
    addAnalysisStyles();
});

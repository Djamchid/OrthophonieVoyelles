// Configuration des voyelles et notes
const vowels = ['a', 'e', 'i', 'o', 'u', 'ou'];
const notes = [
    { name: 'do', frequency: 261.63 },
    { name: 'ré', frequency: 293.66 },
    { name: 'mi', frequency: 329.63 },
    { name: 'fa', frequency: 349.23 },
    { name: 'sol', frequency: 392.00 },
    { name: 'la', frequency: 440.00 },
    { name: 'si', frequency: 493.88 }
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
function drawMusicNotation(note) {
    // Simplification : on affiche juste le nom de la note
    // Une implémentation plus complète utiliserait une bibliothèque comme VexFlow
    scoreContainerEl.innerHTML = `
        <div style="text-align: center; font-size: 1.5rem; padding: 20px;">
            <span style="font-weight: bold;">${note.name}</span>
            <div style="margin-top: 10px; font-style: italic;">
                ${Math.round(note.frequency)} Hz
            </div>
        </div>
    `;
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

// Analyser l'enregistrement (version simplifiée)
function analyzeRecording(blob) {
    // Dans une version complète, nous utiliserions un algorithme de détection de hauteur
    // comme l'autocorrélation ou un algorithme YIN
    
    // Affichage d'analyse simplifiée
    pitchAnalysisEl.innerHTML = `
        <p>Analyse de l'enregistrement :</p>
        <p>Voyelle prononcée : <strong>${currentVowel}</strong></p>
        <p>Note visée : <strong>${currentNote.name} (${Math.round(currentNote.frequency)} Hz)</strong></p>
        <p>Note détectée : <em>Fonctionnalité d'analyse complète à implémenter</em></p>
        <div style="margin-top: 15px;">
            <p>Pour une implémentation complète, il faudrait :</p>
            <ul style="margin-left: 20px;">
                <li>Utiliser un algorithme de détection de hauteur (Pitch Detection)</li>
                <li>Calculer la différence entre la note visée et la note réelle</li>
                <li>Afficher les deux notes sur une portée musicale avec VexFlow</li>
            </ul>
        </div>
    `;
}

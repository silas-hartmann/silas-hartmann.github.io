// markdown-quiz.js - Wandelt Quiz-Listen in interaktive Elemente um

// Globale Variable für das Codewort
let extractedCodeword = null;

// Globale Schülerdaten für Quiz-Authentifizierung
let quizSchuelerDaten = null;
let quizSchuelerListe = [];

document.addEventListener('DOMContentLoaded', function() {
  // Lade Schülerdaten für Authentifizierung
  loadQuizSchuelerDaten();
  
  // Extrahiere das Codewort beim Laden der Seite
  extractCodewordFromMarkdown();
  
  console.log('Quiz-System wird geladen...');
  
  // Wir sammeln alle h3-Überschriften als potentielle Quizfragen
  const quizQuestions = document.querySelectorAll('h3');
  console.log(`${quizQuestions.length} potentielle Quizfragen gefunden`);
  
  if (quizQuestions.length === 0) return;
  
  // Erstelle einen Container für alle Quiz-Fragen
  const quizContainer = document.createElement('div');
  quizContainer.className = 'quiz-container';
  
  // Zähler für die Fragen
  let questionCount = 0;
  
  // Verarbeite jede h3-Überschrift als potentielle Quizfrage
  quizQuestions.forEach((h3, index) => {
    // Sammeln der relevanten Elemente für diese Frage
    const questionElements = collectQuestionElements(h3);
    
    // Überprüfung, ob es sich um eine Quizfrage handelt
    const questionInfo = checkIfNewFormatQuizQuestion(h3, questionElements);
    
    if (questionInfo.isQuizQuestion) {
      questionCount++;
      
      // Wir erstellen einen Container für diese Frage
      const questionContainer = document.createElement('div');
      questionContainer.className = 'interactive-quiz-question';
      questionContainer.id = `quiz-question-${questionCount}`;
      
      // Verarbeite die Frage und füge sie zum Container hinzu
      processQuestion(h3, questionElements, questionContainer, questionCount, questionInfo);
      
      // Füge die Frage zum Quiz-Container hinzu
      quizContainer.appendChild(questionContainer);
      
      // Verstecke die ursprünglichen Elemente
      h3.style.display = 'none';
      questionElements.forEach(el => {
        el.style.display = 'none';
      });
      
      // Füge den Container nach der Überschrift ein
      h3.parentNode.insertBefore(questionContainer, h3.nextSibling);
    }
  });
  
  // Wenn Quizfragen gefunden wurden, füge einen "Antworten überprüfen" Button am Ende der Seite hinzu
  if (questionCount > 0) {
    const checkButton = document.createElement('button');
    checkButton.textContent = 'Alle Antworten überprüfen';
    checkButton.className = 'check-all-answers-btn';
    checkButton.addEventListener('click', function() {
      showQuizAuthModal();
    });
    
    // Füge den Button am Ende der Seite ein
    const mainContent = document.querySelector('main') || document.body;
    mainContent.appendChild(checkButton);
    
    // Füge auch einen Container für das Gesamtergebnis hinzu
    const resultContainer = document.createElement('div');
    resultContainer.id = 'quiz-total-result';
    resultContainer.className = 'quiz-total-result';
    resultContainer.style.display = 'none';
    mainContent.appendChild(resultContainer);
    
    // Erstelle das Authentifizierungs-Modal
    createQuizAuthModal();
  }
});

// ===== SCHÜLERDATEN LADEN FÜR QUIZ =====

async function loadQuizSchuelerDaten() {
  try {
    const response = await fetch('/assets/data/schueler.json');
    if (!response.ok) throw new Error('Schülerliste nicht gefunden');
    quizSchuelerDaten = await response.json();
    
    // Standardklasse laden oder erste verfügbare
    const klasse = quizSchuelerDaten.standardKlasse || Object.keys(quizSchuelerDaten.klassen)[0];
    quizSchuelerListe = quizSchuelerDaten.klassen[klasse] || [];
    
    return true;
  } catch (error) {
    console.error('Fehler beim Laden der Schülerliste:', error);
    return false;
  }
}

function validateQuizCode(name, code) {
  const schueler = quizSchuelerListe.find(s => s.name === name);
  if (!schueler) return false;
  return schueler.code === code.trim();
}

// ===== AUTHENTIFIZIERUNGS-MODAL =====

function createQuizAuthModal() {
  // Prüfe ob Modal bereits existiert
  if (document.getElementById('quiz-auth-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'quiz-auth-modal';
  modal.className = 'quiz-auth-modal';
  modal.style.display = 'none';
  
  modal.innerHTML = `
    <div class="quiz-auth-content">
      <h3>Anmeldung zur Überprüfung</h3>
      <p>Bitte melde dich an, damit dein Ergebnis gespeichert werden kann.</p>
      
      <label for="quiz-auth-name">Dein Name:</label>
      <select id="quiz-auth-name" class="quiz-auth-select">
        <option value="">-- Name auswählen --</option>
      </select>
      
      <label for="quiz-auth-code">Dein Code:</label>
      <input type="text" id="quiz-auth-code" class="quiz-auth-input" placeholder="Code eingeben...">
      
      <div id="quiz-auth-error" class="quiz-auth-error" style="display: none;"></div>
      
      <div class="quiz-auth-buttons">
        <button id="quiz-auth-cancel" class="quiz-auth-btn cancel">Abbrechen</button>
        <button id="quiz-auth-submit" class="quiz-auth-btn submit">Überprüfen</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event-Listener
  document.getElementById('quiz-auth-cancel').addEventListener('click', hideQuizAuthModal);
  document.getElementById('quiz-auth-submit').addEventListener('click', handleQuizAuthSubmit);
  
  // Schließen bei Klick außerhalb
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideQuizAuthModal();
    }
  });
  
  // Enter-Taste zum Absenden
  document.getElementById('quiz-auth-code').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleQuizAuthSubmit();
    }
  });
}

function showQuizAuthModal() {
  const modal = document.getElementById('quiz-auth-modal');
  const nameSelect = document.getElementById('quiz-auth-name');
  const codeInput = document.getElementById('quiz-auth-code');
  const errorDiv = document.getElementById('quiz-auth-error');
  
  // Dropdown befüllen
  nameSelect.innerHTML = '<option value="">-- Name auswählen --</option>';
  quizSchuelerListe.forEach(s => {
    const option = document.createElement('option');
    option.value = s.name;
    option.textContent = s.name;
    nameSelect.appendChild(option);
  });
  
  // Gespeicherte Werte laden
  const savedName = localStorage.getItem('studentResponseName');
  const savedCode = localStorage.getItem('studentResponseCode');
  if (savedName) nameSelect.value = savedName;
  if (savedCode) codeInput.value = savedCode;
  
  // Fehler zurücksetzen
  errorDiv.style.display = 'none';
  
  modal.style.display = 'flex';
}

function hideQuizAuthModal() {
  const modal = document.getElementById('quiz-auth-modal');
  modal.style.display = 'none';
}

function handleQuizAuthSubmit() {
  const nameSelect = document.getElementById('quiz-auth-name');
  const codeInput = document.getElementById('quiz-auth-code');
  const errorDiv = document.getElementById('quiz-auth-error');
  
  const name = nameSelect.value;
  const code = codeInput.value.trim();
  
  // Validierung
  if (!name) {
    errorDiv.textContent = 'Bitte wähle deinen Namen aus.';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (!code) {
    errorDiv.textContent = 'Bitte gib deinen Code ein.';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (!validateQuizCode(name, code)) {
    errorDiv.textContent = 'Der Code ist falsch.';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Speichern für nächstes Mal
  localStorage.setItem('studentResponseName', name);
  localStorage.setItem('studentResponseCode', code);
  
  // Modal schließen und Quiz überprüfen
  hideQuizAuthModal();
  checkAllAnswersWithAuth(name);
}

// Prüft, ob es sich um eine Quizfrage im neuen Format handelt
function checkIfNewFormatQuizQuestion(h3, elements) {
  // Standardrückgabewert
  const result = {
    isQuizQuestion: false,
    type: null,
    originalText: h3.textContent,
    cleanedText: h3.textContent
  };
  
  // Regex, um die "Aufgabe X [TYP]" Struktur zu erkennen
  const taskTypeRegex = /^Aufgabe\s+\d+\s*\[(MC|SC|OFFEN|LÜCKE|ORDER)\]\s*(.*)$/i;
  const match = h3.textContent.match(taskTypeRegex);
  
  if (match) {
    const taskType = match[1].toUpperCase();
    const remainingText = match[2];
    
    result.isQuizQuestion = true;
    result.type = taskType;
    result.cleanedText = "Aufgabe " + h3.textContent.split(/\s+\[/)[0].substring(8) + 
                         (remainingText ? ": " + remainingText : "");
  } else {
    // Falls keine explizite Typisierung gefunden wurde, prüfe auf die alten Formate
    // Diese Funktion bleibt für Rückwärtskompatibilität bestehen
    const legacyResult = checkIfQuizQuestion(elements);
    result.isQuizQuestion = legacyResult;
  }
  
  return result;
}

// Prüft, ob es sich um eine Quizfrage im alten Format handelt
function checkIfQuizQuestion(elements) {
  // Überprüfen, ob ein Lückentext vorliegt
  if (elements.some(el => el.textContent.includes('Lücken:'))) {
    return true;
  }
  
  // Überprüfen, ob Textantwort vorliegt
  if (elements.some(el => el.textContent.includes('Antwort:'))) {
    return true;
  }
  
  // Überprüfen, ob eine UL mit Checkboxen vorliegt
  const ulElement = elements.find(el => el.tagName === 'UL');
  if (ulElement) {
    const listItems = ulElement.querySelectorAll('li');
    
    // Multiple-Choice-Frage mit (richtige Option) markiert
    const hasCorrectMarker = Array.from(listItems).some(item => {
      return item.textContent.includes('(richtige Option)') || 
             item.textContent.includes('(correct)') || 
             item.textContent.includes('(richtig)');
    });
    
    if (hasCorrectMarker) {
      return true;
    }
    
    // Überprüfen auf Checkboxen - nur als Quiz betrachten, wenn Checkboxen vorhanden sind
    const hasCheckboxes = Array.from(listItems).some(item => {
      const itemText = item.textContent.trim();
      return itemText.startsWith('[ ]') || itemText.startsWith('[x]') || itemText.startsWith('[X]');
    });
    
    return hasCheckboxes;
  }
  
  return false;
}

// Sammelt die Elemente einer Frage bis zum Trennstrich oder zur nächsten Überschrift
function collectQuestionElements(h3) {
  const elements = [];
  let currentElement = h3.nextElementSibling;
  
  // Sammle alle Elemente bis zur nächsten Überschrift oder einem Trennstrich (---)
  while (currentElement && 
         !/^H[1-6]$/.test(currentElement.tagName) && 
         !(currentElement.tagName === 'HR')) {
    elements.push(currentElement);
    currentElement = currentElement.nextElementSibling;
  }
  
  return elements;
}

// Verarbeitet eine erkannte Quiz-Frage und erstellt interaktive Elemente
function processQuestion(h3, elements, container, questionNumber, questionInfo) {
  // Falls questionInfo nicht übergeben wurde, erstelle ein Standard-Objekt
  if (!questionInfo) {
    questionInfo = {
      isQuizQuestion: true,
      type: null,
      originalText: h3.textContent,
      cleanedText: h3.textContent
    };
  }
  
  // Verwende den bereinigten Text ohne Typ-Kennung
  const questionText = questionInfo.cleanedText;
  
  const formattedQuestion = document.createElement('div');
  formattedQuestion.className = 'formatted-question';
  
  const questionPrompt = document.createElement('div');
  questionPrompt.className = 'question-prompt';
  questionPrompt.textContent = `${questionNumber}. ${questionText}`;
  formattedQuestion.appendChild(questionPrompt);
  
  // Typ und Inhalt der Frage bestimmen
  let questionType = 'unknown';
  let correctAnswer = '';
  let options = [];
  let correctIndices = [];
  let description = '';
  let gapAnswers = [];
  let gapText = '';
  let orderItems = [];
  
  // Den Typ aus der Überschrift verwenden, falls vorhanden
  if (questionInfo.type) {
    switch (questionInfo.type) {
      case 'MC':
        questionType = 'multiple-choice';
        break;
      case 'SC':
        questionType = 'single-choice';
        break;
      case 'OFFEN':
        questionType = 'text';
        break;
      case 'LÜCKE':
        questionType = 'gap-text';
        break;
      case 'ORDER':
        questionType = 'order';
        break;
    }
  }
  
  // Prüfe auf Reihenfolge-Aufgaben (ORDER)
  if (questionType === 'order' || elements.some(el => el.tagName === 'OL')) {
    questionType = 'order';
    
    // Finde die geordnete Liste (OL) in den Elementen
    const olElement = elements.find(el => el.tagName === 'OL');
    
    if (olElement) {
      const listItems = olElement.querySelectorAll('li');
      
      // Die richtige Reihenfolge ist die Reihenfolge in der nummerierten Liste
      listItems.forEach((item, index) => {
        orderItems.push({
          text: item.textContent.trim(),
          correctPosition: index
        });
      });
    }
  }
  
  // Prüfen, ob es einen Lückentext gibt
  let hasGapText = false;
  let gapParagraphIndex = -1;
  
  // Erst einmal alle Elemente durchgehen, um zu prüfen, ob "Lücken:" vorkommt
  elements.forEach((element, index) => {
    if (element.textContent.includes('Lücken:')) {
      hasGapText = true;
      gapParagraphIndex = index;
    }
  });
  
  // Wenn Lückentext gefunden oder aus Überschrift erkannt, dann verarbeiten
  if (hasGapText || questionType === 'gap-text') {
    questionType = 'gap-text';
    
    if (gapParagraphIndex !== -1) {
      // Extrahiere die Lückentext-Antworten aus dem Element mit "Lücken:"
      const gapParaElement = elements[gapParagraphIndex];
      const match = /Lücken:\s*(.+)/.exec(gapParaElement.textContent);
      if (match) {
        const answersText = match[1].trim();
        // Trenne Antworten durch Komma, und jede Antwort kann Alternativen mit | haben
        gapAnswers = answersText.split(',').map(ans => ans.trim());
      }
    }
    
    // Suche nach dem Lückentext in den Elementen
    for (let i = 0; i < elements.length; i++) {
      const prevEl = elements[i];
      if (i !== gapParagraphIndex && prevEl.textContent.includes('[') && prevEl.textContent.includes(']')) {
        gapText = prevEl.innerHTML;
        break;
      }
    }
  } 
  // Prüfe auf Multiple-Choice-Fragen
  else if (elements.some(el => el.tagName === 'UL') || 
           questionType === 'multiple-choice' || 
           questionType === 'single-choice') {
    
    if (questionType === 'single-choice') {
      questionType = 'multiple-choice'; // Behandeln als multiple-choice mit radio buttons
    }
    
    const ulElement = elements.find(el => el.tagName === 'UL');
    if (ulElement) {
      const listItems = ulElement.querySelectorAll('li');
      
      listItems.forEach((item, index) => {
        const optionText = item.textContent.trim();
        
        // Richtige Option suchen und Marker entfernen
        const cleanedText = optionText.replace(/\(richtige Option\)|\(correct\)|\(richtig\)/g, '').trim();
        
        // Checkbox-Format verarbeiten
        let processedText = cleanedText;
        if (cleanedText.startsWith('[ ]') || cleanedText.startsWith('[x]') || cleanedText.startsWith('[X]')) {
          processedText = cleanedText.substring(3).trim();
        }
        
        options.push(processedText);
        
        if (optionText.includes('(richtige Option)') || 
            optionText.includes('(correct)') ||
            optionText.includes('(richtig)') ||
            optionText.includes('[x]') ||
            optionText.includes('[X]')) {
          correctIndices.push(index);
        }
      });
    }
  }
  // Prüfe auf Textantwort-Fragen
  else if (elements.some(el => el.textContent.includes('Antwort:')) || 
           questionType === 'text') {
    questionType = 'text';
    
    // Finde das Element mit "Antwort:"
    const answerElement = elements.find(el => el.textContent.includes('Antwort:'));
    
    if (answerElement) {
      // Versuche, die Antwort zu extrahieren
      const match = /Antwort:\s*(.+)/.exec(answerElement.textContent);
      if (match) {
        correctAnswer = match[1].trim();
      }
    }
  }
  
  // Sammle erklärende Texte für die Beschreibung
  elements.forEach((element, index) => {
    // Nur Elemente zur Beschreibung hinzufügen, die nicht für die Frage-Identifikation verwendet werden
    if (questionType === 'gap-text' && index === gapParagraphIndex) {
      // Lücken-Zeile nicht zur Beschreibung hinzufügen
      return;
    }
    
    if (questionType === 'gap-text' && gapText && gapText.includes(element.innerHTML)) {
      // Lückentext-Paragraph nicht zur Beschreibung hinzufügen
      return;
    }
    
    if (element.tagName === 'UL' && (questionType === 'multiple-choice' || questionType === 'single-choice')) {
      // Multiple-Choice-Liste nicht zur Beschreibung hinzufügen
      return;
    }
    
    if (element.textContent.includes('Antwort:') && questionType === 'text') {
      // Antwort-Zeile nicht zur Beschreibung hinzufügen
      return;
    }
    
    if (element.tagName === 'OL' && questionType === 'order') {
      // Geordnete Liste bei Reihenfolge-Aufgaben nicht zur Beschreibung hinzufügen
      return;
    }
    
    // Alle anderen Elemente als Beschreibung hinzufügen
    if (element.textContent.trim()) {
      description += element.outerHTML;
    }
  });
  
  // Beschreibung hinzufügen, falls vorhanden
  if (description) {
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'question-content';
    descriptionDiv.innerHTML = description;
    formattedQuestion.appendChild(descriptionDiv);
  }
  
  // Je nach Fragetyp die entsprechenden Elemente hinzufügen
  if ((questionType === 'multiple-choice' || questionType === 'single-choice') && options.length > 0) {
    formattedQuestion.setAttribute('data-type', 'multiple-choice');
    formattedQuestion.setAttribute('data-correct', JSON.stringify(correctIndices));
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';
    
    options.forEach((optionText, index) => {
      const label = document.createElement('label');
      label.className = 'option-label';
      
      // Bei MC immer Checkboxen verwenden (statt Radio-Buttons)
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = `q-${questionNumber}`;
      checkbox.value = index;
      checkbox.dataset.index = index;
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${optionText}`));
      optionsContainer.appendChild(label);
    });
    
    formattedQuestion.appendChild(optionsContainer);
  } 
  else if (questionType === 'text') {
    formattedQuestion.setAttribute('data-type', 'text');
    formattedQuestion.setAttribute('data-correct', correctAnswer);
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'text-input-container';
    
    // Erstelle ein Textarea für die Antwort
    const textarea = document.createElement('textarea');
    textarea.className = 'text-answer';
    textarea.placeholder = 'Deine Antwort hier eingeben...';
    inputContainer.appendChild(textarea);
    
    // Container für die Musterlösung erstellen (anfangs versteckt)
    const solutionContainer = document.createElement('div');
    solutionContainer.className = 'solution-container';
    solutionContainer.style.display = 'none';
    
    const solutionTitle = document.createElement('h4');
    solutionTitle.textContent = 'Musterlösung:';
    solutionContainer.appendChild(solutionTitle);
    
    const solutionText = document.createElement('div');
    solutionText.className = 'solution-text';
    
    // Aufbereiten der Musterlösung - bei mehreren Optionen nehmen wir die erste
    const primarySolution = correctAnswer.split('|')[0];
    solutionText.textContent = primarySolution;
    
    solutionContainer.appendChild(solutionText);
    
    // Selbsteinschätzungs-Bereich erstellen
    const selfAssessment = document.createElement('div');
    selfAssessment.className = 'self-assessment';
    selfAssessment.style.display = 'none';
    
    const assessmentTitle = document.createElement('h4');
    assessmentTitle.textContent = 'Bewerte deine Antwort:';
    selfAssessment.appendChild(assessmentTitle);
    
    const assessmentButtons = document.createElement('div');
    assessmentButtons.className = 'assessment-buttons';
    
    ['Korrekt', 'Teilweise korrekt', 'Falsch'].forEach(assessment => {
      const button = document.createElement('button');
      button.textContent = assessment;
      button.className = 'assessment-button';
      button.addEventListener('click', function() {
        // Alle Buttons zurücksetzen
        assessmentButtons.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('selected');
        });
        // Ausgewählten Button markieren
        this.classList.add('selected');
      });
      assessmentButtons.appendChild(button);
    });
    
    selfAssessment.appendChild(assessmentButtons);
    
    inputContainer.appendChild(solutionContainer);
    inputContainer.appendChild(selfAssessment);
    
    formattedQuestion.appendChild(inputContainer);
  }
  else if (questionType === 'gap-text' && gapText && gapAnswers.length > 0) {
    formattedQuestion.setAttribute('data-type', 'gap-text');
    formattedQuestion.setAttribute('data-correct', JSON.stringify(gapAnswers));
    
    const gapContainer = document.createElement('div');
    gapContainer.className = 'gap-text-container';
    
    // Erstelle einen Container für die Drag & Drop-Wörter
    const wordsContainer = document.createElement('div');
    wordsContainer.className = 'gap-words-container';
    wordsContainer.innerHTML = '<strong>Verfügbare Wörter:</strong>';
    
    // Erstelle den Drag & Drop-Bereich für die Wörter
    const wordsList = document.createElement('div');
    wordsList.className = 'gap-words-list';
    
    // Sammle alle korrekten Wörter für die Lücken
    let allWords = [];
    gapAnswers.forEach(answer => {
      // Für jede Antwort nehmen wir nur die erste Option vor dem |
      const primaryOption = answer.split('|')[0];
      allWords.push(primaryOption);
    });
    
    // Optional: Mische die Wörter
    allWords = shuffleArray(allWords);
    
    // Erstelle für jedes Wort ein Drag & Drop-Element
    allWords.forEach((word, wordIndex) => {
      const wordElement = document.createElement('div');
      wordElement.className = 'gap-word';
      wordElement.textContent = word;
      wordElement.setAttribute('draggable', 'true');
      wordElement.dataset.word = word;
      wordElement.dataset.wordIndex = wordIndex;
      
      // Drag & Drop-Eventlistener
      wordElement.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', word);
        e.dataTransfer.setData('application/word-index', wordIndex);
        e.dataTransfer.setData('application/word-element-id', this.id);
        this.classList.add('dragging');
      });
      
      wordElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
      });
      
      // Eindeutige ID für jedes Wort-Element
      wordElement.id = `word-${questionNumber}-${wordIndex}`;
      
      wordsList.appendChild(wordElement);
    });
    
    wordsContainer.appendChild(wordsList);
    
    // Erstelle einen Container für den Lückentext
    const gapTextContainer = document.createElement('div');
    gapTextContainer.className = 'gap-text-content';
    
    // Extrahiere Lücken aus dem Text und ersetze sie durch Drop-Bereiche
    let gapIndex = 0;
    let lastIndex = 0;
    let textParts = [];
    
    // Regulärer Ausdruck, der alle Lücken findet
    const regex = /\[([^\]]*)\]/g;
    let match;
    
    // Teile den Text in normale Textabschnitte und Lücken auf
    while ((match = regex.exec(gapText)) !== null) {
      // Text vor der Lücke hinzufügen
      if (match.index > lastIndex) {
        const textBefore = gapText.substring(lastIndex, match.index);
        const textNode = document.createElement('span');
        textNode.innerHTML = textBefore;
        gapTextContainer.appendChild(textNode);
      }
      
      // Erstelle die Dropzone für die Lücke
      const dropzone = document.createElement('div');
      dropzone.className = 'gap-dropzone';
      dropzone.dataset.gapIndex = gapIndex;
      dropzone.textContent = 'Wort hier ablegen...';
      dropzone.id = `gap-${questionNumber}-${gapIndex}`;
      
      // Drop-Events
      dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
      });
      
      dropzone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
      });
      
      dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const word = e.dataTransfer.getData('text/plain');
        const wordIndex = e.dataTransfer.getData('application/word-index');
        const wordElementId = e.dataTransfer.getData('application/word-element-id');
        const wordElement = document.getElementById(wordElementId);
        
        // Wenn diese Lücke bereits ein Wort enthält, gib das alte Wort zurück
        if (this.dataset.filledWith && this.dataset.wordElementId) {
          const oldWordElement = document.getElementById(this.dataset.wordElementId);
          if (oldWordElement) {
            oldWordElement.style.display = 'block'; // Mache das alte Wort wieder sichtbar
          }
        }
        
        // Setze das Wort in die Lücke
        this.textContent = word;
        this.classList.add('filled');
        this.dataset.filledWith = word;
        this.dataset.wordElementId = wordElementId;
        
        // Verstecke das Wort in der Wortliste
        if (wordElement) {
          wordElement.style.display = 'none';
        }
        
        // Mache die Lücke klickbar, um das Wort zurückzulegen
        this.style.cursor = 'pointer';
        
        // Entferne bestehende Event-Listener, um Doppelregistrierung zu vermeiden
        this.removeEventListener('click', this.clickHandler);
        
        // Definiere den Click-Handler als Eigenschaft des Elements, damit wir ihn später entfernen können
        this.clickHandler = function() {
          // Nur reagieren, wenn die Lücke gefüllt ist
          if (this.classList.contains('filled')) {
            // Mache das Wort in der Wortliste wieder sichtbar
            const wordEl = document.getElementById(this.dataset.wordElementId);
            if (wordEl) {
              wordEl.style.display = 'block';
            }
            
            // Setze die Lücke zurück
            this.textContent = 'Wort hier ablegen...';
            this.classList.remove('filled');
            delete this.dataset.filledWith;
            delete this.dataset.wordElementId;
            this.style.cursor = 'default';
          }
        };
        
        // Füge den Click-Handler hinzu
        this.addEventListener('click', this.clickHandler);
      });
      
      gapTextContainer.appendChild(dropzone);
      
      lastIndex = regex.lastIndex;
      gapIndex++;
    }
    
    // Text nach der letzten Lücke hinzufügen
    if (lastIndex < gapText.length) {
      const textAfter = gapText.substring(lastIndex);
      const textNode = document.createElement('span');
      textNode.innerHTML = textAfter;
      gapTextContainer.appendChild(textNode);
    }
    
    gapContainer.appendChild(gapTextContainer);
    
    // Füge erst den Text mit den Lücken, dann die Wörter hinzu
    formattedQuestion.appendChild(gapContainer);
    formattedQuestion.appendChild(wordsContainer);
  }   
  else if (questionType === 'order' && orderItems.length > 0) {
    formattedQuestion.setAttribute('data-type', 'order');
    formattedQuestion.setAttribute('data-correct', JSON.stringify(orderItems.map(item => item.correctPosition)));
    
    const orderContainer = document.createElement('div');
    orderContainer.className = 'order-container';
    
    // Mische die Elemente, um sie in zufälliger Reihenfolge anzuzeigen
    const shuffledItems = [...orderItems];
    shuffleArray(shuffledItems);
    
    // Erstelle eine sortierbare Liste
    const sortableList = document.createElement('div');
    sortableList.className = 'sortable-list';
    
    // Erstelle für jedes Element einen verschiebbaren Eintrag
    shuffledItems.forEach((item, index) => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'order-item-container';
      
      // Nummerierung links
      const numberLabel = document.createElement('div');
      numberLabel.className = 'order-number';
      numberLabel.textContent = (index + 1) + '.';
      itemContainer.appendChild(numberLabel);
      
      // Verschiebbares Element
      const itemElement = document.createElement('div');
      itemElement.className = 'order-item';
      itemElement.textContent = item.text;
      itemElement.setAttribute('draggable', 'true');
      itemElement.dataset.originalPosition = orderItems.findIndex(original => original.text === item.text);
      
      // Drag & Drop Event-Listener
      itemElement.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', index);
        this.classList.add('dragging');
        
        // Speichere Referenz auf das gezogene Element
        sortableList.dataset.draggedItem = index;
      });
      
      itemElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        delete sortableList.dataset.draggedItem;
      });
      
      // Handle-Symbol für Drag & Drop
      const dragHandle = document.createElement('div');
      dragHandle.className = 'order-item-handle';
      dragHandle.innerHTML = '&#8942;&#8942;'; // Unicode für zwei vertikale Punktlinien
      
      itemElement.appendChild(dragHandle);
      itemContainer.appendChild(itemElement);
      sortableList.appendChild(itemContainer);
    });
    
    // Event-Listener für die Drop-Zone
    sortableList.addEventListener('dragover', function(e) {
      e.preventDefault();
      const draggedIndex = parseInt(this.dataset.draggedItem);
      const targetContainer = findDropTarget(e.clientY, this);
      
      if (targetContainer && targetContainer !== this.children[draggedIndex]) {
        // Bestimme, ob nach oben oder unten einzufügen
        const targetRect = targetContainer.getBoundingClientRect();
        const targetMiddle = targetRect.top + targetRect.height / 2;
        const insertAfter = e.clientY > targetMiddle;
        
        // Blinken-Effekt für die Drop-Position
        clearDropEffects(this);
        targetContainer.classList.add(insertAfter ? 'drop-after' : 'drop-before');
      }
    });
    
    sortableList.addEventListener('dragleave', function() {
      clearDropEffects(this);
    });
    
    sortableList.addEventListener('drop', function(e) {
      e.preventDefault();
      const draggedIndex = parseInt(this.dataset.draggedItem);
      const draggedItem = this.children[draggedIndex];
      const targetContainer = findDropTarget(e.clientY, this);
      
      if (targetContainer && draggedItem !== targetContainer) {
        // Bestimme, ob nach oben oder unten einzufügen
        const targetRect = targetContainer.getBoundingClientRect();
        const targetMiddle = targetRect.top + targetRect.height / 2;
        const insertAfter = e.clientY > targetMiddle;
        
        // Einfügen an der richtigen Position
        if (insertAfter) {
          this.insertBefore(draggedItem, targetContainer.nextSibling);
        } else {
          this.insertBefore(draggedItem, targetContainer);
        }
        
        // Aktualisiere die Nummerierung
        updateOrderNumbers(this);
      }
      
      clearDropEffects(this);
    });
    
    // Hilfsfunktionen für das Drag & Drop
    function findDropTarget(clientY, container) {
      return Array.from(container.children).find(child => {
        const rect = child.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });
    }
    
    function clearDropEffects(container) {
      Array.from(container.children).forEach(child => {
        child.classList.remove('drop-before', 'drop-after');
      });
    }
    
    function updateOrderNumbers(container) {
      Array.from(container.children).forEach((child, index) => {
        const numberLabel = child.querySelector('.order-number');
        if (numberLabel) {
          numberLabel.textContent = (index + 1) + '.';
        }
      });
    }
    
    orderContainer.appendChild(sortableList);
    
    // Füge Buttons zum Verschieben hinzu
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'order-controls';
    
    const moveUpButton = document.createElement('button');
    moveUpButton.className = 'order-control-button';
    moveUpButton.textContent = '↑ Nach oben';
    moveUpButton.addEventListener('click', function() {
      moveSelectedItem(sortableList, -1);
    });
    
    const moveDownButton = document.createElement('button');
    moveDownButton.className = 'order-control-button';
    moveDownButton.textContent = '↓ Nach unten';
    moveDownButton.addEventListener('click', function() {
      moveSelectedItem(sortableList, 1);
    });
    
    controlsContainer.appendChild(moveUpButton);
    controlsContainer.appendChild(moveDownButton);
    orderContainer.appendChild(controlsContainer);
    
    // Funktion zum Verschieben eines ausgewählten Elements
    function moveSelectedItem(container, direction) {
      const selected = container.querySelector('.order-item.selected');
      if (!selected) {
        alert('Bitte wähle zuerst ein Element aus.');
        return;
      }
      
      const itemContainer = selected.parentNode;
      const index = Array.from(container.children).indexOf(itemContainer);
      const newIndex = index + direction;
      
      // Prüfe, ob die neue Position gültig ist
      if (newIndex >= 0 && newIndex < container.children.length) {
        if (direction > 0) {
          container.insertBefore(itemContainer, container.children[newIndex + 1]);
        } else {
          container.insertBefore(itemContainer, container.children[newIndex]);
        }
        
        // Aktualisiere die Nummerierung
        updateOrderNumbers(container);
      }
    }
    
    // Klick-Ereignis für die Auswahl von Elementen
    sortableList.addEventListener('click', function(e) {
      const item = e.target.closest('.order-item');
      if (item) {
        // Entferne die Auswahl von allen anderen Elementen
        Array.from(this.querySelectorAll('.order-item')).forEach(el => {
          el.classList.remove('selected');
        });
        
        // Markiere das angeklickte Element
        item.classList.add('selected');
      }
    });
    
    formattedQuestion.appendChild(orderContainer);
  }
  else {
    // Fallback für unerkannte Fragetypen - setze trotzdem ein Textfeld
    const fallbackContainer = document.createElement('div');
    fallbackContainer.className = 'text-input-container';
    
    const fallbackTextarea = document.createElement('textarea');
    fallbackTextarea.className = 'text-answer';
    fallbackTextarea.placeholder = 'Deine Antwort hier eingeben...';
    
    const fallbackNote = document.createElement('div');
    fallbackNote.className = 'fallback-note';
    fallbackNote.textContent = 'Hinweis: Fragetyp konnte nicht automatisch erkannt werden';
    fallbackNote.style.fontSize = '0.8em';
    fallbackNote.style.color = '#c00';
    
    fallbackContainer.appendChild(fallbackTextarea);
    fallbackContainer.appendChild(fallbackNote);
    
    formattedQuestion.appendChild(fallbackContainer);
    formattedQuestion.setAttribute('data-type', 'unknown');
  }
  
  // Feedback-Bereich hinzufügen
  const feedbackDiv = document.createElement('div');
  feedbackDiv.className = 'feedback';
  feedbackDiv.style.display = 'none';
  formattedQuestion.appendChild(feedbackDiv);
  
  // Frage zum Container hinzufügen
  container.appendChild(formattedQuestion);
}

/**
 * Extrahiert das Codewort aus dem Markdown-Inhalt
 */
function extractCodewordFromMarkdown() {
  // Suche nach dem Codewort-Pattern im gesamten Dokument
  const bodyText = document.body.textContent || document.body.innerText || '';
  const codewordRegex = /\[Codewort:\s*([^\]]+)\]/i;
  const match = bodyText.match(codewordRegex);
  
  if (match) {
    extractedCodeword = match[1].trim();
    console.log('Codewort extrahiert:', extractedCodeword);
    
    // Verstecke das Codewort im sichtbaren Text
    hideCodewordInDOM();
  } else {
    console.log('Kein Codewort im Markdown gefunden');
  }
}

/**
 * Versteckt das Codewort im DOM, damit es für Schüler nicht sichtbar ist
 */
function hideCodewordInDOM() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const codewordRegex = /\[Codewort:\s*([^\]]+)\]/i;
    if (codewordRegex.test(node.textContent)) {
      // Entferne das Codewort aus dem sichtbaren Text
      node.textContent = node.textContent.replace(codewordRegex, '').trim();
    }
  }
}

/**
 * Fügt CSS-Styles für das Codewort hinzu
 */
function addCodewordStyles() {
  // Prüfe, ob die Styles bereits hinzugefügt wurden
  if (document.getElementById('codewort-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'codewort-styles';
  style.textContent = `
    .codewort-success {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      text-align: center;
    }
    
    .success-header h3 {
      margin: 0 0 15px 0;
      font-size: 1.4em;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    
    .codewort-container {
      margin-top: 15px;
    }
    
    .codewort-box {
      background: rgba(255,255,255,0.2);
      padding: 15px;
      border-radius: 10px;
      margin: 10px 0;
      border: 2px solid rgba(255,255,255,0.3);
    }
    
    .codewort-text {
      font-size: 1.6em;
      font-weight: bold;
      color: #FFEB3B;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      letter-spacing: 1px;
      display: inline-block;
      margin: 10px 0;
      padding: 5px 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
    }
    
    .codewort-instruction {
      margin-top: 15px;
      font-size: 1.1em;
      font-style: italic;
    }
    
    .good-result {
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .good-result h3 {
      margin: 0 0 10px 0;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    
    .encouragement-result {
      background: linear-gradient(135deg, #FF9800, #F57C00);
      color: white;
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .encouragement-result h3 {
      margin: 0 0 10px 0;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    
    .quiz-base-result {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
    }
    
    /* Quiz Auth Modal Styles */
    .quiz-auth-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    
    .quiz-auth-content {
      background: var(--bg-secondary, #262626);
      border: 1px solid var(--accent-2, #80C7B2);
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .quiz-auth-content h3 {
      color: var(--h2-color, #A9E2EA);
      margin: 0 0 1rem 0;
      text-align: center;
    }
    
    .quiz-auth-content p {
      color: var(--text-muted, #999);
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .quiz-auth-content label {
      display: block;
      color: var(--text-normal, #dcddde);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .quiz-auth-select,
    .quiz-auth-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--text-faint, #666);
      border-radius: 6px;
      background: var(--bg-primary, #2d2d2d);
      color: var(--text-normal, #dcddde);
      font-size: 1rem;
      margin-bottom: 1rem;
      box-sizing: border-box;
    }
    
    .quiz-auth-select:focus,
    .quiz-auth-input:focus {
      outline: none;
      border-color: var(--accent-2, #80C7B2);
    }
    
    .quiz-auth-error {
      background: rgba(225, 162, 237, 0.2);
      border: 1px solid var(--accent-3, #E1A2ED);
      color: var(--accent-3, #E1A2ED);
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      text-align: center;
    }
    
    .quiz-auth-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    
    .quiz-auth-btn {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .quiz-auth-btn.cancel {
      background: var(--text-faint, #666);
      color: var(--text-normal, #dcddde);
    }
    
    .quiz-auth-btn.cancel:hover {
      background: var(--text-muted, #999);
    }
    
    .quiz-auth-btn.submit {
      background: var(--accent-2, #80C7B2);
      color: var(--bg-primary, #2d2d2d);
    }
    
    .quiz-auth-btn.submit:hover {
      background: var(--h1-color, #94D3C6);
    }
  `;
  
  document.head.appendChild(style);
}

// Füge Styles beim Laden hinzu
document.addEventListener('DOMContentLoaded', addCodewordStyles);

/**
 * Quiz-ID aus der Seite ermitteln
 */
function getQuizId() {
  // Versuche zuerst, eine explizite Quiz-ID aus dem Seitentitel oder einem data-Attribut zu holen
  const pageTitle = document.querySelector('h1, h2, .page-title');
  if (pageTitle) {
    return pageTitle.textContent.trim();
  }
  
  // Fallback: Verwende den Seitenpfad
  return window.location.pathname;
}

/**
 * Sendet Quiz-Ergebnis an Google Sheets
 */
async function sendQuizResult(name, percentage, correctCount, totalCount) {
  const scriptUrl = window.STUDENT_RESPONSE_SCRIPT_URL;
  if (!scriptUrl) {
    console.warn('Script-URL nicht konfiguriert, Quiz-Ergebnis wird nicht gespeichert');
    return;
  }
  
  const quizId = getQuizId();
  
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'quiz-result',
        name: name,
        taskId: quizId,
        text: `${percentage}% (${correctCount}/${totalCount})`,
        percentage: percentage,
        correctCount: correctCount,
        totalCount: totalCount,
        timestamp: new Date().toISOString(),
        page: window.location.pathname
      })
    });
    
    console.log('Quiz-Ergebnis gesendet:', { name, quizId, percentage });
  } catch (error) {
    console.error('Fehler beim Senden des Quiz-Ergebnisses:', error);
  }
}

/**
 * Erweiterte checkAllAnswers Funktion mit Authentifizierung und Ergebnis-Übertragung
 */
function checkAllAnswersWithAuth(studentName) {
  const questions = document.querySelectorAll('.formatted-question');
  let correctCount = 0;
  let totalCount = 0;
  
  questions.forEach(question => {
    const type = question.getAttribute('data-type');
    if (!type) return; // Wenn kein Typ gesetzt ist, überspringen
    
    totalCount++;
    const correctAnswer = question.getAttribute('data-correct');
    const feedbackDiv = question.querySelector('.feedback');
    feedbackDiv.style.display = 'block';
    
    // Multiple Choice Aufgaben
    if (type === 'multiple-choice') {
      const checkedOptions = question.querySelectorAll('input[type="checkbox"]:checked');
      let correctIndices = [];
      
      try {
        correctIndices = JSON.parse(correctAnswer);
      } catch (e) {
        // Fallback für alte Datenformate
        if (correctAnswer && !isNaN(parseInt(correctAnswer))) {
          correctIndices = [parseInt(correctAnswer)];
        }
      }
      
      // Wenn keine Option ausgewählt wurde
      if (checkedOptions.length === 0) {
        feedbackDiv.textContent = 'Keine Antwort ausgewählt.';
        feedbackDiv.className = 'feedback no-answer';
        showCorrectMCAnswers(question, correctIndices);
        return;
      }
      
      // Überprüfe, ob alle ausgewählten Optionen korrekt sind
      let selectedIndices = Array.from(checkedOptions).map(option => parseInt(option.dataset.index));
      
      // Prüfe auf vollständige Übereinstimmung
      let allCorrect = selectedIndices.length === correctIndices.length &&
                       selectedIndices.every(index => correctIndices.includes(index)) &&
                       correctIndices.every(index => selectedIndices.includes(index));
      
      if (allCorrect) {
        feedbackDiv.textContent = 'Richtig!';
        feedbackDiv.className = 'feedback correct';
        correctCount++;
      } else {
        feedbackDiv.textContent = 'Falsche Antwort.';
        feedbackDiv.className = 'feedback incorrect';
        showCorrectMCAnswers(question, correctIndices);
      }
    } 
    // Text-Aufgaben (OFFEN)
    else if (type === 'text') {
      const answerField = question.querySelector('.text-answer');
      if (!answerField) {
        console.error('Textantwortfeld nicht gefunden');
        return;
      }
      
      const userAnswer = answerField.value.trim();
      
      // Bei offenen Aufgaben zeigen wir die Musterlösung und Selbsteinschätzung
      const solutionContainer = question.querySelector('.solution-container');
      const selfAssessment = question.querySelector('.self-assessment');
      
      if (solutionContainer) solutionContainer.style.display = 'block';
      if (selfAssessment) selfAssessment.style.display = 'block';
      
      // Für Selbsteinschätzungsaufgaben zählen wir sie als richtig, wenn eine Bewertung abgegeben wurde
      const selectedAssessment = selfAssessment ? selfAssessment.querySelector('.assessment-button.selected') : null;
      
      if (selectedAssessment) {
        // Zähle als richtig, wenn "Korrekt" oder "Teilweise korrekt" gewählt wurde
        if (selectedAssessment.textContent === 'Korrekt' || selectedAssessment.textContent === 'Teilweise korrekt') {
          correctCount++;
        }
        feedbackDiv.textContent = 'Selbsteinschätzung abgegeben.';
        feedbackDiv.className = 'feedback info';
      } else {
        feedbackDiv.textContent = 'Bitte bewerte deine Antwort mit den Buttons unten.';
        feedbackDiv.className = 'feedback info';
      }
    }
    // Lückentext-Aufgaben
    else if (type === 'gap-text') {
      const gapDropzones = question.querySelectorAll('.gap-dropzone');
      let totalGaps = gapDropzones.length;
      let correctGaps = 0;
      
      if (gapDropzones.length === 0) {
        feedbackDiv.textContent = 'Fehler: Keine Lücken gefunden.';
        feedbackDiv.className = 'feedback no-answer';
        return;
      }
      
      try {
        const correctAnswers = JSON.parse(correctAnswer);
        
        // Prüfe jede Lücke
        gapDropzones.forEach((dropzone, index) => {
          const userAnswer = dropzone.dataset.filledWith || '';
          
          if (!userAnswer || dropzone.textContent === 'Wort hier ablegen...') {
            dropzone.classList.add('gap-empty');
            return;
          }
          
          dropzone.classList.remove('gap-empty');
          
          // Hole die korrekten Antworten für diese Lücke
          const correctOptions = correctAnswers[index] ? correctAnswers[index].split('|').map(a => a.trim()) : [];
          const userAnswerLower = userAnswer.toLowerCase();
          
          // Überprüfe, ob die Antwort korrekt ist
          const isCorrect = correctOptions.some(option => {
            const optionLower = option.toLowerCase();
            return userAnswerLower === optionLower;
          });
          
          if (isCorrect) {
            dropzone.classList.add('gap-correct');
            dropzone.classList.remove('gap-incorrect');
            correctGaps++;
          } else {
            dropzone.classList.add('gap-incorrect');
            dropzone.classList.remove('gap-correct');
            
            // Zeige die richtige Antwort an
            const correctTip = document.createElement('div');
            correctTip.className = 'gap-correct-answer';
            correctTip.textContent = "Richtig wäre: " + correctOptions[0];
            dropzone.appendChild(correctTip);
          }
          
          // Deaktiviere den Click-Handler nach der Überprüfung
          if (dropzone.clickHandler) {
            dropzone.removeEventListener('click', dropzone.clickHandler);
            dropzone.style.cursor = 'default';
          }
        });
        
        // Bewerte das Ergebnis
        if (totalGaps === correctGaps) {
          feedbackDiv.textContent = 'Alle Lücken richtig ausgefüllt!';
          feedbackDiv.className = 'feedback correct';
          correctCount++;
        } else {
          feedbackDiv.textContent = `${correctGaps} von ${totalGaps} Lücken richtig ausgefüllt.`;
          feedbackDiv.className = 'feedback incorrect';
        }
      } catch (error) {
        console.error('Fehler beim Parsen der korrekten Antworten:', error);
        feedbackDiv.textContent = 'Fehler bei der Lückentext-Prüfung.';
        feedbackDiv.className = 'feedback no-answer';
      }
    }
    // Reihenfolge-Aufgaben
    else if (type === 'order') {
      const sortableList = question.querySelector('.sortable-list');
      
      if (!sortableList) {
        feedbackDiv.textContent = 'Fehler: Keine sortierbaren Elemente gefunden.';
        feedbackDiv.className = 'feedback no-answer';
        return;
      }
      
      try {
        // Hole die korrekten Positionen aus dem Attribut
        const correctPositions = JSON.parse(correctAnswer);
        
        // Sammle die aktuellen Positionen
        const currentItems = Array.from(sortableList.querySelectorAll('.order-item'));
        const currentPositions = currentItems.map(item => parseInt(item.dataset.originalPosition));
        
        // Prüfe, ob die aktuelle Reihenfolge korrekt ist
        let isCorrect = true;
        for (let i = 0; i < correctPositions.length; i++) {
          if (correctPositions[i] !== currentPositions[i]) {
            isCorrect = false;
            break;
          }
        }
        
        if (isCorrect) {
          feedbackDiv.textContent = 'Richtige Reihenfolge!';
          feedbackDiv.className = 'feedback correct';
          correctCount++;
        } else {
          feedbackDiv.textContent = 'Die Reihenfolge ist nicht korrekt.';
          feedbackDiv.className = 'feedback incorrect';
          
          // Zeige die korrekte Reihenfolge an
          const correctOrderDiv = document.createElement('div');
          correctOrderDiv.className = 'correct-order';
          correctOrderDiv.innerHTML = '<strong>Richtige Reihenfolge:</strong>';
          
          const correctItemsList = document.createElement('ol');
          correctItemsList.className = 'correct-order-list';
          
          // Sortiere die Items nach den korrekten Positionen
          const itemsWithCorrectOrder = currentItems
            .map((item, i) => ({ item: item.textContent, originalPosition: parseInt(item.dataset.originalPosition) }))
            .sort((a, b) => a.originalPosition - b.originalPosition);
          
          itemsWithCorrectOrder.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item.item;
            correctItemsList.appendChild(listItem);
          });
          
          correctOrderDiv.appendChild(correctItemsList);
          feedbackDiv.appendChild(correctOrderDiv);
        }
      } catch (error) {
        console.error('Fehler bei der Überprüfung der Reihenfolge:', error);
        feedbackDiv.textContent = 'Fehler bei der Überprüfung.';
        feedbackDiv.className = 'feedback no-answer';
      }
    }
    // Unbekannte Aufgabentypen
    else {
      feedbackDiv.textContent = 'Dieser Aufgabentyp kann nicht automatisch überprüft werden.';
      feedbackDiv.className = 'feedback no-answer';
    }
  });
  
  // Berechne Erfolgsquote
  const successRate = totalCount > 0 ? (correctCount / totalCount) : 0;
  const percentageCorrect = Math.round(successRate * 100);
  
  // Sende Ergebnis an Google Sheets
  sendQuizResult(studentName, percentageCorrect, correctCount, totalCount);
  
  // Zeige Gesamtergebnis mit Codewort-Funktionalität
  const resultDiv = document.getElementById('quiz-total-result');
  if (resultDiv) {
    // Lösche vorherigen Inhalt
    resultDiv.innerHTML = '';
    
    // Zeige angemeldeten Schüler
    const studentInfoDiv = document.createElement('div');
    studentInfoDiv.className = 'quiz-student-info';
    studentInfoDiv.innerHTML = `<strong>Ergebnis für:</strong> ${studentName}`;
    resultDiv.appendChild(studentInfoDiv);
    
    // Basis-Ergebnis
    const baseResultDiv = document.createElement('div');
    baseResultDiv.className = 'quiz-base-result';
    baseResultDiv.textContent = `Gesamtergebnis: ${correctCount} von ${totalCount} Fragen richtig beantwortet! (${percentageCorrect}%)`;
    resultDiv.appendChild(baseResultDiv);
    
    // Codewort anzeigen, wenn mindestens 80% richtig und Codewort vorhanden
    if (successRate >= 0.8 && extractedCodeword) {
      const codewordDiv = document.createElement('div');
      codewordDiv.className = 'codewort-success';
      codewordDiv.innerHTML = `
        <div class="success-header">
          <h3>🎉 Ausgezeichnet! Du hast ${percentageCorrect}% der Aufgaben richtig gelöst!</h3>
        </div>
        <div class="codewort-container">
          <div class="codewort-box">
            <strong>Dein Codewort für die Lehrkraft:</strong><br>
            <span class="codewort-text">"${extractedCodeword}"</span>
          </div>
          <p class="codewort-instruction"><em>🗣️ Teile dieses Codewort mündlich mit deiner Lehrkraft!</em></p>
        </div>
      `;
      
      resultDiv.appendChild(codewordDiv);
    } else if (successRate >= 0.8) {
      // Gute Leistung, aber kein Codewort verfügbar
      const goodResultDiv = document.createElement('div');
      goodResultDiv.className = 'good-result';
      goodResultDiv.innerHTML = `
        <h3>🎉 Sehr gut! Du hast ${percentageCorrect}% der Aufgaben richtig gelöst!</h3>
        <p>Dein Ergebnis wurde gespeichert.</p>
      `;
      resultDiv.appendChild(goodResultDiv);
    } else {
      // Ergebnis unter 80%
      const encouragementDiv = document.createElement('div');
      encouragementDiv.className = 'encouragement-result';
      const missingQuestions = totalCount - correctCount;
      encouragementDiv.innerHTML = `
        <h3>📚 Weiter üben!</h3>
        <p>Du hast ${percentageCorrect}% richtig. Schau dir die Lösungen an und versuche es nochmal!</p>
        <p><em>Für das Codewort benötigst du mindestens 80% richtige Antworten.</em></p>
        <p style="margin-top: 15px;"><strong>🔄 Klicke auf den Neu-Laden-Button unten rechts, um das Quiz zurückzusetzen und es erneut zu versuchen.</strong></p>
      `;
      resultDiv.appendChild(encouragementDiv);
    }
    
    resultDiv.style.display = 'block';
    
    // Scroll zum Ergebnis
    resultDiv.scrollIntoView({ behavior: 'smooth' });
  }
}

// Alte Funktion für Rückwärtskompatibilität (ohne Auth)
function checkAllAnswers() {
  showQuizAuthModal();
}

// Hilfsfunktion zum Anzeigen der richtigen MC-Antworten
function showCorrectMCAnswers(question, correctIndices) {
  const options = question.querySelectorAll('.option-label');
  
  options.forEach((option, index) => {
    const checkbox = option.querySelector('input[type="checkbox"]');
    const isCorrect = correctIndices.includes(index);
    
    if (isCorrect) {
      option.classList.add('correct-option');
      
      // Füge ein visuelles Indikator hinzu
      const correctIndicator = document.createElement('span');
      correctIndicator.className = 'correct-indicator';
      correctIndicator.textContent = ' ✓';
      correctIndicator.style.color = 'green';
      correctIndicator.style.fontWeight = 'bold';
      option.appendChild(correctIndicator);
    }
  });
}

// Hilfsfunktion zum Mischen eines Arrays
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

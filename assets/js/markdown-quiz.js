// markdown-quiz.js - Wandelt Quiz-Listen in interaktive Elemente um

// Globale Variablen
let extractedCodeword = null;
let extractedSolutionPassword = null;
let quizChecked = false;
let quizHadErrors = false;

// Globale Schülerdaten für Quiz-Authentifizierung
let quizSchuelerDaten = null;
let quizSchuelerListe = [];

document.addEventListener('DOMContentLoaded', function() {
  // Lade Schülerdaten für Authentifizierung
  loadQuizSchuelerDaten();
  
  // Extrahiere das Codewort und Lösungspasswort beim Laden der Seite
  extractCodewordFromMarkdown();
  extractSolutionPasswordFromMarkdown();
  
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
  
  // Wenn Quizfragen gefunden wurden, füge Buttons am Ende der Seite hinzu
  if (questionCount > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'quiz-button-container';
    
    // "Antworten überprüfen" Button
    const checkButton = document.createElement('button');
    checkButton.textContent = 'Alle Antworten überprüfen';
    checkButton.className = 'check-all-answers-btn';
    checkButton.addEventListener('click', function() {
      showQuizAuthModal();
    });
    buttonContainer.appendChild(checkButton);
    
    // "Lösung anzeigen" Button (anfangs versteckt, braucht Passwort)
    if (extractedSolutionPassword) {
      const showSolutionBtn = document.createElement('button');
      showSolutionBtn.textContent = 'Lösung anzeigen';
      showSolutionBtn.className = 'show-solution-btn';
      showSolutionBtn.addEventListener('click', function() {
        showSolutionPasswordModal();
      });
      buttonContainer.appendChild(showSolutionBtn);
    }
    
    // Füge den Button-Container am Ende der Seite ein
    const mainContent = document.querySelector('main') || document.body;
    mainContent.appendChild(buttonContainer);
    
    // Füge auch einen Container für das Gesamtergebnis hinzu
    const resultContainer = document.createElement('div');
    resultContainer.id = 'quiz-total-result';
    resultContainer.className = 'quiz-total-result';
    resultContainer.style.display = 'none';
    mainContent.appendChild(resultContainer);
    
    // Erstelle die Modals
    createQuizAuthModal();
    createSolutionPasswordModal();
    createReloadButton();
  }
});

// ===== RELOAD BUTTON =====

function createReloadButton() {
  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'quiz-reload-btn';
  reloadBtn.className = 'quiz-reload-btn';
  reloadBtn.innerHTML = '🔄 Neu starten';
  reloadBtn.style.display = 'none';
  reloadBtn.addEventListener('click', function() {
    window.location.reload();
  });
  document.body.appendChild(reloadBtn);
}

function showReloadButton() {
  const reloadBtn = document.getElementById('quiz-reload-btn');
  if (reloadBtn) {
    reloadBtn.style.display = 'flex';
    // Animation für Aufmerksamkeit
    reloadBtn.classList.add('quiz-reload-highlight');
  }
}

// ===== LÖSUNGSPASSWORT =====

function extractSolutionPasswordFromMarkdown() {
  const bodyText = document.body.textContent || document.body.innerText || '';
  const passwordRegex = /\[Lösungspasswort:\s*([^\]]+)\]/i;
  const match = bodyText.match(passwordRegex);
  
  if (match) {
    extractedSolutionPassword = match[1].trim();
    console.log('Lösungspasswort gefunden');
    
    // Verstecke das Passwort im DOM
    hideSolutionPasswordInDOM();
  } else {
    console.log('Kein Lösungspasswort im Markdown gefunden');
  }
}

function hideSolutionPasswordInDOM() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const passwordRegex = /\[Lösungspasswort:\s*([^\]]+)\]/i;
    if (passwordRegex.test(node.textContent)) {
      node.textContent = node.textContent.replace(passwordRegex, '').trim();
    }
  }
}

function createSolutionPasswordModal() {
  if (document.getElementById('solution-password-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'solution-password-modal';
  modal.className = 'quiz-auth-modal';
  modal.style.display = 'none';
  
  modal.innerHTML = `
    <div class="quiz-auth-content">
      <h3>Lösung anzeigen</h3>
      <p>Bitte gib das Lösungspasswort ein, um die Lösungen zu sehen.</p>
      
      <label for="solution-password-input">Passwort:</label>
      <input type="password" id="solution-password-input" class="quiz-auth-input" placeholder="Passwort eingeben...">
      
      <div id="solution-password-error" class="quiz-auth-error" style="display: none;"></div>
      
      <div class="quiz-auth-buttons">
        <button id="solution-password-cancel" class="quiz-auth-btn cancel">Abbrechen</button>
        <button id="solution-password-submit" class="quiz-auth-btn submit">Anzeigen</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('solution-password-cancel').addEventListener('click', hideSolutionPasswordModal);
  document.getElementById('solution-password-submit').addEventListener('click', handleSolutionPasswordSubmit);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideSolutionPasswordModal();
    }
  });
  
  document.getElementById('solution-password-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleSolutionPasswordSubmit();
    }
  });
}

function showSolutionPasswordModal() {
  const modal = document.getElementById('solution-password-modal');
  const errorDiv = document.getElementById('solution-password-error');
  const input = document.getElementById('solution-password-input');
  
  if (input) input.value = '';
  if (errorDiv) errorDiv.style.display = 'none';
  
  modal.style.display = 'flex';
}

function hideSolutionPasswordModal() {
  const modal = document.getElementById('solution-password-modal');
  modal.style.display = 'none';
}

function handleSolutionPasswordSubmit() {
  const input = document.getElementById('solution-password-input');
  const errorDiv = document.getElementById('solution-password-error');
  
  const password = input.value.trim();
  
  if (!password) {
    errorDiv.textContent = 'Bitte gib ein Passwort ein.';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (password !== extractedSolutionPassword) {
    errorDiv.textContent = 'Falsches Passwort.';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Passwort korrekt - Lösungen anzeigen
  hideSolutionPasswordModal();
  showAllSolutions();
}

function showAllSolutions() {
  const questions = document.querySelectorAll('.formatted-question');
  
  questions.forEach(question => {
    const type = question.getAttribute('data-type');
    const correctAnswer = question.getAttribute('data-correct');
    
    // Multiple Choice - richtige Antworten markieren
    if (type === 'multiple-choice') {
      try {
        const correctIndices = JSON.parse(correctAnswer);
        const options = question.querySelectorAll('.option-label');
        
        options.forEach((option, index) => {
          if (correctIndices.includes(index)) {
            option.classList.add('correct-option');
            if (!option.querySelector('.correct-indicator')) {
              const indicator = document.createElement('span');
              indicator.className = 'correct-indicator';
              indicator.textContent = ' ✓';
              option.appendChild(indicator);
            }
          }
        });
      } catch (e) {}
    }
    
    // Lückentext - richtige Antworten zeigen
    else if (type === 'gap-text') {
      try {
        const correctAnswers = JSON.parse(correctAnswer);
        const gapDropzones = question.querySelectorAll('.gap-dropzone');
        
        gapDropzones.forEach((dropzone, index) => {
          if (correctAnswers[index]) {
            const correctOption = correctAnswers[index].split('|')[0];
            if (!dropzone.querySelector('.gap-correct-answer')) {
              const tip = document.createElement('div');
              tip.className = 'gap-correct-answer';
              tip.textContent = "Lösung: " + correctOption;
              dropzone.appendChild(tip);
            }
          }
        });
      } catch (e) {}
    }
    
    // Reihenfolge - richtige Reihenfolge zeigen
    else if (type === 'order') {
      const feedbackDiv = question.querySelector('.feedback');
      if (feedbackDiv && !feedbackDiv.querySelector('.correct-order')) {
        try {
          const sortableList = question.querySelector('.sortable-list');
          const currentItems = Array.from(sortableList.querySelectorAll('.order-item'));
          
          const correctOrderDiv = document.createElement('div');
          correctOrderDiv.className = 'correct-order';
          correctOrderDiv.innerHTML = '<strong>Richtige Reihenfolge:</strong>';
          
          const correctItemsList = document.createElement('ol');
          correctItemsList.className = 'correct-order-list';
          
          const itemsWithCorrectOrder = currentItems
            .map(item => ({ text: item.textContent.replace('⋮⋮', '').trim(), pos: parseInt(item.dataset.originalPosition) }))
            .sort((a, b) => a.pos - b.pos);
          
          itemsWithCorrectOrder.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item.text;
            correctItemsList.appendChild(listItem);
          });
          
          correctOrderDiv.appendChild(correctItemsList);
          feedbackDiv.appendChild(correctOrderDiv);
          feedbackDiv.style.display = 'block';
        } catch (e) {}
      }
    }
    
    // Text-Aufgaben - Musterlösung zeigen
    else if (type === 'text') {
      const solutionContainer = question.querySelector('.solution-container');
      if (solutionContainer) solutionContainer.style.display = 'block';
    }
  });
}

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
  // Prüfe ob Quiz bereits überprüft wurde
  if (quizChecked) {
    alert('Du hast das Quiz bereits überprüft. Lade die Seite neu, um es erneut zu versuchen.');
    return;
  }
  
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
  const taskTypeRegex = /^Aufgabe\s+\d+\s*\[(MC|SC|OFFEN|LÜCKE|ORDER|ZUORDNUNG)\]\s*(.*)$/i;
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
  let assignmentCategories = []; // Für ZUORDNUNG: [{name: 'Kategorie', items: [{text: 'Begriff', isImage: false, src: ''}]}]
  
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
      case 'ZUORDNUNG':
        questionType = 'assignment';
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
        if (quizChecked) {
          e.preventDefault();
          return;
        }
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
        if (quizChecked) return;
        e.preventDefault();
        this.classList.add('dragover');
      });
      
      dropzone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
      });
      
      dropzone.addEventListener('drop', function(e) {
        if (quizChecked) return;
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
          if (quizChecked) return;
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
        if (quizChecked) {
          e.preventDefault();
          return;
        }
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
      if (quizChecked) return;
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
      if (quizChecked) return;
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
      if (quizChecked) return;
      moveSelectedItem(sortableList, -1);
    });
    
    const moveDownButton = document.createElement('button');
    moveDownButton.className = 'order-control-button';
    moveDownButton.textContent = '↓ Nach unten';
    moveDownButton.addEventListener('click', function() {
      if (quizChecked) return;
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
      if (quizChecked) return;
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
  // ===== ZUORDNUNG (Assignment) =====
  else if (questionType === 'assignment') {
    // Parse Kategorien aus der OL-Liste
    // Format: 1. Kategorie (Begriff1, Begriff2, ![Bild](url))
    const olElement = elements.find(el => el.tagName === 'OL');
    
    if (olElement) {
      const listItems = olElement.querySelectorAll('li');
      
      listItems.forEach((item, catIndex) => {
        // Regex: Kategorie (item1, item2, ...)
        const itemHtml = item.innerHTML;
        const itemText = item.textContent;
        const categoryMatch = itemText.match(/^([^(]+)\s*\((.+)\)\s*$/);
        
        if (categoryMatch) {
          const categoryName = categoryMatch[1].trim();
          const itemsText = categoryMatch[2];
          
          // Parse Items (berücksichtige Bilder im HTML)
          const category = {
            name: categoryName,
            items: []
          };
          
          // Finde alle Items zwischen den Klammern im HTML
          const htmlMatch = itemHtml.match(/^[^(]+\((.+)\)\s*$/);
          if (htmlMatch) {
            const itemsHtml = htmlMatch[1];
            // Teile bei Kommas, aber berücksichtige HTML-Tags
            const itemParts = splitAssignmentItems(itemsHtml);
            
            itemParts.forEach(part => {
              const trimmed = part.trim();
              // Prüfe auf Bild: <img> oder ![]()
              const imgMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/);
              const mdImgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
              
              if (imgMatch) {
                category.items.push({
                  text: '',
                  isImage: true,
                  src: imgMatch[1],
                  alt: ''
                });
              } else if (mdImgMatch) {
                category.items.push({
                  text: '',
                  isImage: true,
                  src: mdImgMatch[2],
                  alt: mdImgMatch[1]
                });
              } else if (trimmed) {
                // Entferne HTML-Tags für reinen Text
                const textOnly = trimmed.replace(/<[^>]+>/g, '').trim();
                if (textOnly) {
                  category.items.push({
                    text: textOnly,
                    isImage: false,
                    src: '',
                    alt: ''
                  });
                }
              }
            });
          }
          
          if (category.items.length > 0) {
            assignmentCategories.push(category);
          }
        }
      });
    }
    
    if (assignmentCategories.length > 0) {
      // Erstelle data-correct Struktur
      const correctData = assignmentCategories.map(cat => ({
        name: cat.name,
        items: cat.items.map(item => item.isImage ? `IMG:${item.src}` : item.text)
      }));
      
      formattedQuestion.setAttribute('data-type', 'assignment');
      formattedQuestion.setAttribute('data-correct', JSON.stringify(correctData));
      
      // Sammle alle Items und mische sie
      let allItems = [];
      assignmentCategories.forEach((cat, catIdx) => {
        cat.items.forEach((item, itemIdx) => {
          allItems.push({
            ...item,
            categoryIndex: catIdx,
            itemIndex: itemIdx,
            id: `assign-item-${questionNumber}-${catIdx}-${itemIdx}`
          });
        });
      });
      shuffleArray(allItems);
      
      // Haupt-Container
      const assignContainer = document.createElement('div');
      assignContainer.className = 'assignment-container';
      
      // Pool mit allen Items (oben)
      const poolContainer = document.createElement('div');
      poolContainer.className = 'assignment-pool';
      poolContainer.innerHTML = '<div class="assignment-pool-label">Ziehe die Begriffe in die richtige Kategorie:</div>';
      
      const poolItems = document.createElement('div');
      poolItems.className = 'assignment-pool-items';
      poolItems.id = `assignment-pool-${questionNumber}`;
      
      allItems.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'assignment-item';
        itemEl.setAttribute('draggable', 'true');
        itemEl.dataset.itemId = item.id;
        itemEl.dataset.categoryIndex = item.categoryIndex;
        itemEl.dataset.isImage = item.isImage;
        itemEl.dataset.value = item.isImage ? `IMG:${item.src}` : item.text;
        itemEl.id = item.id;
        
        if (item.isImage) {
          const img = document.createElement('img');
          img.src = item.src;
          img.alt = item.alt || 'Bild';
          img.className = 'assignment-item-image';
          itemEl.appendChild(img);
        } else {
          itemEl.textContent = item.text;
        }
        
        // Drag-Events
        itemEl.addEventListener('dragstart', function(e) {
          if (quizChecked) { e.preventDefault(); return; }
          e.dataTransfer.setData('text/plain', this.id);
          e.dataTransfer.setData('application/item-id', this.dataset.itemId);
          this.classList.add('dragging');
        });
        
        itemEl.addEventListener('dragend', function() {
          this.classList.remove('dragging');
        });
        
        // Klick-Auswahl für Touch-Geräte
        itemEl.addEventListener('click', function() {
          if (quizChecked) return;
          // Toggle selection
          const wasSelected = this.classList.contains('selected');
          // Deselect all
          poolItems.querySelectorAll('.assignment-item').forEach(i => i.classList.remove('selected'));
          assignContainer.querySelectorAll('.assignment-category-items .assignment-item').forEach(i => i.classList.remove('selected'));
          if (!wasSelected) {
            this.classList.add('selected');
          }
        });
        
        poolItems.appendChild(itemEl);
      });
      
      poolContainer.appendChild(poolItems);
      assignContainer.appendChild(poolContainer);
      
      // Kategorien (unten)
      const categoriesContainer = document.createElement('div');
      categoriesContainer.className = 'assignment-categories';
      
      assignmentCategories.forEach((cat, catIdx) => {
        const catEl = document.createElement('div');
        catEl.className = 'assignment-category';
        catEl.dataset.categoryIndex = catIdx;
        
        const catHeader = document.createElement('div');
        catHeader.className = 'assignment-category-header';
        catHeader.textContent = cat.name;
        catEl.appendChild(catHeader);
        
        const catItems = document.createElement('div');
        catItems.className = 'assignment-category-items';
        catItems.dataset.categoryIndex = catIdx;
        catItems.id = `assignment-cat-${questionNumber}-${catIdx}`;
        
        // Drop-Events
        catItems.addEventListener('dragover', function(e) {
          if (quizChecked) return;
          e.preventDefault();
          this.classList.add('dragover');
        });
        
        catItems.addEventListener('dragleave', function() {
          this.classList.remove('dragover');
        });
        
        catItems.addEventListener('drop', function(e) {
          if (quizChecked) return;
          e.preventDefault();
          this.classList.remove('dragover');
          
          const itemId = e.dataTransfer.getData('text/plain');
          const itemEl = document.getElementById(itemId);
          
          if (itemEl) {
            this.appendChild(itemEl);
          }
        });
        
        // Klick zum Zuordnen (für ausgewähltes Item)
        catItems.addEventListener('click', function(e) {
          if (quizChecked) return;
          if (e.target === this || e.target.classList.contains('assignment-category-placeholder')) {
            const selectedItem = assignContainer.querySelector('.assignment-item.selected');
            if (selectedItem) {
              this.appendChild(selectedItem);
              selectedItem.classList.remove('selected');
            }
          }
        });
        
        // Platzhalter
        const placeholder = document.createElement('div');
        placeholder.className = 'assignment-category-placeholder';
        placeholder.textContent = 'Begriffe hier ablegen';
        catItems.appendChild(placeholder);
        
        catEl.appendChild(catItems);
        categoriesContainer.appendChild(catEl);
      });
      
      assignContainer.appendChild(categoriesContainer);
      
      // Rückgabe-Bereich (Pool als Drop-Zone)
      poolItems.addEventListener('dragover', function(e) {
        if (quizChecked) return;
        e.preventDefault();
        this.classList.add('dragover');
      });
      
      poolItems.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
      });
      
      poolItems.addEventListener('drop', function(e) {
        if (quizChecked) return;
        e.preventDefault();
        this.classList.remove('dragover');
        
        const itemId = e.dataTransfer.getData('text/plain');
        const itemEl = document.getElementById(itemId);
        
        if (itemEl) {
          this.appendChild(itemEl);
        }
      });
      
      formattedQuestion.appendChild(assignContainer);
    }
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
 * Fügt CSS-Styles für das Quiz hinzu
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
      background: linear-gradient(135deg, var(--accent-2, #80C7B2), #5ba894);
      color: var(--bg-primary, #2d2d2d);
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      text-align: center;
    }
    
    .success-header h3 {
      font-family: var(--font-heading, serif);
      margin: 0 0 15px 0;
      font-size: 1.4em;
      font-weight: 500;
      color: var(--bg-primary, #2d2d2d);
    }
    
    .codewort-container {
      margin-top: 15px;
    }
    
    .codewort-box {
      background: rgba(0,0,0,0.15);
      padding: 15px;
      border-radius: 10px;
      margin: 10px 0;
      border: 2px solid rgba(0,0,0,0.2);
    }
    
    .codewort-text {
      font-family: var(--font-heading, serif);
      font-size: 1.6em;
      font-weight: 600;
      color: var(--bg-primary, #2d2d2d);
      letter-spacing: 1px;
      display: inline-block;
      margin: 10px 0;
      padding: 8px 16px;
      background: rgba(255,255,255,0.3);
      border-radius: 8px;
    }
    
    .codewort-instruction {
      margin-top: 15px;
      font-size: 1.1em;
      font-style: italic;
      color: var(--bg-secondary, #262626);
    }
    
    .good-result {
      background: linear-gradient(135deg, var(--accent-1, #80ADC7), #5a8fa8);
      color: var(--bg-primary, #2d2d2d);
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .good-result h3 {
      font-family: var(--font-heading, serif);
      margin: 0 0 10px 0;
      font-weight: 500;
      color: var(--bg-primary, #2d2d2d);
    }
    
    .good-result p {
      color: var(--bg-secondary, #262626);
    }
    
    .encouragement-result {
      background: linear-gradient(135deg, var(--accent-3, #E1A2ED), #c77dd6);
      color: var(--bg-primary, #2d2d2d);
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .encouragement-result h3 {
      font-family: var(--font-heading, serif);
      margin: 0 0 10px 0;
      font-weight: 500;
      color: var(--bg-primary, #2d2d2d);
    }
    
    .encouragement-result p {
      color: var(--bg-secondary, #262626);
    }
    
    .quiz-base-result {
      font-family: var(--font-heading, serif);
      font-size: 1.2em;
      font-weight: 500;
      margin-bottom: 10px;
      text-align: center;
      color: var(--text-normal, #dcddde);
    }
    
    /* Quiz Button Container */
    .quiz-button-container {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin: 30px auto;
      flex-wrap: wrap;
    }
    
    /* Show Solution Button */
    .show-solution-btn {
      background-color: transparent;
      border: 1px solid var(--text-faint, #666);
      color: var(--text-normal, #dcddde);
      padding: 10px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-family: var(--font-text, sans-serif);
      font-size: 1em;
      transition: all 0.2s ease;
    }
    
    .show-solution-btn:hover {
      background-color: rgba(128, 173, 199, 0.15);
      border-color: var(--accent-1, #80ADC7);
      color: var(--accent-1, #80ADC7);
    }
    
    /* Reload Button */
    .quiz-reload-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--h1-color, #94D3C6);
      color: var(--bg-primary, #2d2d2d);
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: var(--font-text, sans-serif);
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      display: none;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    
    .quiz-reload-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
    
    .quiz-reload-highlight {
      animation: pulse-reload 1.5s ease-in-out 3;
    }
    
    @keyframes pulse-reload {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); box-shadow: 0 6px 20px rgba(148, 211, 198, 0.5); }
    }
    
    /* Disabled state for quiz elements */
    .quiz-disabled .option-label {
      pointer-events: none;
      opacity: 0.7;
    }
    
    .quiz-disabled .text-answer {
      pointer-events: none;
      opacity: 0.7;
    }
    
    .quiz-disabled .gap-word {
      pointer-events: none;
      cursor: default;
    }
    
    .quiz-disabled .gap-dropzone {
      pointer-events: none;
      cursor: default;
    }
    
    .quiz-disabled .order-item {
      pointer-events: none;
      cursor: default;
    }
    
    .quiz-disabled .order-control-button {
      pointer-events: none;
      opacity: 0.5;
    }
    
    /* Wrong answer highlighting */
    .option-label.wrong-answer {
      background-color: rgba(225, 162, 237, 0.2) !important;
      border: 1px solid var(--accent-3, #E1A2ED) !important;
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
 * Deaktiviert alle Quiz-Eingaben nach der Überprüfung
 */
function disableAllQuizInputs() {
  // Alle Checkboxen deaktivieren
  document.querySelectorAll('.formatted-question input[type="checkbox"]').forEach(cb => {
    cb.disabled = true;
  });
  
  // Alle Textfelder deaktivieren
  document.querySelectorAll('.formatted-question .text-answer').forEach(ta => {
    ta.disabled = true;
  });
  
  // CSS-Klasse für visuelles Feedback
  document.querySelectorAll('.formatted-question').forEach(q => {
    q.classList.add('quiz-disabled');
  });
  
  // "Alle Antworten überprüfen" Button deaktivieren
  const checkBtn = document.querySelector('.check-all-answers-btn');
  if (checkBtn) {
    checkBtn.disabled = true;
    checkBtn.style.opacity = '0.5';
    checkBtn.style.cursor = 'not-allowed';
  }
}

/**
 * Erweiterte checkAllAnswers Funktion - OHNE Lösungsanzeige
 */
function checkAllAnswersWithAuth(studentName) {
  // Markiere Quiz als überprüft
  quizChecked = true;
  
  const questions = document.querySelectorAll('.formatted-question');
  let correctCount = 0;
  let totalCount = 0;
  let hasErrors = false;
  
  questions.forEach(question => {
    const type = question.getAttribute('data-type');
    if (!type) return;
    
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
        if (correctAnswer && !isNaN(parseInt(correctAnswer))) {
          correctIndices = [parseInt(correctAnswer)];
        }
      }
      
      if (checkedOptions.length === 0) {
        feedbackDiv.textContent = 'Keine Antwort ausgewählt.';
        feedbackDiv.className = 'feedback no-answer';
        hasErrors = true;
        return;
      }
      
      let selectedIndices = Array.from(checkedOptions).map(option => parseInt(option.dataset.index));
      
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
        hasErrors = true;
        
        // NUR falsche Antworten markieren (nicht die richtigen!)
        const options = question.querySelectorAll('.option-label');
        selectedIndices.forEach(idx => {
          if (!correctIndices.includes(idx)) {
            options[idx].classList.add('wrong-answer');
          }
        });
      }
    } 
    // Text-Aufgaben (OFFEN)
    else if (type === 'text') {
      const answerField = question.querySelector('.text-answer');
      if (!answerField) return;
      
      const userAnswer = answerField.value.trim();
      
      // Selbsteinschätzung zeigen (aber NICHT die Lösung!)
      const selfAssessment = question.querySelector('.self-assessment');
      if (selfAssessment) selfAssessment.style.display = 'block';
      
      const selectedAssessment = selfAssessment ? selfAssessment.querySelector('.assessment-button.selected') : null;
      
      if (selectedAssessment) {
        if (selectedAssessment.textContent === 'Korrekt' || selectedAssessment.textContent === 'Teilweise korrekt') {
          correctCount++;
        } else {
          hasErrors = true;
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
        
        gapDropzones.forEach((dropzone, index) => {
          const userAnswer = dropzone.dataset.filledWith || '';
          
          if (!userAnswer || dropzone.textContent === 'Wort hier ablegen...') {
            dropzone.classList.add('gap-empty');
            return;
          }
          
          dropzone.classList.remove('gap-empty');
          
          const correctOptions = correctAnswers[index] ? correctAnswers[index].split('|').map(a => a.trim()) : [];
          const userAnswerLower = userAnswer.toLowerCase();
          
          const isCorrect = correctOptions.some(option => {
            return userAnswerLower === option.toLowerCase();
          });
          
          if (isCorrect) {
            dropzone.classList.add('gap-correct');
            dropzone.classList.remove('gap-incorrect');
            correctGaps++;
          } else {
            dropzone.classList.add('gap-incorrect');
            dropzone.classList.remove('gap-correct');
            // KEINE Lösung anzeigen!
          }
          
          if (dropzone.clickHandler) {
            dropzone.removeEventListener('click', dropzone.clickHandler);
            dropzone.style.cursor = 'default';
          }
        });
        
        if (totalGaps === correctGaps) {
          feedbackDiv.textContent = 'Alle Lücken richtig ausgefüllt!';
          feedbackDiv.className = 'feedback correct';
          correctCount++;
        } else {
          feedbackDiv.textContent = `${correctGaps} von ${totalGaps} Lücken richtig ausgefüllt.`;
          feedbackDiv.className = 'feedback incorrect';
          hasErrors = true;
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
        const correctPositions = JSON.parse(correctAnswer);
        const currentItems = Array.from(sortableList.querySelectorAll('.order-item'));
        const currentPositions = currentItems.map(item => parseInt(item.dataset.originalPosition));
        
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
          hasErrors = true;
          // KEINE Lösung anzeigen!
        }
      } catch (error) {
        console.error('Fehler bei der Überprüfung der Reihenfolge:', error);
        feedbackDiv.textContent = 'Fehler bei der Überprüfung.';
        feedbackDiv.className = 'feedback no-answer';
      }
    }
    else {
      feedbackDiv.textContent = 'Dieser Aufgabentyp kann nicht automatisch überprüft werden.';
      feedbackDiv.className = 'feedback no-answer';
    }
  });
  
  // Alle Eingaben deaktivieren
  disableAllQuizInputs();
  
  // Speichere ob Fehler vorhanden waren
  quizHadErrors = hasErrors;
  
  // Berechne Erfolgsquote
  const successRate = totalCount > 0 ? (correctCount / totalCount) : 0;
  const percentageCorrect = Math.round(successRate * 100);
  
  // Sende Ergebnis an Google Sheets
  sendQuizResult(studentName, percentageCorrect, correctCount, totalCount);
  
  // Zeige Gesamtergebnis
  const resultDiv = document.getElementById('quiz-total-result');
  if (resultDiv) {
    resultDiv.innerHTML = '';
    
    const studentInfoDiv = document.createElement('div');
    studentInfoDiv.className = 'quiz-student-info';
    studentInfoDiv.innerHTML = `<strong>Ergebnis für:</strong> ${studentName}`;
    resultDiv.appendChild(studentInfoDiv);
    
    const baseResultDiv = document.createElement('div');
    baseResultDiv.className = 'quiz-base-result';
    baseResultDiv.textContent = `Gesamtergebnis: ${correctCount} von ${totalCount} Fragen richtig beantwortet! (${percentageCorrect}%)`;
    resultDiv.appendChild(baseResultDiv);
    
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
      const goodResultDiv = document.createElement('div');
      goodResultDiv.className = 'good-result';
      goodResultDiv.innerHTML = `
        <h3>🎉 Sehr gut! Du hast ${percentageCorrect}% der Aufgaben richtig gelöst!</h3>
        <p>Dein Ergebnis wurde gespeichert.</p>
      `;
      resultDiv.appendChild(goodResultDiv);
    } else {
      const encouragementDiv = document.createElement('div');
      encouragementDiv.className = 'encouragement-result';
      encouragementDiv.innerHTML = `
        <h3>📚 Weiter üben!</h3>
        <p>Du hast ${percentageCorrect}% richtig. Versuche es nochmal!</p>
        <p><em>Für das Codewort benötigst du mindestens 80% richtige Antworten.</em></p>
      `;
      resultDiv.appendChild(encouragementDiv);
      
      // Reload-Button anzeigen wenn Fehler vorhanden
      showReloadButton();
    }
    
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
  }
}

// Alte Funktion für Rückwärtskompatibilität (ohne Auth)
function checkAllAnswers() {
  showQuizAuthModal();
}

// Hilfsfunktion zum Mischen eines Arrays
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Hilfsfunktion zum Aufteilen von Assignment-Items (berücksichtigt HTML-Tags)
function splitAssignmentItems(html) {
  const items = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      depth++;
      current += char;
    } else if (char === '>') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    items.push(current.trim());
  }
  
  return items;
}

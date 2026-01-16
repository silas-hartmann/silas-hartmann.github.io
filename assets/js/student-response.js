/**
 * Student Response System
 * Ermöglicht Schülern, Textantworten einzureichen, die in Google Sheets gespeichert werden.
 * 
 * KONFIGURATION:
 * Setze STUDENT_RESPONSE_SCRIPT_URL in einem <script>-Tag vor diesem Script:
 * <script>
 *   window.STUDENT_RESPONSE_SCRIPT_URL = "https://script.google.com/macros/s/DEINE_ID/exec";
 *   window.STUDENT_RESPONSE_SHEET_URL = "https://docs.google.com/spreadsheets/d/DEINE_ID/gviz/tq?tqx=out:json";
 * </script>
 */

(function() {
  'use strict';

  // ===== FORMULAR-FUNKTIONALITÄT =====

  function initResponseForms() {
    const forms = document.querySelectorAll('.student-response-form');
    
    forms.forEach(form => {
      const taskId = form.dataset.taskId || 'unbekannt';
      const nameInput = form.querySelector('.sr-name-input');
      const textInput = form.querySelector('.sr-text-input');
      const submitBtn = form.querySelector('.sr-submit-btn');
      const statusDiv = form.querySelector('.sr-status');

      // Gespeicherten Namen laden
      const savedName = localStorage.getItem('studentResponseName');
      if (savedName && nameInput) {
        nameInput.value = savedName;
      }

      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = nameInput ? nameInput.value.trim() : 'Anonym';
        const text = textInput.value.trim();

        if (!text) {
          showStatus(statusDiv, 'error', 'Bitte gib eine Antwort ein.');
          return;
        }

        // Namen speichern
        if (nameInput && name) {
          localStorage.setItem('studentResponseName', name);
        }

        // Absenden
        submitBtn.disabled = true;
        showStatus(statusDiv, 'loading', 'Wird gesendet...');

        try {
          const scriptUrl = window.STUDENT_RESPONSE_SCRIPT_URL;
          if (!scriptUrl) {
            throw new Error('Script-URL nicht konfiguriert');
          }

          const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script erfordert no-cors
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: name,
              taskId: taskId,
              text: text,
              timestamp: new Date().toISOString(),
              page: window.location.pathname
            })
          });

          // Bei no-cors können wir die Antwort nicht lesen, aber der Request ging durch
          showStatus(statusDiv, 'success', 'Antwort wurde gespeichert!');
          textInput.value = '';

        } catch (error) {
          console.error('Fehler beim Senden:', error);
          showStatus(statusDiv, 'error', 'Fehler beim Senden. Bitte versuche es erneut.');
        } finally {
          submitBtn.disabled = false;
        }
      });
    });
  }

  function showStatus(element, type, message) {
    if (!element) return;
    element.className = 'sr-status ' + type;
    element.textContent = message;
    
    // Erfolgsmeldung nach 5 Sekunden ausblenden
    if (type === 'success') {
      setTimeout(() => {
        element.style.display = 'none';
        element.className = 'sr-status';
      }, 5000);
    }
  }

  // ===== ANZEIGE-FUNKTIONALITÄT =====

  function initResponseDisplays() {
    const displays = document.querySelectorAll('.student-responses-display');
    
    displays.forEach(display => {
      const filterInput = display.querySelector('.sr-filter-input');
      const refreshBtn = display.querySelector('.sr-refresh-btn');
      const countSpan = display.querySelector('.sr-count');
      const listDiv = display.querySelector('.sr-response-list');
      
      let allResponses = [];

      // Initiales Laden
      loadResponses();

      // Refresh-Button
      if (refreshBtn) {
        refreshBtn.addEventListener('click', loadResponses);
      }

      // Filter
      if (filterInput) {
        filterInput.addEventListener('input', () => {
          renderResponses(filterResponses(allResponses, filterInput.value));
        });
      }

      async function loadResponses() {
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div class="sr-loading">Lade Antworten</div>';

        try {
          const sheetUrl = window.STUDENT_RESPONSE_SHEET_URL;
          if (!sheetUrl) {
            throw new Error('Sheet-URL nicht konfiguriert');
          }

          const response = await fetch(sheetUrl);
          const text = await response.text();
          
          // Google Sheets JSON-Response parsen (hat einen Prefix)
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}') + 1;
          const jsonText = text.substring(jsonStart, jsonEnd);
          const data = JSON.parse(jsonText);

          allResponses = parseSheetData(data);
          
          // Filter anwenden falls vorhanden
          const filtered = filterInput ? filterResponses(allResponses, filterInput.value) : allResponses;
          renderResponses(filtered);

        } catch (error) {
          console.error('Fehler beim Laden:', error);
          listDiv.innerHTML = '<div class="sr-empty">Fehler beim Laden der Antworten.</div>';
        }
      }

      function parseSheetData(data) {
        const responses = [];
        const rows = data.table?.rows || [];
        const cols = data.table?.cols || [];

        // Spalten-Indizes ermitteln
        const colMap = {};
        cols.forEach((col, i) => {
          const label = col.label?.toLowerCase() || '';
          if (label.includes('zeit') || label.includes('time') || label.includes('stamp')) colMap.timestamp = i;
          else if (label.includes('name')) colMap.name = i;
          else if (label.includes('aufgabe') || label.includes('task')) colMap.taskId = i;
          else if (label.includes('antwort') || label.includes('text') || label.includes('response')) colMap.text = i;
        });

        // Falls keine Labels, Standard-Reihenfolge annehmen
        if (Object.keys(colMap).length === 0) {
          colMap.timestamp = 0;
          colMap.name = 1;
          colMap.taskId = 2;
          colMap.text = 3;
        }

        rows.forEach(row => {
          const cells = row.c || [];
          const getValue = (idx) => cells[idx]?.v || cells[idx]?.f || '';
          
          responses.push({
            timestamp: getValue(colMap.timestamp),
            name: getValue(colMap.name) || 'Anonym',
            taskId: getValue(colMap.taskId),
            text: getValue(colMap.text)
          });
        });

        // Neueste zuerst
        responses.reverse();
        return responses;
      }

      function filterResponses(responses, filterText) {
        if (!filterText) return responses;
        const lower = filterText.toLowerCase();
        return responses.filter(r => 
          r.name.toLowerCase().includes(lower) ||
          r.taskId.toLowerCase().includes(lower) ||
          r.text.toLowerCase().includes(lower)
        );
      }

      function renderResponses(responses) {
        if (!listDiv) return;

        if (countSpan) {
          countSpan.textContent = `${responses.length} Antwort${responses.length !== 1 ? 'en' : ''}`;
        }

        if (responses.length === 0) {
          listDiv.innerHTML = '<div class="sr-empty">Keine Antworten gefunden.</div>';
          return;
        }

        listDiv.innerHTML = responses.map(r => `
          <div class="sr-response-card">
            <div class="sr-response-header">
              <span class="sr-response-name">${escapeHtml(r.name)}</span>
              <span class="sr-response-time">${formatTimestamp(r.timestamp)}</span>
            </div>
            ${r.taskId ? `<div class="sr-response-task">Aufgabe: ${escapeHtml(r.taskId)}</div>` : ''}
            <div class="sr-response-text">${escapeHtml(r.text)}</div>
          </div>
        `).join('');
      }

      function formatTimestamp(ts) {
        if (!ts) return '';
        try {
          // Google Sheets Date-Format: "Date(2024,0,15,10,30,0)"
          if (typeof ts === 'string' && ts.startsWith('Date(')) {
            const parts = ts.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
            if (parts) {
              const date = new Date(parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]);
              return date.toLocaleString('de-DE');
            }
          }
          const date = new Date(ts);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('de-DE');
          }
        } catch (e) {}
        return ts;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    });
  }

  // ===== CODE-BLOCK KONVERTER =====
  // Jekyll rendert ```student-response:id``` als <pre><code class="language-student-response">id</code></pre>
  // Diese Funktion ersetzt diese Code-Blöcke durch die entsprechenden Formulare

  function convertCodeBlocks() {
    // Alle Code-Blöcke durchgehen
    const allCodeBlocks = document.querySelectorAll('pre > code');
    
    allCodeBlocks.forEach(codeBlock => {
      const pre = codeBlock.parentElement;
      const className = codeBlock.className || '';
      const content = codeBlock.textContent.trim();
      
      // WICHTIG: Zuerst auf "display" prüfen (längerer Match zuerst)
      const isDisplay = className.includes('language-student-responses-display') || 
                        content === 'student-responses-display';
      
      const isForm = !isDisplay && (
        className === 'language-student-response' ||
        (className.includes('language-student-response') && !className.includes('display')) ||
        content.startsWith('student-response:') || 
        content === 'student-response'
      );
      
      if (isDisplay) {
        const displayDiv = document.createElement('div');
        displayDiv.className = 'student-responses-display';
        displayDiv.innerHTML = `
          <div class="sr-controls">
            <input type="text" class="sr-filter-input" placeholder="Filtern nach Name, Aufgabe...">
            <button class="sr-refresh-btn">Aktualisieren</button>
            <span class="sr-count"></span>
          </div>
          <div class="sr-response-list"></div>
        `;
        pre.parentNode.replaceChild(displayDiv, pre);
      } else if (isForm) {
        const taskId = content.replace('student-response:', '').trim() || 'aufgabe';
        
        const formDiv = document.createElement('div');
        formDiv.className = 'student-response-form';
        formDiv.dataset.taskId = taskId;
        formDiv.innerHTML = `
          <label>Dein Name:</label>
          <input type="text" class="sr-name-input" placeholder="Name eingeben...">
          <label>Deine Antwort:</label>
          <textarea class="sr-text-input" placeholder="Schreibe deine Antwort hier..."></textarea>
          <button class="sr-submit-btn">Antwort absenden</button>
          <div class="sr-status"></div>
        `;
        pre.parentNode.replaceChild(formDiv, pre);
      }
    });
  }

  function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== INITIALISIERUNG =====

  document.addEventListener('DOMContentLoaded', () => {
    // Erst Code-Blöcke konvertieren
    convertCodeBlocks();
    // Dann Funktionalität initialisieren
    initResponseForms();
    initResponseDisplays();
  });

})();

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
 * 
 * Schülerliste in: /assets/data/schueler.json
 */

(function() {
  'use strict';

  // Globale Schülerdaten
  let schuelerDaten = null;
  let schuelerListe = [];

  // ===== SCHÜLERDATEN LADEN =====

  async function loadSchuelerDaten() {
    try {
      const response = await fetch('/assets/data/schueler.json');
      if (!response.ok) throw new Error('Schülerliste nicht gefunden');
      schuelerDaten = await response.json();
      
      // Standardklasse laden oder erste verfügbare
      const klasse = schuelerDaten.standardKlasse || Object.keys(schuelerDaten.klassen)[0];
      schuelerListe = schuelerDaten.klassen[klasse] || [];
      
      return true;
    } catch (error) {
      console.error('Fehler beim Laden der Schülerliste:', error);
      return false;
    }
  }

  function validateCode(name, code) {
    const schueler = schuelerListe.find(s => s.name === name);
    if (!schueler) return false;
    return schueler.code === code.trim();
  }

  // ===== FORMULAR-FUNKTIONALITÄT =====

  function initResponseForms() {
    const forms = document.querySelectorAll('.student-response-form');
    
    forms.forEach(form => {
      const taskId = form.dataset.taskId || 'unbekannt';
      const nameSelect = form.querySelector('.sr-name-select');
      const codeInput = form.querySelector('.sr-code-input');
      const textInput = form.querySelector('.sr-text-input');
      const submitBtn = form.querySelector('.sr-submit-btn');
      const statusDiv = form.querySelector('.sr-status');

      // Dropdown mit Schülern befüllen
      if (nameSelect && schuelerListe.length > 0) {
        nameSelect.innerHTML = '<option value="">-- Name auswählen --</option>';
        schuelerListe.forEach(s => {
          const option = document.createElement('option');
          option.value = s.name;
          option.textContent = s.name;
          nameSelect.appendChild(option);
        });

        // Gespeicherten Namen laden
        const savedName = localStorage.getItem('studentResponseName');
        const savedCode = localStorage.getItem('studentResponseCode');
        if (savedName) {
          nameSelect.value = savedName;
        }
        if (savedCode && codeInput) {
          codeInput.value = savedCode;
        }
      }

      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = nameSelect ? nameSelect.value : '';
        const code = codeInput ? codeInput.value.trim() : '';
        const text = textInput.value.trim();

        // Validierungen
        if (!name) {
          showStatus(statusDiv, 'error', 'Bitte wähle deinen Namen aus.');
          return;
        }

        if (!code) {
          showStatus(statusDiv, 'error', 'Bitte gib deinen Code ein.');
          return;
        }

        if (!validateCode(name, code)) {
          showStatus(statusDiv, 'error', 'Der Code ist falsch.');
          return;
        }

        if (!text) {
          showStatus(statusDiv, 'error', 'Bitte gib eine Antwort ein.');
          return;
        }

        // Name und Code speichern
        localStorage.setItem('studentResponseName', name);
        localStorage.setItem('studentResponseCode', code);

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
            mode: 'no-cors',
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
    element.style.display = 'block';
    
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
      const filterSelect = display.querySelector('.sr-filter-select');
      const filterInput = display.querySelector('.sr-filter-input');
      const refreshBtn = display.querySelector('.sr-refresh-btn');
      const countSpan = display.querySelector('.sr-count');
      const listDiv = display.querySelector('.sr-response-list');
      const presetTask = display.dataset.presetTask || '';
      
      let allResponses = [];

      loadResponses();

      if (refreshBtn) {
        refreshBtn.addEventListener('click', loadResponses);
      }

      if (filterSelect) {
        filterSelect.addEventListener('change', applyFilters);
      }

      if (filterInput) {
        filterInput.addEventListener('input', applyFilters);
      }

      function applyFilters() {
        const taskFilter = filterSelect ? filterSelect.value : '';
        const textFilter = filterInput ? filterInput.value : '';
        renderResponses(filterResponses(allResponses, taskFilter, textFilter));
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
          
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}') + 1;
          const jsonText = text.substring(jsonStart, jsonEnd);
          const data = JSON.parse(jsonText);

          allResponses = parseSheetData(data);
          
          if (filterSelect) {
            updateTaskSelect(allResponses);
          }
          
          applyFilters();

        } catch (error) {
          console.error('Fehler beim Laden:', error);
          listDiv.innerHTML = '<div class="sr-empty">Fehler beim Laden der Antworten.</div>';
        }
      }

      function parseSheetData(data) {
        const responses = [];
        const rows = data.table?.rows || [];
        const cols = data.table?.cols || [];

        const colMap = {};
        cols.forEach((col, i) => {
          const label = col.label?.toLowerCase() || '';
          if (label.includes('zeit') || label.includes('time') || label.includes('stamp')) colMap.timestamp = i;
          else if (label.includes('name')) colMap.name = i;
          else if (label.includes('aufgabe') || label.includes('task')) colMap.taskId = i;
          else if (label.includes('antwort') || label.includes('text') || label.includes('response')) colMap.text = i;
        });

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

        responses.reverse();
        return responses;
      }

      function updateTaskSelect(responses) {
        const tasks = [...new Set(responses.map(r => r.taskId).filter(t => t))];
        tasks.sort();
        
        const currentValue = filterSelect.value || presetTask;
        
        filterSelect.innerHTML = '<option value="">Alle Aufgaben</option>';
        tasks.forEach(task => {
          const option = document.createElement('option');
          option.value = task;
          option.textContent = task;
          filterSelect.appendChild(option);
        });
        
        if (currentValue && tasks.includes(currentValue)) {
          filterSelect.value = currentValue;
        }
      }

      function filterResponses(responses, taskFilter, textFilter) {
        return responses.filter(r => {
          if (taskFilter && r.taskId !== taskFilter) return false;
          
          if (textFilter) {
            const lower = textFilter.toLowerCase();
            if (!r.name.toLowerCase().includes(lower) && 
                !r.text.toLowerCase().includes(lower)) {
              return false;
            }
          }
          
          return true;
        });
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

  function convertCodeBlocks() {
    const allCodeBlocks = document.querySelectorAll('pre > code');
    
    allCodeBlocks.forEach(codeBlock => {
      const pre = codeBlock.parentElement;
      const className = codeBlock.className || '';
      const content = codeBlock.textContent.trim();
      
      const isDisplay = className.includes('language-student-responses-display') || 
                        content === 'student-responses-display' ||
                        content.startsWith('student-responses-display\n');
      
      const isForm = !isDisplay && (
        className === 'language-student-response' ||
        (className.includes('language-student-response') && !className.includes('display')) ||
        content.startsWith('student-response:') || 
        content === 'student-response'
      );
      
      if (isDisplay) {
        let presetTask = '';
        if (className.includes('language-student-responses-display')) {
          presetTask = content.trim();
        } else {
          presetTask = content.replace('student-responses-display', '').trim();
        }
        
        const displayDiv = document.createElement('div');
        displayDiv.className = 'student-responses-display';
        if (presetTask) {
          displayDiv.dataset.presetTask = presetTask;
        }
        displayDiv.innerHTML = `
          <div class="sr-controls">
            <select class="sr-filter-select">
              <option value="">Alle Aufgaben</option>
            </select>
            <input type="text" class="sr-filter-input" placeholder="Zusätzlich nach Name filtern...">
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
          <select class="sr-name-select">
            <option value="">-- Name auswählen --</option>
          </select>
          <label>Dein Code:</label>
          <input type="text" class="sr-code-input" placeholder="Code eingeben...">
          <label>Deine Antwort:</label>
          <textarea class="sr-text-input" placeholder="Schreibe deine Antwort hier..."></textarea>
          <button class="sr-submit-btn">Antwort absenden</button>
          <div class="sr-status"></div>
        `;
        pre.parentNode.replaceChild(formDiv, pre);
      }
    });
  }

  // ===== INITIALISIERUNG =====

  document.addEventListener('DOMContentLoaded', async () => {
    // Erst Schülerdaten laden
    await loadSchuelerDaten();
    // Dann Code-Blöcke konvertieren
    convertCodeBlocks();
    // Dann Funktionalität initialisieren
    initResponseForms();
    initResponseDisplays();
  });

})();

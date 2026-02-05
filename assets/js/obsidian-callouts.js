/**
 * Obsidian Callouts Parser
 * Konvertiert Obsidian-Callout-Syntax in HTML
 * 
 * Obsidian-Syntax:
 * > [!type] Optionaler Titel
 * > Inhalt hier
 * 
 * Kramdown rendert das als:
 * <blockquote>
 *   <p>[!type] Titel<br />
 *   Inhalt</p>
 * </blockquote>
 */

(function() {
  'use strict';

  // Callout-Typen und ihre Aliase
  const CALLOUT_TYPES = {
    'note': 'note',
    'abstract': 'abstract', 'summary': 'abstract', 'tldr': 'abstract',
    'info': 'info', 'todo': 'info',
    'tip': 'tip', 'hint': 'tip', 'important': 'tip',
    'success': 'success', 'check': 'success', 'done': 'success',
    'question': 'question', 'help': 'question', 'faq': 'question',
    'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
    'failure': 'failure', 'fail': 'failure', 'missing': 'failure',
    'danger': 'danger', 'error': 'danger',
    'bug': 'bug',
    'example': 'example',
    'quote': 'quote', 'cite': 'quote'
  };

  // Standard-Titel für Callout-Typen (Deutsch)
  const DEFAULT_TITLES = {
    'note': 'Hinweis',
    'abstract': 'Zusammenfassung',
    'info': 'Info',
    'tip': 'Tipp',
    'success': 'Erfolg',
    'question': 'Frage',
    'warning': 'Warnung',
    'failure': 'Fehler',
    'danger': 'Gefahr',
    'bug': 'Bug',
    'example': 'Beispiel',
    'quote': 'Zitat'
  };

  /**
   * Parst eine Callout-Header-Zeile
   * @param {string} text - Der Text (kann HTML enthalten)
   * @returns {Object|null} - Callout-Info oder null
   */
  function parseCalloutHeader(text) {
    // Regex für Callout-Syntax: [!type] oder [!type]+ oder [!type]-
    const match = text.match(/^\s*\[!([a-zA-Z_-]+)\]([+-])?\s*(.*)?$/);
    
    if (!match) return null;

    const rawType = match[1].toLowerCase();
    const foldChar = match[2]; // '+', '-', oder undefined
    const customTitle = match[3] ? match[3].trim() : '';

    const type = CALLOUT_TYPES[rawType] || rawType;
    
    return {
      type: type,
      rawType: rawType,
      foldable: foldChar !== undefined,
      collapsed: foldChar === '-',
      title: customTitle || DEFAULT_TITLES[type] || rawType.charAt(0).toUpperCase() + rawType.slice(1)
    };
  }

  /**
   * Extrahiert die erste Zeile und den Rest aus HTML-Content
   * @param {string} html - HTML-String
   * @returns {Object} - { firstLine, rest }
   */
  function splitFirstLine(html) {
    // Mögliche Trennzeichen: <br>, <br/>, <br />, oder Newline
    const brRegex = /<br\s*\/?>/i;
    const match = html.match(brRegex);
    
    if (match) {
      const index = match.index;
      return {
        firstLine: html.substring(0, index).trim(),
        rest: html.substring(index + match[0].length).trim()
      };
    }
    
    // Kein <br> gefunden - alles ist erste Zeile
    return {
      firstLine: html.trim(),
      rest: ''
    };
  }

  /**
   * Bereinigt HTML-Content von führenden <br>-Tags
   * @param {string} html - HTML-String
   * @returns {string}
   */
  function cleanLeadingBr(html) {
    return html.replace(/^(\s*<br\s*\/?>\s*)+/gi, '').trim();
  }

  /**
   * Erstellt das Callout-HTML-Element
   * @param {Object} calloutInfo - Die Callout-Informationen
   * @param {string} content - Der Inhalt des Callouts (HTML)
   * @returns {HTMLElement}
   */
  function createCalloutElement(calloutInfo, content) {
    const callout = document.createElement('div');
    callout.className = 'callout';
    callout.setAttribute('data-callout', calloutInfo.type);
    
    if (calloutInfo.foldable) {
      callout.setAttribute('data-callout-fold', '1');
      if (calloutInfo.collapsed) {
        callout.classList.add('is-collapsed');
      }
    }

    // Icon-Container
    const icon = document.createElement('div');
    icon.className = 'callout-icon';
    callout.appendChild(icon);

    // Content-Container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'callout-content';

    // Titel
    const titleDiv = document.createElement('div');
    titleDiv.className = 'callout-title';
    titleDiv.textContent = calloutInfo.title;
    
    // Klick-Handler für faltbare Callouts
    if (calloutInfo.foldable) {
      titleDiv.style.cursor = 'pointer';
      titleDiv.addEventListener('click', function() {
        callout.classList.toggle('is-collapsed');
      });
    }
    
    contentDiv.appendChild(titleDiv);

    // Inhalt hinzufügen
    content = cleanLeadingBr(content);
    if (content) {
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'callout-body';
      contentWrapper.innerHTML = content;
      contentDiv.appendChild(contentWrapper);
    }

    callout.appendChild(contentDiv);
    return callout;
  }

  /**
   * Konvertiert alle Blockquotes mit Callout-Syntax
   */
  function convertCallouts() {
    // Alle Blockquotes finden
    const blockquotes = document.querySelectorAll('blockquote');

    blockquotes.forEach(function(blockquote) {
      // Prüfen, ob bereits konvertiert
      if (blockquote.classList.contains('callout-processed')) return;
      
      const firstP = blockquote.querySelector('p');
      if (!firstP) return;

      // Gesamten HTML-Inhalt des ersten <p> holen
      const innerHTML = firstP.innerHTML;
      
      // Erste Zeile extrahieren
      const { firstLine, rest } = splitFirstLine(innerHTML);
      
      // Text-Content der ersten Zeile für Parsing (ohne HTML-Tags)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = firstLine;
      const firstLineText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Callout-Syntax prüfen
      const calloutInfo = parseCalloutHeader(firstLineText);
      if (!calloutInfo) {
        blockquote.classList.add('callout-processed');
        return;
      }

      // Restlichen Inhalt sammeln
      let contentParts = [];
      
      // Rest aus dem ersten Absatz (mit Links etc. erhalten)
      if (rest) {
        // Prüfen ob rest nur whitespace/br ist
        const cleanRest = cleanLeadingBr(rest);
        if (cleanRest) {
          contentParts.push('<p>' + cleanRest + '</p>');
        }
      }

      // Alle weiteren Elemente im Blockquote sammeln
      let sibling = firstP.nextElementSibling;
      while (sibling) {
        contentParts.push(sibling.outerHTML);
        sibling = sibling.nextElementSibling;
      }

      // Callout-Element erstellen
      const calloutElement = createCalloutElement(calloutInfo, contentParts.join(''));

      // Blockquote durch Callout ersetzen
      blockquote.parentNode.replaceChild(calloutElement, blockquote);
    });
  }

  /**
   * Initialisierung
   */
  function init() {
    convertCallouts();
    
    // MutationObserver für dynamisch geladene Inhalte
    const observer = new MutationObserver(function(mutations) {
      let shouldConvert = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          shouldConvert = true;
        }
      });
      if (shouldConvert) {
        convertCallouts();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Bei DOM-Laden ausführen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM bereits geladen
    init();
  }

  // Für manuellen Aufruf exportieren
  window.convertObsidianCallouts = convertCallouts;

})();

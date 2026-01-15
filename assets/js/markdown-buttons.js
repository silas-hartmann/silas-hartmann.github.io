/**
 * Markdown Button Parser
 * Erkennt {button: (Beschriftung)(link)} und wandelt es in Buttons um
 * Syntax: {button: (Button Text)(pfad/zur/datei.md)}
 * Mehrere Buttons: {button: (A)(a.md), button: (B)(b.md)} werden horizontal gruppiert
 */

document.addEventListener('DOMContentLoaded', function() {
  const content = document.querySelector('.main-content');
  if (!content) return;

  // Regex für {button: (Beschriftung)(link)}
  const buttonRegex = /\{button:\s*\(([^)]+)\)\(([^)]+)\)\}/g;

  // Alle Textknoten durchsuchen
  const walker = document.createTreeWalker(
    content,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const nodesToReplace = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (buttonRegex.test(node.textContent)) {
      nodesToReplace.push(node);
    }
    buttonRegex.lastIndex = 0;
  }

  // Knoten ersetzen
  nodesToReplace.forEach(node => {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let buttonGroup = null;
    let lastMatchEnd = -1;

    buttonRegex.lastIndex = 0;
    const text = node.textContent;

    while ((match = buttonRegex.exec(text)) !== null) {
      // Text vor dem Match
      const textBefore = text.slice(lastIndex, match.index);
      
      // Prüfen, ob Text zwischen Buttons nur Whitespace/Kommas enthält
      const isConsecutive = lastMatchEnd >= 0 && /^[\s,]*$/.test(textBefore);
      
      if (!isConsecutive) {
        // Vorherige Button-Gruppe abschließen
        if (buttonGroup && buttonGroup.childElementCount > 0) {
          fragment.appendChild(buttonGroup);
          buttonGroup = null;
        }
        
        // Text vor dem Button hinzufügen (wenn nicht nur Whitespace/Kommas)
        if (textBefore.trim() && !/^[\s,]*$/.test(textBefore)) {
          fragment.appendChild(document.createTextNode(textBefore));
        }
      }

      // Neue Button-Gruppe erstellen falls nötig
      if (!buttonGroup) {
        buttonGroup = document.createElement('div');
        buttonGroup.className = 'md-button-group';
      }

      // Button erstellen
      const button = document.createElement('a');
      button.href = match[2];
      button.className = 'md-button';
      button.textContent = match[1];
      
      // Externe Links in neuem Tab öffnen
      if (match[2].startsWith('http')) {
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
      }

      buttonGroup.appendChild(button);
      lastIndex = buttonRegex.lastIndex;
      lastMatchEnd = lastIndex;
    }

    // Letzte Button-Gruppe hinzufügen
    if (buttonGroup && buttonGroup.childElementCount > 0) {
      fragment.appendChild(buttonGroup);
    }

    // Rest-Text nach letztem Match
    if (lastIndex < text.length) {
      const restText = text.slice(lastIndex);
      if (restText.trim()) {
        fragment.appendChild(document.createTextNode(restText));
      }
    }

    node.parentNode.replaceChild(fragment, node);
  });
});

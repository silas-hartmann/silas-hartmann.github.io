/**
 * Markdown Button Parser
 * Erkennt {button: (Beschriftung)(link)} und wandelt es in Buttons um
 * Syntax: {button: (Button Text)(pfad/zur/datei.md)}
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

    buttonRegex.lastIndex = 0;
    const text = node.textContent;

    while ((match = buttonRegex.exec(text)) !== null) {
      // Text vor dem Match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
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

      fragment.appendChild(button);
      lastIndex = buttonRegex.lastIndex;
    }

    // Rest-Text nach letztem Match
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  });
});

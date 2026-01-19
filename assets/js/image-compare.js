/**
 * Image Compare Slider
 * Vorher/Nachher-Bildvergleich mit Schieberegler
 * 
 * Markdown-Syntax:
 *   {compare: (bild-links.jpg)(bild-rechts.jpg)}
 *   {compare: (bild-links.jpg, Label Links)(bild-rechts.jpg, Label Rechts)}
 * 
 * Das linke Bild ist "vorher" (wird geclippt), das rechte ist "nachher" (Hintergrund)
 */

document.addEventListener('DOMContentLoaded', function() {
  const content = document.querySelector('.main-content');
  if (!content) return;

  // Regex für {compare: (bild1, label1)(bild2, label2)}
  // Labels sind optional
  const compareRegex = /\{compare:\s*\(([^)]+)\)\(([^)]+)\)\}/g;

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
    if (compareRegex.test(node.textContent)) {
      nodesToReplace.push(node);
    }
    compareRegex.lastIndex = 0;
  }

  // Knoten ersetzen
  nodesToReplace.forEach(node => {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    compareRegex.lastIndex = 0;
    const text = node.textContent;

    while ((match = compareRegex.exec(text)) !== null) {
      // Text vor dem Match
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        fragment.appendChild(document.createTextNode(textBefore));
      }

      // Parameter parsen (Bild, optional Label)
      const leftParam = parseParam(match[1]);
      const rightParam = parseParam(match[2]);

      // Compare-Container erstellen
      const container = createCompareSlider(leftParam, rightParam);
      fragment.appendChild(container);

      lastIndex = compareRegex.lastIndex;
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

  // Alle Slider initialisieren
  initializeSliders();
});

/**
 * Parst "bild.jpg" oder "bild.jpg, Label Text"
 */
function parseParam(param) {
  const parts = param.split(',').map(s => s.trim());
  return {
    src: parts[0],
    label: parts[1] || null
  };
}

/**
 * Erstellt den Compare-Slider DOM
 */
function createCompareSlider(left, right) {
  const container = document.createElement('div');
  container.className = 'image-compare-container';

  const wrapper = document.createElement('div');
  wrapper.className = 'image-compare-wrapper';

  // Nachher-Bild (rechts, Hintergrund)
  const afterDiv = document.createElement('div');
  afterDiv.className = 'image-compare-after';
  const afterImg = document.createElement('img');
  afterImg.src = right.src;
  afterImg.alt = right.label || 'Nachher';
  afterImg.draggable = false;
  afterDiv.appendChild(afterImg);

  // Vorher-Bild (links, wird geclippt)
  const beforeDiv = document.createElement('div');
  beforeDiv.className = 'image-compare-before';
  beforeDiv.style.width = '50%';
  const beforeImg = document.createElement('img');
  beforeImg.src = left.src;
  beforeImg.alt = left.label || 'Vorher';
  beforeImg.draggable = false;
  beforeDiv.appendChild(beforeImg);

  // Slider
  const slider = document.createElement('div');
  slider.className = 'image-compare-slider';
  slider.style.left = '50%';

  // Touch-freundlicher Hitarea
  const hitarea = document.createElement('div');
  hitarea.className = 'image-compare-slider-hitarea';
  hitarea.style.left = '50%';

  wrapper.appendChild(afterDiv);
  wrapper.appendChild(beforeDiv);
  wrapper.appendChild(slider);
  wrapper.appendChild(hitarea);
  container.appendChild(wrapper);

  // Labels hinzufügen falls vorhanden
  if (left.label || right.label) {
    const labels = document.createElement('div');
    labels.className = 'image-compare-labels';

    const leftLabel = document.createElement('span');
    leftLabel.className = 'image-compare-label image-compare-label-left';
    leftLabel.textContent = left.label || '';

    const rightLabel = document.createElement('span');
    rightLabel.className = 'image-compare-label image-compare-label-right';
    rightLabel.textContent = right.label || '';

    labels.appendChild(leftLabel);
    labels.appendChild(rightLabel);
    container.appendChild(labels);
  }

  return container;
}

/**
 * Initialisiert Drag-Funktionalität für alle Slider
 */
function initializeSliders() {
  const containers = document.querySelectorAll('.image-compare-container');

  containers.forEach(container => {
    const wrapper = container.querySelector('.image-compare-wrapper');
    const beforeDiv = container.querySelector('.image-compare-before');
    const slider = container.querySelector('.image-compare-slider');
    const hitarea = container.querySelector('.image-compare-slider-hitarea');

    let isDragging = false;

    function updatePosition(clientX) {
      const rect = wrapper.getBoundingClientRect();
      let x = clientX - rect.left;
      
      // Begrenzen auf Container-Breite
      x = Math.max(0, Math.min(x, rect.width));
      
      const percent = (x / rect.width) * 100;
      
      beforeDiv.style.width = percent + '%';
      slider.style.left = percent + '%';
      hitarea.style.left = percent + '%';
    }

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      container.style.cursor = 'ew-resize';
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    }

    function doDrag(e) {
      if (!isDragging) return;
      e.preventDefault();
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    }

    function endDrag() {
      isDragging = false;
      container.style.cursor = '';
    }

    // Event-Listener für Hitarea und Slider
    [slider, hitarea].forEach(el => {
      el.addEventListener('mousedown', startDrag);
      el.addEventListener('touchstart', startDrag, { passive: false });
    });

    // Auch Klick irgendwo im Container erlauben
    wrapper.addEventListener('mousedown', startDrag);
    wrapper.addEventListener('touchstart', startDrag, { passive: false });

    // Move und End auf document für bessere UX
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  });
}

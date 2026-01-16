---
title: Setup - Schülerantworten
---

# Setup: Schülerantwort-System

Diese Anleitung erklärt die Einrichtung des Google Sheets Backends.

## Schritt 1: Google Sheet erstellen

1. Gehe zu [Google Sheets](https://sheets.google.com)
2. Erstelle eine neue Tabelle
3. Benenne sie z.B. "Schülerantworten"
4. Erstelle in der ersten Zeile folgende Spaltenüberschriften:
   - A1: `Zeitstempel`
   - B1: `Name`
   - C1: `Aufgabe`
   - D1: `Antwort`
   - E1: `Seite`

## Schritt 2: Google Apps Script erstellen

1. Im Google Sheet: **Erweiterungen → Apps Script**
2. Lösche den vorhandenen Code
3. Füge folgenden Code ein:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date(),           // Zeitstempel
      data.name || '',      // Name
      data.taskId || '',    // Aufgabe
      data.text || '',      // Antwort
      data.page || ''       // Seite
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("Schülerantwort-API aktiv")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

4. Speichern (Strg+S)
5. **Bereitstellen → Neue Bereitstellung**
6. Typ: **Web-App**
7. Einstellungen:
   - Beschreibung: "Schülerantworten"
   - Ausführen als: **Ich**
   - Zugriff: **Jeder**
8. **Bereitstellen** klicken
9. Berechtigungen bestätigen
10. **Web-App-URL kopieren** (sieht aus wie: `https://script.google.com/macros/s/ABC.../exec`)
11. Ergebnis: https://script.google.com/macros/s/AKfycbzdqyFXIEQ9GWT5lFNCLbHl6m98aPxOOygBw_hVK4j92g2dHWedoQ1YZ9bsp3im3G_I/exec
## Schritt 3: Sheet für Lesen freigeben

1. Zurück zum Google Sheet
2. **Datei → Im Web veröffentlichen**
3. Format: **Gesamtes Dokument** als **Webseite** (Standardeinstellung)
4. **Veröffentlichen** klicken
5. Notiere dir die Sheet-ID aus der URL:
   - URL: `https://docs.google.com/spreadsheets/d/DIESE_ID_HIER/edit`
   - Ergebnis: https://docs.google.com/spreadsheets/d/e/2PACX-1vQMFufks1ycbwPhQqB1i_bih_HBX46XT6NEq3il8o0CWN9QsSdRm5YoeZPQehoOFYvseMLNMDohxc0-/pubhtml
1. Deine Lese-URL ist: `https://docs.google.com/spreadsheets/d/DEINE_ID/gviz/tq?tqx=out:json`

## Schritt 4: URLs in Website eintragen

Öffne `_includes/head-custom.html` und trage die URLs ein:

```html
<script>
  window.STUDENT_RESPONSE_SCRIPT_URL = "https://script.google.com/macros/s/DEINE_SCRIPT_ID/exec";
  window.STUDENT_RESPONSE_SHEET_URL = "https://docs.google.com/spreadsheets/d/DEINE_SHEET_ID/gviz/tq?tqx=out:json";
</script>
```

## Nutzung in Markdown

### Eingabeformular einfügen

```
```student-response:aufgaben-id```
```

Die `aufgaben-id` wird mit gespeichert und ermöglicht Filterung.

### Anzeige-Bereich einfügen

```
```student-responses-display```
```

## Fertig!

- Demo-Formular: [/antworten-demo](/antworten-demo)
- Antworten anzeigen: [/antworten-anzeige](/antworten-anzeige)

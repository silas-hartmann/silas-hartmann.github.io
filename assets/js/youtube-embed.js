// YouTube Embed mit Start/End-Beschränkung
// Nutzt die YouTube IFrame API für strikte Kontrolle

(function() {
  'use strict';
  
  // YouTube IFrame API laden
  let apiReady = false;
  let pendingPlayers = [];
  
  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      apiReady = true;
      return;
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
  }
  
  // Callback wenn API bereit
  window.onYouTubeIframeAPIReady = function() {
    apiReady = true;
    pendingPlayers.forEach(initPlayer);
    pendingPlayers = [];
  };
  
  // Zeit-String (M:SS oder MM:SS) zu Sekunden konvertieren
  function parseTime(timeStr) {
    if (!timeStr || timeStr === '') return null;
    
    // Bereits Sekunden (nur Zahl)
    if (/^\d+$/.test(timeStr)) {
      return parseInt(timeStr, 10);
    }
    
    // Format M:SS oder MM:SS oder H:MM:SS
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return null;
  }
  
  // Sekunden zu lesbarem Format
  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }
  
  // Player initialisieren
  function initPlayer(container) {
    const videoId = container.dataset.videoId;
    const startTime = parseTime(container.dataset.start) || 0;
    const endTime = parseTime(container.dataset.end);
    const strictMode = container.dataset.strict === 'true';
    
    const playerDiv = container.querySelector('.youtube-player');
    
    container.classList.add('loading');
    
    const player = new YT.Player(playerDiv, {
      videoId: videoId,
      playerVars: {
        start: startTime,
        end: endTime || undefined,
        rel: 0,
        modestbranding: 1,
        autoplay: 0
      },
      events: {
        onReady: function(event) {
          container.classList.remove('loading');
          
          // Zeitbereich-Info anzeigen wenn Start oder End gesetzt
          if (startTime > 0 || endTime) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'youtube-time-info';
            
            let rangeText = 'Bereich: ';
            if (startTime > 0) {
              rangeText += formatTime(startTime);
            } else {
              rangeText += '0:00';
            }
            rangeText += ' – ';
            if (endTime) {
              rangeText += formatTime(endTime);
            } else {
              rangeText += 'Ende';
            }
            
            infoDiv.innerHTML = '<span class="time-range">' + rangeText + '</span>';
            container.appendChild(infoDiv);
          }
        },
        onStateChange: function(event) {
          // Strikte Kontrolle: Zurücksetzen wenn außerhalb des Bereichs
          if (strictMode && event.data === YT.PlayerState.PLAYING) {
            checkTimeRestriction(player, startTime, endTime);
          }
        }
      }
    });
    
    // Strikte Kontrolle: Regelmäßig prüfen
    if (strictMode) {
      setInterval(function() {
        if (player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
          checkTimeRestriction(player, startTime, endTime);
        }
      }, 500);
    }
    
    container.youtubePlayer = player;
  }
  
  // Zeitbeschränkung prüfen und durchsetzen
  function checkTimeRestriction(player, startTime, endTime) {
    try {
      const currentTime = player.getCurrentTime();
      
      // Vor Startzeit? Zurück zum Start
      if (currentTime < startTime - 0.5) {
        player.seekTo(startTime, true);
      }
      
      // Nach Endzeit? Stoppen und zurück zum Start
      if (endTime && currentTime >= endTime) {
        player.pauseVideo();
        player.seekTo(startTime, true);
      }
    } catch (e) {
      // Player noch nicht bereit
    }
  }
  
  // Alle YouTube-Container auf der Seite initialisieren
  function initAllPlayers() {
    const containers = document.querySelectorAll('.youtube-container');
    
    containers.forEach(function(container) {
      // Bereits initialisiert?
      if (container.youtubePlayer) return;
      
      if (apiReady) {
        initPlayer(container);
      } else {
        pendingPlayers.push(container);
      }
    });
  }
  
  // Bei DOM-Ready starten
  document.addEventListener('DOMContentLoaded', function() {
    loadYouTubeAPI();
    
    // Warten bis API geladen, dann initialisieren
    const checkAPI = setInterval(function() {
      if (apiReady || (window.YT && window.YT.Player)) {
        apiReady = true;
        clearInterval(checkAPI);
        initAllPlayers();
      }
    }, 100);
    
    // Timeout nach 10 Sekunden
    setTimeout(function() {
      clearInterval(checkAPI);
    }, 10000);
  });
  
})();

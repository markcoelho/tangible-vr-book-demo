// Simple logging system
const webhookUrl = atob("aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ4NjE1NDA4Nzg3MDM2NTc1OS9RanRhQ2tBLUN1WktLTU9Ja2RsdkQ4ME8tZTJON1B1M3dBUWZUOXh5aHRQTkRTUUp0NVlFdlBidms5MjlVbFFXcGQ0Sg==");

// Track current marker and stats
let currentMarker = null;
let markerStartTime = null;

// Store all CSV entries for file download
let allCSVEntries = []; // Changed from allSummaries
let marker9Completed = false;
let hasDownloaded = false;

// Get time (HH:MM:SS)
function getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}
    
// Get full timestamp for console
function getTimestamp() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
}

// Get full timestamp for CSV (YYYY-MM-DD HH:MM:SS)
function getFullTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

// Extract action from button ID (returns specific action type)
function getAction(buttonId) {
    if (buttonId.includes('arrow-right') || buttonId.includes('right') && !buttonId.includes('left')) return 'arrow right';
    if (buttonId.includes('arrow-left') || buttonId.includes('left')) return 'arrow left';
    if (buttonId.includes('arrow-up') || buttonId.includes('up')) return 'arrow up';
    if (buttonId.includes('arrow-down') || buttonId.includes('down')) return 'arrow down';
    if (buttonId.includes('reset')) return 'reset';
    if (buttonId.includes('navigation')) return 'navigation';
    if (buttonId.includes('play')) return 'play';
    if (buttonId.includes('pause')) return 'pause';
    if (buttonId.includes('mute')) return 'mute';
    if (buttonId.includes('zoom') || buttonId.includes('increase')) return 'zoom in';
    if (buttonId.includes('decrease')) return 'zoom out';
    if (buttonId.includes('rotate')) return 'rotate';
    if (buttonId.includes('fast-forward') || buttonId.includes('ff')) return 'fast forward';
    if (buttonId.includes('backward')) return 'backward';
    if (buttonId.includes('restart')) return 'restart';
    if (buttonId.includes('marker3d')) return 'marker3d';
    if (buttonId.includes('move')) return 'move';
    return 'other';
}

// Get piece from button ID or media ID (returns side)
function getPiece(id) {
    if (id.includes('centerpiece')) return 'center';
    if (id.includes('leftpiece')) return 'left';
    if (id.includes('rightpiece')) return 'right';
    if (id.includes('marker')) return 'marker';
    return null;
}

// Get media type from button ID
function getMediaType(buttonId) {
    if (buttonId.includes('_image_') || buttonId.includes('image')) return 'image';
    if (buttonId.includes('_video_') || buttonId.includes('video')) return 'video';
    if (buttonId.includes('_3d_') || buttonId.includes('marker3d') || buttonId.includes('3d')) return '3d model';
    return 'unknown';
}

// Get current marker summary as CSV rows (instead of text summary)
function getCurrentMarkerCSVRows() {
    if (!currentMarker) return [];
    
    // Filter entries for current marker
    const markerEntries = allCSVEntries.filter(entry => entry.marker === currentMarker);
    return markerEntries;
}

// Send marker summary to Discord (CSV format for the marker)
function sendMarkerSummary() {
    if (!currentMarker) return;
    
    const markerEntries = getCurrentMarkerCSVRows();
    if (markerEntries.length === 0) return;
    
    // Create summary for Discord (first few entries + stats)
    const firstEntries = markerEntries.slice(0, 10);
    let discordOutput = `**Marker ${currentMarker} Summary** (${markerEntries.length} interactions)\n\`\`\`csv\n`;
    firstEntries.forEach(entry => {
        discordOutput += `"${entry.timestamp}",${entry.action_type},${entry.side},${entry.media_type},${entry.marker},${entry.element_id}\n`;
    });
    if (markerEntries.length > 10) {
        discordOutput += `... and ${markerEntries.length - 10} more interactions\n`;
    }
    discordOutput += `\`\`\``;
    
    // Send to Discord
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: discordOutput.substring(0, 2000) })
    }).catch(error => console.error(`Failed to send logs: ${error.message}`));
    
    console.log(`\n📊 Marker ${currentMarker} summary sent to Discord (${markerEntries.length} interactions)`);
}

// Download CSV file
function downloadLogFile() {
    if (allCSVEntries.length === 0) {
        console.log('No CSV entries to download');
        return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `interaction_log_${timestamp}.csv`;
    
    
    // Create CSV rows
    const rows = allCSVEntries.map(entry => 
        `"${entry.timestamp}",${entry.action_type},${entry.side},${entry.media_type},${entry.marker},${entry.element_id}`
    ).join('\n');
    
    const content = rows;
    
    const blob = new Blob([content], { type: 'text/csv' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ CSV file downloaded: ${filename} (${allCSVEntries.length} entries)`);
    hasDownloaded = true;
}

// Add CSV entry
function addCSVEntry(timestamp, actionType, side, mediaType, marker, elementId) {
    allCSVEntries.push({
        timestamp: timestamp,
        action_type: actionType,
        side: side,
        media_type: mediaType,
        marker: marker,
        element_id: elementId
    });
    
    // Also log as CSV line to console
    console.log(`[CSV] "${timestamp}",${actionType},${side},${mediaType},${marker}`);
}

// Marker found logging (physical marker detection)
function logMarkerFound(markerValue) {
    const previousMarker = currentMarker;
    
    // Add CSV entry for marker found
    addCSVEntry(getFullTimestamp(), 'marker_found', '', '', markerValue);
    
    // Send summary for previous marker
    if (currentMarker !== null && currentMarker !== markerValue) {
        sendMarkerSummary();
        // Check if previous marker was 9 and we haven't downloaded yet
        if (!hasDownloaded && parseInt(previousMarker) === 9) {
            marker9Completed = true;
        }
    }
    
    // Start new marker
    currentMarker = markerValue;
    markerStartTime = getTime();
    
    // If we completed marker 9 and this is a new marker, download
    if (!hasDownloaded && marker9Completed && currentMarker !== null) {
        setTimeout(() => {
            downloadLogFile();
        }, 100);
    }
}

// Marker found logging
function logMarkerShown(markerValue) {
    // Add CSV entry for marker shown
    addCSVEntry(getFullTimestamp(), 'marker_shown', '', '', markerValue);
    
    // Log to console
    console.log(`[${getTimestamp()}] MARKER SHOWN: ${markerValue}`);
}

// Marker found logging
function logMarkerLost(markerValue) {
    // Add CSV entry for marker lost
    addCSVEntry(getFullTimestamp(), 'marker_lost', '', '', markerValue);
    
    // Log to console
    console.log(`[${getTimestamp()}] MARKER LOST: ${markerValue}`);
}

// Button click logging
function logButton(buttonId) {
    const timestamp = getFullTimestamp();
    const action = getAction(buttonId);
    const piece = getPiece(buttonId);
    const mediaType = getMediaType(buttonId);
    
    // Track stats if we're in a marker
    if (currentMarker !== null && piece) {
        addCSVEntry(timestamp, action, piece, mediaType, currentMarker, buttonId);
    }
    
    // Log to console
    console.log(`[${getTimestamp()}] BUTTON: ${buttonId}`);
}

// Navigation media switch logging
function logNavigationSwitch(mediaId) {
    const timestamp = getFullTimestamp();
    const action = 'navigation';
    const piece = getPiece(mediaId);
    const mediaType = getMediaType(mediaId);
    
    // Track stats if we're in a marker
    if (currentMarker !== null && piece) {
        addCSVEntry(timestamp, action, piece, mediaType, currentMarker, mediaId);
    }
    
    // Log to console
    console.log(`[${getTimestamp()}] NAVIGATION: ${mediaId}`);
}

// Manual download function (exposed for console use)
function downloadLogNow() {
    if (allCSVEntries.length === 0) {
        console.log('No CSV entries to download yet');
        return;
    }
    downloadLogFile();
}

// Expose functions globally
window.logNavigationSwitch = logNavigationSwitch;
window.downloadLogNow = downloadLogNow;
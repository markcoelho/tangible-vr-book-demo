// marker-found.js - Complete version with navigation support and video playback
(function() {
    // Store current visible marker
    let currentVisibleMarker = null;

        // Debouncer variables
    let debounceTimer = null;
    let pendingMarkerValue = null;

    // Hide all content initially
    function pauseAllVideos() {
        document.querySelectorAll('a-video[id*="_video_"]').forEach(el => {
                console.log("Attempting to pause: " + el.id);
                        if (el.components.material && el.components.material.material) {
                            const videoTexture = el.components.material.material.map;
                            if (videoTexture && videoTexture.image && videoTexture.image instanceof HTMLVideoElement) {
                                videoTexture.image.pause();
                                console.log(`✅ Paused video: ${el.id}`);
                            }
                        }
        });
    }

    function stopAllNarration() {
        const allNarrations = document.querySelectorAll('[id^="narration_"]');
        allNarrations.forEach(narration => {
            try {
                if (narration.components.sound && narration.components.sound.isPlaying) {
                    narration.components.sound.stopSound();
                    console.log(`⏹️ Stopped narration: ${narration.id}`);
                }
            } catch(e) {
                // Ignore errors
            }
        });
    }

    // Helper function to show an element and all its children
    function showElementWithChildren(element, label) {
        if (!element) {
            console.log(`  ❌ ${label} not found`);
            return;
        }
        element.setAttribute('visible', true);
        console.log(`  ✅ ${label} visible`);
        // Show all children
        element.querySelectorAll('*').forEach(child => {
            child.setAttribute('visible', true);
        });
    }

    // Helper function to find first media element (excluding control buttons)
    function findFirstMediaElement(container) {
        // Get all potential media elements
        const allElements = container.children;
        
        // First, look for direct children that are actual media (not in control panels)
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const tagName = el.tagName;
            const id = el.id || '';
            
            // Skip control planes and their children
            if (tagName === 'A-PLANE' || id.includes('Controls_')) {
                continue;
            }
            
            // Check if it's a media element
            if (tagName === 'A-IMAGE' || 
                tagName === 'A-VIDEO' || 
                tagName === 'A-ENTITY' || 
                el.hasAttribute('gltf-model')) {
                return el;
            }
        }
        
        return null;
    }

    // Unified function to handle any piece (center, left, right)
    function handlePiece(pieceType, value) {
        const piece = document.getElementById(`${pieceType}_${value}`);
        if (!piece) return;
        
        piece.setAttribute('visible', true);
        
        // Map piece type to icon for logging
        const icons = {
            'centerpiece': '🖼️',
            'leftpiece': '⬅️',
            'rightpiece': '➡️'
        };
        console.log(`${icons[pieceType] || '📦'} ${pieceType}_${value}`);
        
        // Find first media element in piece
        const firstMedia = findFirstMediaElement(piece);
        if (firstMedia) {
            firstMedia.setAttribute('visible', true);
            console.log(`  📸 ${firstMedia.id}`);
            
            // Determine media type and find matching controls
            let controlsId;
            
            if (firstMedia.tagName === 'A-IMAGE') {
                controlsId = `${pieceType}_${value}_Controls_0`;
            } else if (firstMedia.tagName === 'A-VIDEO') {
                controlsId = `${pieceType}_${value}_VideoControls_0`;
                // Play video only if autoplay is true
                if (firstMedia.getAttribute('auto-play') === 'true') {
                    try {
                        firstMedia.components.material.material.map.image.play();
                    } catch(e) {
                        console.warn(`Could not play video: ${e}`);
                    }
                }
            } else if (firstMedia.tagName === 'A-ENTITY' || firstMedia.hasAttribute('gltf-model')) {
                controlsId = `${pieceType}_${value}_3dControls_0`;
            }
            
            const controls = piece.querySelector('#' + controlsId);
            showElementWithChildren(controls, `${controlsId} (controls)`);
        }
        
        // Show navigation if it exists
        const navigation = piece.querySelector(`#${pieceType}_${value}_navigation`);
        if (navigation) {
            showElementWithChildren(navigation, `${pieceType}_${value}_navigation`);
        }
    }

    // Show content for specific marker value
    function showContentForMarker(value) {
    // Log the marker value
    logMarkerShown(value);
    
    if (currentVisibleMarker === value) {
        return;
    }

    // Hide all pieces from previous marker
    ['markerpiece_', 'centerpiece_', 'leftpiece_', 'rightpiece_'].forEach(prefix => {
        const element = document.getElementById(prefix + currentVisibleMarker);
        if (element) {
            element.setAttribute('visible', 'false');
        }
    });
    
    stopAllNarration();
    pauseAllVideos();

        if (currentVisibleMarker) {
        const previousSurround = document.getElementById(`surround_${currentVisibleMarker}`);
        if (previousSurround && previousSurround.tagName === 'A-VIDEOSPHERE') {
            try {
                const video = previousSurround.components.material.material.map.image;
                if (video && video instanceof HTMLVideoElement) {
                    video.pause();
                    console.log(`⏸️ Paused surround video for previous marker: ${currentVisibleMarker}`);
                }
            } catch(e) {
                // Ignore
            }
        }
    }

    const narrationElement = document.getElementById(`narration_${value}`);
    if (narrationElement) {
        try {
            narrationElement.components.sound.playSound();
        } catch(e) {
            // Ignore errors
        }
    }

    // Show surround element for this marker if it exists
        const surroundElement = document.getElementById(`surround_${value}`);
    if (surroundElement) {
        surroundElement.setAttribute('visible', true);
        if (surroundElement.tagName === 'A-VIDEOSPHERE') {
            try {
                const video = surroundElement.components.material.material.map.image;
                if (video && video instanceof HTMLVideoElement) {
                    // Reset to beginning and play
                    video.currentTime = 0;
                    video.play().catch(e => console.warn('Could not play surround video:', e));
                    console.log(`▶️ Playing surround video for marker: ${value}`);
                }
            } catch(e) {
                console.warn('Could not play surround video:', e);
            }
        }
    }
    
    // Show marker piece
    var markerPiece = document.getElementById('markerpiece_' + value);
    if (markerPiece) {
        markerPiece.setAttribute('visible', true);
        
        var markerContent = markerPiece.querySelector('[id^="markerContent_"]');
        if (markerContent) {
            markerContent.setAttribute('visible', true);
            
            var firstMarkerMedia = findFirstMediaElement(markerContent);
            if (firstMarkerMedia) {
                firstMarkerMedia.setAttribute('visible', true);

                if (firstMarkerMedia.tagName === 'A-VIDEO' && firstMarkerMedia.getAttribute('auto-play') === 'true') {
                    try {
                        firstMarkerMedia.components.material.material.map.image.play();
                    } catch(e) {
                        // Ignore errors
                    }
                }
                
                var mediaType = 'image';
                if (firstMarkerMedia.tagName === 'A-VIDEO'){
                    mediaType = 'video';
                } else if (firstMarkerMedia.tagName === 'A-ENTITY' || firstMarkerMedia.hasAttribute('gltf-model')) {
                    mediaType = '3d';
                }
                
                var controlsId;
                if (mediaType === 'image') {
                    controlsId = 'markerControls_0';
                } else if (mediaType === 'video') {
                    controlsId = 'markerVideoControls_0';
                } else if (mediaType === '3d') {
                    controlsId = 'marker3dControls_0';
                }
                
                var markerControls = markerContent.querySelector('#' + controlsId);
                if (markerControls) {
                    markerControls.setAttribute('visible', true);
                    markerControls.querySelectorAll('*').forEach(child => {
                        child.setAttribute('visible', true);
                    });
                }
            }
        }
        
        var markerNavigation = markerPiece.querySelector(`#markerpiece_${value}_navigation`);
        if (markerNavigation) {
            markerNavigation.setAttribute('visible', true);
            markerNavigation.querySelectorAll('*').forEach(child => {
                child.setAttribute('visible', true);
            });
        }
    }
    
    handlePiece('centerpiece', value);
    handlePiece('leftpiece', value);
    handlePiece('rightpiece', value);
    
    currentVisibleMarker = value;
}

        // Debounced wrapper for marker detection
    function showContentForMarkerDebounced(value) {
        // Clear any existing timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Log marker found immediately (physical detection)
        logMarkerFound(value);
        
        // Set new timer
        debounceTimer = setTimeout(() => {
            // Only trigger if it's not the same as current visible marker
            if (currentVisibleMarker !== value) {
                showContentForMarker(value);
            }
            debounceTimer = null;
        }, 1000);
    }

    // Initialize marker listeners
    function initMarkerListeners() {
        console.log('🎯 Initializing marker listeners...');
        var markers = document.querySelectorAll('[id^="markerpiece_"]');
        console.log(`Found ${markers.length} markers`);
        
        markers.forEach(function(marker) {
            var value = marker.getAttribute('value');
            
            marker.addEventListener('markerFound', function() {
                showContentForMarkerDebounced(value);

                worldrotationadjust(marker);
            });
            
            marker.addEventListener('markerLost', function() {
                console.log(`\n👋 Marker ${value} lost`);
                logMarkerLost(value);

                 // Clear debouncer 
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                    debounceTimer = null;
                }

                    if (currentVisibleMarker === value) {
                    // ⭐ PAUSE surround video when marker is lost
                    const surroundElement = document.getElementById(`surround_${value}`);
                    if (surroundElement && surroundElement.tagName === 'A-VIDEOSPHERE') {
                        try {
                            const video = surroundElement.components.material.material.map.image;
                            if (video && video instanceof HTMLVideoElement) {
                                video.pause();
                                console.log(`⏸️ Paused surround video for marker ${value}`);
                            }
                        } catch(e) {
                            console.warn(`Could not pause surround video: ${e}`);
                        }
                    }

                    // Find and pause any videos on this marker
                    const markerPiece = document.getElementById('markerpiece_' + value);
                    if (markerPiece) {
                        const videos = markerPiece.querySelectorAll('a-video');
                        videos.forEach(video => {
                            try {
                                video.components.material.material.map.image.pause();
                                console.log(`⏸️ Paused video on marker ${value}: ${video.id}`);
                            } catch(e) {
                                console.warn(`Could not pause video: ${e}`);
                            }
                        });
                    }
                }
            });
        });
    }

    // Start when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initMarkerListeners, 2000);
        });
    } else {
        setTimeout(initMarkerListeners, 2000);
    }

    // Also try when scene loads
    var scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', function() {
            console.log('Scene loaded, initializing markers');
            setTimeout(initMarkerListeners, 1000);
        });
    }
})();
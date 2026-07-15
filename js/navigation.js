// navigation.js
(function() {
    console.log('🧭 Navigation interaction initializing...');
    
    // Store currently visible media for each piece
    const visibleMediaMap = new Map();
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('📄 DOM loaded, looking for scene...');
        
        // Get the scene
        const scene = document.querySelector('a-scene');
        if (!scene) {
            console.error('❌ Scene not found, retrying in 1 second...');
            setTimeout(init, 1000);
            return;
        }

        scene.addEventListener('loaded', function() {
            console.log('✅ Scene loaded, setting up navigation listeners');
            
            // Get the raycaster entity
            const raycaster = document.getElementById('raycaster');
            if (!raycaster) {
                console.error('❌ Raycaster not found');
                return;
            }

            console.log('🎯 Raycaster found, monitoring navigation intersections...');

            // Helper function to check if element is visible (checks self AND parent)
            function isElementVisible(el) {
                if (!el) return false;
                
                // Check self visibility
                let selfVisible = false;
                if (el.components && el.components.visible) {
                    el.components.visible.update();
                    selfVisible = el.components.visible.data === true;
                } else {
                    const attr = el.getAttribute('visible');
                    selfVisible = attr !== 'false' && attr !== false;
                }
                
                if (!selfVisible) return false;
                
                // Check parent visibility (recursively up to 3 levels)
                let parent = el.parentNode;
                let level = 0;
                while (parent && level < 3) {
                    if (parent.components && parent.components.visible) {
                        parent.components.visible.update();
                        if (parent.components.visible.data === false) {
                            return false;
                        }
                    } else {
                        const parentAttr = parent.getAttribute('visible');
                        if (parentAttr === 'false' || parentAttr === false) {
                            return false;
                        }
                    }
                    parent = parent.parentNode;
                    level++;
                }
                
                return true;
            }

            // Helper function to check if element is a navigation thumbnail (excluding marker)
            function isNavigationThumbnail(el) {
                return el.id && el.id.includes('_navigation') && !el.id.includes('marker');
            }

            // Helper function to get navigation button info
            function getNavigationInfo(button) {
                if (!button || !isNavigationThumbnail(button)) {
                    return { type: 'unknown' };
                }
                
                // Extract the media ID from the thumbnail ID (remove '_navigation' suffix)
                const mediaId = button.id.replace('_navigation', '');
                
                // Determine media type from the ID
                let mediaType = 'unknown';
                if (mediaId.includes('_3d_')) {
                    mediaType = '3d';
                } else if (mediaId.includes('_image_')) {
                    mediaType = 'image';
                } else if (mediaId.includes('_video_')) {
                    mediaType = 'video';
                }
                
                return { 
                    type: 'navigation', 
                    mediaId: mediaId,
                    mediaType: mediaType
                };
            }

            // Helper function to switch media
            function switchMedia(targetMediaId) {
                console.log(`🔄 Switching to media: ${targetMediaId}`);

                // Add this line right after: console.log(`🔄 Switching to media: ${targetMediaId}`);
                if (window.logNavigationSwitch) window.logNavigationSwitch(targetMediaId);
                
                // Extract piece ID from media ID (e.g., "centerpiece_0_image_0" -> "centerpiece_0")
                const match = targetMediaId.match(/^(centerpiece|leftpiece|rightpiece)_\d+/);
                const pieceId = match ? match[0] : null;
                
                if (!pieceId) {
                    console.log('❌ Could not determine piece from media ID');
                    return;
                }
                
                console.log(`  Piece ID: ${pieceId}`);
                const piece = document.getElementById(pieceId);
                if (!piece) {
                    console.log(`❌ Piece ${pieceId} not found`);
                    return;
                }
                
                // Determine media type and index from the target media ID
                let mediaType = 'image';
                let mediaIndex = '0';
                
                if (targetMediaId.includes('_3d_')) {
                    mediaType = '3d';
                    const match = targetMediaId.match(/_3d_(\d+)$/);
                    mediaIndex = match ? match[1] : '0';
                } else if (targetMediaId.includes('_image_')) {
                    mediaType = 'image';
                    const match = targetMediaId.match(/_image_(\d+)$/);
                    mediaIndex = match ? match[1] : '0';
                } else if (targetMediaId.includes('_video_')) {
                    mediaType = 'video';
                    const match = targetMediaId.match(/_video_(\d+)$/);
                    mediaIndex = match ? match[1] : '0';
                }
                
                console.log(`  Media type: ${mediaType}, index: ${mediaIndex}`);
                
                // Hide all media in this piece - dynamic selector for any index
                const allMedia = piece.querySelectorAll(
                    '[id*="_3d_"], [id*="_image_"], [id*="_video_"]'
                );
                
                console.log(`  Found ${allMedia.length} media elements to hide`);
                allMedia.forEach(media => {
                    // Don't hide navigation thumbnails or control panels
                    if (!media.id.includes('_navigation') && 
                        !media.id.includes('_Controls') && 
                        !media.id.includes('_3dControls') && 
                        !media.id.includes('_VideoControls')) {
                        media.setAttribute('visible', 'false');
                        
                        // Pause videos if they're playing
                        if (media.tagName === 'A-VIDEO') {
                            media.components.material.material.map.image.pause();
                        }
                    }
                });
                
                // Hide ALL control panels AND their children in this piece
                // Dynamic selector for any control panel
                const allControlPlanes = piece.querySelectorAll(
                    '[id$="_3dControls"], [id$="_Controls"], [id$="_VideoControls"], ' +
                    '[id*="_3dControls_"], [id*="_Controls_"], [id*="_VideoControls_"]'
                );
                
                console.log(`  Found ${allControlPlanes.length} control planes to hide`);
                allControlPlanes.forEach(plane => {
                    // Hide the plane itself
                    plane.setAttribute('visible', 'false');
                    
                    // Also hide all children of this plane (the buttons)
                    plane.querySelectorAll('*').forEach(button => {
                        button.setAttribute('visible', 'false');
                    });
                });
                
                // Show the target media
                const targetMedia = document.getElementById(targetMediaId);
                if (targetMedia) {
                    targetMedia.setAttribute('visible', 'true');
                    console.log(`  ✅ SHOWING media: ${targetMediaId}`);
                } else {
                    console.log(`  ❌ Target media ${targetMediaId} not found`);
                }
                
                // Show the matching controls plane
                let controlsId;
                if (mediaType === 'image') {
                    controlsId = `${pieceId}_Controls_${mediaIndex}`;
                } else if (mediaType === '3d') {
                    controlsId = `${pieceId}_3dControls_${mediaIndex}`;
                } else if (mediaType === 'video') {
                    if (targetMedia) {
                        targetMedia.components.material.material.map.image.play();
                    }
                    controlsId = `${pieceId}_VideoControls_${mediaIndex}`;
                }
                
                console.log(`  Looking for controls: ${controlsId}`);
                const controls = piece.querySelector('#' + controlsId);
                if (controls) {
                    controls.setAttribute('visible', 'true');
                    console.log(`  ✅ SHOWING control plane: ${controlsId}`);
                    
                    // Make sure all control buttons are visible
                    controls.querySelectorAll('*').forEach(button => {
                        button.setAttribute('visible', 'true');
                    });
                } else {
                    console.log(`  ❌ Controls ${controlsId} not found`);
                }
                
                // Update visible media map
                visibleMediaMap.set(pieceId, targetMediaId);
                console.log(`  📍 Updated visible media map for ${pieceId}: ${targetMediaId}`);
            }

            // Add navigation-specific intersection listeners
            raycaster.addEventListener('raycaster-intersection', function(evt) {
                evt.detail.intersections.forEach(intersection => {
                    const el = intersection.object.el;
                    if (el && isNavigationThumbnail(el)) {
                        // Use setTimeout to ensure visibility updates have taken effect
                        setTimeout(() => {
                            if (isElementVisible(el)) {
                                const navInfo = getNavigationInfo(el);
                                switchMedia(navInfo.mediaId);
                            }
                        }, 50);
                    }
                });
            });

            raycaster.addEventListener('raycaster-intersection-cleared', function(evt) {
                evt.detail.elms?.forEach(el => {
                    if (el && isNavigationThumbnail(el)) {
                        // Use setTimeout to ensure visibility updates have taken effect
                        setTimeout(() => {
                            if (isElementVisible(el)) {
                                const navInfo = getNavigationInfo(el);
                                console.log(`👈 NAV LEAVE: ${navInfo.mediaType} ${navInfo.mediaId}`);
                            }
                        }, 50);
                    }
                });
            });

            console.log('🧭 Ready - navigation thumbnails will switch media on hover');
        });
    }
})();
// raycast-interaction.js
(function() {
    console.log('🔍 Raycast interaction initializing...');
    
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
            
            // Get the raycaster entity
            const raycaster = document.getElementById('raycaster');
            if (!raycaster) {
                console.error('❌ Raycaster not found');
                return;
            }

            console.log('🎯 Raycaster found, monitoring intersections (ignoring invisible elements)...');

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

            // Helper function to get button type and direction
            function getButtonInfo(button) {
                if (!button) return { type: 'unknown', direction: '' };
                
                const classes = button.className || '';
                const dataAction = button.getAttribute('data-action');
                const dataDirection = button.getAttribute('data-direction');
                let type = 'unknown';
                let direction = '';
                
                // Log for debugging
                if (classes.includes('marker-model-zoom-button')) {
                    console.log('🔍 Processing marker zoom button:', classes, 'data-action:', dataAction);
                }
                
                // Determine button type - check in order from most specific to least specific
                
                // Check for 3D reset buttons (marker and regular)
                if (classes.includes('3dreset') || classes.includes('marker-3dreset')) {
                    type = '3d-reset';
                }
                // Check for 3D zoom buttons (marker and regular)
                else if (classes.includes('model-zoom-button') || classes.includes('marker-model-zoom-button')) {
                    type = '3d-zoom';
                    // Check for zoom direction from data-action attribute
                    if (dataAction === '3dincrease' || dataAction === 'marker3dincrease') {
                        direction = 'in';
                    } else if (dataAction === '3ddecrease' || dataAction === 'marker3ddecrease') {
                        direction = 'out';
                    } else if (button.src?.includes('zoom-in')) {
                        direction = 'in';
                    } else if (button.src?.includes('zoom-out')) {
                        direction = 'out';
                    }
                }
                // Check for regular zoom buttons
                else if (classes.includes('zoom-button') || classes.includes('marker-zoom-button')) {
                    type = 'zoom';
                    // Check for zoom direction from data-action attribute
                    if (dataAction.toLowerCase().includes('increase')) {
                        direction = 'in';
                    } else if (dataAction.toLowerCase().includes('decrease')) {
                        direction = 'out';
                    } else if (button.src?.includes('zoom-in')) {
                        direction = 'in';
                    } else if (button.src?.includes('zoom-out')) {
                        direction = 'out';
                    }
                }
                // Check for reset buttons
                else if (classes.includes('reset')) {
                    type = 'reset';
                }
                // Check for scroller buttons (marker and regular)
                else if (classes.includes('scroller') || classes.includes('marker-scroller')) {
                    type = 'scroller';
                    // Extract direction from data-direction attribute or ID
                    direction = dataDirection || '';
                    if (!direction) {
                        const dirMatch = button.id?.match(/_(up|down|left|right)_/);
                        direction = dirMatch ? dirMatch[1] : '';
                    }
                }
                // Check for roller buttons (marker and regular)
                else if (classes.includes('roller') || classes.includes('marker-roller')) {
                    type = 'roller';
                    // Extract direction from data-direction attribute or ID
                    direction = dataDirection || '';
                    if (!direction) {
                        const dirMatch = button.id?.match(/_(up|down|left|right)_/);
                        direction = dirMatch ? dirMatch[1] : '';
                    }
                }
                // Check for video control buttons (marker and regular)
                else if (classes.includes('restart') || classes.includes('marker-restart')) {
                    type = 'restart';
                }
                else if (classes.includes('mute') || classes.includes('marker-mute')) {
                    type = 'mute';
                }
                else if (classes.includes('fast-forward') || classes.includes('marker-fast-forward')) {
                    type = 'fast-forward';
                }
                else if (classes.includes('play')) {  // <-- ADD THIS
                    type = 'play';
                }
                else if (classes.includes('fast-backward') || classes.includes('marker-fast-backward')) {
                    type = 'fast-backward';
                }
                
                return { type, direction };
            }

            // Helper function to find which media element this button controls
            function findTargetMedia(button) {
                if (!button) return 'unknown';
                
                // Get parent control plane
                const controlPlane = button.parentNode;
                if (!controlPlane) return 'unknown';
                
                // Get the container (centerpiece_X, leftpiece_X, rightpiece_X)
                const container = controlPlane.parentNode;
                if (!container) return 'unknown';
                
                const containerId = container.id || '';
                const buttonId = button.id || '';
                const buttonClasses = button.className || '';
                
                // Determine media type from button class or ID
                let mediaType = 'image';
                if (buttonClasses.includes('roller') || 
                    buttonClasses.includes('model-zoom-button') || 
                    buttonClasses.includes('3dreset') || 
                    buttonClasses.includes('marker-roller') ||
                    buttonClasses.includes('marker-model-zoom-button') || 
                    buttonClasses.includes('marker-3dreset') ||
                    buttonId.includes('_3d_')) {
                    mediaType = '3d';
                } else if (buttonClasses.includes('restart') || buttonClasses.includes('mute') ||
                            buttonClasses.includes('fast-backward') || buttonClasses.includes('fast-forward') ||
                            buttonClasses.includes('play') || buttonId.includes('_video_') ) {
                        mediaType = 'video';
                    }
                
                // Extract the media index from the button ID or control plane ID
                let mediaIndex = '0';
                
                // Try to get index from button ID first (e.g., centerpiece_0_3d_up_0 -> index 0)
                const buttonIndexMatch = buttonId.match(/_(\d+)$/);
                if (buttonIndexMatch) {
                    mediaIndex = buttonIndexMatch[1];
                } else {
                    // Fall back to control plane ID
                    const controlPlaneId = controlPlane.id || '';
                    const planeIndexMatch = controlPlaneId.match(/_(\d+)$/);
                    if (planeIndexMatch) {
                        mediaIndex = planeIndexMatch[1];
                    }
                }
                
                // Look for the media element in the container
                let mediaId = 'unknown';
                
                if (mediaType === 'image') {
                    // Try to find image with matching index
                    const image = container.querySelector(`[id$="_image_${mediaIndex}"]`);
                    mediaId = image ? image.id : `${containerId}_image_${mediaIndex}`;
                } else if (mediaType === '3d') {
                    // Try to find 3d model with matching index
                    const model = container.querySelector(`[id$="_3d_${mediaIndex}"]`);
                    mediaId = model ? model.id : `${containerId}_3d_${mediaIndex}`;
                } else if (mediaType === 'video') {
                    // Try to find video with matching index
                    const video = container.querySelector(`[id$="_video_${mediaIndex}"]`);
                    mediaId = video ? video.id : `${containerId}_video_${mediaIndex}`;
                }
                
                // Verify this media element is actually the one that should be controlled
                // by checking if the control plane is for this media type
                const controlPlaneId = controlPlane.id || '';
                const expectedPattern = mediaType === '3d' ? '3dControls' : 
                                       (mediaType === 'video' ? 'VideoControls' : 'Controls');
                
                if (!controlPlaneId.includes(expectedPattern)) {
                    // Try to determine correct type from control plane
                    if (controlPlaneId.includes('3dControls')) {
                        mediaType = '3d';
                    } else if (controlPlaneId.includes('VideoControls')) {
                        mediaType = 'video';
                    } else if (controlPlaneId.includes('Controls')) {
                        mediaType = 'image';
                    }
                    
                    // Re-find with corrected type
                    if (mediaType === 'image') {
                        const image = container.querySelector(`[id$="_image_${mediaIndex}"]`);
                        mediaId = image ? image.id : `${containerId}_image_${mediaIndex}`;
                    } else if (mediaType === '3d') {
                        const model = container.querySelector(`[id$="_3d_${mediaIndex}"]`);
                        mediaId = model ? model.id : `${containerId}_3d_${mediaIndex}`;
                    } else if (mediaType === 'video') {
                        const video = container.querySelector(`[id$="_video_${mediaIndex}"]`);
                        mediaId = video ? video.id : `${containerId}_video_${mediaIndex}`;
                    }
                }
                
                return mediaId;
            }

            function handleButton(el, info, target) {
                if (!isElementVisible(el)) return;

                // Log the button ID
                logButton(el.id || 'unknown');
                
                // Execute the action
                handleButtonAction(target, info.type, info.direction || null, el);
                
                // Handle visual feedback and raycast cooldown
                if (['zoom', '3d-zoom', 'reset', '3d-reset', 'scroller', 'roller'].includes(info.type)) {
                    el.removeAttribute('raycastable');
                    const delay = (info.type.includes("scroller") || info.type.includes("roller")) ? 100 : 200;
                    setTimeout(() => el.setAttribute('raycastable', ''), delay);
                }

                // Button press animation
                if (!el.id.includes("navigation") && !el.classList.contains('istriggered')) {
                    el.classList.add('istriggered');
                    const origWidth = el.getAttribute('width');
                    const origHeight = el.getAttribute('height');
                    el.setAttribute('width', 0.8);
                    el.setAttribute('height', 0.8);
                    
                    setTimeout(() => {
                        el.classList.remove('istriggered');
                        el.setAttribute('width', origWidth);
                        el.setAttribute('height', origHeight);
                    }, 500);
                }
            }
            

                raycaster.addEventListener('raycaster-intersection', function(evt) {
                    evt.detail.intersections.forEach(intersection => {
                        const el = intersection.object.el;
                        if (el) {
                                const buttonInfo = getButtonInfo(el);
                                if (buttonInfo) {
                                    handleButton(el, buttonInfo, findTargetMedia(el));
                                }
                        }
                    });
                });

            

            console.log('👆 Ready - raycast interaction initialized');
        });
    }
})();
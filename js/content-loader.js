// content-loader.js

const AppContent = {
    data: null,

    jsonFile: 'content.json',
    
    // Load JSON content
    async load(jsonUrl = null) {
        const url = jsonUrl || this.jsonFile;

        try {
            const response = await fetch(url);
            this.data = await response.json();
            console.log('Content loaded:', this.data);
            
            // Generate elements after content is loaded
            this.generateContentElements();
            console.log('Content generated:', this.data);
            
            return this.data;
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    },
    
    // Generate all content elements based on JSON
    generateContentElements() {
        if (!this.data || !this.data.pages) return;
        
        const scene = document.querySelector('a-scene');
        if (!scene) {
            console.error('Scene not found');
            return;
        }
        
        // Find the camera element (markers should be inside camera)
        const camera = document.querySelector('a-camera, [camera]');
        if (!camera) {
            console.error('Camera not found');
            return;
        }
        
        // Remove the original template elements
        const originalCenter = document.getElementById('centerpiece');
        const originalLeft = document.getElementById('leftpiece');
        const originalRight = document.getElementById('rightpiece');
        
        // Remove all existing marker elements (with ID starting with markerpiece_)
        const originalMarkers = document.querySelectorAll('a-marker[id^="markerpiece_"]');
        originalMarkers.forEach(marker => marker.remove());
        
        // Also remove the original template marker if it exists
        const originalTemplateMarker = document.getElementById('markerpiece');
        if (originalTemplateMarker) originalTemplateMarker.remove();
        
        if (originalCenter) originalCenter.remove();
        if (originalLeft) originalLeft.remove();
        if (originalRight) originalRight.remove();
        
        // Generate elements for each page
        this.data.pages.forEach((page, index) => {
            // Generate surround element if present
            if (page.surround) {
                this.createSurroundElements(page.surround, page.surround_rotation, index, scene);
            }

            if (page.narration) {
                this.createNarrationAudio(page.narration, index, scene);
            }

            // Generate centerpiece elements
            if (page.central_side && page.central_side.length > 0) {
                this.createSideElements('centerpiece', page.central_side, index, scene);
            }
            
            // Generate leftpiece elements
            if (page.left_side && page.left_side.length > 0) {
                this.createSideElements('leftpiece', page.left_side, index, scene);
            }
            
            // Generate rightpiece elements
            if (page.right_side && page.right_side.length > 0) {
                this.createSideElements('rightpiece', page.right_side, index, scene);
            }
            
            // Generate marker elements - ALWAYS create a marker, even if empty
            this.createMarkerElements(page.marker || [], page.barcode_number, camera);
        });
        
        console.log('Content elements generated');
    },

    createNarrationAudio(audioSrc, pageIndex, scene) {
        if (!audioSrc) return null;
        
        // Create audio entity
        const audio = document.createElement('a-entity');
        audio.id = `narration_${pageIndex}`;
        audio.setAttribute('sound', `src: ${audioSrc}; autoplay: false; volume: 1`);
        audio.setAttribute('visible', 'false'); // Hide the audio entity
        
        scene.appendChild(audio);
        console.log(`Created narration audio for page ${pageIndex}: ${audioSrc}`);
        
        return audio;
    },

    createSurroundElements(surroundSrc, surroundRotation, pageIndex, scene) {
        if (!surroundSrc) return null;
        
        // Determine if it's a video or image based on file extension
        const isVideo = surroundSrc.match(/\.(mp4|webm|ogg)$/i);
        let surroundElement;
        
        if (isVideo) {
            // Create videosphere
            surroundElement = document.createElement('a-videosphere');
            surroundElement.id = `surround_${pageIndex}`;
            surroundElement.setAttribute('src', surroundSrc);
            surroundElement.setAttribute('rotation', `0 ${surroundRotation || 0} 0`);  // ✅ This sets the Y rotation
            surroundElement.setAttribute('radius', '40');
            surroundElement.setAttribute('visible', 'false');
            
            // Pause video immediately
            surroundElement.addEventListener('loadedmetadata', () => {
                try {
                    surroundElement.components.material.material.map.image.pause();
                } catch(e) {
                    console.warn('Could not pause surround video:', e);
                }
            });
        } else {
            // Create sphere for 360 image
            surroundElement = document.createElement('a-sphere');
            surroundElement.id = `surround_${pageIndex}`;
            surroundElement.setAttribute('src', surroundSrc);
            surroundElement.setAttribute('rotation', `0 ${surroundRotation || 0} 0`);  // ✅ This sets the Y rotation
            surroundElement.setAttribute('radius', '40');
            surroundElement.setAttribute('material', 'shader: flat; side: back');
            surroundElement.setAttribute('visible', 'false');
        }
        
        scene.appendChild(surroundElement);
        console.log(`Created surround element for page ${pageIndex}: ${surroundSrc} with rotation: ${surroundRotation || 0}°`);
        
        return surroundElement;
    },
    
    // Create elements for centerpiece, leftpiece, rightpiece
    createSideElements(containerType, items, pageIndex, scene) {
        // Filter out invalid items first - only filter if we actually have items with type and src
        const validItems = items.filter(item => item && item.type && item.src);
        if (validItems.length === 0) return; // Skip if no valid items
        
        const containerId = `${containerType}_${pageIndex}`;
        
        // Get position based on container type
        let position = '0 0 -5';
        let rotation = '0 0 0';
        
        if (containerType === 'leftpiece') {
            position = '-5 0 -1';
            rotation = '0 90 0';
        } else if (containerType === 'rightpiece') {
            position = '5 0 -1';
            rotation = '0 -90 0';
        }
        
        // Create container entity
        const container = document.createElement('a-entity');
        container.id = containerId;
        container.setAttribute('position', position);
        container.setAttribute('rotation', rotation);
        container.setAttribute('visible', 'false'); // Container starts invisible
        
        // Track counters for each media type
        let imageCounter = 0;
        let videoCounter = 0;
        let modelCounter = 0;
        
        // Create media elements with proper sequential IDs
        validItems.forEach((item) => {
            let element;
            let mediaIndex;
            let controlId;
            
            switch(item.type) {
                case 'image':
                    mediaIndex = imageCounter;
                    imageCounter++;
                    
                    element = document.createElement('a-image');
                    element.id = `${containerId}_image_${mediaIndex}`;
                    element.setAttribute('src', item.src);
                    
                    // Load image to get natural dimensions for aspect ratio
                    const img = new Image();
                    img.onload = function() {
                        const aspect = img.naturalWidth / img.naturalHeight;
                        // Set width based on scale, height auto-calculated from aspect ratio
                        const baseWidth = item.scale ? parseFloat(item.scale) : 1;
                        element.setAttribute('width', baseWidth);
                        element.setAttribute('height', baseWidth / aspect);
                    };
                    img.src = item.src;
                    
                    element.setAttribute('render-order', '1');
                    
                    // Only the FIRST image (index 0) gets NO visible attribute
                    // All other images get visible="false"
                    if (mediaIndex > 0) {
                        element.setAttribute('visible', 'false');
                    }
                    // mediaIndex === 0 gets NO visible attribute
                    
                    // Create image controls if needed
                    if (item.controls === "true") {
                        controlId = `${containerId}_Controls_${mediaIndex}`;
                        const imageControls = this.createGeneralControls({
                            id: controlId,
                            containerId: containerId,
                            suffix: mediaIndex,
                            type: 'image',
                            isFirstOfType: (mediaIndex === 0), // Pass this flag
                            buttons: [
                                { src: 'reset.png', class: 'reset', position: '-1.4 0 0.2', action: 'reset', fuseTimeout: 1000 },
                                { src: 'up.png', class: 'scroller', position: '0 0.2 0.2', direction: 'up' },
                                { src: 'right.png', class: 'scroller', position: '0.4 0 0.2', direction: 'right' },
                                { src: 'down.png', class: 'scroller', position: '0 -0.2 0.2', direction: 'down' },
                                { src: 'left.png', class: 'scroller', position: '-0.4 0 0.2', direction: 'left' },
                                { src: 'zoom-in.png', class: 'zoom-button', position: '1.0 0 0.2', action: 'increase', fuseTimeout: 500 },
                                { src: 'zoom-out.png', class: 'zoom-button', position: '1.4 0 0.2', action: 'decrease', fuseTimeout: 500 }
                            ]
                        });
                        container.appendChild(imageControls);
                    }
                    break;
                    
                case 'video':
                    mediaIndex = videoCounter;
                    videoCounter++;
                    
                    element = document.createElement('a-video');
                    element.id = `${containerId}_video_${mediaIndex}`;
                    element.setAttribute('src', item.src);
                    
                    // Set video dimensions assuming 16:9 aspect ratio
                    const baseWidth = item.scale ? parseFloat(item.scale) : 2;
                    element.setAttribute('width', baseWidth);
                    element.setAttribute('height', baseWidth * 9/16); // 16:9 aspect ratio
                    
                    element.setAttribute('render-order', '1');

                    element.setAttribute('auto-play', item.autoplay)
                    setTimeout(() => {
                        element.components.material.material.map.image.pause();
                    }, 6000);
                    setTimeout(() => {
                        element.components.material.material.map.image.pause();
                    }, 8000);
                    setTimeout(() => {
                        element.components.material.material.map.image.pause();
                    }, 10000);
                    
                    element.setAttribute('visible', 'false');

                    // PAUSE VIDEO IMMEDIATELY
                    element.addEventListener('loadedmetadata', () => {
                        element.components.material.material.map.image.pause();
                    });

                    // Create video controls if needed
                    if (item.controls === "true") {
                        controlId = `${containerId}_VideoControls_${mediaIndex}`;
                        const videoControls = this.createGeneralControls({
                            id: controlId,
                            containerId: containerId,
                            suffix: mediaIndex,
                            type: 'video',
                            isFirstOfType: false, // All video controls get visible="false"
                            buttons: [
                                { src: 'reset.png', class: 'restart', position: '-1.4 0 0.2', action: 'restart', fuseTimeout: 1000 },
                                { src: 'mute.png', class: 'mute', position: '-0.4 0 0.2', action: 'mute', fuseTimeout: 1000 },
                                { src: item.autoplay === 'true' ? 'pause.png' : 'play.png', class: 'play', position: '0.2 0 0.2', action: 'play', fuseTimeout: 100 },
                                { src: 'fastbackward.png', class: 'fast-backward', position: '1.0 0 0.2', action: 'backward', fuseTimeout: 500 },
                                { src: 'fastforward.png', class: 'fast-forward', position: '1.4 0 0.2', action: 'forward', fuseTimeout: 500 }
                            ]
                        });
                        container.appendChild(videoControls);
                    }
                    break;
                    
                case '3d':
                    mediaIndex = modelCounter;
                    modelCounter++;
                    
                    element = document.createElement('a-entity');
                    element.id = `${containerId}_3d_${mediaIndex}`;
                    element.setAttribute('gltf-model', item.src);

                    // Add animation-mixer
                    element.setAttribute('animation-mixer', 'clip: *; loop: repeat;');
                    
                    // Get rotation directly from file - MUST be object with x,y,z
                    const rotX = item.rotation.x || 0;
                    const rotY = item.rotation.y || 0;
                    const rotZ = item.rotation.z || 0;
                    
                    // Store original rotation values
                    element.setAttribute('data-original-rotation-x', rotX);
                    element.setAttribute('data-original-rotation-y', rotY);
                    element.setAttribute('data-original-rotation-z', rotZ);
                    element.setAttribute('data-original-scale', item.scale || 1);
                    
                    // Apply scale
                    const scale = item.scale || 1;
                    element.setAttribute('scale', `${scale} ${scale} ${scale}`);
                    
                    // Apply rotation with all three axes
                    element.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`);

                    // Auto-rotate around Y axis
                    if (item.auto_rotate === true || item.auto_rotate === "true") {
                        element.setAttribute('animation', `property: rotation; to: ${rotX} ${rotY + 360} ${rotZ}; loop: true; dur: 10000; easing: linear`);
                    }
                    
                    element.setAttribute('render-order', '1');
                    element.setAttribute('visible', 'false');
                    
                    // Create 3D controls if needed
                    if (item.controls === "true") {
                        controlId = `${containerId}_3dControls_${mediaIndex}`;
                        const modelControls = this.createGeneralControls({
                            id: controlId,
                            containerId: containerId,
                            suffix: mediaIndex,
                            type: '3d',
                            isFirstOfType: false, // All 3D controls get visible="false"
                            buttons: [
                                { src: 'reset.png', class: '3dreset', position: '-1.4 0 0.2', action: '3dreset', fuseTimeout: 1000 },
                                { src: 'up.png', class: 'roller', position: '0 0.2 0.2', direction: 'up' },
                                { src: 'right.png', class: 'roller', position: '0.4 0 0.2', direction: 'right' },
                                { src: 'down.png', class: 'roller', position: '0 -0.2 0.2', direction: 'down' },
                                { src: 'left.png', class: 'roller', position: '-0.4 0 0.2', direction: 'left' },
                                { src: 'zoom-in.png', class: 'model-zoom-button', position: '1.0 0 0.2', action: '3dincrease', fuseTimeout: 500 },
                                { src: 'zoom-out.png', class: 'model-zoom-button', position: '1.4 0 0.2', action: '3ddecrease', fuseTimeout: 500 }
                            ]
                        });
                        container.appendChild(modelControls);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown type: ${item.type}`);
                    return;
            }
            
            if (element) {
                container.appendChild(element);
            }
        });
        
        // Only add container if it has children
        if (container.children.length > 0) {
            scene.appendChild(container);
        }
    },
    
    // Create marker elements - ALWAYS creates a marker, even if empty
    createMarkerElements(items, barcodeNumber, camera) {
        // Create the main marker element (always create it)
        const marker = document.createElement('a-marker');
        marker.id = `markerpiece_${barcodeNumber}`;
        marker.setAttribute('type', 'barcode');
        marker.setAttribute('value', barcodeNumber.toString());
        marker.setAttribute('emitevents', 'true');
        marker.setAttribute('material', '');
        
        // Create the main content container
        const markerContent = document.createElement('a-entity');
        markerContent.id = `markerContent_${barcodeNumber}`;
        markerContent.setAttribute('position', '0 0 0');
        markerContent.setAttribute('rotation', '0 0 0');
        
        // Filter valid items
        const validItems = items.filter(item => item && item.type && item.src);
        
        if (validItems.length > 0) {
            // Track counters for each media type
            let imageCounter = 0;
            let videoCounter = 0;
            let modelCounter = 0;
            
            // Create marker media elements with proper sequential IDs
            validItems.forEach((item) => {
                let element;
                let mediaIndex;
                let controlId;
                
                switch(item.type) {
                    case 'image':
                        mediaIndex = imageCounter++;
                        element = document.createElement('a-image');
                        element.id = `marker_${barcodeNumber}_image_${mediaIndex}`;
                        element.setAttribute('src', item.src);
                        
                        // Load image to get natural dimensions for aspect ratio
                        const img = new Image();
                        img.onload = function() {
                            const aspect = img.naturalWidth / img.naturalHeight;
                            // Set width based on scale, height auto-calculated from aspect ratio
                            const baseWidth = item.scale ? parseFloat(item.scale) : 1;
                            element.setAttribute('width', baseWidth);
                            element.setAttribute('height', baseWidth / aspect);
                            element.setAttribute('rotation', "-90 0 0");
                        };
                        img.src = item.src;
                        
                        element.setAttribute('render-order', '1');
                        element.setAttribute('visible', 'false');
                        
                        // Create image controls if needed
                        if (item.controls === "true") {
                            controlId = `markerControls_${mediaIndex}`;
                            const imageControls = this.createGeneralControls({
                                id: controlId,
                                prefix: 'marker',
                                containerId: `marker_${barcodeNumber}`,
                                suffix: mediaIndex,
                                type: 'marker-image',
                                buttons: [
                                    { src: 'reset.png', class: 'marker-reset', position: '-1.4 0 0.2', action: 'markerReset', fuseTimeout: 1000 },
                                    { src: 'up.png', class: 'marker-scroller', position: '0 0.2 0.2', direction: 'up' },
                                    { src: 'right.png', class: 'marker-scroller', position: '0.4 0 0.2', direction: 'right' },
                                    { src: 'down.png', class: 'marker-scroller', position: '0 -0.2 0.2', direction: 'down' },
                                    { src: 'left.png', class: 'marker-scroller', position: '-0.4 0 0.2', direction: 'left' },
                                    { src: 'zoom-in.png', class: 'marker-zoom-button', position: '1.0 0 0.2', action: 'markerIncrease', fuseTimeout: 500 },
                                    { src: 'zoom-out.png', class: 'marker-zoom-button', position: '1.4 0 0.2', action: 'markerDecrease', fuseTimeout: 500 }
                                ]
                            });
                            markerContent.appendChild(imageControls);
                        }
                        break;
                        
                    case 'video':
                        mediaIndex = videoCounter++;
                        element = document.createElement('a-video');
                        element.id = `marker_${barcodeNumber}_video_${mediaIndex}`;
                        element.setAttribute('src', item.src);
                        
                        // Set video dimensions assuming 16:9 aspect ratio
                        const baseWidth = item.scale ? parseFloat(item.scale) : 2;
                        element.setAttribute('width', baseWidth);
                        element.setAttribute('height', baseWidth * 9/16); // 16:9 aspect ratio

                        element.setAttribute('render-order', '1');
                        element.setAttribute('auto-play', item.autoplay)
                        setTimeout(() => {
                            element.components.material.material.map.image.pause();
                        }, 6000);
                        setTimeout(() => {
                            element.components.material.material.map.image.pause();
                        }, 8000);
                        setTimeout(() => {
                            element.components.material.material.map.image.pause();
                        }, 10000);
                    
                        element.setAttribute('visible', 'false');
                        

                        element.autoplay = false;

                        element.setAttribute('render-order', '1');
                        element.setAttribute('visible', 'false');
                        
                        // Create video controls if needed
                        if (item.controls === "true") {
                            controlId = `markerVideoControls_${mediaIndex}`;
                            const videoControls = this.createGeneralControls({
                                id: controlId,
                                prefix: 'marker',
                                containerId: `marker_${barcodeNumber}`,
                                suffix: mediaIndex,
                                type: 'marker-video',
                                buttons: [
                                    { src: 'reset.png', class: 'marker-restart', position: '-1.4 0 0.2', action: 'markerRestart', fuseTimeout: 1000 },
                                    { src: 'mute.png', class: 'marker-mute', position: '-0.4 0 0.2', action: 'markerMute', fuseTimeout: 1000 },
                                    { src: item.autoplay === 'true' ? 'pause.png' : 'play.png', class: 'play', position: '0.2 0 0.2', action: 'play', fuseTimeout: 100 },
                                    { src: 'fastbackward.png', class: 'marker-fast-backward', position: '1.0 0 0.2', action: 'markerBackward', fuseTimeout: 500 },
                                    { src: 'fastforward.png', class: 'marker-fast-forward', position: '1.4 0 0.2', action: 'markerForward', fuseTimeout: 500 }
                                ]
                            });
                            markerContent.appendChild(videoControls);
                        }
                        break;
                        
                    case '3d':
                        mediaIndex = modelCounter++;
                        element = document.createElement('a-entity');
                        element.id = `marker_${barcodeNumber}_3d_${mediaIndex}`;
                        element.setAttribute('gltf-model', item.src);
                        
                        // Add animation-mixer
                        element.setAttribute('animation-mixer', 'clip: *; loop: repeat;');
                        
                        // Handle rotation - support both old and new formats
                        let rotX = 0, rotY = 0, rotZ = 0;
                        if (item.rotation) {
                            if (typeof item.rotation === 'object') {
                                rotX = item.rotation.x || 0;
                                rotY = item.rotation.y || 0;
                                rotZ = item.rotation.z || 0;
                            } else {
                                rotY = parseFloat(item.rotation) || 0; // Old format
                            }
                        }
                        
                        // Store original rotation values
                        element.setAttribute('data-original-rotation-x', rotX);
                        element.setAttribute('data-original-rotation-y', rotY);
                        element.setAttribute('data-original-rotation-z', rotZ);
                        element.setAttribute('data-original-scale', item.scale || 1);
                        
                        // Apply scale
                        const scale = item.scale || 1;
                        element.setAttribute('scale', `${scale} ${scale} ${scale}`);
                        
                        // Apply rotation with all three axes (plus marker's base rotation)
                        element.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`);

                        // Auto-rotate around Y axis
                        if (item.auto_rotate === true || item.auto_rotate === "true") {
                            element.setAttribute('animation', `property: rotation; to: ${rotX} ${rotY + 360} ${rotZ}; loop: true; dur: 10000; easing: linear`);
                        }
                        
                        element.setAttribute('render-order', '1');
                        element.setAttribute('visible', 'false');
                        
                        // Create 3D controls if needed
                        if (item.controls === "true") {
                            controlId = `marker3dControls_${mediaIndex}`;
                            const modelControls = this.createGeneralControls({
                                id: controlId,
                                prefix: 'marker',
                                containerId: `marker_${barcodeNumber}`,
                                suffix: mediaIndex,
                                type: 'marker-3d',
                                buttons: [
                                    { src: 'reset.png', class: 'marker-3dreset', position: '-1.4 0 0.2', action: 'marker3dreset', fuseTimeout: 1000 },
                                    { src: 'up.png', class: 'marker-roller', position: '0 0.2 0.2', direction: 'up' },
                                    { src: 'right.png', class: 'marker-roller', position: '0.4 0 0.2', direction: 'right' },
                                    { src: 'down.png', class: 'marker-roller', position: '0 -0.2 0.2', direction: 'down' },
                                    { src: 'left.png', class: 'marker-roller', position: '-0.4 0 0.2', direction: 'left' },
                                    { src: 'zoom-in.png', class: 'marker-model-zoom-button', position: '1.0 0 0.2', action: 'marker3dincrease', fuseTimeout: 500 },
                                    { src: 'zoom-out.png', class: 'marker-model-zoom-button', position: '1.4 0 0.2', action: 'marker3ddecrease', fuseTimeout: 500 }
                                ]
                            });
                            markerContent.appendChild(modelControls);
                        }
                        break;
                        
                    default:
                        console.warn(`Unknown marker type: ${item.type}`);
                        return;
                }
                
                if (element) {
                    markerContent.appendChild(element);
                }
            });
        }
        
        // Always add marker content to marker
        marker.appendChild(markerContent);
        
        // Always add marker to camera (even if empty)
        camera.appendChild(marker);
        console.log(`Created marker for barcode ${barcodeNumber}${validItems.length === 0 ? ' (empty)' : ''}`);
    },
    
    // GENERAL FUNCTION to create controls - replaces all the duplicate create*Controls functions
    createGeneralControls(config) {
        const { id, containerId, suffix, type, isFirstOfType, buttons } = config;
        
        const controlsPlane = document.createElement('a-plane');
        controlsPlane.id = id;
        controlsPlane.setAttribute('opacity', '0');

        if(containerId.includes("marker")){
            controlsPlane.setAttribute('position', '0 0.1 1');
            controlsPlane.setAttribute('rotation', '-90 0 0');
        }else{
            controlsPlane.setAttribute('position', '0 -1.8 0.1');
            controlsPlane.setAttribute('rotation', '0 0 0');
        }
        controlsPlane.setAttribute('width', '3.6'); // Doubled from 1.8
        controlsPlane.setAttribute('height', '0.8'); // Doubled from 0.4
        controlsPlane.setAttribute('material', 'depthTest: false;');
        controlsPlane.setAttribute('render-order', '2');
        
        // Only the FIRST image controls (index 0) get NO visible attribute
        // All other controls get visible="false"
        if (!isFirstOfType) {
            controlsPlane.setAttribute('visible', 'false');
        }
        // isFirstOfType === true gets NO visible attribute
        
        // Create all buttons from the configuration array
        buttons.forEach(buttonConfig => {
            const button = document.createElement('a-image');
            button.setAttribute('src', `assets/icons/${buttonConfig.src}`);
            
            // Set class if provided
            if (buttonConfig.class) {
                button.setAttribute('class', buttonConfig.class);
            }
            
            // Set ID if direction is provided
            if (buttonConfig.direction) {
                button.setAttribute('id', `${containerId}_${type}_${buttonConfig.direction}_${suffix}`);
            }else if (buttonConfig.action) {
                button.setAttribute('id', `${containerId}_${type}_${buttonConfig.action}_${suffix}`);
            }
            
            button.setAttribute('position', buttonConfig.position);
            button.setAttribute('scale', '0.36 0.36 0.36'); // Doubled from 0.18
            button.setAttribute('render-order', '3'); 
            
            // Set data attributes
            if (buttonConfig.direction) {
                button.setAttribute('data-direction', buttonConfig.direction);
            }
            
            if (buttonConfig.action) {
                button.setAttribute('data-action', buttonConfig.action);
            }
            
            // Set gaze-interaction-handler
            let gazeHandler = '';
            if (buttonConfig.action) {
                gazeHandler = `action: ${buttonConfig.action}`;
                if (buttonConfig.fuseTimeout) {
                    gazeHandler += `; fuseTimeout: ${buttonConfig.fuseTimeout}`;
                }
            }
            button.setAttribute('gaze-interaction-handler', gazeHandler);
            button.setAttribute('raycastable', '');
            
            controlsPlane.appendChild(button);
        });
        
        return controlsPlane;
    },
    
    // Get page by barcode
    getPage(barcode) {
        return this.data?.pages?.find(p => p.barcode_number === parseInt(barcode)) || null;
    },
    
    // Get content for specific position
    getContent(barcode, position = 'center') {
        const page = this.getPage(barcode);
        if (!page) return [];
        
        const content = page[position === 'marker' ? 'marker' : position + '_side'] || [];
        return content.filter(item => item && item.type);
    },
    
    // Quick check if marker navigation enabled
    hasMarkerNav(barcode) {
        const page = this.getPage(barcode);
        return page?.marker_navigation === true || 
               page?.marker_navigation === "true";
    }
};

// Auto-load content when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    AppContent.load();  
});

// Export (works in both browser and Node)
if (typeof module !== 'undefined') module.exports = AppContent;
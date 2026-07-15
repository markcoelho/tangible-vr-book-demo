// navigation-creator.js
(function() {
    // Wait for everything to be fully loaded
    window.addEventListener('load', function() {
        console.log('=== NAVIGATION CREATOR STARTED ===');
        console.log('Page fully loaded, waiting for A-Frame...');
        
        // Give A-Frame a moment to initialize and render
        setTimeout(function() {
            console.log('Creating navigation panels...');
            createNavigationPanels();
        }, 2000);
    });

    function createNavigationPanels() {
        console.log('=== SCANNING FOR PIECES ===');
        
        // Find all piece entities (excluding marker pieces)
        const centerPieces = document.querySelectorAll('[id^="centerpiece_"]');
        const leftPieces = document.querySelectorAll('[id^="leftpiece_"]');
        const rightPieces = document.querySelectorAll('[id^="rightpiece_"]');
        // Skip marker pieces entirely
        
        console.log(`Found pieces - Center: ${centerPieces.length}, Left: ${leftPieces.length}, Right: ${rightPieces.length}`);
        
        // Process only regular pieces
        centerPieces.forEach(piece => processPiece(piece));
        leftPieces.forEach(piece => processPiece(piece));
        rightPieces.forEach(piece => processPiece(piece));
        
        console.log('=== NAVIGATION CREATION COMPLETE ===');
    }

    function processPiece(piece) {
        if (!piece || !piece.id) return;
        
        // IMPORTANT: Skip if this is a control panel or navigation panel
        if (piece.id.includes('Controls') || piece.id.includes('navigation')) {
            return;
        }
        
        const pieceId = piece.id;
        console.log(`\n--- Processing piece: ${pieceId} ---`);
        
        // Log all children of this piece
        console.log(`Children of ${pieceId}:`);
        for (let i = 0; i < piece.children.length; i++) {
            const child = piece.children[i];
            console.log(`  [${i}] ${child.tagName} id="${child.id}" class="${child.className}"`);
        }
        
        // Find all media elements within this piece in DOM order
        const mediaElements = findMediaElements(piece);
        
        if (mediaElements.length === 0) {
            console.log(`⚠ No media elements found for ${pieceId}`);
            return;
        }
        
        console.log(`✅ Found ${mediaElements.length} media elements for ${pieceId} in DOM order:`, mediaElements);
        
        // ONLY CREATE NAVIGATION IF THERE ARE 2 OR MORE MEDIA ELEMENTS
        if (mediaElements.length < 2) {
            console.log(`⏭ Skipping navigation for ${pieceId} - only ${mediaElements.length} media element (navigation only needed for 2+)`);
            return;
        }
        
        // Check if navigation panel already exists
        if (piece.querySelector(`#${pieceId}_navigation`)) {
            console.log(`⏭ Navigation panel already exists for ${pieceId}`);
            return;
        }
        
        // Create and add navigation panel using elements in DOM order
        const navigationPanel = createNavigationPanel(pieceId, mediaElements);
        piece.appendChild(navigationPanel);
        console.log(`✅ Added navigation panel to ${pieceId} with ${mediaElements.length} thumbnails in DOM order:`, mediaElements);
    }

    function findMediaElements(piece) {
        const mediaElements = [];
        const pieceId = piece.id;
        
        console.log(`Searching for media in ${pieceId} in DOM order...`);
        
        // For regular pieces, use the piece directly as container
        let container = piece;
        
        // Get all children of the container in DOM order
        const children = container.children;
        
        // Loop through children in DOM order
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // Check if it's a 3D model entity
            if (child.tagName === 'A-ENTITY' && child.id && child.id.includes('_3d_')) {
                // Only include if it's the actual 3D model (not control buttons)
                if (!child.id.includes('_up_') && 
                    !child.id.includes('_down_') && 
                    !child.id.includes('_left_') && 
                    !child.id.includes('_right_') &&
                    !child.id.includes('Controls')) {
                    console.log(`    ✅ Found 3D model at position ${i}: ${child.id}`);
                    mediaElements.push(child.id);
                }
            }
            
            // Check if it's an image element
            else if (child.tagName === 'A-IMAGE') {
                const classList = child.className || '';
                const src = child.getAttribute('src') || '';
                const id = child.id || '';
                
                console.log(`    Checking image at position ${i}: id="${id}" class="${classList}"`);
                
                // Skip if it's a control button
                if (classList.includes('scroller') || 
                    classList.includes('roller') || 
                    classList.includes('reset') || 
                    classList.includes('zoom-button') ||
                    classList.includes('3dreset') ||
                    src.includes('icons/') ||
                    id.includes('_up_') || 
                    id.includes('_down_') || 
                    id.includes('_left_') || 
                    id.includes('_right_')) {
                    console.log(`      ❌ Skipped - is control button`);
                    continue;
                }
                
                // Only include if it's a media image
                if (id && id.includes('_image_')) {
                    console.log(`      ✅ Found image at position ${i}: ${id}`);
                    mediaElements.push(id);
                }
            }
            
            // Check if it's a video element
            else if (child.tagName === 'A-VIDEO') {
                if (child.id && 
                    !child.id.includes('_up_') && 
                    !child.id.includes('_down_') && 
                    !child.id.includes('_left_') && 
                    !child.id.includes('_right_')) {
                    console.log(`    ✅ Found video at position ${i}: ${child.id}`);
                    mediaElements.push(child.id);
                }
            }
        }
        
        console.log(`  Found ${mediaElements.length} media elements in DOM order:`, mediaElements);
        return mediaElements;
    }

    function createNavigationPanel(pieceId, mediaElements) {
        console.log(`Creating navigation panel for ${pieceId} with ${mediaElements.length} thumbnails`);
        
        // Create navigation panel container
        const navPanel = document.createElement('a-entity');
        navPanel.id = `${pieceId}_navigation`;
        navPanel.setAttribute('position', '0 3 0.1');
        navPanel.setAttribute('visible', 'true');
        
        // Calculate positions
        const thumbnailCount = mediaElements.length;
        const panelWidth = thumbnailCount * 1.4;
        const startX = -(panelWidth / 2) + 0.7;
        
        console.log(`  Panel width: ${panelWidth}, startX: ${startX}`);
        
        // Create thumbnails for each media element with borders
        mediaElements.forEach((mediaId, index) => {
            const xPos = startX + (index * 1.4);
            console.log(`  Creating thumbnail ${index + 1}/${thumbnailCount}: ${mediaId}_navigation at x=${xPos}`);
            
            // Create container for thumbnail + border
            const container = document.createElement('a-entity');
            container.id = `${mediaId}_navigation_container`;
            container.setAttribute('position', `${xPos} 0 0`);
            
            // Default thumbnail size
            let width = 1.2;
            let height = 1.2;
            
            // Determine the correct thumbnail source based on media type
            let thumbnailSrc = 'assets/images/0.jpg'; // Default fallback
            
            // Create border (will be resized if needed)
            const border = document.createElement('a-plane');
            border.setAttribute('color', 'black');
            border.setAttribute('width', width + 0.08);
            border.setAttribute('height', height + 0.08);
            border.setAttribute('position', '0 0 -0.05');
            border.setAttribute('material', 'side: double; opacity: 1');
            
            // Thumbnail image
            const thumbnail = document.createElement('a-image');
            thumbnail.id = `${mediaId}_navigation`;
            
            if (mediaId.includes('_image_')) {
                // For images, try to get the original image source and maintain aspect ratio
                const originalImage = document.getElementById(mediaId);
                if (originalImage) {
                    const src = originalImage.getAttribute('src');
                    if (src) {
                        thumbnailSrc = src;
                        
                        // Create a new Image object to get natural dimensions
                        const img = new Image();
                        img.onload = function() {
                            // Calculate aspect ratio and adjust dimensions
                            const aspectRatio = img.naturalWidth / img.naturalHeight;
                            
                            if (aspectRatio >= 1) {
                                // Landscape or square image
                                width = 1.2;
                                height = 1.2 / aspectRatio;
                            } else {
                                // Portrait image
                                height = 1.2;
                                width = 1.2 * aspectRatio;
                            }
                            
                            // Update the thumbnail dimensions
                            thumbnail.setAttribute('width', width);
                            thumbnail.setAttribute('height', height);
                            
                            // Update border size to match new dimensions
                            border.setAttribute('width', width + 0.08);
                            border.setAttribute('height', height + 0.08);
                            
                            console.log(`    📷 Image thumbnail: using original source ${src} with aspect ratio ${aspectRatio.toFixed(2)} (${width.toFixed(3)} x ${height.toFixed(3)})`);
                        };
                        img.src = src;
                        
                        // If image is already cached, onload might not fire, so check complete property
                        if (img.complete) {
                            img.onload();
                        }
                    } else {
                        console.log(`    ⚠ Image ${mediaId} has no src attribute, using default`);
                    }
                } else {
                    console.log(`    ⚠ Could not find original image element ${mediaId}, using default`);
                }
            } else if (mediaId.includes('_3d_')) {
                // For 3D models, use model thumbnail icon
                thumbnailSrc = 'assets/icons/model-thumbnail.png';
                console.log(`    🧊 3D model thumbnail: using model icon`);
            } else if (mediaId.includes('_video_')) {
                // For videos, use video thumbnail icon
                thumbnailSrc = 'assets/icons/video-thumbnail.png';
                console.log(`    🎥 Video thumbnail: using video icon`);
            } else {
                // Default fallback for unknown types
                console.log(`    ❓ Unknown media type for ${mediaId}, using default thumbnail`);
            }
            
            thumbnail.setAttribute('src', thumbnailSrc);
            thumbnail.setAttribute('width', width);
            thumbnail.setAttribute('height', height);
            thumbnail.setAttribute('raycastable', '');
            thumbnail.setAttribute('visible', 'true');
            
            // Add border and thumbnail to container
            container.appendChild(border);
            container.appendChild(thumbnail);
            
            // Add container to navigation panel
            navPanel.appendChild(container);
        });
        
        return navPanel;
    }
})();
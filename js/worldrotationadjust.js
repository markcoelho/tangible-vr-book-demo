// Global function to position and rotate pieces around camera with animation
function worldrotationadjust(markerElement) {
    console.log("adjusting");
    
    // Get the camera
    const camera = document.querySelector('a-camera');
    if (!camera || !markerElement) return;
    
    // Get marker value number
    const markerValue = markerElement.getAttribute('value');
    
    // Get world positions
    const markerPos = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();
    
    markerElement.object3D.getWorldPosition(markerPos);
    camera.object3D.getWorldPosition(cameraPos);
    
    const markerXZ = new THREE.Vector3(markerPos.x, 0, markerPos.z);
    const cameraXZ = new THREE.Vector3(cameraPos.x, 0, cameraPos.z);
    
    // Calculate direction and position
    const direction = new THREE.Vector3().subVectors(markerXZ, cameraXZ).normalize();
    const centerPos = new THREE.Vector3().copy(markerXZ).add(direction.multiplyScalar(5));
    
    const lookDir = new THREE.Vector3().subVectors(cameraXZ, centerPos).normalize();
    const targetYRot = THREE.Math.radToDeg(Math.atan2(lookDir.x, lookDir.z));
    
    console.log(`🎯 Animating pieces for marker ${markerValue} to rotation: ${targetYRot}°`);
    
    // Get the pieces for this marker
    const centerpiece = document.getElementById(`centerpiece_${markerValue}`);
    const leftpiece = document.getElementById(`leftpiece_${markerValue}`);
    const rightpiece = document.getElementById(`rightpiece_${markerValue}`);
    
    // Calculate target positions
    let centerTarget, leftTarget, rightTarget;
    
    if (centerpiece) {
        const currentPos = centerpiece.getAttribute('position');
        centerTarget = {
            position: { x: centerPos.x, y: currentPos.y, z: centerPos.z },
            rotation: { x: 0, y: targetYRot, z: 0 }
        };
    }
    
    if (leftpiece) {
        const currentPos = leftpiece.getAttribute('position');
        const perpX = direction.z;
        const perpZ = -direction.x;
        const leftOffset = 1;
        const cameraOffset = 1.3;
        
        leftTarget = {
            position: {
                x: centerPos.x + (perpX * leftOffset) + (-direction.x * cameraOffset),
                y: currentPos.y,
                z: centerPos.z + (perpZ * leftOffset) + (-direction.z * cameraOffset)
            },
            rotation: { x: 0, y: targetYRot + 90, z: 0 }
        };
    }
    
    if (rightpiece) {
        const currentPos = rightpiece.getAttribute('position');
        const perpX = -direction.z;
        const perpZ = direction.x;
        const rightOffset = 1;
        const cameraOffset = 1.3;
        
        rightTarget = {
            position: {
                x: centerPos.x + (perpX * rightOffset) + (-direction.x * cameraOffset),
                y: currentPos.y,
                z: centerPos.z + (perpZ * rightOffset) + (-direction.z * cameraOffset)
            },
            rotation: { x: 0, y: targetYRot - 90, z: 0 }
        };
    }
    
    // Simple animation
    const duration = 500;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Animate centerpiece
        if (centerpiece && centerTarget) {
            const currentPos = centerpiece.getAttribute('position');
            const currentRot = centerpiece.getAttribute('rotation');
            
            centerpiece.setAttribute('position', {
                x: currentPos.x + (centerTarget.position.x - currentPos.x) * ease,
                y: currentPos.y + (centerTarget.position.y - currentPos.y) * ease,
                z: currentPos.z + (centerTarget.position.z - currentPos.z) * ease
            });
            centerpiece.setAttribute('rotation', {
                x: currentRot.x + (centerTarget.rotation.x - currentRot.x) * ease,
                y: currentRot.y + (centerTarget.rotation.y - currentRot.y) * ease,
                z: currentRot.z + (centerTarget.rotation.z - currentRot.z) * ease
            });
        }
        
        // Animate leftpiece
        if (leftpiece && leftTarget) {
            const currentPos = leftpiece.getAttribute('position');
            const currentRot = leftpiece.getAttribute('rotation');
            
            leftpiece.setAttribute('position', {
                x: currentPos.x + (leftTarget.position.x - currentPos.x) * ease,
                y: currentPos.y + (leftTarget.position.y - currentPos.y) * ease,
                z: currentPos.z + (leftTarget.position.z - currentPos.z) * ease
            });
            leftpiece.setAttribute('rotation', {
                x: currentRot.x + (leftTarget.rotation.x - currentRot.x) * ease,
                y: currentRot.y + (leftTarget.rotation.y - currentRot.y) * ease,
                z: currentRot.z + (leftTarget.rotation.z - currentRot.z) * ease
            });
        }
        
        // Animate rightpiece
        if (rightpiece && rightTarget) {
            const currentPos = rightpiece.getAttribute('position');
            const currentRot = rightpiece.getAttribute('rotation');
            
            rightpiece.setAttribute('position', {
                x: currentPos.x + (rightTarget.position.x - currentPos.x) * ease,
                y: currentPos.y + (rightTarget.position.y - currentPos.y) * ease,
                z: currentPos.z + (rightTarget.position.z - currentPos.z) * ease
            });
            rightpiece.setAttribute('rotation', {
                x: currentRot.x + (rightTarget.rotation.x - currentRot.x) * ease,
                y: currentRot.y + (rightTarget.rotation.y - currentRot.y) * ease,
                z: currentRot.z + (rightTarget.rotation.z - currentRot.z) * ease
            });
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            console.log('✅ Animation complete');
        }
    }
    
    animate();
    
    return targetYRot;
}

// Your existing getWorldPosition function
function getWorldPosition(entity) {
    const position = new THREE.Vector3();
    entity.object3D.getWorldPosition(position);
    return position;
}
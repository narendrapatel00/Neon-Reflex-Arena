/**
 * Neon Reflex Arena - Three.js 3D Game Engine
 * Manages the 3D WebGL viewport, orbs rendering, particle explosions,
 * mouse parallax, and collision detection via raycasting.
 */

class ThreeGameEngine {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Core game state linked to UI controller
    this.uiController = null;
    this.isPlaying = false;
    
    // 3D Objects lists
    this.orbs = [];
    this.explosions = [];
    this.bgElements = [];
    this.starfield = null;
    
    // Mouse tracking for parallax and raycasting
    this.mouse = new THREE.Vector2();
    this.targetCameraPos = new THREE.Vector3(0, 0, 12);
    this.cameraParallaxStrength = 1.8;
    this.cameraShakeOffset = new THREE.Vector3();
    this.cameraShakeTime = 0;
    this.cameraShakeIntensity = 0;
    
    // Raycaster for click detection
    this.raycaster = new THREE.Raycaster();
    
    // Gameplay balance variables
    this.spawnTimer = 0;
    this.gameDuration = 60; // 60 seconds
    this.elapsedTime = 0;
    
    // Colors mapping
    this.themeColors = {
      primary: 0x00F5FF,    // Cyan
      secondary: 0xA855F7,  // Purple
      accent: 0xFF0080      // Pink/Magenta
    };
    
    // Bind event handlers
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onCanvasClick = this.onCanvasClick.bind(this);
    this.animate = this.animate.bind(this);
  }

  // Initialize the 3D environment
  init(containerId, uiController) {
    this.container = document.getElementById(containerId);
    this.uiController = uiController;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // 1. Create Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020308, 0.015);
    
    // 2. Create Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.copy(this.targetCameraPos);
    
    // 3. Create WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Clear canvas child nodes and append renderer canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    
    // 4. Lights
    this.setupLights();
    
    // 5. Background Objects (Floating Geometries + Starfield)
    this.createStarfield();
    this.createBackgroundElements();
    
    // 6. Bind Listeners
    window.addEventListener('resize', this.onWindowResize);
    this.container.addEventListener('mousemove', this.onMouseMove);
    
    // Support mouse and touch
    this.renderer.domElement.addEventListener('mousedown', this.onCanvasClick);
    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        // Mock a mousemove position for the raycaster
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        this.onCanvasClick(e);
      }
    }, { passive: true });

    // Start animation loop
    this.animate();
  }

  setupLights() {
    // Subtle ambient lighting
    const ambientLight = new THREE.AmbientLight(0x080c1e, 1.2);
    this.scene.add(ambientLight);
    
    // Central glowing blue directional light
    const dirLight = new THREE.DirectionalLight(0x00F5FF, 1.5);
    dirLight.position.set(0, 10, 8);
    this.scene.add(dirLight);
    
    // Backlight purple glowing directional light for depth highlights
    const dirLight2 = new THREE.DirectionalLight(0xA855F7, 1.0);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
  }

  // Particle Starfield background
  createStarfield() {
    const starCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Random coordinates in space
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = -Math.random() * 50 - 10; // behind game area
      
      // Multi-colored stars (Cyan, Magenta, Purple, White)
      const colorVal = Math.random();
      if (colorVal < 0.3) {
        colors[i * 3] = 0.0;     // Cyan
        colors[i * 3 + 1] = 0.96;
        colors[i * 3 + 2] = 1.0;
      } else if (colorVal < 0.6) {
        colors[i * 3] = 1.0;     // Accent Pink
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 0.5;
      } else if (colorVal < 0.8) {
        colors[i * 3] = 0.66;    // Secondary Purple
        colors[i * 3 + 1] = 0.33;
        colors[i * 3 + 2] = 0.97;
      } else {
        colors[i * 3] = 1.0;     // Pure White
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Custom round dot particle look using a Canvas-drawn texture
    const texture = this.createCircleTexture();
    
    const material = new THREE.PointsMaterial({
      size: 0.25,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  // Draw circular glowing dot for particles
  createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Renders wireframe shapes rotating slowly in background Z depth
  createBackgroundElements() {
    const geometries = [
      new THREE.TorusGeometry(3, 0.4, 8, 24),
      new THREE.IcosahedronGeometry(2, 1),
      new THREE.TorusKnotGeometry(1.5, 0.3, 30, 4, 3, 4),
      new THREE.OctahedronGeometry(2.5, 0),
      new THREE.DodecahedronGeometry(2.2, 0)
    ];
    
    const colors = [
      this.themeColors.secondary, // Purple
      this.themeColors.primary,   // Cyan
      this.themeColors.accent,    // Pink
      this.themeColors.secondary
    ];

    for (let i = 0; i < 6; i++) {
      const geom = geometries[i % geometries.length];
      const color = colors[i % colors.length];
      
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.8
      });
      
      const mesh = new THREE.Mesh(geom, mat);
      
      // Distribute in background grid
      mesh.position.set(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 22,
        -Math.random() * 10 - 8 // Z depth -8 to -18
      );
      
      // Store rotational speeds
      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.15,
        rotSpeedY: (Math.random() - 0.5) * 0.15,
        rotSpeedZ: (Math.random() - 0.5) * 0.15
      };
      
      this.scene.add(mesh);
      this.bgElements.push(mesh);
    }
  }

  // Start the gameplay session
  start() {
    this.clearAllOrbs();
    this.isPlaying = true;
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.cameraParallaxStrength = 1.8;
  }

  // Stop gameplay session
  stop() {
    this.isPlaying = false;
    this.clearAllOrbs();
  }

  // Clear all target orbs from scene
  clearAllOrbs() {
    this.orbs.forEach(orb => {
      this.scene.remove(orb.mesh);
      if (orb.pointLight) this.scene.remove(orb.pointLight);
    });
    this.orbs = [];
  }

  // Dynamic parameters mapping difficulty to time elapsed
  getDifficultyConfig() {
    // Normalised game progress 0.0 to 1.0
    const progress = Math.min(1.0, this.elapsedTime / this.gameDuration);
    
    // Linearly interpolate stats
    // Spawn Interval: starts at 1.5s, ends at 0.5s
    const spawnInterval = 1.5 - (progress * 1.0);
    // Orb Size Radius: starts at 1.15, shrinks to 0.45
    const orbSize = 1.15 - (progress * 0.70);
    // Orb Lifetime: starts at 3.2s, drops to 1.3s
    const lifetime = 3.2 - (progress * 1.9);
    // Orb Speed: starts static, climbs to moving at 2.5 speed scale
    const isMoving = progress > 0.15;
    const moveSpeed = progress > 0.15 ? 0.3 + (progress * 2.2) : 0;
    
    return { spawnInterval, orbSize, lifetime, isMoving, moveSpeed };
  }

  // Spawn an interactive 3D orb
  spawnOrb() {
    if (!this.isPlaying) return;
    
    const config = this.getDifficultyConfig();
    
    // Choose color theme: 45% Primary Cyan, 35% Secondary Purple, 20% Accent Pink
    let colorHex = this.themeColors.primary;
    let type = 'primary';
    const rand = Math.random();
    
    if (rand > 0.8) {
      colorHex = this.themeColors.accent;
      type = 'accent';
    } else if (rand > 0.45) {
      colorHex = this.themeColors.secondary;
      type = 'secondary';
    }
    
    // Calculate viewport bounds at Z = 0
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const boundY = Math.tan(fovRad) * this.camera.position.z - (config.orbSize * 1.2);
    const boundX = boundY * this.camera.aspect - (config.orbSize * 1.2);
    
    // Generate orb position
    const x = (Math.random() - 0.5) * 2 * boundX;
    const y = (Math.random() - 0.5) * 2 * boundY;
    const z = 0.0; // Play arena plane
    
    // Create Mesh Group for orb (contains core sphere + rotating details)
    const orbGroup = new THREE.Group();
    orbGroup.position.set(x, y, z);
    
    // 1. Core Sphere (reflective & glowing)
    const sphereGeom = new THREE.SphereGeometry(config.orbSize, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.05,
      metalness: 0.95,
      emissive: colorHex,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.95
    });
    const coreMesh = new THREE.Mesh(sphereGeom, sphereMat);
    orbGroup.add(coreMesh);
    
    // 2. Neon Ring Halo
    const ringGeom = new THREE.TorusGeometry(config.orbSize * 1.25, config.orbSize * 0.06, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.5,
      metalness: 0.8,
      emissive: colorHex,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.6
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    // Align ring randomly
    ringMesh.rotation.x = Math.random() * Math.PI;
    ringMesh.rotation.y = Math.random() * Math.PI;
    orbGroup.add(ringMesh);
    
    // 3. Dynamic Local Point Light inside the orb
    // Projects actual ambient colors onto other objects
    const pointLight = new THREE.PointLight(colorHex, 2.5, config.orbSize * 7.5);
    pointLight.position.set(x, y, z);
    this.scene.add(pointLight);
    
    // Add Mesh Group to scene
    this.scene.add(orbGroup);
    
    // Define movement velocity vectors (for moving targets)
    const velocity = new THREE.Vector3(0, 0, 0);
    if (config.isMoving) {
      // Pick random direction angle
      const angle = Math.random() * Math.PI * 2;
      const speed = config.moveSpeed;
      velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
    }
    
    // Store orb details
    const orbId = Math.random().toString(36).substring(2, 9);
    
    const newOrb = {
      id: orbId,
      mesh: orbGroup,
      coreMesh: coreMesh,
      ringMesh: ringMesh,
      pointLight: pointLight,
      color: colorHex,
      type: type,
      radius: config.orbSize,
      spawnTime: this.elapsedTime,
      lifetime: config.lifetime,
      velocity: velocity,
      boundsX: boundX,
      boundsY: boundY,
      isExpiring: false
    };
    
    this.orbs.push(newOrb);
    
    // Play spawn sound via synthesizer
    if (window.synth) {
      window.synth.playSpawn();
    }
  }

  // Create dynamic 3D particle explosion when clicking an orb
  createExplosion(position, colorHex) {
    const particleCount = 28;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Initial position matches clicked orb
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      // Velocities shooting outwards in spherical vector coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 4.0 + Math.random() * 4.5;
      
      velocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          (Math.random() - 0.5) * speed
        )
      );
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const texture = this.createCircleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.32,
      color: colorHex,
      map: texture,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const pointsMesh = new THREE.Points(geometry, material);
    this.scene.add(pointsMesh);
    
    this.explosions.push({
      mesh: pointsMesh,
      velocities: velocities,
      age: 0,
      maxAge: 0.45 // 450ms lifetime
    });
  }

  // Setup camera shake trigger
  triggerCameraShake(intensity = 0.25) {
    this.cameraShakeIntensity = intensity;
    this.cameraShakeTime = 0.15; // 150ms duration
  }

  // Projection math: Converts 3D space vectors into 2D client coordinates
  // Used to spawn HTML points exactly where the click hit on the 3D orb
  getScreenCoordinates(vector3D) {
    const tempV = vector3D.clone();
    tempV.project(this.camera);
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    // Map (-1 to 1) normalized coordinates to Client X & Y
    const x = (tempV.x *  .5 + .5) * rect.width + rect.left;
    const y = (tempV.y * -.5 + .5) * rect.height + rect.top;
    
    return { x, y };
  }

  // Handle raycast click logic
  onCanvasClick(event) {
    if (!this.isPlaying) return;
    
    let clientX, clientY;
    if (event.type === 'touchstart') {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
      // Normalised coordinates for raycast
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    // Fire ray from camera through cursor plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Extract interactive meshes
    const targets = this.orbs.map(orb => orb.coreMesh);
    const intersects = this.raycaster.intersectObjects(targets);
    
    if (intersects.length > 0) {
      // HIT!
      const hitMesh = intersects[0].object;
      
      // Locate which orb object was hit by tracing parents
      const hitOrb = this.orbs.find(orb => orb.coreMesh === hitMesh || orb.mesh.getObjectById(hitMesh.id));
      
      if (hitOrb) {
        const scoreCoords = this.getScreenCoordinates(hitOrb.mesh.position);
        
        // Trigger explosion in 3D scene
        this.createExplosion(hitOrb.mesh.position, hitOrb.color);
        
        // Remove orb and point light immediately
        this.scene.remove(hitOrb.mesh);
        this.scene.remove(hitOrb.pointLight);
        this.orbs = this.orbs.filter(o => o.id !== hitOrb.id);
        
        // Trigger small camera impact vibration
        this.triggerCameraShake(0.18);
        
        // Dispatch event back to UI controller
        this.uiController.registerHit(hitOrb.type, scoreCoords.x, scoreCoords.y);
      }
    } else {
      // MISS! Background clicked
      // Exclude clicks overlaying start/gameover screens
      const isStartActive = document.getElementById('start-overlay').classList.contains('active');
      const isOverActive = document.getElementById('gameover-overlay').classList.contains('active');
      
      if (!isStartActive && !isOverActive) {
        // Map cursor coordinates for floating miss popup
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        // Trigger visual miss flash and camera shake
        this.triggerCameraShake(0.35);
        
        this.uiController.registerMiss(clientX, clientY);
      }
    }
  }

  // Keep aspect ratio matching on resize
  onWindowResize() {
    if (!this.container || !this.camera) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  // Update mouse position vector for camera parallax
  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // ==========================================
  // CORE ANIMATION LOOP (WebGL RENDERER)
  // ==========================================
  animate() {
    requestAnimationFrame(this.animate);
    
    const delta = 0.016; // Assumed fixed ~60fps step
    
    if (this.isPlaying) {
      this.elapsedTime += delta;
      
      // Update HUD game timer directly
      this.uiController.updateTimer(Math.max(0, this.gameDuration - this.elapsedTime));
      
      // Spawn orbs based on difficulty timer intervals
      const config = this.getDifficultyConfig();
      this.spawnTimer += delta;
      if (this.spawnTimer >= config.spawnInterval) {
        this.spawnOrb();
        this.spawnTimer = 0;
      }
      
      // Process active orbs lifetime and moving vectors
      this.updateOrbs(delta);
    }
    
    // Process active explosions (3D particles)
    this.updateExplosions(delta);
    
    // Animate background elements (Starfield + wireframes)
    this.updateBackground(delta);
    
    // Camera offsets and shakes
    this.updateCameraEffects(delta);
    
    // WebGL frame render call
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Handle active orbs movement and auto-destruction limits
  updateOrbs(delta) {
    const expiredOrbs = [];
    
    this.orbs.forEach(orb => {
      // 1. Position movement by velocity
      orb.mesh.position.addScaledVector(orb.velocity, delta);
      orb.pointLight.position.copy(orb.mesh.position);
      
      // Collision bounce borders (for moving targets)
      if (Math.abs(orb.mesh.position.x) > orb.boundsX) {
        orb.velocity.x *= -1;
        orb.mesh.position.x = Math.sign(orb.mesh.position.x) * orb.boundsX;
      }
      if (Math.abs(orb.mesh.position.y) > orb.boundsY) {
        orb.velocity.y *= -1;
        orb.mesh.position.y = Math.sign(orb.mesh.position.y) * orb.boundsY;
      }
      
      // 2. Slow spin detailing
      orb.ringMesh.rotation.x += 1.5 * delta;
      orb.ringMesh.rotation.y += 0.8 * delta;
      
      // 3. Pulse scale mapping
      const timeAlive = this.elapsedTime - orb.spawnTime;
      const pulse = 1.0 + Math.sin(timeAlive * 8) * 0.08;
      orb.mesh.scale.set(pulse, pulse, pulse);
      
      // 4. Expiry warning animation (flickers & shrinks in final 0.5s)
      const timeLeft = orb.lifetime - timeAlive;
      
      if (timeLeft <= 0.5 && timeLeft > 0) {
        orb.isExpiring = true;
        // Fast flicker and scale shrink
        const shrinkFactor = timeLeft / 0.5;
        const flicker = Math.sin(timeAlive * 30) > 0 ? 1 : 0.25;
        orb.coreMesh.material.opacity = 0.8 * shrinkFactor * flicker;
        orb.ringMesh.material.opacity = 0.5 * shrinkFactor * flicker;
        orb.pointLight.intensity = 2.5 * shrinkFactor * flicker;
      }
      
      // Self-destruct limit
      if (timeLeft <= 0) {
        expiredOrbs.push(orb);
      }
    });
    
    // Remove expired orbs (counts as a missed orb, breaking combo, but no -5 score penalty)
    expiredOrbs.forEach(orb => {
      this.scene.remove(orb.mesh);
      this.scene.remove(orb.pointLight);
      this.orbs = this.orbs.filter(o => o.id !== orb.id);
      
      this.uiController.registerExpiry();
    });
  }

  // Update particle positions in the explosion lists
  updateExplosions(delta) {
    const finishedExplosions = [];
    
    this.explosions.forEach(exp => {
      exp.age += delta;
      
      if (exp.age >= exp.maxAge) {
        finishedExplosions.push(exp);
      } else {
        // Retrieve and update particle positions
        const positionAttr = exp.mesh.geometry.attributes.position;
        const positions = positionAttr.array;
        
        for (let i = 0; i < positionAttr.count; i++) {
          const velocity = exp.velocities[i];
          
          positions[i * 3] += velocity.x * delta;
          positions[i * 3 + 1] += velocity.y * delta;
          positions[i * 3 + 2] += velocity.z * delta;
          
          // Apply slight drag and gravity
          velocity.multiplyScalar(0.93);
          velocity.y -= 0.8 * delta; // falling gravity dust
        }
        
        positionAttr.needsUpdate = true;
        
        // Fade out particle opacity
        const opacity = 1.0 - (exp.age / exp.maxAge);
        exp.mesh.material.opacity = opacity;
      }
    });
    
    // Clean up finished explosions
    finishedExplosions.forEach(exp => {
      this.scene.remove(exp.mesh);
      exp.mesh.geometry.dispose();
      exp.mesh.material.dispose();
      this.explosions = this.explosions.filter(e => e !== exp);
    });
  }

  // Renders slow background animations
  updateBackground(delta) {
    // 1. Slow spin of wireframe objects
    this.bgElements.forEach(mesh => {
      mesh.rotation.x += mesh.userData.rotSpeedX * delta;
      mesh.rotation.y += mesh.userData.rotSpeedY * delta;
      mesh.rotation.z += mesh.userData.rotSpeedZ * delta;
      
      // Floating wave motion
      mesh.position.y += Math.sin(this.elapsedTime + mesh.position.x) * 0.003;
    });
    
    // 2. Slow starfield drift
    if (this.starfield) {
      this.starfield.rotation.z += 0.008 * delta;
    }
  }

  // Renders camera parallax shift & shakes
  updateCameraEffects(delta) {
    // 1. Smooth mouse parallax
    // Target camera pos shifts slightly depending on where mouse cursor is hovering
    this.targetCameraPos.x = this.mouse.x * this.cameraParallaxStrength;
    this.targetCameraPos.y = this.mouse.y * this.cameraParallaxStrength;
    
    // Interpolate camera position
    this.camera.position.x += (this.targetCameraPos.x - this.camera.position.x) * 0.08;
    this.camera.position.y += (this.targetCameraPos.y - this.camera.position.y) * 0.08;
    
    // 2. Screen Shake decay math
    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime -= delta;
      
      // Generate random offsets proportional to shake intensity
      const currentIntensity = (this.cameraShakeTime / 0.15) * this.cameraShakeIntensity;
      this.cameraShakeOffset.set(
        (Math.random() - 0.5) * currentIntensity * 2.5,
        (Math.random() - 0.5) * currentIntensity * 2.5,
        (Math.random() - 0.5) * currentIntensity * 1.5
      );
      
      this.camera.position.add(this.cameraShakeOffset);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }
}

// Instantiate globally
const threeGame = new ThreeGameEngine();
window.threeGame = threeGame;

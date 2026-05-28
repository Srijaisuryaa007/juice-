/* ==========================================================================
   JUICE Sparkling Lemonade Scrollytelling Engine
   ========================================================================== */

function initEngine() {
  // --- Constants & Config ---
  const TOTAL_FRAMES = 300;
  const SKELETON_STEP = 6; // Load every 6th frame initially for rapid startup
  const BEATS = [
    { id: 'beat-1', start: 0, end: 15 },
    { id: 'beat-2', start: 20, end: 40 },
    { id: 'beat-3', start: 45, end: 65 },
    { id: 'beat-4', start: 70, end: 85 },
    { id: 'beat-5', start: 90, end: 100 }
  ];

  // --- Element Selection ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const glow = document.getElementById('ambient-glow');
  const navbar = document.getElementById('navbar');


  // --- Animation State ---
  let targetProgress = 0; // Target scroll progress (0 to 1)
  let currentProgress = 0; // Smoothly interpolated scroll progress (0 to 1)
  
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;

  // --- Progressive Image Loader Setup ---
  const loadedImages = {};
  const skeletonFrames = [];
  const backgroundFrames = [];

  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    if (i === 1 || i === TOTAL_FRAMES || (i - 1) % SKELETON_STEP === 0) {
      skeletonFrames.push(i);
    } else {
      backgroundFrames.push(i);
    }
  }

  const totalSkeleton = skeletonFrames.length;
  let skeletonLoadedCount = 0;
  let experienceStarted = false;

  // Dynamic Lookup for the closest loaded frame to keep scroll rendering O(1)
  const closestLoadedFrames = new Array(TOTAL_FRAMES + 1).fill(null);

  function registerLoadedFrame(frameIndex, img) {
    loadedImages[frameIndex] = img;
    
    // Update closest loaded frame for all sequence indices
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      let closest = null;
      let minDiff = Infinity;
      for (const loadedStr in loadedImages) {
        const loadedIndex = parseInt(loadedStr, 10);
        const diff = Math.abs(i - loadedIndex);
        if (diff < minDiff) {
          minDiff = diff;
          closest = loadedIndex;
        }
      }
      closestLoadedFrames[i] = closest;
    }
  }

  // Helper: Pad frame numbers (e.g. 1 -> "001")
  const pad = (num, size) => num.toString().padStart(size, '0');

  // Status messages for preloader based on loading percentage
  function getStatusMessage(percent) {
    if (percent < 20) return "Harvesting organic lemons...";
    if (percent < 40) return "Squeezing fresh botanical mint...";
    if (percent < 60) return "Infusing spring water micro-bubbles...";
    if (percent < 80) return "Blending natural monk fruit nectar...";
    if (percent < 95) return "Chilling to optimal temperature...";
    return "System Ready.";
  }

  // --- Preloader Progress Tracker ---
  function checkProgress() {
    skeletonLoadedCount++;
    const percent = Math.min(Math.round((skeletonLoadedCount / totalSkeleton) * 100), 100);
    
    const percentEl = document.getElementById('preloader-percent');
    const fillEl = document.getElementById('preloader-fill');
    const statusEl = document.getElementById('preloader-status');
    
    if (percentEl) percentEl.textContent = percent.toString().padStart(2, '0');
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (statusEl) statusEl.textContent = getStatusMessage(percent);
    
    if (skeletonLoadedCount === totalSkeleton && !experienceStarted) {
      experienceStarted = true;
      setTimeout(startExperience, 400); // Fast transition to experience
    }
  }

  // --- Sequential Background Loading ---
  function startBackgroundLoading() {
    const concurrency = 4;
    let index = 0;
    
    function loadNext() {
      if (index >= backgroundFrames.length) return;
      const frameIndex = backgroundFrames[index++];
      const img = new Image();
      img.src = `./pics/ezgif-frame-${pad(frameIndex, 3)}.webp`;
      img.onload = () => {
        registerLoadedFrame(frameIndex, img);
        loadNext();
      };
      img.onerror = () => {
        console.error(`Failed to load background frame ${frameIndex}`);
        loadNext();
      };
    }
    
    for (let i = 0; i < concurrency; i++) {
      loadNext();
    }
  }

  // --- Core Start Sequence ---
  function startExperience() {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 1000);

    // Initial sizing and kickstart render loop
    resizeCanvas();
    updateScroll(); // Run immediately to sync initial position
    tick();

    // Start background image sequence fetching after skeleton has rendered
    startBackgroundLoading();
  }

  // Start skeleton image loads
  skeletonFrames.forEach((index) => {
    const img = new Image();
    img.src = `./pics/ezgif-frame-${pad(index, 3)}.webp`;
    img.onload = () => {
      registerLoadedFrame(index, img);
      checkProgress();
    };
    img.onerror = () => {
      console.error(`Failed to load skeleton frame ${index}`);
      checkProgress(); // Keep progress moving even on error
    };
  });

  // --- Canvas Rendering & Fitting ---
  function drawImage(img) {
    if (!img) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fit Image inside canvas (cover behavior for seamless full-bleed)
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    
    let drawWidth, drawHeight;
    
    if (imgRatio < canvasRatio) {
      // Image is taller than canvas (relative to width), match width and crop height
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
    } else {
      // Image is wider than canvas (relative to height), match height and crop width
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
    }
    
    // Apply subtle parallax offsets based on mouse position
    const offsetX = mouseX * 25 * dpr;
    const offsetY = mouseY * 25 * dpr;
    
    ctx.save();
    // Center drawing context
    ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    // Subtle rotation tilt
    ctx.rotate(mouseX * 0.015);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    // Force redraw of current frame on resize
    const exactFrame = 1 + currentProgress * (TOTAL_FRAMES - 1);
    const targetFrameIndex = Math.round(exactFrame);
    const closestFrame = closestLoadedFrames[targetFrameIndex] || skeletonFrames[0];
    const img = loadedImages[closestFrame];
    if (img) {
      drawImage(img);
    }
  }

  // --- Scroll Tracking Logic ---
  function updateScroll() {
    const container = document.getElementById('overview');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const totalScroll = rect.height - window.innerHeight;
    const currentScroll = -rect.top;
    
    if (totalScroll > 0) {
      targetProgress = Math.min(Math.max(currentScroll / totalScroll, 0), 1);
    }

    // Navbar translucency and blur fade on scroll
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // --- Mouse Parallax Tracker ---
  window.addEventListener('mousemove', (e) => {
    // Normalize coordinates to -0.5 to 0.5 range
    targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  // --- Text Overlay Beats Logic ---
  function updateOverlays(p) {
    BEATS.forEach((beat) => {
      const el = document.getElementById(beat.id);
      if (!el) return;
      
      const transitionWindow = 6; // Scroll percentage span for smooth fade curves
      let opacity = 0;
      let translateY = 30; // Pixel offset when hidden
      
      if (p >= beat.start && p <= beat.end) {
        opacity = 1;
        translateY = 0;
      } else if (p >= beat.start - transitionWindow && p < beat.start) {
        // Fade in
        const ratio = (p - (beat.start - transitionWindow)) / transitionWindow;
        opacity = ratio;
        translateY = 30 * (1 - ratio);
      } else if (p > beat.end && p <= beat.end + transitionWindow) {
        // Fade out
        const ratio = (p - beat.end) / transitionWindow;
        opacity = 1 - ratio;
        translateY = -30 * ratio;
      } else {
        opacity = 0;
        translateY = p < beat.start ? 30 : -30;
      }
      
      // Inline styles for high-fidelity animations
      el.style.opacity = opacity;
      
      if (el.classList.contains('beat-hero') || el.classList.contains('beat-cta')) {
        // Centered layouts
        el.style.transform = `translate3d(-50%, calc(-50% + ${translateY}px), 0)`;
      } else {
        // Side layouts (beat-left and beat-right)
        el.style.transform = `translate3d(0, calc(-50% + ${translateY}px), 0)`;
      }
      
      // Handle interactive elements state
      if (opacity > 0) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // --- Animation Core Loop (Tick) ---
  function tick() {
    // Smooth scrolling using Linear Interpolation (lerp)
    currentProgress += (targetProgress - currentProgress) * 0.08;
    
    // Smooth mouse parallax transitions
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    
    // Map smoothed progress to 300 frame sequence
    const exactFrame = 1 + currentProgress * (TOTAL_FRAMES - 1);
    const targetFrameIndex = Math.round(exactFrame);
    const closestFrame = closestLoadedFrames[targetFrameIndex] || skeletonFrames[0];
    
    const img = loadedImages[closestFrame];
    if (img) {
      drawImage(img);
    }
    
    // Ambient glow parallax
    if (glow) {
      glow.style.transform = `translate3d(calc(-50% - ${mouseX * 50}px), calc(-50% - ${mouseY * 50}px), 0)`;
    }

    // Synchronize text overlays with smoothed frame progress
    updateOverlays(currentProgress * 100);


    requestAnimationFrame(tick);
  }

  // --- Event Bindings ---
  window.addEventListener('scroll', updateScroll);
  window.addEventListener('resize', resizeCanvas);
}

// Avoid DOMContentLoaded race conditions by checking readyState
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}

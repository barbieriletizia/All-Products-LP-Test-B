import {
  DoubleSide,
  Group,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderTarget,
  Raycaster
} from "../three.module.js";

import { AnimationManager } from "./AnimationManager.js";
import { Animation } from "./Animation.js";

import { CamState, SingleBuffer } from "./Buffers.js";
import {
  FresnelLight,
  FresnelLightHelper,
  NouveauPetal,
} from "./NouveauPetal.js";
import { WaveTextures } from "./WaveTextures.js";

import PASSTHROUGH_VERTEX_SHADER from "./passthrough_vert.js";
import BLUR_FRAGMENT_SHADER from "./blur_frag.js";
import { createRenderer, createRenderLoop } from "./WebGLPerformance.js";

let useLocalConfig = false;

const FPS_BASELINE = (1 / 60) * 1000;
const DUMMY_TEXTURE = new Texture();

class WaveScene {
  constructor(renderer, width, height) {
    this.mouseX = 0.5;
    this.mouseY = 0.5;

    this.scene = new Scene();

    this.helpersGroup = new Group();
    this.helpersGroup.visible = false;
    this.scene.add(this.helpersGroup);

    this.camera = new OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      10000
    );
    this.camera.position.set(100.0, 0, 5000.0);

    this.petals = [];
  }

  render = (renderer, frame) => {
    this.petals.forEach((petal, _) => {
      petal.time = frame;
      petal.render(renderer, this.scene, this.camera);
    });
  };

  renderDerivative = (renderer, frame) => {
    this.petals.forEach((petal, _) => {
      petal.time = frame;
      petal.renderDerivative(renderer, this.scene, this.camera);
    });
  };

  addGui = (gui) => {
    this.petals.forEach((petal, index) => {
      this.addPetalGui(gui, petal, index);
      petal.lights.forEach((light) => {
        this.addLightHelper(light);
      });
    });
  };

  addLightHelper = (light) => {
    const lightHelper = new FresnelLightHelper(light);
    light.helper = lightHelper;
    this.helpersGroup.add(lightHelper.group);
  };

  addPetalGui = (gui, petal, index) => {
    const folder = gui.addFolder(`Petal ${index}`);

    folder.add(petal, "timeOffset", 0.0, 5000.0, 25.0);
    // folder.add(petal, "colorVibrance", 0.0, 5.0, 0.01);
    folder.add(petal, "colorContrast", 0.0, 5.0, 0.01);
    folder.add(petal, "colorSaturation", 0.0, 2.0, 0.01);
    folder.add(petal, "colorHueShift", -Math.PI, Math.PI, 0.01);
    folder.add(petal, "displaceFrequencyX", -0.03, 0.03, 0.000001);
    folder.add(petal, "displaceFrequencyZ", -0.03, 0.03, 0.000001);
    folder.add(petal, "displaceAmount", -50.0, 50.0, 0.001);
    folder.add(petal, "positionX", -1000.0, 1000.0, 0.1);
    folder.add(petal, "positionY", -1000.0, 1000.0, 0.1);
    folder.add(petal, "positionZ", -1000.0, 1000.0, 0.1);
    folder.add(petal, "scaleX", 0.1, 10.0, 0.1);
    folder.add(petal, "scaleY", 0.1, 10.0, 0.1);
    folder.add(petal, "scaleZ", 0.1, 10.0, 0.1);
    folder.add(petal, "rotationX", -Math.PI, Math.PI, 0.001);
    folder.add(petal, "rotationY", -Math.PI, Math.PI, 0.001);
    folder.add(petal, "rotationZ", -Math.PI, Math.PI, 0.001);
    folder.add(petal, "twistFrequencyX", -5.0, 5.0, 0.001);
    folder.add(petal, "twistFrequencyY", -5.0, 5.0, 0.001);
    folder.add(petal, "twistFrequencyZ", -5.0, 5.0, 0.001);
    folder.add(petal, "twistPowerX", 0.0, 12.0, 0.01);
    folder.add(petal, "twistPowerY", 0.0, 12.0, 0.01);
    folder.add(petal, "twistPowerZ", 0.0, 12.0, 0.01);
    folder.add(petal, "glowAmount", 0.01, 24.0, 0.01);
    folder.add(petal, "glowPower", 0.0, 6.0, 0.001);
    folder.add(petal, "glowRamp", 0.01, 1.0, 0.001);

    const removeLightFn = (light, folder) => {
      return () => {
        petal.removeLight(light);
        if (light.helper) {
          this.helpersGroup.remove(light.helper.group);
          light.helper = null;
        }
        folder.destroy();
      };
    };

    petal.lights.forEach((light, lightIndex) => {
      const lightFolder = FresnelLight.addGUI(light, folder);
      lightFolder.add(
        { removeLight: removeLightFn(light, lightFolder) },
        "removeLight"
      );
      lightFolder.onChange(() => {
        petal.updateLightUniforms();
        if (light.helper) light.helper.update();
      });
    });

    const addLight = () => {
      const light = petal.addLight();
      this.addLightHelper(light);
      const lightFolder = FresnelLight.addGUI(light, folder);

      lightFolder.add(
        { removeLight: removeLightFn(light, lightFolder) },
        "removeLight"
      );
      lightFolder.onChange(() => {
        petal.updateLightUniforms();
        if (light.helper) light.helper.update();
      });
    };

    const removePetal = () => {
      this.scene.remove(petal.group);
      this.petals.splice(index, 1);
      folder.destroy();
    };

    folder.add({ addLight: addLight }, "addLight");
    folder.add({ remove: removePetal }, "remove");
  };

  set resolution(value) {
    this.petals.forEach((petal, _) => {
      petal.resolution = value;
    });
  }
}

class PostProcessing {
  static BLUR_MATERIAL = new ShaderMaterial({
    uniforms: {
      u_scene: { value: null },
      u_depth: { value: DUMMY_TEXTURE },
      u_derivative: { value: DUMMY_TEXTURE },
      u_resolution: { value: new Vector2(0, 0) },
      u_blurAmount: { value: 0.03 },
      u_diffuseBlur: { value: 0.0 },
      u_opaque: { value: 0.0 },
      u_grainAmount: { value: 1.0 },
    },
    vertexShader: PASSTHROUGH_VERTEX_SHADER,
    fragmentShader: BLUR_FRAGMENT_SHADER,
    side: DoubleSide,
  });

  material;

  constructor(blurAmount = 0.03, grainAmount = 1.0) {
    this.material = PostProcessing.BLUR_MATERIAL.clone();
    this.material.uniforms.u_blurAmount.value = blurAmount;
    this.material.uniforms.u_grainAmount.value = grainAmount;
  }

  set blurAmount(value) {
    this.material.uniforms.u_blurAmount.value = value;
  }

  get blurAmount() {
    return this.material.uniforms.u_blurAmount.value;
  }

  set diffuseBlur(value) {
    this.material.uniforms.u_diffuseBlur.value = value;
  }

  get diffuseBlur() {
    return this.material.uniforms.u_diffuseBlur.value;
  }

  set grainAmount(value) {
    this.material.uniforms.u_grainAmount.value = value;
  }

  get grainAmount() {
    return this.material.uniforms.u_grainAmount.value;
  }
}

class NouveauBloomWave {
  constructor() {
    this.containers = document.querySelectorAll(
      "[data-js-target='nouveau-bloom-wave']"
    );
    if (!this.containers.length) return;

    if (!Animation.manager) Animation.manager = new AnimationManager();

    const queryString = window.location.search;
    this.urlParams = new URLSearchParams(queryString);
    if (this.urlParams.has("__useLocalConfig")) {
      this.useLocalConfig = true;
    }

    this.waveTextures = new WaveTextures(() => {
      this.containers.forEach((container) => this.initContainer(container));
    });
  }

  initContainer = (container) => {
    const containerRect = container.getBoundingClientRect();
    const { renderer, hasMajorPerformanceCaveat, hasCapabilities } =
      createRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
      });

    if (!renderer || hasMajorPerformanceCaveat || !hasCapabilities) {
      //console.log(majorPerformanceCaveat, hasCapabilities);
      return;
    }

    renderer.autoClear = false;
    renderer.autoClearColor = false;
    renderer.autoClearDepth = false;
    renderer.setClearColor(0xffffff, 0.0);

    const dpr = window.devicePixelRatio;
    let containerSize = new Vector2(
      containerRect.width,
      containerRect.height
    );
    const resolution = containerSize.clone().multiplyScalar(dpr);

    renderer.setPixelRatio(dpr);
    renderer.setSize(containerSize.width, containerSize.height);

    const postProcessing = new PostProcessing();

    const waveScene = new WaveScene(
      renderer,
      containerSize.width,
      containerRect.height
    );

    const sceneTarget = new WebGLRenderTarget(
      resolution.width,
      resolution.height
    );

    const derivativeTarget = new WebGLRenderTarget(
      resolution.width,
      resolution.height
    );

    const postProcessingMaterial = postProcessing.material;
    postProcessingMaterial.uniforms.u_resolution.value = new Vector2(
      resolution.width,
      resolution.height
    );
    postProcessingMaterial.uniforms.u_scene.value = sceneTarget.texture;
    postProcessingMaterial.uniforms.u_depth.value = sceneTarget.depthTexture;
    postProcessingMaterial.uniforms.u_derivative.value =
      derivativeTarget.texture;

    if (this.urlParams.has("__opaque")) {
      postProcessingMaterial.uniforms.u_opaque.value = 1.0;
    }

    const postProcessingBuffer = new SingleBuffer(
      resolution.width,
      resolution.height,
      postProcessingMaterial,
      false
    );

    const loadState = (waveData) => {
      if (waveData.petals) {
        waveData.petals.forEach((petalData, index) => {
          const petal = NouveauPetal.fromJson(
            petalData,
            this.waveTextures.paletteTexture,
            this.waveTextures.lutTexture,
            this.waveTextures.blueNoiseTexture
          );

          petal.resolution = new Vector2(
            containerRect.width * dpr,
            containerRect.height * dpr
          );

          waveScene.scene.add(petal.group);
          waveScene.petals.push(petal);
        });
      }

      const camState = CamState.fromJson(waveData.camState);
      waveScene.camera.position.copy(camState.position);
      waveScene.camera.rotation.copy(camState.rotation);
      waveScene.camera.zoom = camState.zoom;
      waveScene.camera.lookAt(camState.lookat);
    };

    // Get position from data attributes if provided
    const customPositionX = container.dataset.positionX;
    const customPositionY = container.dataset.positionY;
    const defaultPositionX = 662.7;
    const defaultPositionY = -301.7;
    const positionX = customPositionX ? parseFloat(customPositionX) : defaultPositionX;
    const positionY = customPositionY ? parseFloat(customPositionY) : defaultPositionY;

    // Parse the petal JSON and update positions
    const petalData = JSON.parse('{"timeOffset":2275,"colorContrast":1,"colorSaturation":1,"colorHueShift":-0.00159265358979299,"displaceFrequencyX":0.005831,"displaceFrequencyZ":0.016001,"displaceAmount":-7.821,"positionX":662.7,"positionY":-301.7,"positionZ":-11.0999999999999,"rotationX":-0.449592653589793,"rotationY":-0.117592653589793,"rotationZ":1.87440734641021,"scaleX":9,"scaleY":8,"scaleZ":5,"twistFrequencyX":-0.649999999999999,"twistFrequencyY":0.41,"twistFrequencyZ":-0.58,"twistPowerX":3.63,"twistPowerY":0.7,"twistPowerZ":3.95,"glowAmount":1.98,"glowPower":0.806,"glowRamp":0.834,"lights":[]}');
    petalData.positionX = positionX;
    petalData.positionY = positionY;

    loadState({
      guiState: {
        controllers: {},
        folders: {
          "Post Processing": {
            controllers: { blurAmount: 0.02, grainAmount: 1.1 },
            folders: {},
          },
        },
      },
      camState: {
        position: { x: 100.00000000000004, y: 3.06222926004786e-13, z: 5000 },
        rotation: {
          isEuler: true,
          _x: -6.124458520095719e-17,
          _y: 0.019997333973150542,
          _z: 1.2246467991473536e-18,
          _order: "XYZ",
        },
        lookat: { x: 0, y: 0, z: 0 },
        zoom: 1,
      },
      petals: [
        JSON.stringify(petalData),
      ],
    });

    waveScene.resolution = resolution;

    const mouseVector = new Vector2(0.0, 0.0);
    const mouseMove = (e) => {
      const mouseX = e.offsetX / containerSize.width;
      const mouseY = 1.0 - e.offsetY / containerSize.height; // flipped for OpenGL
      mouseVector.set(mouseX, mouseY);
    };

    const resize = () => {
      const newContainerRect = container.getBoundingClientRect();
      
      // Skip if size hasn't actually changed
      if (newContainerRect.width === containerSize.x && 
          newContainerRect.height === containerSize.y) {
        return;
      }

      containerSize = new Vector2(
        newContainerRect.width,
        newContainerRect.height
      );

      const resolution = containerSize.clone().multiplyScalar(dpr);
      
      // Update renderer size
      renderer.setSize(containerSize.width, containerSize.height);
      
      // Update render targets to match new size
      sceneTarget.setSize(resolution.width, resolution.height);
      derivativeTarget.setSize(resolution.width, resolution.height);
      
      // Update post-processing resolution uniform
      postProcessingMaterial.uniforms.u_resolution.value.set(resolution.width, resolution.height);
      
      // Update wave scene resolution
      waveScene.resolution = resolution;

      // Update camera
      waveScene.camera.left = -containerSize.width / 2;
      waveScene.camera.right = containerSize.width / 2;
      waveScene.camera.top = containerSize.height / 2;
      waveScene.camera.bottom = -containerSize.height / 2;
      waveScene.camera.updateProjectionMatrix();
    };

    const keydown = (e) => {
      if (e.key === "/") {
        if (gui && gui._hidden) {
          gui.show();
          waveScene.helpersGroup.visible = true;
          // container.style.zIndex = "1000";
        } else {
          if (gui) gui.hide();
          transformControl.detach();
          transformObject = null;
          transformHelper = null;
          waveScene.helpersGroup.visible = false;
          // container.style.zIndex = "";
        }
      } else if (e.key === "Escape") {
        if (transformObject) {
          transformControl.detach();
          transformObject = null;
          transformHelper = null;
        }
      } else if (e.key === "m") {
        transformControl.setMode(
          transformControl.getMode() === "translate" ? "rotate" : "translate"
        );
      }
    };

    let transformObject;
    let transformHelper;

    const raycaster = new Raycaster();
    const pointer = new Vector2();

    const click = (event) => {
      pointer.x = (event.offsetX / container.offsetWidth) * 2 - 1;
      pointer.y = -(event.offsetY / container.offsetHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, waveScene.camera);

      const lightHelpers = [];
      const lightHelperMeshes = [];

      waveScene.petals.forEach((petal) => {
        petal.lights.forEach((light) => {
          if (light.helper) {
            lightHelpers.push(light.helper);
            lightHelperMeshes.push(light.helper.mesh);
          }
        });
      });

      const intersects = raycaster.intersectObjects(lightHelperMeshes, false);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const helper = lightHelpers.find((lightHelper) => {
          return lightHelper.mesh === object;
        });

        if (helper) {
          transformObject = object;
          transformHelper = helper;
          transformControl.attach(object);
        }
      }
    };

    const render = (timestamp) => {
      waveScene.petals.forEach((petal) => {
        petal.mousePosition = mouseVector;
      });

      renderer.setRenderTarget(sceneTarget);
      renderer.clearDepth();
      renderer.clearColor();
      waveScene.render(renderer, timestamp);

      renderer.setRenderTarget(derivativeTarget);
      renderer.clearDepth();
      renderer.clearColor();
      waveScene.renderDerivative(renderer, timestamp);

      renderer.setRenderTarget(null);
      renderer.render(postProcessingBuffer.scene, postProcessingBuffer.camera);
    };

    const scroll = () => {
      // TODO: remove scroll logic if not needed
      //const scrollHeight = document.body.scrollHeight - window.innerHeight;
      //const p = window.scrollY / scrollHeight;
    };

    const drop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length === 0) return;
      const fileList = e.dataTransfer.files;
      for (const file of fileList) {
        if (file.type == "image/png") {
          const url = (window.URL || window.webkitURL).createObjectURL(file);
          const image = new Image();
          image.src = url;

          const texture = new Texture(image);
          texture.wrapS = texture.wrapS;
          texture.wrapT = texture.wrapT;
          texture.needsUpdate = true;

          waveScene.petals[0].colorMesh.material.uniforms.u_paletteTexture.value =
            texture;
        }
      }
    };

    container.appendChild(renderer.domElement);
    window.requestAnimationFrame(scroll);

    let resizeTimeout = null;
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize to prevent flickering from rapid consecutive calls
      if (resizeTimeout) {
        cancelAnimationFrame(resizeTimeout);
      }
      resizeTimeout = requestAnimationFrame(() => {
        resize();
        render(performance.now()); // Immediate render to prevent blank frame
      });
    });

    container.addEventListener("mousemove", mouseMove);
    container.addEventListener("click", click);
    window.addEventListener("keydown", keydown);
    window.addEventListener("scroll", scroll);
    window.addEventListener("drop", drop);
    resizeObserver.observe(container);

    window["renderCount"] = 1; // here for testing WebGL performance only
    const renderLoop = createRenderLoop(function (timestamp) {
      for (let i = 0; i < window["renderCount"]; i++) {
        render(timestamp);
      }
    }, 2);

    window.requestAnimationFrame(() => {
      scroll();
      resize();
      render(0);
      renderLoop.start();
    });

    window.addEventListener("resize", () => {
      scroll();
      resize();
    });

    // Shared easing function
    const easeInOutCubic = (progress) => {
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    };

    // Grayscale animation support
    let grayscaleAnimation = null;
    const GRAYSCALE_DURATION = 1000; // 1 second transition

    const animateGrayscale = (targetValue) => {
      if (grayscaleAnimation) {
        cancelAnimationFrame(grayscaleAnimation);
      }

      const startValue = waveScene.petals[0]?.grayscale ?? 0;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / GRAYSCALE_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        waveScene.petals.forEach((petal) => {
          petal.grayscale = currentValue;
        });

        render(currentTime); // Force render on each animation frame

        if (progress < 1) {
          grayscaleAnimation = requestAnimationFrame(animate);
        } else {
          grayscaleAnimation = null;
        }
      };

      grayscaleAnimation = requestAnimationFrame(animate);
    };

    // Check initial grayscale state
    if (container.hasAttribute('data-grayscale')) {
      waveScene.petals.forEach((petal) => {
        petal.grayscale = 1.0;
      });
    }

    // Blur animation support
    let blurAnimation = null;
    const BLUR_DURATION = 2000; // 2 second transition

    const animateBlur = (targetValue) => {
      if (blurAnimation) {
        cancelAnimationFrame(blurAnimation);
      }

      const startValue = postProcessing.diffuseBlur;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / BLUR_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        postProcessing.diffuseBlur = currentValue;

        render(currentTime); // Force render on each animation frame

        if (progress < 1) {
          blurAnimation = requestAnimationFrame(animate);
        } else {
          blurAnimation = null;
        }
      };

      blurAnimation = requestAnimationFrame(animate);
    };

    // Check initial blur state
    if (container.hasAttribute('data-blur')) {
      const blurValue = parseFloat(container.getAttribute('data-blur'));
      if (!isNaN(blurValue) && blurValue >= 0) {
        postProcessing.diffuseBlur = blurValue;
      }
    }

    // Wave rotation animation support (rotates on Z-axis)
    let waveRotationAnimation = null;
    const WAVE_ROTATION_DURATION = 1000; // 1 second transition

    const getDefaultWaveRotationZ = () => {
      return waveScene.petals[0]?.config?.rotationZ ?? 0;
    };

    const animateWaveRotation = (targetValue) => {
      if (waveRotationAnimation) {
        cancelAnimationFrame(waveRotationAnimation);
      }

      const startValue = waveScene.petals[0]?.rotationZ ?? 0;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / WAVE_ROTATION_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        waveScene.petals.forEach((petal) => {
          petal.rotationZ = currentValue;
        });

        render(currentTime); // Force render on each animation frame

        if (progress < 1) {
          waveRotationAnimation = requestAnimationFrame(animate);
        } else {
          waveRotationAnimation = null;
        }
      };

      waveRotationAnimation = requestAnimationFrame(animate);
    };

    // Store original rotation for reset
    const originalWaveRotationZ = getDefaultWaveRotationZ();

    // Check initial wave rotation state
    if (container.hasAttribute('data-wave-rotation')) {
      const rotationDegrees = parseFloat(container.getAttribute('data-wave-rotation'));
      if (!isNaN(rotationDegrees)) {
        const rotationRadians = (rotationDegrees * Math.PI) / 180;
        waveScene.petals.forEach((petal) => {
          petal.rotationZ = originalWaveRotationZ + rotationRadians;
        });
      }
    }

    // Check initial color offset state (0–1, shifts palette sampling)
    if (container.hasAttribute('data-color-offset')) {
      const colorOffsetValue = parseFloat(container.getAttribute('data-color-offset'));
      if (!isNaN(colorOffsetValue)) {
        const offset = Math.max(0, Math.min(360, colorOffsetValue));
        waveScene.petals.forEach((petal) => {
          petal.colorOffset = offset;
        });
      }
    }

    // Camera zoom animation support
    let cameraZoomAnimation = null;
    const CAMERA_ZOOM_DURATION = 1000; // 1 second transition
    const DEFAULT_CAMERA_ZOOM = 1; // Default zoom level

    const animateCameraZoom = (targetValue) => {
      if (cameraZoomAnimation) {
        cancelAnimationFrame(cameraZoomAnimation);
      }

      const startValue = waveScene.camera.zoom;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / CAMERA_ZOOM_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        waveScene.camera.zoom = currentValue;
        waveScene.camera.updateProjectionMatrix();

        render(currentTime); // Force render on each animation frame

        if (progress < 1) {
          cameraZoomAnimation = requestAnimationFrame(animate);
        } else {
          cameraZoomAnimation = null;
        }
      };

      cameraZoomAnimation = requestAnimationFrame(animate);
    };

    // Check initial camera zoom state
    if (container.hasAttribute('data-camera-zoom')) {
      const zoomValue = parseFloat(container.getAttribute('data-camera-zoom'));
      if (!isNaN(zoomValue) && zoomValue > 0) {
        waveScene.camera.zoom = zoomValue;
        waveScene.camera.updateProjectionMatrix();
      }
    }

    // Wave position-x animation support
    let positionXAnimation = null;
    const POSITION_X_DURATION = 1000;
    const originalPositionX = positionX;

    const animatePositionX = (targetValue) => {
      if (positionXAnimation) {
        cancelAnimationFrame(positionXAnimation);
      }

      const startValue = waveScene.petals[0]?.positionX ?? originalPositionX;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / POSITION_X_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        waveScene.petals.forEach((petal) => {
          petal.positionX = currentValue;
        });
        render(currentTime);
        if (progress < 1) {
          positionXAnimation = requestAnimationFrame(animate);
        } else {
          positionXAnimation = null;
        }
      };
      positionXAnimation = requestAnimationFrame(animate);
    };

    // Wave position-y animation support
    let positionYAnimation = null;
    const POSITION_Y_DURATION = 1000; // 1 second transition
    const originalPositionY = positionY; // Store the initial position

    const animatePositionY = (targetValue) => {
      if (positionYAnimation) {
        cancelAnimationFrame(positionYAnimation);
      }

      const startValue = waveScene.petals[0]?.positionY ?? originalPositionY;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / POSITION_Y_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        waveScene.petals.forEach((petal) => {
          petal.positionY = currentValue;
        });

        render(currentTime); // Force render on each animation frame

        if (progress < 1) {
          positionYAnimation = requestAnimationFrame(animate);
        } else {
          positionYAnimation = null;
        }
      };

      positionYAnimation = requestAnimationFrame(animate);
    };

    // Watch for attribute changes
    const attributeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'data-grayscale') {
            const hasGrayscale = container.hasAttribute('data-grayscale');
            animateGrayscale(hasGrayscale ? 1.0 : 0.0);
          }
          
          if (mutation.attributeName === 'data-blur') {
            if (container.hasAttribute('data-blur')) {
              const blurValue = parseFloat(container.getAttribute('data-blur'));
              if (!isNaN(blurValue) && blurValue >= 0) {
                animateBlur(blurValue);
              }
            } else {
              // Attribute removed, animate back to no blur
              animateBlur(0);
            }
          }

          if (mutation.attributeName === 'data-wave-rotation') {
            if (container.hasAttribute('data-wave-rotation')) {
              const rotationDegrees = parseFloat(container.getAttribute('data-wave-rotation'));
              if (!isNaN(rotationDegrees)) {
                const rotationRadians = (rotationDegrees * Math.PI) / 180;
                animateWaveRotation(originalWaveRotationZ + rotationRadians);
              }
            } else {
              // Attribute removed, animate back to default
              animateWaveRotation(originalWaveRotationZ);
            }
          }

          if (mutation.attributeName === 'data-camera-zoom') {
            if (container.hasAttribute('data-camera-zoom')) {
              const zoomValue = parseFloat(container.getAttribute('data-camera-zoom'));
              if (!isNaN(zoomValue) && zoomValue > 0) {
                animateCameraZoom(zoomValue);
              }
            } else {
              // Attribute removed, animate back to default
              animateCameraZoom(DEFAULT_CAMERA_ZOOM);
            }
          }

          if (mutation.attributeName === 'data-position-x') {
            if (container.hasAttribute('data-position-x')) {
              const posXValue = parseFloat(container.getAttribute('data-position-x'));
              if (!isNaN(posXValue)) {
                animatePositionX(posXValue);
              }
            } else {
              animatePositionX(originalPositionX);
            }
          }

          if (mutation.attributeName === 'data-position-y') {
            if (container.hasAttribute('data-position-y')) {
              const posYValue = parseFloat(container.getAttribute('data-position-y'));
              if (!isNaN(posYValue)) {
                animatePositionY(posYValue);
              }
            } else {
              // Attribute removed, animate back to default
              animatePositionY(originalPositionY);
            }
          }

          if (mutation.attributeName === 'data-color-offset') {
            if (container.hasAttribute('data-color-offset')) {
              const colorOffsetValue = parseFloat(container.getAttribute('data-color-offset'));
              if (!isNaN(colorOffsetValue)) {
                const offset = Math.max(0, Math.min(360, colorOffsetValue));
                waveScene.petals.forEach((petal) => {
                  petal.colorOffset = offset;
                });
              }
            } else {
              waveScene.petals.forEach((petal) => {
                petal.colorOffset = 0;
              });
            }
          }
        }
      });
    });

    attributeObserver.observe(container, {
      attributes: true,
      attributeFilter: ['data-grayscale', 'data-blur', 'data-wave-rotation', 'data-camera-zoom', 'data-position-x', 'data-position-y', 'data-color-offset']
    });
  };
}

new NouveauBloomWave();

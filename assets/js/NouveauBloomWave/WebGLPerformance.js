import { WebGLRenderer } from "../three.module.js";

const median = (array) => {
  if (!array.length) return undefined;
  const s = [...array].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const average = (array) => {
  if (!array.length) return undefined;
  return array.reduce((a, b) => a + b) / array.length;
};

const checkCapabilities = (
  renderer,
  requiredExtensions
) => {
  const { capabilities, extensions } = renderer;

  /* Debug extensions omitted so the wave runs in browsers that omit WEBGL_debug_* */
  const baselineExtensions = [
    "EXT_color_buffer_float",
    "EXT_texture_filter_anisotropic",
  ];

  const allExtensions = [...baselineExtensions, ...requiredExtensions];

  const hasBaselineCapabilities =
    capabilities.isWebGL2 &&
    capabilities.vertexTextures &&
    capabilities.maxTextureSize >= 4096 &&
    capabilities.maxVertexUniforms >= 256 &&
    capabilities.maxFragmentUniforms >= 256;

  return (
    hasBaselineCapabilities &&
    allExtensions.every((ext) => extensions.get(ext) !== null)
  );
};

const MAX_FRAME_HISTORY = 60;
const MIN_FRAME_HISTORY = 12;
const REFRESH_RATE_THRESHOLD = 0.15;
const REFRESH_RATE_FRAME_MIN = 24;
const REFRESH_RATES = [600, 540, 480, 360, 240, 144, 120, 90, 60, 30];


export class WebGLPerformanceError extends Error {
  constructor(message, errorType) {
    super(message);
    this.name = "WebGLPerformanceError";
    this.errorType = errorType;
    Object.setPrototypeOf(this, WebGLPerformanceError.prototype);
  }
}

export class WebGLRenderLoop {
  frameCount = 0;
  frameInterval = 1;
  renderTime = 0;



  constructor(renderFunction) {
    this.renderFunction = renderFunction;
  }

  start() {
    WebGLPerformanceMonitor.addRenderLoop(this);
  }

  stop() {
    WebGLPerformanceMonitor.removeRenderLoop(this);
  }
}

class WebGLPerformanceMonitor {
   _frameTimes = [];
   _lastFrameTime = 0;
   _renderLoops = [];
   _estimatedRefreshRate = undefined;
   _estimatedRefreshRateTimeStamp = undefined;
   _frameInterval = 1;


   constructor() {
    this._rafId = null;
    this._frameTimes = [];

    if (document) {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    this.start();
  }

  static get instance() {
    if (!WebGLPerformanceMonitor._instance) {
      WebGLPerformanceMonitor._instance = new WebGLPerformanceMonitor();
    }
    return WebGLPerformanceMonitor._instance;
  }

  static addRenderLoop(renderLoop) {
    if (
      WebGLPerformanceMonitor.instance._renderLoops.indexOf(renderLoop) === -1
    ) {
      WebGLPerformanceMonitor.instance._renderLoops.push(renderLoop);
    }
  }

  static removeRenderLoop(renderLoop) {
    const index =
      WebGLPerformanceMonitor.instance._renderLoops.indexOf(renderLoop);
    if (index !== -1) {
      WebGLPerformanceMonitor.instance._renderLoops.splice(index, 1);
    }
  }

  onVisibilityChange = (event) => {
    if (document && document.hidden) {
      this.suspend("visibility");
    } else {
      this.resume("visibility");
    }
  };

  start = () => {
    if (this._rafId) return; // Already monitoring
    this._lastFrameTime = performance.now();
    this._rafId = requestAnimationFrame(this.update);
  };

  stop = () => {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  };

  update = (timeStamp) => {
    this._rafId = requestAnimationFrame(this.update);

    const deltaTime = timeStamp - this._lastFrameTime;
    this._lastFrameTime = timeStamp;

    // Newest time in, oldest time out
    this._frameTimes.push(deltaTime);
    if (this._frameTimes.length > MAX_FRAME_HISTORY) this._frameTimes.shift();

    if (
      this._frameTimes.length >= REFRESH_RATE_FRAME_MIN &&
      !this._estimatedRefreshRate
    ) {
      // An estimated refresh rate of MIN_VALUE means we are below the minimum FPS
      this._estimatedRefreshRate = this.getEstimatedRefreshRate();
      if (this._estimatedRefreshRate === Number.MIN_VALUE) {
        this.suspendPermanently();
        return;
      }

      // An estimated refresh rate of MIN_VALUE means we are below the minimum FPS
      this._estimatedRefreshRateTimeStamp = performance.now();
      console.log(`estimated refresh rate: ${this._estimatedRefreshRate}`);
      this._frameTimes = [];
    }

    if (this._estimatedRefreshRate) {
      // Do the rendering
      this._renderLoops.forEach((loop) => {
        loop.frameCount += 1;
        if (loop.frameCount % loop.frameInterval === 0) {
          // The timestamp is altered so the initial render begins at time 0
          loop.renderFunction(
            Math.max(timeStamp - this._estimatedRefreshRateTimeStamp, 0)
          );
        }
      });

      if (this._frameTimes.length > MIN_FRAME_HISTORY) {
        const averageFrameRate = 1000 / average(this._frameTimes);
        const refreshDelta = this._estimatedRefreshRate - averageFrameRate;

        // If we are consistently below the estimated refresh rate by a certain threshold, reduce load
        if (
          refreshDelta >
          this._estimatedRefreshRate * REFRESH_RATE_THRESHOLD
        ) {
          this._frameInterval += 1;

          console.log(
            "PERMANENTLY REDUCED FRAMERATE",
            this._frameInterval,
            averageFrameRate
          );

          // After 3 attempts at reducing the frame rate, suspend rendering altogether
          if (this._frameInterval > 3) {
            this.suspendPermanently();
            console.log(
              "MAXIMUM FRAME REDUCTION ATTEMPTS REACHED, ALL RENDERING SUSPENDED"
            );
          }

          // Notify loops about frame rate reductions
          this._renderLoops.forEach((loop) => {
            loop.frameInterval = Math.max(
              loop.frameInterval,
              this._frameInterval
            );
            loop.onFramerateReduced?.(averageFrameRate);

            // Clear frame times; measure again once enough measurements have accumulated
            this._frameTimes = [];
          });
        }
      }
    }
  };

  suspendPermanently() {
    this._frameInterval = 1;
    this._frameTimes = [];
    this._estimatedRefreshRate = undefined;
    this._estimatedRefreshRateTimeStamp = undefined;
    this._renderLoops.forEach((loop) => {
      loop.onRenderSuspended?.("performance");
      WebGLPerformanceMonitor.removeRenderLoop(loop);
    });
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.stop();
  }

  suspend(suspensionType) {
    this._renderLoops.forEach((loop) => {
      loop.onRenderSuspended?.(suspensionType);
    });
    this.stop();
  }

  resume(suspensionType) {
    this._lastFrameTime = performance.now();
    this._renderLoops.forEach((loop) => {
      loop.onRenderResumed?.(suspensionType);
    });
    this.start();
  }

  getEstimatedRefreshRate() {
    if (!this._frameTimes.length) {
      return undefined;
    }

    const medianFrameRate = 1000 / median(this._frameTimes);
    const closestRefreshRate = REFRESH_RATES.reduce(function (prev, curr) {
      return Math.abs(curr - medianFrameRate) < Math.abs(prev - medianFrameRate)
        ? curr
        : prev;
    });

    const delta = closestRefreshRate - medianFrameRate;
    if (delta > closestRefreshRate * REFRESH_RATE_THRESHOLD) {
      const refreshRateIdx = REFRESH_RATES.indexOf(closestRefreshRate);
      if (refreshRateIdx < REFRESH_RATES.length - 1) {
        return REFRESH_RATES[refreshRateIdx + 1];
      } else {
        return Number.MIN_VALUE;
      }
    } else {
      return closestRefreshRate;
    }
  }
}

export const createRenderer = (
  options,
  extensions = []
) => {
  let renderer = undefined;
  let hasMajorPerformanceCaveat = false;
  let hasCapabilities = false;

  try {
    options.failIfMajorPerformanceCaveat = true;
    renderer = new WebGLRenderer(options);
  } catch (error) {
    hasMajorPerformanceCaveat = true;
  }

  try {
    options.failIfMajorPerformanceCaveat = false;
    renderer = new WebGLRenderer(options);
  } catch (error) {
    console.error("Failed to create WebGLRenderer:", error);
  }

  if (renderer) {
    hasCapabilities = checkCapabilities(renderer, extensions);
  }

  return { renderer, hasMajorPerformanceCaveat, hasCapabilities };
};

export const createRenderLoop = (
  onRender,
  frameInterval = 1
) => {
  const renderLoop = new WebGLRenderLoop(onRender);
  renderLoop.frameInterval = frameInterval;
  return renderLoop;
};

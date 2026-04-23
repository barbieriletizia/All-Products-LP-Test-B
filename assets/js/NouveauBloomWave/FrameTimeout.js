export class FrameTimeout {
  constructor(fn, duration) {
    this.duration = duration;
    this.complete = false;
    this.completeFn = fn;
    this.elapsed = 0.0;
  }

  update = (deltaTime) => {
    this.elapsed += deltaTime;
    if (this.elapsed >= this.duration) {
      this.complete = true;
    }
  };

  static manager = null;

  static setTimeout = (fn, milliseconds) => {
    const timeout = new FrameTimeout(fn, milliseconds / 1000.0);

    if (FrameTimeout.manager) {
      FrameTimeout.manager.addTimeout(timeout);
    } else {
      // Logger.info('WARNING: PodcastFrameTimeout.manager undefined');
    }

    return timeout;
  };

  static clearTimeout = (timeout) => {
    if (FrameTimeout.manager) {
      FrameTimeout.manager.removeTimeout(timeout);
    }
  };
}

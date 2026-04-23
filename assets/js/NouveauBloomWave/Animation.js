export class Animation {
  constructor(duration) {
    this.val = 0;

    this.duration = duration;
    this.startTime = 0.0;
    this.startDelay = 0.0;
    this.lastUpdate = 0.0;

    this.complete = false;
    this.started = false;

    this.startFn = () => {};
    this.updateFn = () => {};
    this.completeFn = () => {};

    this.elapsed = 0.0;
  }

  start = (delay) => {
    const startDelay = delay || 0.0;
    this.startDelay = startDelay;

    if (!Animation.manager) {
      // Logger.info('WARNING: PodcastAnimation.manager undefined');
      return;
    }

    Animation.manager.add(this);
  };

  integrate = (deltaTime) => {
    this.elapsed += deltaTime;
    const v = (this.elapsed - this.startDelay) / this.duration;
    this.val = Math.max(Math.min(v, 1.0), 0.0);

    if (this.val === 1.0) {
      this.complete = true;
    }
  };

  stop = () => {
    this.val = 1.0;
    this.updateFn(1.0);
    this.complete = true;
  };

  cancel = () => {
    this.complete = true;
  };
}

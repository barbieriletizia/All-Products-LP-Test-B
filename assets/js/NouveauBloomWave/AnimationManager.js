export class AnimationManager {
  animations= [];
  paused = false;
  timeouts = [];
  frameFns = [];
  nextFrameFns = [];

  constructor() {
    requestAnimationFrame(this.tick);
  }

  addFrameFn = (fn) => {
    this.frameFns.push(fn);
  };

  removeFrameFn = (fn) => {
    const idx = this.frameFns.indexOf(fn);
    if (idx !== -1) {
      this.frameFns.splice(idx, 1);
    }
  };

  nextFrame = (fn) => {
    this.nextFrameFns.push(fn);
  };

  pause = () => {
    this.paused = true;
  };

  resume = () => {
    if (this.paused) {
      this.paused = false;
      requestAnimationFrame(this.tick);
    }
  };

  tick = (timestamp) => {
    if (!this.paused) {
      requestAnimationFrame(this.tick);
      this.update(timestamp);
      this.updateTimeouts();
      this.executeFrameFns(timestamp);
    }
  };

  executeFrameFns = (timestamp) => {
    this.frameFns.forEach((frameFn) => {
      frameFn(timestamp);
    });

    this.nextFrameFns.forEach((frameFn) => {
      frameFn(timestamp);
    });

    this.nextFrameFns = [];
  };

  update = (timestamp) => {
    const completeAnimations = [];
    const now = performance.now();

    this.animations.forEach((animation) => {
      if (timestamp - animation.startTime < animation.startDelay) {
        return;
      }

      if (!animation.started) {
        animation.started = true;
        animation.startTime = now;
        animation.lastUpdate = now;
        animation.startFn(animation.val);
      }

      if (animation.complete) {
        completeAnimations.push(animation);
        animation.completeFn(animation.val);
        return;
      }

      const delta = now - animation.lastUpdate;

      animation.integrate(delta / 1000);
      animation.updateFn(animation.val);
      animation.lastUpdate = now;
    });

    this.animations = this.animations.filter((el) => {
      return !completeAnimations.includes(el);
    });
  };

  updateTimeouts = () => {
    const completeTimeouts = [];

    this.timeouts.forEach((timeout) => {
      if (timeout.complete) {
        completeTimeouts.push(timeout);
        timeout.completeFn();
        return;
      }

      timeout.update(1.0 / 60.0);
    });

    this.timeouts = this.timeouts.filter((el) => {
      return !completeTimeouts.includes(el);
    });
  };

  add = (animation) => {
    if (this.paused) return;
    if (this.animations.indexOf(animation) === -1) {
      this.animations.push(animation);
    }
  };

  remove = (animation) => {
    const idx = this.animations.indexOf(animation);
    if (idx !== -1) {
      this.animations.splice(idx, 1);
    }
  };

  addTimeout = (timeout) => {
    this.timeouts.push(timeout);
  };

  removeTimeout = (timeout) => {
    const idx = this.timeouts.indexOf(timeout);
    if (idx !== -1) {
      this.timeouts.splice(idx, 1);
    }
  };
}

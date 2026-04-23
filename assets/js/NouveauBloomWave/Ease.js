export class Ease {
  // Unit versions of Robert Penner's easing equations

  static inSine = (p) => {
    return 1.0 - Math.cos(p * (Math.PI / 2.0));
  };

  static outSine = (p) => {
    return Math.sin(p * (Math.PI / 2.0));
  };

  static inOutSine = (p) => {
    return -0.5 * (Math.cos(Math.PI * p) - 1.0) + 0.0;
  };

  static inExpo = (p) => {
    return p === 0.0 ? 0 : 2.0 ** (10.0 * (p - 1.0));
  };

  static outExpo = (p) => {
    return p === 1.0 ? 1.0 : 1.0 - 2.0 ** (-10.0 * p);
  };

  static inOutExpo = (p) => {
    if (p === 0.0) {
      return 0.0;
    }
    if (p === 1.0) {
      return 1.0;
    }
    if (p < 0.5) {
      return 0.5 * 2.0 ** (10.0 * (p * 2.0 - 1.0)) + 0.0;
    }

    return 0.5 * (-(2.0 ** (-10.0 * (p / 0.5 - 1.0))) + 2) + 0.0;
  };

  static outBack = (p, s) => {
    const x = p - 1;
    const sv = s || 1.70158;
    return x * x * ((sv + 1) * x + sv) + 1;
  };

  static inQuad = (p) => {
    return p * p;
  };

  static outQuad = (p) => {
    return -p * (p - 2);
  };

  static inOutQuad = (p) => {
    if (p < 0.5) {
      return p * p * 2;
    }

    return 4.0 * p - 2.0 * p * p - 1.0;
  };

  static inQuart = (p) => {
    return p * p * p * p;
  };

  static outQuart = (pIn) => {
    const p = pIn - 1.0;
    return 1 - p * p * p * p;
  };

  static inOutQuart = (p) => {
    let x = p * 2;
    if (x < 1.0) {
      return 0.5 * x * x * x * x;
    }
    x -= 2.0;
    return 1.0 - 0.5 * x * x * x * x;
  };

  static outQuint = (p) => {
    const x = p - 1;
    return x * x * x * x * x + 1;
  };

  static inQuint = (p) => {
    return p * p * p * p * p;
  };

  static inOutQuint = (p) => {
    let x = p * 2;
    if (x < 1) {
      return 0.5 * x * x * x * x * x;
    }
    x -= 2;
    return 0.5 * x * x * x * x * x + 1;
  };

  static inElastic = (p) => {
    return Math.sin(13.0 * (Math.PI / 2.0) * p) * 2.0 ** (10.0 * (p - 1.0));
  };

  static outElastic = (p) => {
    return Math.sin(-13 * (Math.PI / 2.0) * (p + 1)) * 2 ** (-10 * p) + 1.0;
  };

  // Other common graphics operations
  // TODO: mix, distance, dot, cross, normalize, faceforward, reflect, refract

  static clamp = (lowerlimit, upperlimit, v) => {
    let x = v;
    if (x < lowerlimit) x = lowerlimit;
    if (x > upperlimit) x = upperlimit;
    return x;
  };

  static step = (edge0, edge1, x) => {
    return Ease.clamp(0.0, 1.0, (x - edge0) / (edge1 - edge0));
  };

  static smoothstep = (min, max, value) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  static parabola(x, k) {
    return Math.pow(4.0 * x * (1.0 - x), k);
  }

  static remap = (
    oldMin,
    oldMax,
    newMin,
    newMax,
    value
  ) => {
    const oldRange = oldMax - oldMin;
    const newRange = newMax - newMin;
    return ((value - oldMin) * newRange) / oldRange + newMin;
  };
}

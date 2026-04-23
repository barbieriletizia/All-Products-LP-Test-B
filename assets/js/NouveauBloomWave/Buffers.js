import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderTarget,
} from "../three.module.js";

import { Euler, Vector3 } from "../three.module.js";

const createCamera = (width, height) => {
  const camera = new OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0.1,
    1000
  );

  camera.position.set(0, 0, 5);
  return camera;
};

export class CamState {
  constructor(position, rotation, lookat, zoom) {
    this.position = position;
    this.rotation = rotation;
    this.lookat = lookat;
    this.zoom = zoom;
  }

  static fromJson(json) {
    return new CamState(
      new Vector3(json.position.x, json.position.y, json.position.z),
      // eslint-disable-next-line no-underscore-dangle
      new Euler(
        json.rotation._x,
        json.rotation._y,
        json.rotation._z,
        json.rotation._order
      ),
      new Vector3(json.lookat.x, json.lookat.y, json.lookat.z),
      json.zoom
    );
  }

  static lerp(state, newState, t) {
    return new CamState(
      state.position.clone().lerp(newState.position, t),
      new Euler(
        state.rotation.x + t * (newState.rotation.x - state.rotation.x),
        state.rotation.y + t * (newState.rotation.y - state.rotation.y),
        state.rotation.z + t * (newState.rotation.z - state.rotation.z),
        state.rotation.order
      ),
      state.lookat.clone().lerp(newState.lookat, t),
      state.zoom + t * (newState.zoom - state.zoom)
    );
  }
}

export class SingleBuffer {
  constructor(
    width,
    height,
    material,
    renderTarget = true,
    renderTargetOptions
  ) {
    this.renderTarget = renderTarget
      ? new WebGLRenderTarget(width, height, renderTargetOptions)
      : null;

    this.camera = createCamera(width, height);

    const geom = new PlaneGeometry(width, height);
    this.mesh = new Mesh(geom, material);

    this.scene = new Scene();
    this.scene.add(this.mesh);
  }

  render = (renderer) => {
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
  };

  resize = (width, height) => {
    this.renderTarget?.setSize(width, height);
    this.camera = createCamera(width, height);
  };

  get texture() {
    return this.renderTarget.texture;
  }
}

export class DoubleBuffer {
  constructor(width, height, material, renderTargetOptions) {
    this.renderTargetA = new WebGLRenderTarget(
      width,
      height,
      renderTargetOptions
    );
    this.renderTargetB = new WebGLRenderTarget(
      width,
      height,
      renderTargetOptions
    );

    this.camera = createCamera(width, height);

    const geom = new PlaneGeometry(width, height);
    this.mesh = new Mesh(geom, material);

    this.scene = new Scene();
    this.scene.add(this.mesh);

    this.renderTarget = this.renderTargetA;
    this.lastRenderTarget = this.renderTargetB;
  }

  render = (renderer) => {
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);

    if (this.renderTarget === this.renderTargetA) {
      this.renderTarget = this.renderTargetB;
      this.lastRenderTarget = this.renderTargetA;
    } else {
      this.renderTarget = this.renderTargetA;
      this.lastRenderTarget = this.renderTargetB;
    }

    const m = this.mesh.material;
    m.uniforms.u_lastRender.value = this.lastRenderTarget.texture;
  };

  createCamera = (width, height) => {
    const camera = new OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      0.1,
      1000
    );

    camera.position.set(0, 0, 5);
    return camera;
  };

  resize = (width, height) => {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
    this.camera = createCamera(width, height);
  };

  get texture() {
    return this.lastRenderTarget.texture;
  }
}

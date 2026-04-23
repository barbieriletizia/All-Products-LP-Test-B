import {
  AddEquation,
  ArrowHelper,
  Color,
  CustomBlending,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  SrcColorFactor,
  Texture,
  Vector2,
  Vector3,
  ZeroFactor,
} from "../three.module.js";


const DUMMY_LIGHT = {
  position: new Vector3(0.0, 0.0, 0.0),
  direction: new Vector3(0.0, 0.0, 0.0),
  color: new Vector3(0.0, 1.0, 0.0),
  intensity: 1.0,
  amount: 0.0,
  exponent: 0.0,
};

const DUMMY_TEXTURE = new Texture();

const COLOR_UNIFORMS = {
  u_time: {
    value: 0,
  },
  u_resolution: {
    value: new Vector2(),
  },
  u_paletteTexture: {
    value: DUMMY_TEXTURE,
  },
  u_lutTexture: {
    value: DUMMY_TEXTURE,
  },
  u_blueNoiseTexture: {
    value: DUMMY_TEXTURE,
  },
  u_colorContrast: {
    value: 1.0,
  },
  // u_colorVibrance: {
  //   value: 1.0,
  // },
  u_colorSaturation: {
    value: 1.0,
  },
  u_colorHueShift: {
    value: 0.0,
  },
  u_colorOffset: {
    value: 0.0,
  },
  u_grayscale: {
    value: 0.0,
  },
  u_displaceFrequencyX: {
    value: 2.25,
  },
  u_displaceFrequencyZ: {
    value: 2.25,
  },
  u_displaceAmount: {
    value: 0.0,
  },
  u_twistFrequencyY: {
    value: 0.0,
  },
  u_twistFrequencyX: {
    value: 0.0,
  },
  u_twistFrequencyZ: {
    value: 0.0,
  },
  u_twistPowerY: {
    value: 1.0,
  },
  u_twistPowerX: {
    value: 1.0,
  },
  u_twistPowerZ: {
    value: 1.0,
  },
  u_glowAmount: {
    value: 0.01,
  },
  u_glowPower: {
    value: 0.01,
  },
  u_glowRamp: {
    value: 0.05,
  },
  u_mousePosition: {
    value: new Vector2(0.0, 0.0),
  },
  u_lights: {
    value: new Array(10).fill(DUMMY_LIGHT),
  },
  u_numLights: {
    value: 1,
  },
};

import VERTEX_SHADER from "./wave_vert.js";
import FRAGMENT_SHADER from "./wave_frag.js";
import DERIVATIVE_FRAGMENT_SHADER from "./wave_derivative_frag.js";
import { WaveGeometry } from "./WaveGeometry.js";

const LIGHT_DEFAULT_POSITION = new Vector3(0, 0, 0);
const LIGHT_DEFAULT_DIRECTION = new Vector3(0, 1, 0);
const LIGHT_DEFAULT_COLOR = new Color(0, 1, 0);

const makeId = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export class FresnelLightHelper {
  constructor(light) {
    this.light = light;
    this.group = new Group();
    this.material = new MeshBasicMaterial({
      color: light.color,
      depthWrite: true,
      depthTest: true,
      transparent: true,
    });
    this.mesh = new Mesh(new SphereGeometry(15.0, 6.0, 6.0), this.material);
    this.mesh.position.copy(light.position);

    this.arrowHelper = new ArrowHelper(
      light.direction,
      light.position,
      75.0,
      light.color.getHex(),
      15.0,
      10.0
    );

    this.group.add(this.arrowHelper);
    this.group.add(this.mesh);
  }

  update() {
    this.mesh.position.copy(this.light.position);
    this.material.color.copy(this.light.color);
    // this.arrowHelper.setDirection(this.light.direction);
    this.arrowHelper.setColor(this.light.color.getHex());
  }
}

export class FresnelLight {
  id;
  position;
  direction;
  color;
  intensity = 1.0;
  amount = 1.0;
  exponent = 1.0;
  helper = null;

  constructor(
    position = LIGHT_DEFAULT_POSITION.clone(),
    direction = LIGHT_DEFAULT_DIRECTION.clone(),
    color = LIGHT_DEFAULT_COLOR.clone(),
    intensity = 1.0,
    amount = 0.0,
    exponent = 1.0
  ) {
    this.id = makeId(5);
    this.direction = direction;
    this.position = position;
    this.color = color;
    this.intensity = intensity;
    this.amount = amount;
    this.exponent = exponent;
  }

  static addGUI(light, gui) {
    const folder = gui.addFolder(`Fresnel Light ${light.id}`);
    folder.addColor(light, "color");
    folder.add(light, "intensity", 0.0, 10.0, 0.01);
    folder.add(light, "amount", 0.0, 300.0, 1.0);
    folder.add(light, "exponent", 0.01, 10.0, 0.01);
    return folder;
  }

  static fromJson(json) {
    return new FresnelLight(
      new Vector3(json.position.x, json.position.y, json.position.z),
      new Vector3(json.direction.x, json.direction.y, json.direction.z),
      new Color(json.color.r, json.color.g, json.color.b),
      json.intensity,
      json.amount,
      json.exponent
    );
  }

  static toJson(light) {
    const direction = light.direction.clone();
    if (light.helper) {
      direction.applyEuler(light.helper.mesh.rotation);
    }

    return {
      position: {
        x: light.position.x,
        y: light.position.y,
        z: light.position.z,
      },
      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z,
      },
      color: {
        r: light.color.r,
        g: light.color.g,
        b: light.color.b,
      },
      intensity: light.intensity,
      amount: light.amount,
      exponent: light.exponent,
      id: light.id,
    };
  }
}

export class NouveauPetal {
  static COLOR_MATERIAL = new ShaderMaterial({
    uniforms: COLOR_UNIFORMS,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    depthWrite: true,
    depthTest: true,
    side: DoubleSide,
    transparent: true,
    colorWrite: true,
    // blending: SubtractiveBlending,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: SrcColorFactor,
    blendDst: ZeroFactor,
  });

  static DERIVATIVE_MATERIAL = new ShaderMaterial({
    uniforms: COLOR_UNIFORMS,
    vertexShader: VERTEX_SHADER,
    fragmentShader: DERIVATIVE_FRAGMENT_SHADER,
    depthWrite: true,
    depthTest: true,
    side: DoubleSide,
    transparent: true,
    colorWrite: true,
    // blending: SubtractiveBlending,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: SrcColorFactor,
    blendDst: ZeroFactor,
  });

  lights = [];

  constructor(paletteTexture, lutTexture, blueNoiseTexture) {
    this.timeOffset = 0.0;
    this.geom = WaveGeometry.folded();

    const colorMaterial = NouveauPetal.COLOR_MATERIAL.clone();
    // const derivativeMaterial = NouveauPetal.DERIVATIVE_MATERIAL.clone();

    this.colorMesh = new Mesh(this.geom, colorMaterial);
    // this.derivativeMesh = new Mesh(this.geom, derivativeMaterial);

    this.colorMesh.visible = false;
    // this.derivativeMesh.visible = false;

    colorMaterial.uniforms.u_paletteTexture.value = paletteTexture;
    colorMaterial.uniforms.u_lutTexture.value = lutTexture;
    colorMaterial.uniforms.u_blueNoiseTexture.value = blueNoiseTexture;

    this.group = new Group();
    this.group.add(this.colorMesh);
    // this.group.add(this.derivativeMesh);
  }

  render = (renderer, scene, camera) => {
    // this.derivativeMesh.visible = false;
    this.colorMesh.visible = true;
    renderer.render(scene, camera);
  };

  renderDerivative = (renderer, scene, camera) => {
    // this.colorMesh.visible = false;
    // this.derivativeMesh.visible = true;
    // renderer.render(scene, camera);
  };

  toJson() {
    const lights = [];
    this.lights.forEach((light) => {
      console.log("toJson", light);
      lights.push(FresnelLight.toJson(light));
    });
    const json = JSON.stringify({
      timeOffset: this.timeOffset,
      // colorVibrance: this.colorVibrance,
      colorContrast: this.colorContrast,
      colorSaturation: this.colorSaturation,
      colorHueShift: this.colorHueShift,
      displaceFrequencyX: this.displaceFrequencyX,
      displaceFrequencyZ: this.displaceFrequencyZ,
      displaceAmount: this.displaceAmount,
      positionX: this.positionX,
      positionY: this.positionY,
      positionZ: this.positionZ,
      rotationX: this.rotationX,
      rotationY: this.rotationY,
      rotationZ: this.rotationZ,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      scaleZ: this.scaleZ,
      twistFrequencyX: this.twistFrequencyX,
      twistFrequencyY: this.twistFrequencyY,
      twistFrequencyZ: this.twistFrequencyZ,
      twistPowerX: this.twistPowerX,
      twistPowerY: this.twistPowerY,
      twistPowerZ: this.twistPowerZ,
      glowAmount: this.glowAmount,
      glowPower: this.glowPower,
      glowRamp: this.glowRamp,
      lights: lights,
    });
    return json;
  }

  static fromJson(json, paletteTexture, lutTexture, blueNoiseTexture) {
    const parsed = JSON.parse(json);

    const petal = new NouveauPetal(
      paletteTexture,
      lutTexture,
      blueNoiseTexture
    );
    petal.config = parsed;

    // if (parsed.colorVibrance) petal.colorVibrance = parsed.colorVibrance;
    if (parsed.colorContrast) petal.colorContrast = parsed.colorContrast;
    if (parsed.colorSaturation) petal.colorSaturation = parsed.colorSaturation;
    if (parsed.colorHueShift) petal.colorHueShift = parsed.colorHueShift;

    if (parsed.displaceFrequencyX)
      petal.displaceFrequencyX = parsed.displaceFrequencyX;
    if (parsed.displaceFrequencyZ)
      petal.displaceFrequencyZ = parsed.displaceFrequencyZ;

    if (parsed.displaceAmount) petal.displaceAmount = parsed.displaceAmount;
    if (parsed.positionX) petal.positionX = parsed.positionX;
    if (parsed.positionY) petal.positionY = parsed.positionY;
    if (parsed.positionZ) petal.positionZ = parsed.positionZ;
    if (parsed.rotationX) petal.rotationX = parsed.rotationX;
    if (parsed.rotationY) petal.rotationY = parsed.rotationY;
    if (parsed.rotationZ) petal.rotationZ = parsed.rotationZ;
    if (parsed.scaleX) petal.scaleX = parsed.scaleX;
    if (parsed.scaleY) petal.scaleY = parsed.scaleY;
    if (parsed.scaleZ) petal.scaleZ = parsed.scaleZ;
    if (parsed.twistFrequencyX) petal.twistFrequencyX = parsed.twistFrequencyX;
    if (parsed.twistFrequencyY) petal.twistFrequencyY = parsed.twistFrequencyY;
    if (parsed.twistFrequencyZ) petal.twistFrequencyZ = parsed.twistFrequencyZ;
    if (parsed.twistPowerX) petal.twistPowerX = parsed.twistPowerX;
    if (parsed.twistPowerY) petal.twistPowerY = parsed.twistPowerY;
    if (parsed.twistPowerZ) petal.twistPowerZ = parsed.twistPowerZ;
    if (parsed.glowAmount) petal.glowAmount = parsed.glowAmount;
    if (parsed.glowPower) petal.glowPower = parsed.glowPower;
    if (parsed.glowRamp) petal.glowRamp = parsed.glowRamp;

    if (parsed.lights) {
      parsed.lights.forEach((light) => {
        const parsedLight = FresnelLight.fromJson(light);
        petal.lights.push(parsedLight);
      });
      petal.updateLightUniforms();
    }

    if (parsed.hasOwnProperty("timeOffset")) {
      petal.timeOffset = parsed.timeOffset;
    }

    return petal;
  }

  addLight() {
    const light = new FresnelLight();
    this.lights.push(light);
    this.updateLightUniforms();
    return light;
  }

  removeLight(light) {
    const index = this.lights.indexOf(light);
    if (index !== -1) {
      this.lights.splice(index, 1);
    }
    this.updateLightUniforms();
  }

  updateLightUniforms() {
    const lights = Array(10).fill(DUMMY_LIGHT);
    this.lights.forEach((light, index) => {
      const direction = light.direction.clone();
      if (light.helper) {
        direction.applyEuler(light.helper.mesh.rotation);
      }
      console.log(direction);

      lights[index] = {
        position: light.position,
        direction: direction,
        color: {
          x: light.color.r,
          y: light.color.g,
          z: light.color.b,
        },
        intensity: light.intensity,
        amount: light.amount,
        exponent: light.exponent,
      };
    });

    this.setColorUniform("u_lights", lights);
    this.setColorUniform("u_numLights", this.lights.length);
    // console.log(this.getColorUniform("u_lights"));
  }

  set time(value) {
    this.colorMesh.material.uniforms.u_time.value = value + this.timeOffset;
    // (this.derivativeMesh.material as ShaderMaterial).uniforms.u_time.value =
    //   value + this.timeOffset;
  }

  set resolution(value) {
    this.colorMesh.material.uniforms.u_resolution.value = value;
    // (
    //   this.derivativeMesh.material as ShaderMaterial
    // ).uniforms.u_resolution.value = value;
  }

  get resolution() {
    return this.colorMesh.material.uniforms.u_resolution.value;
  }

  setColorUniform = (name, value) => {
    this.colorMesh.material.uniforms[name].value = value;
    // (this.derivativeMesh.material as ShaderMaterial).uniforms[name].value =
    //   value;
  };

  getColorUniform = (name) => {
    return this.colorMesh.material.uniforms[name].value;
  };

  // get colorVibrance() {
  //   return this.getColorUniform("u_colorVibrance");
  // }

  // set colorVibrance(value: number) {
  //   this.setColorUniform("u_colorVibrance", value);
  // }

  get colorContrast() {
    return this.getColorUniform("u_colorContrast");
  }

  set colorContrast(value) {
    this.setColorUniform("u_colorContrast", value);
  }

  get colorSaturation() {
    return this.getColorUniform("u_colorSaturation");
  }

  set colorSaturation(value) {
    this.setColorUniform("u_colorSaturation", value);
  }

  get colorHueShift() {
    return this.getColorUniform("u_colorHueShift");
  }

  set colorHueShift(value) {
    this.setColorUniform("u_colorHueShift", value);
  }

  get colorOffset() {
    return this.getColorUniform("u_colorOffset");
  }

  set colorOffset(value) {
    this.setColorUniform("u_colorOffset", value);
  }

  get grayscale() {
    return this.getColorUniform("u_grayscale");
  }

  set grayscale(value) {
    this.setColorUniform("u_grayscale", value);
  }

  get positionX() {
    return this.group.position.x;
  }

  set positionX(value) {
    this.group.position.x = value;
  }

  get positionY() {
    return this.group.position.y;
  }

  set positionY(value) {
    this.group.position.y = value;
  }

  get positionZ() {
    return this.group.position.z;
  }

  set positionZ(value) {
    this.group.position.z = value;
  }

  get rotationX() {
    return this.group.rotation.x;
  }

  set rotationX(value) {
    this.group.rotation.x = value;
  }

  get rotationY() {
    return this.group.rotation.y;
  }

  set rotationY(value) {
    this.group.rotation.y = value;
  }

  get rotationZ() {
    return this.group.rotation.z;
  }

  set rotationZ(value) {
    this.group.rotation.z = value;
  }

  get scaleX() {
    return this.group.scale.x;
  }

  set scaleX(value) {
    this.group.scale.x = value;
  }

  get scaleY() {
    return this.group.scale.y;
  }

  set scaleY(value) {
    this.group.scale.y = value;
  }

  get scaleZ() {
    return this.group.scale.z;
  }

  set scaleZ(value) {
    this.group.scale.z = value;
  }

  get displaceFrequencyX() {
    return this.getColorUniform("u_displaceFrequencyX");
  }

  set displaceFrequencyX(value) {
    this.setColorUniform("u_displaceFrequencyX", value);
  }

  get displaceFrequencyZ() {
    return this.getColorUniform("u_displaceFrequencyZ");
  }

  set displaceFrequencyZ(value) {
    this.setColorUniform("u_displaceFrequencyZ", value);
  }

  get displaceAmount() {
    return this.getColorUniform("u_displaceAmount");
  }

  set displaceAmount(value) {
    this.setColorUniform("u_displaceAmount", value);
  }

  get twistFrequencyX() {
    return this.getColorUniform("u_twistFrequencyX");
  }

  set twistFrequencyX(value) {
    this.setColorUniform("u_twistFrequencyX", value);
  }

  get twistFrequencyY() {
    return this.getColorUniform("u_twistFrequencyY");
  }

  set twistFrequencyY(value) {
    this.setColorUniform("u_twistFrequencyY", value);
  }

  get twistFrequencyZ() {
    return this.getColorUniform("u_twistFrequencyZ");
  }

  set twistFrequencyZ(value) {
    this.setColorUniform("u_twistFrequencyZ", value);
  }

  get twistPowerX() {
    return this.getColorUniform("u_twistPowerX");
  }

  set twistPowerX(value) {
    this.setColorUniform("u_twistPowerX", value);
  }

  get twistPowerY() {
    return this.getColorUniform("u_twistPowerY");
  }

  set twistPowerY(value) {
    this.setColorUniform("u_twistPowerY", value);
  }

  get twistPowerZ() {
    return this.getColorUniform("u_twistPowerZ");
  }

  set twistPowerZ(value) {
    this.setColorUniform("u_twistPowerZ", value);
  }

  get glowAmount() {
    return this.getColorUniform("u_glowAmount");
  }

  set glowAmount(value) {
    this.setColorUniform("u_glowAmount", value);
  }

  get glowPower() {
    return this.getColorUniform("u_glowPower");
  }

  set glowPower(value) {
    this.setColorUniform("u_glowPower", value);
  }

  get glowRamp() {
    return this.getColorUniform("u_glowRamp");
  }

  set glowRamp(value) {
    this.setColorUniform("u_glowRamp", value);
  }

  get mousePosition() {
    return this.getColorUniform("u_mousePosition");
  }

  set mousePosition(value) {
    this.setColorUniform("u_mousePosition", value);
  }
}

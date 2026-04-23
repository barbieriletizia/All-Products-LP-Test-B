import {
  CylinderGeometry,
  PlaneGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from "../three.module.js";
import { Ease } from "./Ease.js";

const twistGeometry = (
  geometry,
  amountX,
  amountY
) => {
  const quaternion = new Quaternion();
  const up = new Vector3(0, -1, 0);

  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const tangent = geometry.attributes.tanget;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < position.count; i += 1) {
    const px = position.getX(i);
    const py = position.getY(i);
    const pz = position.getZ(i);

    const uvx = uv.getX(i);
    const uvy = uv.getY(i);

    const v = new Vector3(px, py, pz);

    quaternion.setFromAxisAngle(
      up,
      (Math.PI / 180) * uvy * (py / amountY + px / amountX)
    );
    v.applyQuaternion(quaternion);

    position.setXYZ(i, v.x, v.y, v.z);
  }

  geometry.computeVertexNormals();
  geometry.computeTangents();

  position.needsUpdate = true;
  normal.needsUpdate = true;
  tangent.needsUpdate = true;
};

export class WaveGeometry {
  static twisted = (
    width = 3,
    height = 3,
    subdivisionsX = 128,
    subdivisionsY = 128,
    twistX = 0,
    twistY = 0
  ) => {
    const geom = new PlaneGeometry(width, height, subdivisionsX, subdivisionsY);
    // twistGeometry(geom, 1.0 - twistX, 1.0 - twistY);
    return geom;
  };

  static cylinder = () => {
    const geom = new CylinderGeometry(
      400,
      400,
      4200,
      512,
      512,
      true,
      0.0,
      Math.PI * 1.8
    );
    // twistGeometry(geom, 25.0, 17.0);
    return geom;
  };

  static folded = (
    width = 400,
    height = 400,
    subdivisionsX = 400,
    subdivisionsY = 400
  ) => {
    const geometry = new PlaneGeometry(
      width,
      height,
      subdivisionsX,
      subdivisionsY
    );

    const positionAttribute = geometry.attributes
      .position;
    const normalAttribute = geometry.attributes
      .normal;
    const uvAttribute = geometry.attributes.uv;

    const quartCircum = 16.0;
    const radius = 4.0;

    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new Vector3().fromBufferAttribute(positionAttribute, i);
      const uv = new Vector2().fromBufferAttribute(uvAttribute, i);

      const edge = Ease.parabola(uv.y, 9.5);
      const r = radius - 2.0 * edge;

      if (vertex.x < -quartCircum) {
        vertex.z += r;
      } else if (vertex.x < quartCircum) {
        vertex.z =
          Math.cos(
            Ease.remap(-quartCircum, quartCircum, 0, Math.PI, vertex.x)
          ) * r;
        vertex.x =
          Math.cos(
            Ease.remap(
              -quartCircum,
              quartCircum,
              -Math.PI / 2,
              Math.PI / 2,
              vertex.x
            )
          ) *
            r -
          quartCircum;
      } else {
        vertex.z -= r;
        vertex.x = -vertex.x;
      }

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // twistGeometry(geometry, 4.0, 8.0);
    geometry.translate(width / 4.0, 0, 0);
    geometry.rotateX(-Math.PI / 2);
    geometry.rotateY(-Math.PI / 2);

    geometry.computeVertexNormals();
    geometry.computeTangents();

    positionAttribute.needsUpdate = true;
    normalAttribute.needsUpdate = true;

    return geometry;
  };
}

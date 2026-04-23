export default `
attribute vec3 tangent;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_twistFrequencyX;
uniform float u_twistFrequencyY;
uniform float u_twistFrequencyZ;

uniform float u_twistPowerX;
uniform float u_twistPowerY;
uniform float u_twistPowerZ;

uniform float u_displaceFrequencyX;
uniform float u_displaceFrequencyZ;
uniform float u_displaceAmount;

varying float v_time;
varying vec2 v_uv;
varying vec3 v_position;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec2 v_resolution;

//
// psrdnoise2.glsl
//
// Authors: Stefan Gustavson (stefan.gustavson@gmail.com)
// and Ian McEwan (ijm567@gmail.com)
// Version 2021-12-02, published under the MIT license (see below)
//
// Copyright (c) 2021 Stefan Gustavson and Ian McEwan.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
//

//
// Periodic (tiling) 2-D simplex noise (hexagonal lattice gradient noise)
// with rotating gradients and analytic derivatives.
//
// This is (yet) another variation on simplex noise. Unlike previous
// implementations, the grid is axis-aligned and slightly stretched in
// the y direction to permit rectangular tiling.
// The noise pattern can be made to tile seamlessly to any integer period
// in x and any even integer period in y. Odd periods may be specified
// for y, but then the actual tiling period will be twice that number.
//
// The rotating gradients give the appearance of a swirling motion, and
// can serve a similar purpose for animation as motion along z in 3-D
// noise. The rotating gradients in conjunction with the analytic
// derivatives allow for "flow noise" effects as presented by Ken
// Perlin and Fabrice Neyret.
//

//
// 2-D tiling simplex noise with rotating gradients and analytical derivative.
// "vec2 x" is the point (x,y) to evaluate,
// "vec2 period" is the desired periods along x and y, and
// "float alpha" is the rotation (in radians) for the swirling gradients.
// The "float" return value is the noise value, and
// the "out vec2 gradient" argument returns the x,y partial derivatives.
//
// Setting either period to 0.0 or a negative value will skip the wrapping
// along that dimension. Setting both periods to 0.0 makes the function
// execute about 15% faster.
//
// Not using the return value for the gradient will make the compiler
// eliminate the code for computing it. This speeds up the function
// by 10-15%.
//
// The rotation by alpha uses one single addition. Unlike the 3-D version
// of psrdnoise(), setting alpha == 0.0 gives no speedup.
//
float psrdnoise(vec2 x, vec2 period, float alpha, out vec2 gradient) {
    // Transform to simplex space (axis-aligned hexagonal grid)
    vec2 uv = vec2(x.x + x.y * 0.5, x.y);

    // Determine which simplex we're in, with i0 being the "base"
    vec2 i0 = floor(uv);
    vec2 f0 = fract(uv);
    // o1 is the offset in simplex space to the second corner
    float cmp = step(f0.y, f0.x);
    vec2 o1 = vec2(cmp, 1.0 - cmp);

    // Enumerate the remaining simplex corners
    vec2 i1 = i0 + o1;
    vec2 i2 = i0 + vec2(1.0, 1.0);

    // Transform corners back to texture space
    vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
    vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
    vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);

    // Compute vectors from v to each of the simplex corners
    vec2 x0 = x - v0;
    vec2 x1 = x - v1;
    vec2 x2 = x - v2;

    vec3 iu, iv;
    vec3 xw, yw;

    // Wrap to periods, if desired
    if (any(greaterThan(period, vec2(0.0)))) {
        xw = vec3(v0.x, v1.x, v2.x);
        yw = vec3(v0.y, v1.y, v2.y);
        if (period.x > 0.0)
            xw = mod(vec3(v0.x, v1.x, v2.x), period.x);
        if (period.y > 0.0)
            yw = mod(vec3(v0.y, v1.y, v2.y), period.y);
        // Transform back to simplex space and fix rounding errors
        iu = floor(xw + 0.5 * yw + 0.5);
        iv = floor(yw + 0.5);
    } else { // Shortcut if neither x nor y periods are specified
        iu = vec3(i0.x, i1.x, i2.x);
        iv = vec3(i0.y, i1.y, i2.y);
    }

    // Compute one pseudo-random hash value for each corner
    vec3 hash = mod(iu, 289.0);
    hash = mod((hash * 51.0 + 2.0) * hash + iv, 289.0);
    hash = mod((hash * 34.0 + 10.0) * hash, 289.0);

    // Pick a pseudo-random angle and add the desired rotation
    vec3 psi = hash * 0.07482 + alpha;
    vec3 gx = cos(psi);
    vec3 gy = sin(psi);

    // Reorganize for dot products below
    vec2 g0 = vec2(gx.x, gy.x);
    vec2 g1 = vec2(gx.y, gy.y);
    vec2 g2 = vec2(gx.z, gy.z);

    // Radial decay with distance from each simplex corner
    vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
    w = max(w, 0.0);
    vec3 w2 = w * w;
    vec3 w4 = w2 * w2;

    // The value of the linear ramp from each of the corners
    vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));

    // Multiply by the radial decay and sum up the noise value
    float n = dot(w4, gdotx);

    // Compute the first order partial derivatives
    vec3 w3 = w2 * w;
    vec3 dw = -8.0 * w3 * gdotx;
    vec2 dn0 = w4.x * g0 + dw.x * x0;
    vec2 dn1 = w4.y * g1 + dw.y * x1;
    vec2 dn2 = w4.z * g2 + dw.z * x2;
    gradient = 10.9 * (dn0 + dn1 + dn2);

    // Scale the return value to fit nicely into the range [-1,1]
    return 10.9 * n;
}

float parabola(float x, float k) {
    return pow(4.0 * x * (1.0 - x), k);
}

float tone(float x, float k) {
    return (k + 1.0) / (1.0 + k * x);
}

float pcurve(float x, float a, float b) {
    float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
    return k * pow(x, a) * pow(1.0 - x, b);
}

float expStep(float x, float n) {
    return exp2(-exp2(n) * pow(x, n));
}

float gain(float x, float k) {
    float a = 0.5 * pow(2.0 * ((x < 0.5) ? x : 1.0 - x), k);
    return (x < 0.5) ? a : 1.0 - a;
}

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float xxhash(vec2 x) { // https://xxhash.com/
    uvec2 t = floatBitsToUint(x);
    uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
    h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
    h += 0xc2b2ae3du * t.y;
    h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
    h ^= h >> 15u;
    h *= 0x85ebca77u;
    h ^= h >> 13u;
    h *= 0xc2b2ae3du;
    h ^= h >> 16u;
    return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}

vec2 hash(vec2 x) {
    float k = 6.283185307 * xxhash(x);
    return vec2(cos(k), sin(k));
}

float simplexNoise(in vec2 p) { // Stefan Gustavson's version; https://www.shadertoy.com/view/43tBDr
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0))); // changed to h^3 [1]

    return dot(n, vec3(32.99)); // analytic factor (= 2916*sqrt(2)/125)
}

// vec3 displace(vec3 pos, vec3 normal, vec2 uv, float time) {
//     vec2 gradient;
//     vec2 p = vec2(0.0);
//     float d = psrdnoise(5.0 * vec2(uv.x * 1., uv.y * 1.), p, time, gradient);
//
//     d = map(d, -1., 1., 0., 1.);
//     d = tone(d, 3.0) * 0.2;
//
//     float amountX = smoothstep(0.0, 0.5, uv.x) - smoothstep(0.5, 1.0, uv.x);
//     float amountY = smoothstep(0.0, 0.5, uv.y) - smoothstep(0.5, 1.0, uv.y);
//     float amount = 1.0;
//
//     pos.xyz += (normal * 200.0 * d * amount);
//     return pos;
// }

vec3 displace(vec2 uv, vec3 position, float time, float frequencyX, float frequencyY, float amount) {
    float noise = simplexNoise(vec2(position.x * frequencyX + time, position.z * frequencyY + time));
    float dist = map(uv.x, 0.0, 1.0, -1.0, 1.0);
    position.y += amount * noise;
    return position;
}

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

void main(void) {
    v_time = u_time;
    v_uv = uv;
    v_tangent = tangent;
    v_resolution = u_resolution;

    mat4 rotationA = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyY * expStep(v_uv.x, u_twistPowerY));
    mat4 rotationB = rotationMatrix(vec3(0.0, 0.5, 0.5), u_twistFrequencyX * expStep(v_uv.y, u_twistPowerX));
    mat4 rotationC = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyZ * expStep(v_uv.y, u_twistPowerZ));

    float speed = 0.00007;
    float offset = 1.0;

    vec3 biTangent = cross(tangent.xyz, normal.xyz);
    vec3 displacedPosition = displace(uv, position.xyz, u_time * speed, u_displaceFrequencyX, u_displaceFrequencyZ, u_displaceAmount);
    vec3 displacedTangent = displace(uv, position.xyz - tangent.xyz * offset, u_time * speed, u_displaceFrequencyX, u_displaceFrequencyZ, u_displaceAmount);
    vec3 displacedBiTangent = displace(uv, position.xyz - biTangent.xyz * offset, u_time * speed, u_displaceFrequencyX, u_displaceFrequencyZ, u_displaceAmount);

    v_position = displacedPosition;
    v_position = (vec4(v_position, 1.0) * rotationA).xyz;
    v_position = (vec4(v_position, 1.0) * rotationB).xyz;
    v_position = (vec4(v_position, 1.0) * rotationC).xyz;

    v_normal = cross(normalize(displacedBiTangent - displacedPosition), normalize(displacedTangent - displacedPosition));
    v_normal = (vec4(v_normal, 1.0) * rotationA).xyz;
    v_normal = (vec4(v_normal, 1.0) * rotationB).xyz;
    v_normal = (vec4(v_normal, 1.0) * rotationC).xyz;

    // mat3 normalMatrix = transpose(inverse(mat3(modelMatrix)));
    v_normal = normalize(transpose(mat3(modelMatrix)) * v_normal);

    vec4 mvPosition = modelViewMatrix * vec4(v_position, 1.0);
    v_position = (modelMatrix * vec4(v_position, 1.0)).xyz;

    gl_Position = projectionMatrix * mvPosition;
}`;
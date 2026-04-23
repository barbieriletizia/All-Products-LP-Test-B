export default `
precision highp float;

varying float v_time;
varying vec2 v_uv;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_position;
varying vec2 v_resolution;

uniform vec2 u_mousePosition;

uniform sampler2D u_paletteTexture;
uniform sampler2D u_solidPaletteTexture;
uniform sampler2D u_lutTexture;
uniform sampler2D u_blueNoiseTexture;

uniform float u_colorSaturation;
uniform float u_colorVibrance;
uniform float u_colorContrast;
uniform float u_colorHueShift;

uniform float u_lineAmount;
uniform float u_lineThickness;
uniform float u_lineDerivativePower;

uniform float u_glowAmount;
uniform float u_glowPower;

struct FresnelLight {
    vec3 direction;
    vec3 color;
    vec3 position;
    float intensity;
    float amount;
    float exponent;
};

uniform FresnelLight u_lights[10];
uniform int u_numLights;

/*
contributors: Patricio Gonzalez Vivo
description: change saturation of a color
use: desaturate(<float|vec3|vec4> color, float amount)
*/

#ifndef FNC_DESATURATE
#define FNC_DESATURATE
vec3 desaturate(in vec3 v, in float a) {
    return mix(v, vec3(dot(vec3(.3, .59, .11), v)), a);
}

vec4 desaturate(in vec4 v, in float a) {
    return vec4(desaturate(v.rgb, a), v.a);
}
#endif

#ifndef SAMPLER_FNC
#if __VERSION__ >= 300
#define SAMPLER_FNC(TEX, UV) texture(TEX, UV)
#else
#define SAMPLER_FNC(TEX, UV) texture2D(TEX, UV)
#endif
#endif

#ifndef SAMPLER_TYPE
#define SAMPLER_TYPE sampler2D
#endif

/*
contributors: Patricio Gonzalez Vivo
description: given a Spherical Map texture and a normal direction returns the right pixel
use: spheremap(<SAMPLER_TYPE> texture, <vec3> normal)
options:
    SPHEREMAP_EYETOPOINT: where the eye is looking
*/

#ifndef SPHEREMAP_TYPE
#define SPHEREMAP_TYPE vec4
#endif

#ifndef SPHEREMAP_SAMPLER_FNC
#define SPHEREMAP_SAMPLER_FNC(TEX, UV) SAMPLER_FNC(TEX, UV)
#endif

#ifndef FNC_SPHEREMAP
#define FNC_SPHEREMAP
vec2 sphereMap(const in vec3 normal, const in vec3 eye) {
    vec3 r = reflect(-eye, normal);
    r.z += 1.0;
    float m = 2.0 * length(r);
    return r.xy / m + 0.5;
}

SPHEREMAP_TYPE sphereMap(in SAMPLER_TYPE tex, const in vec3 normal, const in vec3 eye) {
    return SPHEREMAP_SAMPLER_FNC(tex, sphereMap(normal, eye));
}
#endif

/*
contributors: Patricio Gonzalez Vivo
description: bias high pass
use: <vec4|vec3|float> contrast(<vec4|vec3|float> value, <float> amount)
*/

#ifndef FNC_CONTRAST
#define FNC_CONTRAST
float contrast(in float v, in float a) {
    return (v - 0.5) * a + 0.5;
}
vec3 contrast(in vec3 v, in float a) {
    return (v - 0.5) * a + 0.5;
}
vec4 contrast(in vec4 v, in float a) {
    return vec4((v.rgb - 0.5) * a + 0.5, v.a);
}
#endif

/*
contributors: Christian Cann Schuldt Jensen ~ CeeJay.dk
description: |
    Vibrance is a smart-tool which cleverly increases the intensity of the more muted colors and leaves the already well-saturated colors alone. Prevents skin tones from becoming overly saturated and unnatural.
    vibrance from https://github.com/CeeJayDK/SweetFX/blob/master/Shaders/Vibrance.fx
use: <vec3|vec4> vibrance(<vec3|vec4> color, <float> v)
license: MIT License (MIT) Copyright (c) 2014 CeeJayDK
*/

/*
contributors: Patricio Gonzalez Vivo
description: extend GLSL Max function to add more arguments
use:
    - max(<float> A, <float> B, <float> C[, <float> D])
    - max(<vec2|vec3|vec4> A)
*/

#ifndef FNC_MMAX
#define FNC_MMAX

float mmax(in float a, in float b) {
    return max(a, b);
}
float mmax(in float a, in float b, in float c) {
    return max(a, max(b, c));
}
float mmax(in float a, in float b, in float c, in float d) {
    return max(max(a, b), max(c, d));
}
float mmax(const vec2 v) {
    return max(v.x, v.y);
}
float mmax(const vec3 v) {
    return mmax(v.x, v.y, v.z);
}
float mmax(const vec4 v) {
    return mmax(v.x, v.y, v.z, v.w);
}

#endif

/*
contributors: Patricio Gonzalez Vivo
description: extend GLSL min function to add more arguments
use:
  - min(<float> A, <float> B, <float> C[, <float> D])
  - min(<vec2|vec3|vec4> A)
*/

#ifndef FNC_MMIN
#define FNC_MMIN

float mmin(const float v) {
    return v;
}
float mmin(in float a, in float b) {
    return min(a, b);
}
float mmin(in float a, in float b, in float c) {
    return min(a, min(b, c));
}
float mmin(in float a, in float b, in float c, in float d) {
    return min(min(a, b), min(c, d));
}

float mmin(const vec2 v) {
    return min(v.x, v.y);
}
float mmin(const vec3 v) {
    return mmin(v.x, v.y, v.z);
}
float mmin(const vec4 v) {
    return mmin(v.x, v.y, v.z, v.w);
}

#endif

/*
contributors: Patricio Gonzalez Vivo
description: |
    Get's the luminosity from linear RGB, based on Rec709 luminance (see https://en.wikipedia.org/wiki/Grayscale)
use: <float> rgb2luma(<vec3|vec4> rgb)
*/

#ifndef FNC_RGB2LUMA
#define FNC_RGB2LUMA
float rgb2luma(const in vec3 rgb) {
    return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}
float rgb2luma(const in vec4 rgb) {
    return rgb2luma(rgb.rgb);
}
#endif

/*
contributors: Hugh Kennedy (https://github.com/hughsk)
description: get the luminosity of a color. From https://github.com/hughsk/glsl-luma/blob/master/index.glsl
use: luma(<vec3|vec4> color)
*/

#ifndef FNC_LUMA
#define FNC_LUMA
float luma(float v) {
    return v;
}
float luma(in vec3 v) {
    return rgb2luma(v);
}
float luma(in vec4 v) {
    return rgb2luma(v.rgb);
}
#endif

#ifndef FNC_VIBRANCE
#define FNC_VIBRANCE
vec3 vibrance(in vec3 v, in float vi) {
    float max_v = mmax(v);
    float min_v = mmin(v);
    float sat = max_v - min_v;
    float lum = luma(v);
    return mix(vec3(lum), v, 1.0 + (vi * 1.0 - (sign(vi) * sat)));
}

vec4 vibrance(in vec4 v, in float vi) {
    return vec4(vibrance(v.rgb, vi), v.a);
}
#endif

// By Inigo Quilez, under MIT license
// https://www.shadertoy.com/view/ttcyRS
vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
    // https://bottosson.github.io/posts/oklab
    const mat3 kCONEtoLMS = mat3(
        0.4121656120, 0.2118591070, 0.0883097947,
        0.5362752080, 0.6807189584, 0.2818474174,
        0.0514575653, 0.1074065790, 0.6302613616
    );
    const mat3 kLMStoCONE = mat3(
        4.0767245293, -1.2681437731, -0.0041119885,
        -3.3072168827, 2.6093323231, -0.7034763098,
        0.2307590544, -0.3411344290, 1.7068625689
    );

    // rgb to cone (arg of pow can't be negative)
    vec3 lms1 = pow(kCONEtoLMS * lin1, vec3(1.0 / 3.0));
    vec3 lms2 = pow(kCONEtoLMS * lin2, vec3(1.0 / 3.0));
    // lerp
    vec3 lms = mix(lms1, lms2, a);
    // gain in the middle (no oklab anymore, but looks better?)
    lms *= 1.0 + 0.2 * a * (1.0 - a);
    // cone to rgb
    return kLMStoCONE * (lms * lms * lms);
}

float tone(float x, float k) {
    return (k + 1.0) / (1.0 + k * x);
}

float pcurve(float x, float a, float b) {
    float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
    return k * pow(x, a) * pow(1.0 - x, b);
}

float parabola(float x, float k) {
    return pow(4.0 * x * (1.0 - x), k);
}

vec3 hueShift(vec3 color, float hueAdjust) {
    const vec3 kRGBToYPrime = vec3(0.299, 0.587, 0.114);
    const vec3 kRGBToI = vec3(0.596, -0.275, -0.321);
    const vec3 kRGBToQ = vec3(0.212, -0.523, 0.311);

    const vec3 kYIQToR = vec3(1.0, 0.956, 0.621);
    const vec3 kYIQToG = vec3(1.0, -0.272, -0.647);
    const vec3 kYIQToB = vec3(1.0, -1.107, 1.704);

    float YPrime = dot(color, kRGBToYPrime);
    float I = dot(color, kRGBToI);
    float Q = dot(color, kRGBToQ);
    float hue = atan(Q, I);
    float chroma = sqrt(I * I + Q * Q);

    hue += hueAdjust;

    Q = chroma * sin(hue);
    I = chroma * cos(hue);

    vec3 yIQ = vec3(YPrime, I, Q);
    return vec3(dot(yIQ, kYIQToR), dot(yIQ, kYIQToG), dot(yIQ, kYIQToB));
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

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 invertColor(vec4 color) {
    return vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, color.a);
}

vec2 rotateUV(vec2 uv, float rotation) {
    float mid = 0.5;
    return vec2(
        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
    );
}

vec2 rotateUV(vec2 uv, float rotation, vec2 mid) {
    return vec2(
        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
    );
}

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float nSimplexNoise(in vec2 p) {
    float n = simplexNoise(p);
    return map(n, -1.0, 1.0, 0.0, 1.0);
}

vec3 brush(float pdx) {
    float scaledPdx = 1.0 - pow(abs(pdx * 500.0), 2.0);
    scaledPdx = max(0.0, scaledPdx);
    // scaledPdx = smoothstep(0.9997, 1.0, scaledPdx);
    return vec3(scaledPdx);
}

void main(void) {
    vec2 st = gl_FragCoord.xy / v_resolution.xy;
    float l = length(v_uv);
    float n = length(vec2(dFdx(l), dFdy(l)));
    vec4 color = vec4(vec3(1.0 - smoothstep(0.0, 0.0005, pow(n, 1.0))), 1.0);
    gl_FragColor = color;
}`;

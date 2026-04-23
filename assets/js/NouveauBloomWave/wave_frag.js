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
uniform sampler2D u_lutTexture;
uniform sampler2D u_blueNoiseTexture;

uniform float u_colorSaturation;
// uniform float u_colorVibrance;
uniform float u_colorContrast;
uniform float u_colorHueShift;
uniform float u_colorOffset;
uniform float u_grayscale;

uniform float u_lineAmount;
uniform float u_lineThickness;
uniform float u_lineDerivativePower;

uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;

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
contributors: ["Patricio Gonzalez Vivo", "David Hoskins", "Inigo Quilez"]
description: pass a value and get some random normalize value between 0 and 1
use: float random[2|3](<float|vec2|vec3> value)
options:
    - RANDOM_HIGHER_RANGE: for working with a range over 0 and 1
    - RANDOM_SINLESS: Use sin-less random, which tolerates bigger values before producing pattern. From https://www.shadertoy.com/view/4djSRW
    - RANDOM_SCALE: by default this scale if for number with a big range. For producing good random between 0 and 1 use bigger range
examples:
    - /shaders/generative_random.frag
license:
    - MIT License (MIT) Copyright 2014, David Hoskins
*/

#ifndef RANDOM_SCALE
#ifdef RANDOM_HIGHER_RANGE
#define RANDOM_SCALE vec4(.1031, .1030, .0973, .1099)
#else
#define RANDOM_SCALE vec4(443.897, 441.423, .0973, .1099)
#endif
#endif

#ifndef FNC_RANDOM
#define FNC_RANDOM
float random(in float x) {
#ifdef RANDOM_SINLESS
    x = fract(x * RANDOM_SCALE.x);
    x *= x + 33.33;
    x *= x + x;
    return fract(x);
#else
    return fract(sin(x) * 43758.5453);
#endif
}

float random(in vec2 st) {
#ifdef RANDOM_SINLESS
    vec3 p3 = fract(vec3(st.xyx) * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
#else
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
#endif
}

float random(in vec3 pos) {
#ifdef RANDOM_SINLESS
    pos = fract(pos * RANDOM_SCALE.xyz);
    pos += dot(pos, pos.zyx + 31.32);
    return fract((pos.x + pos.y) * pos.z);
#else
    return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
#endif
}

float random(in vec4 pos) {
#ifdef RANDOM_SINLESS
    pos = fract(pos * RANDOM_SCALE);
    pos += dot(pos, pos.wzxy + 33.33);
    return fract((pos.x + pos.y) * (pos.z + pos.w));
#else
    float dot_product = dot(pos, vec4(12.9898, 78.233, 45.164, 94.673));
    return fract(sin(dot_product) * 43758.5453);
#endif
}

vec2 random2(float p) {
    vec3 p3 = fract(vec3(p) * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 random2(vec2 p) {
    vec3 p3 = fract(p.xyx * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 random2(vec3 p3) {
    p3 = fract(p3 * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 random3(float p) {
    vec3 p3 = fract(vec3(p) * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec3 random3(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * RANDOM_SCALE.xyz);
    p3 += dot(p3, p3.yxz + 19.19);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec3 random3(vec3 p) {
    p = fract(p * RANDOM_SCALE.xyz);
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yzz) * p.zyx);
}

vec4 random4(float p) {
    vec4 p4 = fract(p * RANDOM_SCALE);
    p4 += dot(p4, p4.wzxy + 19.19);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec4 random4(vec2 p) {
    vec4 p4 = fract(p.xyxy * RANDOM_SCALE);
    p4 += dot(p4, p4.wzxy + 19.19);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec4 random4(vec3 p) {
    vec4 p4 = fract(p.xyzx * RANDOM_SCALE);
    p4 += dot(p4, p4.wzxy + 19.19);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec4 random4(vec4 p4) {
    p4 = fract(p4 * RANDOM_SCALE);
    p4 += dot(p4, p4.wzxy + 19.19);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}
#endif

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

/*
function: luminance
contributor: nan
description: Computes the luminance of the specified linear RGB color using the luminance coefficients from Rec. 709.
use: luminance(<vec3|vec4> color)
*/

#ifndef FNC_LUMINANCE
#define FNC_LUMINANCE
float luminance(in vec3 linear) {
    return dot(linear, vec3(0.21250175, 0.71537574, 0.07212251));
}
float luminance(in vec4 linear) {
    return luminance(linear.rgb);
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

float snoise(vec3 v) {
    const vec2 C = 1.0 / vec2(6, 3);
    const vec4 D = vec4(0, .5, 1, 2);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.x;
    vec3 x2 = x0 - i2 + C.y;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec3 ns = .142857142857 * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = floor(j - 7.0 * x_) * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 sh = -step(h, vec4(0));
    vec4 a0 = b0.xzyw + (floor(b0) * 2.0 + 1.0).xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + (floor(b1) * 2.0 + 1.0).xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = inversesqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    return .5 + 12.0 * dot(m * m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 snoiseVec3(vec3 x) {
    return vec3(
        snoise(vec3(x) * 2.0 - 1.0),
        snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)) * 2.0 - 1.0,
        snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4) * 2.0 - 1.0)
    );
}

vec3 lottes(vec3 x) {
    const vec3 a = vec3(1.6);
    const vec3 d = vec3(0.977);
    const vec3 hdrMax = vec3(8.0);
    const vec3 midIn = vec3(0.18);
    const vec3 midOut = vec3(0.267);

    const vec3 b = (-pow(midIn, a) + pow(hdrMax, a) * midOut) /
        ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);
    const vec3 c = (pow(hdrMax, a * d) * pow(midIn, a) - pow(hdrMax, a) * pow(midIn, a * d) * midOut) /
        ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);

    return pow(x, a) / (pow(x, a * d) * b + c);
}

vec3 aces(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float blendColorBurn(in float base, in float blend) {
    return (blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0);
}

vec3 blendColorBurn(in vec3 base, in vec3 blend) {
    return vec3(blendColorBurn(base.r, blend.r), blendColorBurn(base.g, blend.g), blendColorBurn(base.b, blend.b));
}

float blendColorDodge(in float base, in float blend) {
    return (blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0);
}

vec3 blendColorDodge(in vec3 base, in vec3 blend) {
    return vec3(blendColorDodge(base.r, blend.r), blendColorDodge(base.g, blend.g), blendColorDodge(base.b, blend.b));
}

vec3 brush(vec2 uv, vec3 pos, float pdx, float mouseDistance) {
    // Value 0-360: ramp 0->180 then back 180->360 (triangle). More dramatic shift at lower levels via power curve.
    float phase = u_colorOffset / 180.0;
    float triangle = phase <= 1.0 ? phase : (2.0 - phase);
    float curve = pow(triangle, 0.55);
    float paletteShift = curve * 8.0;
    vec2 paletteUV = vec2(fract(uv.x + paletteShift), uv.y);
    vec3 color = texture2D(u_paletteTexture, paletteUV).rgb;

    // Warm red–purple tint at 180 so reds get more purple and purple stays in the mix
    float warmPeak = 1.0 - abs(phase - 1.0);
    vec3 warmTint = vec3(0.78, 0.28, 0.72);
    color = mix(color, warmTint, warmPeak * 0.55);

    float ipdx = 1.0 - pdx;
    float p = 1.0 - parabola(uv.x, 3.0);

    // glowAmount += pow(max(1.0 - mouseDistance, 0.0), 4.0) * 1.0;
    // float highlightAmount = pow((1.0 - pd) * glowAmount, u_glowPower) * 1.0;
    // highlightAmount *= 1.0 - parabola(uv.x, 0.25);

    float n0 = simplexNoise(vec2(v_uv.x * 0.1, v_uv.y * 0.5));
    float n1 = nSimplexNoise(vec2(v_uv.x * (600.0 + (300.0 * n0)), v_uv.y * 4.0 * n0));

    vec3 textureColor = color;
    // textureColor += highlightAmount;

    //textureColor = hueShift(textureColor, abs(n1) * (1.0 - pow(textureColor.b, 3.0)) * pdx * p);
    //textureColor = contrast(textureColor, 1.0 + (n1 * 1.0 * (1.0 - pow(textureColor.b, 1.8)) * pdx * p));
    textureColor += (n1 * 0.2 * (1.0 - textureColor.b * 0.9) * pdx * p);

    // vec3 brighterColor = textureColor * pow(1.0 + (abs(n1) * pdx * p), 1.0 * (1.0 - color.b * 0.75));
    // textureColor = blendColorBurn(textureColor, brighterColor);

    // textureColor.r += 0.5 * n1 * pdx * p;
    // textureColor.g += 0.1 * n1 * pdx * p;
    // textureColor.b += 0.1 * n1 * pdx * p;

    // textureColor.g -= 0.25 * n1 * pdx * p;
    // textureColor = mix(textureColor, vec3(1.0), ipdx);
    // textureColor += ipdx;

    color = textureColor;
    return color;

    /*
    // float n1 = nSimplexNoise(vec2(v_uv.x * 1000.0, v_uv.y * 6.0) + time);
    float n = simplexNoise(vec2(v_uv.y * 1.0, v_uv.x * 1.0));
    n = map(-1.0, 1.0, 0.0, 1.0, n);
    float n1 = nSimplexNoise(vec2(v_uv.x * (700.0 + (20.0 * n)), v_uv.y * 3.0 * n));
    n1 = pow(n1, 6.0);
    float n2 = nSimplexNoise(vec2(v_uv.x * 1.0 * pdx, v_uv.y * 1.0) + time);
    float n3 = nSimplexNoise(vec2(v_uv.x * 1.0, v_uv.y * 5.0) + time);

    vec4 color1 = texture2D(u_paletteTexture, vec2(n1, uv.y));
    vec4 color2 = texture2D(u_paletteTexture, vec2(n2, uv.y));
    vec4 color3 = texture2D(u_paletteTexture, vec2(n3, uv.y));

    vec3 purpleColor = vec3(0.72, 0.0, 1.0);
    vec3 yellowColor = vec3(1.0, 0.97, 0.65);
    vec3 pinkColor = vec3(0.82, 0.0, 1.0);
    vec3 whiteColor = vec3(1.0);
    vec3 orangeColor = vec3(1.0, 0.57, 0.0);

    vec3 color = color1.rgb + scaledPdx * 0.1;
    color.rgb = mix(color.rgb, yellowColor, nSimplexNoise(vec2(v_uv.x * 5., v_uv.y) + time));
    color.rgb = mix(color.rgb, pinkColor, nSimplexNoise(vec2(v_uv.x * 1., v_uv.y) + time) * 0.2);

    color.r += pow(simplexNoise(vec2(v_uv.x * 2.2, v_uv.y * 2.0) + time) * 0.5, 1.0);
    color.b -= pow(simplexNoise(vec2(v_uv.x * 2.2, v_uv.y * 2.0) + time) * 0.5, 1.0);
    // color.g += pow(simplexNoise(vec2(v_uv.x * 3.0, v_uv.y * 2.0) + time) * 0.3, 1.0);

    // color.r -= pow(simplexNoise(vec2(v_uv.x * 8., v_uv.y * 2.0) + time) * 0.2, 1.0);
    color.g -= pow(nSimplexNoise(vec2(v_uv.x * 2.0, v_uv.y * 4.0) + time) * 0.2, 1.0);

    // color.g = min(max(color.r, color.b), color.g);
    color.r = max(color.r, color.g * 0.9);
    color.b = max(color.b, color.g * 1.0);

    // White highlights
    float glowAmount = u_glowAmount;
    glowAmount += pow(max(1.0 - mouseDistance, 0.0), 6.0) * 5.0;

    float highlightAmount = pow(scaledPdx * glowAmount, u_glowPower) * 1.0;
    highlightAmount *= 1.0 - parabola(uv.x, 0.5);
    color = oklab_mix(color, vec3(1.0), min(highlightAmount, 1.0));

    color.r = max(min(color.r, 1.0), 0.0);
    color.b = max(min(color.b, 1.0), 0.0);
    color.g = max(min(color.g, 1.0), 0.0);

    return color;
    */
}

/* Start FBM functions */

float fbm_hash(vec2 p) {
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
}

float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    float a = fbm_hash(i);
    float b = fbm_hash(i + vec2(1.0, 0.0));
    float c = fbm_hash(i + vec2(0.0, 1.0));
    float d = fbm_hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 palette(in float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.45, 0.25, 0.14);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.1, 0.2);
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 fresnel_glow(float amount, float intensity, vec3 color, vec3 normal, vec3 view) {
    return pow((1.0 - dot(normalize(normal), normalize(view))), amount) * color * intensity;
}

void main(void) {
    vec2 st = gl_FragCoord.xy / v_resolution.xy;

    vec2 dx = dFdx(v_uv);
    vec2 dy = dFdy(v_uv);

    float c = dy.y * v_resolution.y * u_glowAmount;
    c = map(c, -1.0, 1.0, 0.0, 1.0);
    c = clamp(c, 0.0, 1.0);
    c = pow(c, u_glowPower);
    c = smoothstep(0.0, u_glowRamp, c);
    c = clamp(c, 0.0, 1.0);

    float mouseDistance = distance(st, u_mousePosition);
    vec4 color = vec4(brush(v_uv, v_position, c, mouseDistance), 1.0);

    float viewSpeed = 0.1;
    float noiseX = simplexNoise(vec2(v_uv.x * 1.0 * dx.y + viewSpeed, v_uv.y * 1.0 + viewSpeed));
    float noiseY = simplexNoise(vec2(v_uv.x * 1.0 * dx.y + viewSpeed, v_uv.y * 1.0 + viewSpeed));

    // vec3 viewDirA = normalize(vec3(0.0, -cos(noiseY), sin(noiseX)));
    // vec3 viewDirA = normalize(vec3(0.5, -0.0, -0.75));
    // vec3 viewDirB = normalize(vec3(-sin(noiseY), cos(noiseX), -sin(noiseY)));
    // vec3 viewDirC = normalize(vec3(0.0, 0.0, -0.1));
    // vec3 viewDirD = normalize(vec3(0.0, -.0, -0.5));

    // vec3 fresnelColorA = vec3(1.0);
    // vec3 fresnelColorB = vec3(1.0);
    // vec3 fresnelColorC = vec3(1.0, 1.0, 0.0);
    // vec3 fresnelColorC = vec3(0.0, 1.0, 0.05);
    // vec3 fresnelColorD = vec3(0.0, 1.0, 0.9);

    // vec3 fresnelA = fresnel_glow(1.5, 0.05, fresnelColorA, v_normal, viewDirA);
    // vec3 fresnelB = fresnel_glow(3.0, 0.01, fresnelColorB, v_normal, viewDirB);
    // vec3 fresnelC = fresnel_glow(1.0, 0.1, fresnelColorC, v_normal, viewDirC);
    // vec3 fresnelD = fresnel_glow(5.0, 0.005, fresnelColorD, v_normal, viewDirD);

    // color.rgb += fresnelA;
    // color.rgb += fresnelB;
    // color.rgb -= fresnelC;
    // color.rgb *= 1.0 + fresnelD;

    color.rgb = contrast(color.rgb, u_colorContrast);
    color.rgb = desaturate(color.rgb, 1.0 - u_colorSaturation);
    color.rgb = hueShift(color.rgb, u_colorHueShift);
    
    // Apply grayscale effect (0.0 = full color, 1.0 = full grayscale)
    color.rgb = desaturate(color.rgb, u_grayscale);

    for (int i = 0; i < u_numLights; i++) {
        FresnelLight light = u_lights[i];
        vec3 viewDir = vec3(0.0, 0.0, 1.0);

        float lightPower = dot(normalize(v_normal), normalize(light.direction));
        lightPower = clamp(lightPower, 0.0, 1.0);
        lightPower = pow(lightPower, light.exponent);

        vec3 dirToLight = light.position - v_position;
        float distToLight = length(dirToLight);
        float attenuation = clamp(light.amount / distToLight, 0.0, 1.0);

        // lightPower = clamp(lightPower, 0.0, 1.0);
        color.rgb = mix(color.rgb, light.color, attenuation * lightPower);

        // vec3 dir = light.direction;
        // vec3 lightColor = light.color;
        // color.rgb = mix(color.rgb, light.color, light.intensity);
        // color.rgb = light.color;
    }

    // TODO: decide whether vibrance is valuable here
    // color.rgb = vibrance(color.rgb, 0.5);

    // float rb = max(color.r, color.b);
    // color.g = min(rb * 0.8, color.g);

    color += (1.0 - c) * 0.25;
    gl_FragColor = color;
    // gl_FragColor = vec4(vec3(1.0 - c), 1.0);
}`;

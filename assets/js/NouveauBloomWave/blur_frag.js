export default `
uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform sampler2D u_derivative;
uniform float u_blurAmount;
uniform float u_diffuseBlur;
uniform float u_grainAmount;
uniform float u_opaque;
uniform vec2 u_resolution;
varying vec2 v_uv;

#define WINDOW_SIZE 5
#define DEPTH_PER_CHANNEL 64

const int REGION_SIZE = (WINDOW_SIZE + 1) / 2;
const int REGION_N = REGION_SIZE * REGION_SIZE;

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

// Mathematical constants
#ifndef QTR_PI
#define QTR_PI 0.78539816339
#endif
#ifndef HALF_PI
#define HALF_PI 1.5707963267948966192313216916398
#endif
#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif
#ifndef TAU
#define TAU 6.2831853071795864769252867665590
#endif
#ifndef INV_PI
#define INV_PI 0.31830988618379067153776752674503
#endif
#ifndef INV_SQRT_TAU
#define INV_SQRT_TAU 0.39894228040143267793994605993439 // 1.0/SQRT_TAU
#endif
#ifndef SQRT_HALF_PI
#define SQRT_HALF_PI 1.25331413732
#endif
#ifndef PHI
#define PHI 1.618033988749894848204586834
#endif
#ifndef EPSILON
#define EPSILON 0.0000001
#endif
#ifndef GOLDEN_RATIO
#define GOLDEN_RATIO 1.6180339887
#endif
#ifndef GOLDEN_RATIO_CONJUGATE
#define GOLDEN_RATIO_CONJUGATE 0.61803398875
#endif
#ifndef GOLDEN_ANGLE // (3.-sqrt(5.0))*PI radians
#define GOLDEN_ANGLE 2.39996323
#endif

// Sampler functions
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
function: nearest
contributors: Patricio Gonzalez Vivo
description: sampling function to make a texture behave like GL_NEAREST
use: nearest(vec2 st, <vec2> res)
*/

#ifndef NEAREST_FLOOR_FNC
#define NEAREST_FLOOR_FNC(UV) floor(UV)
#endif

#ifndef FNC_NEAREST
#define FNC_NEAREST
vec2 nearest(in vec2 v, in vec2 res) {
    vec2 offset = 0.5 / (res - 1.0);
    return NEAREST_FLOOR_FNC(v * res) / res + offset;
}
#endif

/*
contributors: Patricio Gonzalez Vivo
description: fakes a nearest sample
use: <vec4> sampleNearest(<SAMPLER_TYPE> tex, <vec2> st, <vec2> texResolution);
options:
    - SAMPLER_FNC(TEX, UV)
examples:
    - /shaders/sample_filter_nearest.frag
*/

#ifndef FNC_SAMPLENEAREST
#define FNC_SAMPLENEAREST
vec4 sampleNearest(SAMPLER_TYPE tex, vec2 st, vec2 texResolution) {
    return SAMPLER_FNC(tex, nearest(st, texResolution));
}
#endif

/*
contributors: ["Alan Wolfe", "Patricio Gonzalez Vivo"]
description: Generic blur using a noise function inspired on https://www.shadertoy.com/view/XsVBDR
use: noiseBlur(<SAMPLER_TYPE> texture, <vec2> st, <vec2> pixel, <float> radius)
options:
    - NOISEBLUR_TYPE: default to vec3
    - NOISEBLUR_GAUSSIAN_K: no gaussian by default
    - NOISEBLUR_RANDOM23_FNC(UV): defaults to random2(UV)
    - NOISEBLUR_SAMPLER_FNC(UV): defualts to texture2D(tex, UV).rgb
    - NOISEBLUR_SAMPLES: default to 4
    - SAMPLER_FNC(TEX, UV): optional depending the target version of GLSL (texture2D(...) or texture(...))
examples:
    - /shaders/filter_noiseBlur2D.frag
*/

#ifndef NOISEBLUR_SAMPLES
#define NOISEBLUR_SAMPLES 16.0
#endif

#ifndef NOISEBLUR_TYPE
#define NOISEBLUR_TYPE vec4
#endif

#ifndef NOISEBLUR_SAMPLER_FNC
#define NOISEBLUR_SAMPLER_FNC(TEX, UV) SAMPLER_FNC(TEX, UV)
#endif

#ifndef NOISEBLUR_RANDOM23_FNC
#define NOISEBLUR_RANDOM23_FNC(UV) random2(UV)
#endif

#ifndef FNC_NOISEBLUR
#define FNC_NOISEBLUR

NOISEBLUR_TYPE noiseBlur(in SAMPLER_TYPE tex, in vec2 st, in vec2 pixel, float radius) {
    float blurRadius = radius;
    vec2 noiseOffset = st;

    #ifdef NOISEBLUR_SECS
    noiseOffset += 1337.0 * fract(NOISEBLUR_SECS * 0.1);
    #endif

    NOISEBLUR_TYPE result = NOISEBLUR_TYPE(0.0);
    for (float i = 0.0; i < NOISEBLUR_SAMPLES; ++i) {
        #if defined(BLUENOISE_TEXTURE) && defined(BLUENOISE_TEXTURE_RESOLUTION)
        vec2 noiseRand = sampleNearest(BLUENOISE_TEXTURE, noiseOffset.xy, BLUENOISE_TEXTURE_RESOLUTION).xy;
        #else
        vec2 noiseRand = NOISEBLUR_RANDOM23_FNC(vec3(noiseOffset.xy, i));
        #endif

        noiseOffset = noiseRand;

        vec2 r = noiseRand;
        r.x *= TAU;

        #if defined(NOISEBLUR_GAUSSIAN_K)
        // box-muller transform to get gaussian distributed sample points in the circle
        vec2 cr = vec2(sin(r.x), cos(r.x)) * sqrt(-NOISEBLUR_GAUSSIAN_K * log(r.y));
        #else
        // uniform sample the circle
        vec2 cr = vec2(sin(r.x), cos(r.x)) * sqrt(r.y);
        #endif

        NOISEBLUR_TYPE color = NOISEBLUR_SAMPLER_FNC(tex, st + cr * blurRadius * pixel);
        // average the samples as we get em
        // https://blog.demofox.org/2016/08/23/incremental-averaging/
        result = mix(result, color, 1.0 / (i + 1.0));
    }
    return result;
}

NOISEBLUR_TYPE noiseBlur(SAMPLER_TYPE tex, vec2 st, vec2 pixel) {
    NOISEBLUR_TYPE rta = NOISEBLUR_TYPE(0.0);
    float total = 0.0;
    float offset = random(vec3(12.9898 + st.x, 78.233 + st.y, 151.7182));
    for (float t = -NOISEBLUR_SAMPLES; t <= NOISEBLUR_SAMPLES; t++) {
        float percent = (t / NOISEBLUR_SAMPLES) + offset - 0.5;
        float weight = 1.0 - abs(percent);
        NOISEBLUR_TYPE color = NOISEBLUR_SAMPLER_FNC(tex, st + pixel * percent);
        rta += color * weight;
        total += weight;
    }
    return rta / total;
}
#endif

// Utility functions
vec3 dithering(vec3 color) {
    float grid_position = random(gl_FragCoord.xy * 0.01);
    vec3 dither_shift_RGB = vec3(4.0 / 255.0, 8.0 / 255.0, 4.0 / 255.0);
    dither_shift_RGB = mix(u_grainAmount * dither_shift_RGB, -u_grainAmount * dither_shift_RGB, grid_position);
    return color + dither_shift_RGB;
}

mat2 rotate(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float rand(vec2 uv) {
    return fract(sin(dot(vec2(12.9898, 78.233), uv)) * 43758.5453123);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 tex(vec2 uv) {
    uv -= 0.5;
    // uv *= 1. - (sin(iTime * .25) * .5 + .5) * .4;
    uv += 0.5;
    vec4 col = texture(u_scene, uv);
    float depth = float(DEPTH_PER_CHANNEL);

    col.r = floor(col.r * depth) / depth;
    col.g = floor(col.g * depth) / depth;
    col.b = floor(col.b * depth) / depth;
    col.a = rgb2hsv(col.rgb).b;

    return col;
}

float regionMeanValue(vec4 vals[REGION_N]) {
    float sum = 0.0;

    for (int i = 0; i < REGION_N; ++i) {
        sum += vals[i].a;
    }
    return sum / float(REGION_N);
}

vec3 regionMean(vec4 vals[REGION_N]) {
    vec3 sum = vec3(0);
    for (int i = 0; i < REGION_N; ++i) {
        sum += vals[i].rgb;
    }
    return vec3(sum / float(REGION_N));
}

float regionStandardDeviation(vec4 vals[REGION_N], float mean) {
    float sum = 0.0;

    for (int i = 0; i < REGION_N; ++i) {
        float val = vals[i].a - mean;
        sum += val * val;
    }
    return sqrt(sum / float(REGION_N - 1));
}

vec3 kuwahara(vec2 uv) {
    vec4 p = vec4(dFdx(uv.x), dFdy(uv.y), -dFdy(uv.y), 0.0);

    float angle = 0.75;

    mat2 a = rotate(uv.x + uv.y + rand(uv) + angle) * (u_blurAmount);

    vec4 regVal[REGION_N];
    for (int y = 0; y < REGION_SIZE; ++y) {
        for (int x = 0; x < REGION_SIZE; ++x) {
            regVal[y * REGION_SIZE + x] = tex(uv + a * vec2(-p.x * float(x), -p.y * float(y)));
        }
    }

    float meanValueA = regionMeanValue(regVal);
    vec3 meanA = regionMean(regVal);
    float standardDeviationA = regionStandardDeviation(regVal, meanValueA);

    for (int y = 0; y < REGION_SIZE; ++y) {
        for (int x = 0; x < REGION_SIZE; ++x) {
            regVal[y * REGION_SIZE + x] = tex(uv + a * vec2(p.x * float(x), -p.y * float(y)));
        }
    }

    float meanValueB = regionMeanValue(regVal);
    vec3 meanB = regionMean(regVal);
    float standardDeviationB = regionStandardDeviation(regVal, meanValueB);

    for (int y = 0; y < REGION_SIZE; ++y) {
        for (int x = 0; x < REGION_SIZE; ++x) {
            regVal[y * REGION_SIZE + x] = tex(uv + a * vec2(-p.x * float(x), p.y * float(y)));
        }
    }

    float meanValueC = regionMeanValue(regVal);
    vec3 meanC = regionMean(regVal);
    float standardDeviationC = regionStandardDeviation(regVal, meanValueC);

    for (int y = 0; y < REGION_SIZE; ++y) {
        for (int x = 0; x < REGION_SIZE; ++x) {
            regVal[y * REGION_SIZE + x] = tex(uv + a * vec2(p.x * float(x), p.y * float(y)));
        }
    }

    float meanValueD = regionMeanValue(regVal);
    vec3 meanD = regionMean(regVal);
    float standardDeviationD = regionStandardDeviation(regVal, meanValueD);

    float mostHomogeneous = min(standardDeviationA, min(standardDeviationB, min(standardDeviationC, standardDeviationD)));
    vec3 outMean = vec3(0);
    if (mostHomogeneous == standardDeviationA)
        outMean = meanA;
    if (mostHomogeneous == standardDeviationB)
        outMean = meanB;
    if (mostHomogeneous == standardDeviationC)
        outMean = meanC;
    if (mostHomogeneous == standardDeviationD)
        outMean = meanD;

    return outMean;
}

vec4 blurRadial(sampler2D tex, vec2 texel, vec2 uv, float radius) {
    vec4 total = vec4(0);

    float dist = 1.0 / 20.0;
    float rad = radius * length(texel);
    for (float i = 0.0; i <= 1.0; i += dist) {
        vec2 coord = (uv - 0.5) / (1.0 + rad * i) + 0.5;
        total += texture(tex, coord);
    }

    return total * dist;
}

vec4 blurAngular(sampler2D tex, vec2 texel, vec2 uv, float angle) {
    vec4 total = vec4(0);
    vec2 coord = uv - 0.5;

    float dist = 1.0 / 16.0;
    vec2 dir = vec2(cos(angle * dist), sin(angle * dist));
    mat2 rot = mat2(dir.xy, -dir.y, dir.x);
    for (float i = 0.0; i <= 1.0; i += dist) {
        vec4 color = texture(tex, coord + 0.5);
        // color = vec4(color.rgb / color.a, color.a);
        total += color;
        coord *= rot;
    }

    return total * dist;
}

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float parabola(float x, float k) {
    return pow(4.0 * x * (1.0 - x), k);
}

vec3 aces(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 neutral(vec3 color) {
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;

    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;

    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression)
        return color;

    const float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;

    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, vec3(newPeak), g);
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 st = gl_FragCoord.xy * texel;

    vec4 sceneColor = texture2D(u_scene, v_uv);
    vec3 derivativeColor = texture2D(u_derivative, v_uv).rgb;

    vec4 blurColor = blurAngular(u_scene, texel, v_uv, u_blurAmount);

    float blurPower = smoothstep(0.0, 0.9, v_uv.y) - smoothstep(0.6, 1.0, v_uv.y);
    blurPower = pow(blurPower, 2.0);

    vec4 finalColor = mix(blurColor, sceneColor, blurPower);
    
    // Apply diffuse blur effect (dramatic gaussian-style blur)
    if (u_diffuseBlur > 0.0) {
        // Scale the blur radius dramatically - multiply by 100 for visible effect
        float blurRadius = u_diffuseBlur * 100.0;
        vec4 diffuseBlurred = noiseBlur(u_scene, st, texel, blurRadius);
        // Mix between current result and heavily blurred version
        finalColor = mix(finalColor, diffuseBlurred, min(u_diffuseBlur * 2.0, 1.0));
    }
    
    finalColor.rgb = dithering(finalColor.rgb);

    float alpha = mix(finalColor.a, 1.0, u_opaque);
    gl_FragColor = vec4(min(finalColor.rgb, 1.0), alpha);
}`;

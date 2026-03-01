export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform sampler2D tDiffuse; // Current frame from camera
uniform sampler2D tPrev;    // Previous frame (for accumulation/datamoshing)
uniform float uTime;
uniform vec2 uResolution;
uniform int uEffect;
uniform vec3 uBaseColor;
uniform int uMirror;

varying vec2 vUv;

// Helper functions
float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
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

float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 getSobel(sampler2D tex, vec2 uv, vec2 res) {
    vec2 texel = 1.0 / res;
    float s00 = luma(texture2D(tex, uv + texel * vec2(-1.0, -1.0)).rgb);
    float s10 = luma(texture2D(tex, uv + texel * vec2( 0.0, -1.0)).rgb);
    float s20 = luma(texture2D(tex, uv + texel * vec2( 1.0, -1.0)).rgb);
    float s01 = luma(texture2D(tex, uv + texel * vec2(-1.0,  0.0)).rgb);
    float s21 = luma(texture2D(tex, uv + texel * vec2( 1.0,  0.0)).rgb);
    float s02 = luma(texture2D(tex, uv + texel * vec2(-1.0,  1.0)).rgb);
    float s12 = luma(texture2D(tex, uv + texel * vec2( 0.0,  1.0)).rgb);
    float s22 = luma(texture2D(tex, uv + texel * vec2( 1.0,  1.0)).rgb);
    float sx = s00 + 2.0 * s01 + s02 - (s20 + 2.0 * s21 + s22);
    float sy = s00 + 2.0 * s10 + s20 - (s02 + 2.0 * s12 + s22);
    float dist = sqrt(sx * sx + sy * sy);
    return vec3(dist);
}

void main() {
    vec2 uv = vUv;
    if (uMirror == 1) {
        uv.x = 1.0 - uv.x;
    }
    vec4 color = texture2D(tDiffuse, uv);
    vec4 prevColor = texture2D(tPrev, uv);
    vec3 finalColor = color.rgb;

    // 1-10: Glitch
    if (uEffect == 1) {
        // RGB Split
        float amount = 0.02 * sin(uTime * 5.0);
        finalColor.r = texture2D(tDiffuse, vec2(uv.x + amount, uv.y)).r;
        finalColor.b = texture2D(tDiffuse, vec2(uv.x - amount, uv.y)).b;
    } else if (uEffect == 2) {
        // Pixel Sort (simulated)
        float lum = luma(color.rgb);
        float offset = (lum > 0.5) ? 0.05 * rand(vec2(uv.y, uTime)) : 0.0;
        finalColor = texture2D(tDiffuse, vec2(uv.x, uv.y - offset)).rgb;
    } else if (uEffect == 3) {
        // Datamosh
        float diff = abs(luma(color.rgb) - luma(prevColor.rgb));
        if (diff < 0.1) {
            finalColor = prevColor.rgb;
        } else {
            finalColor = mix(color.rgb, prevColor.rgb, 0.5);
        }
    } else if (uEffect == 4) {
        // Scanlines
        float scanline = sin(uv.y * 800.0) * 0.04;
        finalColor -= scanline;
    } else if (uEffect == 5) {
        // CRT Distortion
        vec2 crtUv = uv * 2.0 - 1.0;
        crtUv *= 1.0 + pow(length(crtUv) / 2.0, 2.0);
        crtUv = crtUv * 0.5 + 0.5;
        if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
            finalColor = vec3(0.0);
        } else {
            finalColor = texture2D(tDiffuse, crtUv).rgb;
        }
    } else if (uEffect == 6) {
        // Digital Glitch
        float noise = rand(vec2(floor(uv.y * 50.0), uTime));
        if (noise > 0.9) {
            finalColor = texture2D(tDiffuse, vec2(uv.x + 0.05, uv.y)).rgb;
        }
    } else if (uEffect == 7) {
        // VHS Tape
        float n = rand(uv + uTime) * 0.1;
        float y = uv.y + sin(uTime * 10.0) * 0.01;
        finalColor = texture2D(tDiffuse, vec2(uv.x, y)).rgb + n;
        finalColor.g *= 0.9;
    } else if (uEffect == 8) {
        // Chromatic Aberration
        vec2 dir = uv - 0.5;
        float d = length(dir);
        finalColor.r = texture2D(tDiffuse, uv + dir * 0.02 * d).r;
        finalColor.b = texture2D(tDiffuse, uv - dir * 0.02 * d).b;
    } else if (uEffect == 9) {
        // Frame Bleed
        finalColor = mix(color.rgb, prevColor.rgb, 0.8);
    } else if (uEffect == 10) {
        // Noise Grain
        float noise = (rand(uv * uTime) - 0.5) * 0.3;
        finalColor += noise;
    } else if (uEffect == 58) {
        // Blocky Glitch
        vec2 blockUv = floor(uv * 20.0) / 20.0;
        float shift = (rand(blockUv + uTime) > 0.9) ? 0.1 : 0.0;
        finalColor = texture2D(tDiffuse, vec2(uv.x + shift, uv.y)).rgb;
    } else if (uEffect == 59) {
        // Color Tear
        float tear = sin(uv.y * 50.0 + uTime * 10.0) * 0.02;
        finalColor.r = texture2D(tDiffuse, uv + vec2(tear, 0.0)).r;
        finalColor.b = texture2D(tDiffuse, uv - vec2(tear, 0.0)).b;
    } else if (uEffect == 60) {
        // VCR Tracking
        float track = fract(uTime * 0.5);
        if (abs(uv.y - track) < 0.05) {
            finalColor += rand(uv * uTime) * 0.5;
            finalColor.x += 0.1;
        }
    } else if (uEffect == 61) {
        // JPEG Artifacts
        vec2 p = floor(uv * 100.0) / 100.0;
        finalColor = floor(texture2D(tDiffuse, p).rgb * 5.0) / 5.0;
    } else if (uEffect == 62) {
        // Time Displacement
        float lum = luma(color.rgb);
        finalColor = mix(color.rgb, prevColor.rgb, lum);
    } else if (uEffect == 87) {
        // Noisy RGB
        float n = rand(uv * uTime) * 0.1;
        finalColor.r = texture2D(tDiffuse, uv + vec2(n, 0.0)).r;
        finalColor.g = texture2D(tDiffuse, uv + vec2(0.0, n)).g;
        finalColor.b = texture2D(tDiffuse, uv - vec2(n, 0.0)).b;
    } else if (uEffect == 90) {
        // Negative Glitch
        if (rand(vec2(uTime, floor(uv.y * 5.0))) > 0.8) {
            finalColor = 1.0 - color.rgb;
            finalColor.r += 0.2;
        }
    } else if (uEffect == 94) {
        // TV Static
        float staticNoise = rand(uv * uTime);
        finalColor = mix(color.rgb, vec3(staticNoise), 0.5);
    } else if (uEffect == 100) {
        // Random Blocks
        vec2 blockUv = floor(uv * 10.0) / 10.0;
        if (rand(blockUv + uTime) > 0.8) {
            finalColor = 1.0 - color.rgb;
        }
    } else if (uEffect == 101) {
        // Channel Shift
        finalColor.r = texture2D(tDiffuse, uv + vec2(0.05, 0.0)).r;
        finalColor.g = texture2D(tDiffuse, uv).g;
        finalColor.b = texture2D(tDiffuse, uv - vec2(0.05, 0.0)).b;
    }
    // 11-20: Color Dynamics
    else if (uEffect == 11) {
        // Strobe
        float strobe = sin(uTime * 20.0) * 0.5 + 0.5;
        finalColor *= strobe;
    } else if (uEffect == 12) {
        // Infrared
        float lum = luma(color.rgb);
        finalColor = vec3(lum, 0.0, 1.0 - lum);
    } else if (uEffect == 13) {
        // Thermal
        float lum = luma(color.rgb);
        finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), lum);
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 1.0, lum));
    } else if (uEffect == 14) {
        // Psychedelic
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x = fract(hsv.x + uTime * 0.5);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 15) {
        // Invert
        finalColor = 1.0 - color.rgb;
    } else if (uEffect == 16) {
        // Sepia
        finalColor.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
        finalColor.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
        finalColor.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
    } else if (uEffect == 17) {
        // Hue Shift
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x = fract(hsv.x + 0.3);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 18) {
        // Duotone
        float lum = luma(color.rgb);
        finalColor = mix(vec3(0.0), uBaseColor, lum);
    } else if (uEffect == 19) {
        // Neon Glow
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = edge * uBaseColor * 2.0;
    } else if (uEffect == 20) {
        // Color Quantize
        float levels = 4.0;
        finalColor = floor(color.rgb * levels) / levels;
    } else if (uEffect == 63) {
        // Cyberpunk
        finalColor.r *= 1.2;
        finalColor.g *= 0.5;
        finalColor.b *= 1.5;
    } else if (uEffect == 64) {
        // Vaporwave
        finalColor.r *= 1.5;
        finalColor.g *= 0.8;
        finalColor.b *= 1.2;
    } else if (uEffect == 65) {
        // Golden Hour
        finalColor.r *= 1.3;
        finalColor.g *= 1.1;
        finalColor.b *= 0.8;
    } else if (uEffect == 66) {
        // Matrix Green
        finalColor = vec3(0.0, luma(color.rgb) * 1.5, 0.0);
    } else if (uEffect == 67) {
        // Blood Red
        finalColor = vec3(luma(color.rgb) * 1.5, 0.0, 0.0);
    } else if (uEffect == 68) {
        // Deep Blue
        finalColor = vec3(0.0, luma(color.rgb) * 0.5, luma(color.rgb) * 1.5);
    } else if (uEffect == 69) {
        // Rainbow Cycle
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x = fract(hsv.x + uTime * 0.2);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 70) {
        // Solarize
        if (luma(color.rgb) > 0.5) finalColor = 1.0 - color.rgb;
    } else if (uEffect == 96) {
        // Infrared Red
        float lum = luma(color.rgb);
        finalColor = vec3(lum, 0.0, 0.0);
    } else if (uEffect == 97) {
        // Color Blindness Sim (Protanopia approx)
        float r = color.r * 0.56667 + color.g * 0.43333;
        float g = color.r * 0.55833 + color.g * 0.44167;
        float b = color.b * 0.24167 + color.b * 0.75833;
        finalColor = vec3(r, g, b);
    } else if (uEffect == 103) {
        // Color Explosion
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.y *= 2.0; // Boost saturation
        hsv.x = fract(hsv.x + sin(uTime) * 0.5);
        finalColor = hsv2rgb(hsv);
    }
    // Flicker / Strobe
    else if (uEffect == 51) {
        float rFlash = step(0.5, sin(uTime * 10.0));
        float gFlash = step(0.5, sin(uTime * 13.0));
        float bFlash = step(0.5, sin(uTime * 17.0));
        finalColor *= vec3(rFlash, gFlash, bFlash) + 0.2;
    } else if (uEffect == 52) {
        float flicker = rand(vec2(uTime, 0.0));
        finalColor *= (flicker > 0.8) ? 2.0 : 1.0;
    } else if (uEffect == 53) {
        if (sin(uTime * 15.0) > 0.0) finalColor = 1.0 - finalColor;
    } else if (uEffect == 54) {
        vec3 hsv = rgb2hsv(finalColor);
        hsv.x = fract(hsv.x + step(0.5, sin(uTime * 10.0)) * 0.5);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 55) {
        if (sin(uTime * 12.0) > 0.0) finalColor = vec3(luma(finalColor));
    } else if (uEffect == 56) {
        if (rand(vec2(uTime, floor(uv.y * 10.0))) > 0.8) finalColor = 1.0 - finalColor;
    } else if (uEffect == 57) {
        float n = rand(uv * uTime);
        if (sin(uTime * 20.0) > 0.0) finalColor += n * 0.5;
    }
    // 21-30: Artistic
    else if (uEffect == 21) {
        // Posterize
        float levels = 3.0;
        finalColor = floor(color.rgb * levels) / levels;
    } else if (uEffect == 22) {
        // ASCII Art (simulated)
        vec2 grid = floor(uv * 80.0) / 80.0;
        float lum = luma(texture2D(tDiffuse, grid).rgb);
        float char = step(0.5, rand(grid + lum));
        finalColor = vec3(char * lum);
    } else if (uEffect == 23) {
        // Sobel Edge
        finalColor = getSobel(tDiffuse, uv, uResolution);
    } else if (uEffect == 24) {
        // Halftone
        vec2 center = floor(uv * 100.0) / 100.0 + 0.005;
        float dist = length(uv - center);
        float lum = luma(texture2D(tDiffuse, center).rgb);
        float radius = 0.005 * lum;
        finalColor = dist < radius ? vec3(1.0) : vec3(0.0);
    } else if (uEffect == 25) {
        // Pencil Sketch
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = vec3(1.0) - edge;
    } else if (uEffect == 26) {
        // Oil Painting (simplified Kuwahara)
        vec2 texel = 1.0 / uResolution;
        vec3 m = vec3(0.0);
        for(int i=-2; i<=2; i++) {
            for(int j=-2; j<=2; j++) {
                m += texture2D(tDiffuse, uv + vec2(i,j)*texel).rgb;
            }
        }
        finalColor = m / 25.0;
    } else if (uEffect == 27) {
        // Comic Book
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        float levels = 4.0;
        vec3 quant = floor(color.rgb * levels) / levels;
        finalColor = mix(quant, vec3(0.0), step(0.2, luma(edge)));
    } else if (uEffect == 28) {
        // Emboss
        vec2 texel = 1.0 / uResolution;
        vec3 c1 = texture2D(tDiffuse, uv - texel).rgb;
        vec3 c2 = texture2D(tDiffuse, uv + texel).rgb;
        finalColor = vec3(0.5) + (c1 - c2);
    } else if (uEffect == 29) {
        // Crosshatch
        float lum = luma(color.rgb);
        finalColor = vec3(1.0);
        if (lum < 0.75) { if (mod(uv.x + uv.y, 0.01) < 0.002) finalColor = vec3(0.0); }
        if (lum < 0.50) { if (mod(uv.x - uv.y, 0.01) < 0.002) finalColor = vec3(0.0); }
        if (lum < 0.25) { if (mod(uv.x + uv.y - 0.005, 0.01) < 0.002) finalColor = vec3(0.0); }
    } else if (uEffect == 30) {
        // Watercolor
        vec2 texel = 1.0 / uResolution;
        vec3 m = vec3(0.0);
        for(int i=-3; i<=3; i++) {
            for(int j=-3; j<=3; j++) {
                m += texture2D(tDiffuse, uv + vec2(i,j)*texel).rgb;
            }
        }
        finalColor = m / 49.0;
        finalColor += 0.1 * vec3(rand(uv));
    } else if (uEffect == 71) {
        // Edge Glow
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = color.rgb + edge * vec3(sin(uTime), cos(uTime), sin(uTime*0.5));
    } else if (uEffect == 72) {
        // Toon Shading
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = floor(color.rgb * 5.0) / 5.0;
        if (luma(edge) > 0.2) finalColor = vec3(0.0);
    } else if (uEffect == 73) {
        // Pointillism
        vec2 p = floor(uv * 100.0) / 100.0;
        float dist = length(uv - p - 0.005);
        if (dist > 0.004) finalColor = vec3(0.0);
    } else if (uEffect == 74) {
        // CRT Phosphor
        float mx = mod(uv.x * uResolution.x, 3.0);
        if (mx < 1.0) finalColor *= vec3(1.0, 0.0, 0.0);
        else if (mx < 2.0) finalColor *= vec3(0.0, 1.0, 0.0);
        else finalColor *= vec3(0.0, 0.0, 1.0);
        finalColor *= (sin(uv.y * uResolution.y) * 0.5 + 0.5);
    } else if (uEffect == 75) {
        // Dither
        float lum = luma(color.rgb);
        float dither = rand(uv) * 0.2 - 0.1;
        finalColor = vec3(step(0.5, lum + dither));
    } else if (uEffect == 76) {
        // Pop Art
        float lum = luma(color.rgb);
        if (lum < 0.25) finalColor = vec3(0.1, 0.1, 0.5);
        else if (lum < 0.5) finalColor = vec3(0.8, 0.2, 0.2);
        else if (lum < 0.75) finalColor = vec3(0.9, 0.8, 0.2);
        else finalColor = vec3(0.9, 0.9, 0.8);
    } else if (uEffect == 86) {
        // Color ASCII
        vec2 grid = floor(uv * 80.0) / 80.0;
        float lum = luma(texture2D(tDiffuse, grid).rgb);
        float char = step(0.5, rand(grid + lum));
        finalColor = texture2D(tDiffuse, grid).rgb * char;
    } else if (uEffect == 89) {
        // Color Halftone
        vec2 center = floor(uv * 100.0) / 100.0 + 0.005;
        float dist = length(uv - center);
        vec3 c = texture2D(tDiffuse, center).rgb;
        float lum = luma(c);
        float radius = 0.005 * lum;
        finalColor = dist < radius ? c : vec3(0.0);
    } else if (uEffect == 95) {
        // Glass
        vec2 p = uv;
        p += (rand(floor(uv * 50.0)) - 0.5) * 0.02;
        finalColor = texture2D(tDiffuse, p).rgb;
    }
    // 31-40: Geometry
    else if (uEffect == 31) {
        // Kaleidoscope
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float segments = 6.0;
        a = mod(a, 3.14159 * 2.0 / segments);
        a = abs(a - 3.14159 / segments);
        p = r * vec2(cos(a), sin(a));
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 32) {
        // Mirror X
        vec2 p = uv;
        if (p.x > 0.5) p.x = 1.0 - p.x;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 33) {
        // Mirror Y
        vec2 p = uv;
        if (p.y > 0.5) p.y = 1.0 - p.y;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 34) {
        // Mirror Quad
        vec2 p = uv;
        if (p.x > 0.5) p.x = 1.0 - p.x;
        if (p.y > 0.5) p.y = 1.0 - p.y;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 35) {
        // Fisheye
        vec2 p = uv - 0.5;
        float r = length(p);
        float bind = 0.5;
        if (r < bind) {
            p *= r / bind;
        }
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 36) {
        // Pixelate
        float pixels = 50.0;
        vec2 p = floor(uv * pixels) / pixels;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 37) {
        // Swirl
        vec2 p = uv - 0.5;
        float r = length(p);
        float angle = atan(p.y, p.x) + r * 5.0;
        p = vec2(cos(angle), sin(angle)) * r;
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 38) {
        // Ripple
        vec2 p = uv - 0.5;
        float r = length(p);
        p += p * sin(r * 50.0 - uTime * 10.0) * 0.05;
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 39) {
        // Bulge
        vec2 p = uv - 0.5;
        float r = length(p);
        p *= smoothstep(0.0, 0.5, r);
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 40) {
        // Spherize
        vec2 p = uv - 0.5;
        float r = length(p);
        float z = sqrt(1.0 - r * r);
        p /= z;
        finalColor = texture2D(tDiffuse, p * 0.5 + 0.5).rgb;
    } else if (uEffect == 77) {
        // Hexagon Mosaic
        vec2 p = uv * 50.0;
        p.x += mod(floor(p.y), 2.0) * 0.5;
        p = floor(p) / 50.0;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 78) {
        // Sine Wave Warp
        vec2 p = uv;
        p.x += sin(p.y * 10.0 + uTime) * 0.05;
        p.y += cos(p.x * 10.0 + uTime) * 0.05;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 79) {
        // Pinch
        vec2 p = uv - 0.5;
        float r = length(p);
        p *= 1.0 + r * 2.0;
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 80) {
        // Twirl
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x) + r * 2.0;
        p = r * vec2(cos(a), sin(a));
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    } else if (uEffect == 81) {
        // Broken Glass
        vec2 p = uv;
        p += (rand(floor(uv * 10.0)) - 0.5) * 0.05;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 82) {
        // Droste / Recursive
        vec2 p = uv - 0.5;
        p *= mod(uTime, 2.0) + 0.5;
        p = fract(p + 0.5);
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 91) {
        // Liquid Metal
        vec2 p = uv;
        p.x += sin(p.y * 10.0 + uTime) * 0.05;
        p.y += cos(p.x * 10.0 + uTime) * 0.05;
        vec3 c = texture2D(tDiffuse, p).rgb;
        finalColor = vec3(luma(c)) * vec3(0.8, 0.9, 1.0) * 1.5;
    } else if (uEffect == 99) {
        // Psychedelic Ripple
        vec2 p = uv - 0.5;
        float r = length(p);
        p += p * sin(r * 20.0 - uTime * 5.0) * 0.1;
        vec3 c = texture2D(tDiffuse, p + 0.5).rgb;
        vec3 hsv = rgb2hsv(c);
        hsv.x = fract(hsv.x + uTime * 0.5);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 104) {
        // Magnetic Field
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        p = r * vec2(cos(a + sin(r * 10.0 + uTime)), sin(a + cos(r * 10.0 + uTime)));
        finalColor = texture2D(tDiffuse, p + 0.5).rgb;
    }
    // 41-50: Misc / Combinations
    else if (uEffect == 41) {
        // Matrix Rain
        float rain = step(0.98, rand(vec2(floor(uv.x * 100.0), floor(uv.y * 50.0 + uTime * 10.0))));
        finalColor = vec3(0.0, rain, 0.0) + color.rgb * vec3(0.0, 0.5, 0.0);
    } else if (uEffect == 42) {
        // Night Vision
        float lum = luma(color.rgb);
        float noise = rand(uv * uTime) * 0.2;
        float vignette = smoothstep(1.0, 0.5, length(uv - 0.5));
        finalColor = vec3(0.0, lum + noise, 0.0) * vignette;
    } else if (uEffect == 43) {
        // Dreamy Blur
        vec2 texel = 1.0 / uResolution;
        vec3 m = vec3(0.0);
        for(int i=-4; i<=4; i++) {
            for(int j=-4; j<=4; j++) {
                m += texture2D(tDiffuse, uv + vec2(i,j)*texel).rgb;
            }
        }
        finalColor = m / 81.0 + color.rgb * 0.5;
    } else if (uEffect == 44) {
        // Vignette
        float dist = length(uv - 0.5);
        finalColor = color.rgb * smoothstep(0.8, 0.2, dist);
    } else if (uEffect == 45) {
        // Radial Blur
        vec2 dir = 0.5 - uv;
        vec3 sum = vec3(0.0);
        for(int i=0; i<10; i++) {
            sum += texture2D(tDiffuse, uv + dir * (float(i) / 10.0) * 0.1).rgb;
        }
        finalColor = sum / 10.0;
    } else if (uEffect == 46) {
        // Zoom Blur
        vec2 dir = uv - 0.5;
        vec3 sum = vec3(0.0);
        for(int i=0; i<10; i++) {
            sum += texture2D(tDiffuse, uv + dir * (float(i) / 10.0) * 0.2).rgb;
        }
        finalColor = sum / 10.0;
    } else if (uEffect == 47) {
        // Wavy
        vec2 p = uv;
        p.x += sin(p.y * 20.0 + uTime * 5.0) * 0.05;
        finalColor = texture2D(tDiffuse, p).rgb;
    } else if (uEffect == 48) {
        // Glitch + Sobel
        float amount = 0.02 * sin(uTime * 5.0);
        vec3 c;
        c.r = texture2D(tDiffuse, vec2(uv.x + amount, uv.y)).r;
        c.g = texture2D(tDiffuse, uv).g;
        c.b = texture2D(tDiffuse, vec2(uv.x - amount, uv.y)).b;
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = c + edge;
    } else if (uEffect == 49) {
        // Thermal + Pixelate
        float pixels = 50.0;
        vec2 p = floor(uv * pixels) / pixels;
        vec3 c = texture2D(tDiffuse, p).rgb;
        float lum = luma(c);
        finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), lum);
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 1.0, lum));
    } else if (uEffect == 50) {
        // Psychedelic + Kal
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float segments = 6.0;
        a = mod(a, 3.14159 * 2.0 / segments);
        a = abs(a - 3.14159 / segments);
        p = r * vec2(cos(a), sin(a));
        vec3 c = texture2D(tDiffuse, p + 0.5).rgb;
        vec3 hsv = rgb2hsv(c);
        hsv.x = fract(hsv.x + uTime * 0.5);
        finalColor = hsv2rgb(hsv);
    } else if (uEffect == 83) {
        // VHS + Strobe
        float n = rand(uv + uTime) * 0.1;
        float y = uv.y + sin(uTime * 10.0) * 0.01;
        finalColor = texture2D(tDiffuse, vec2(uv.x, y)).rgb + n;
        finalColor.g *= 0.9;
        if (sin(uTime * 15.0) > 0.0) finalColor += 0.2;
    } else if (uEffect == 84) {
        // Edge + Flicker
        vec3 edge = getSobel(tDiffuse, uv, uResolution);
        finalColor = edge;
        if (rand(vec2(uTime, 0.0)) > 0.8) finalColor = 1.0 - finalColor;
    } else if (uEffect == 85) {
        // Thermal + Glitch
        float shift = (rand(vec2(uv.y, uTime)) > 0.9) ? 0.05 : 0.0;
        vec3 c = texture2D(tDiffuse, vec2(uv.x + shift, uv.y)).rgb;
        float lum = luma(c);
        finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), lum);
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 1.0, lum));
    } else if (uEffect == 88) {
        // Advanced CRT
        vec2 crtUv = uv * 2.0 - 1.0;
        crtUv *= 1.0 + pow(length(crtUv) / 2.0, 2.0);
        crtUv = crtUv * 0.5 + 0.5;
        if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
            finalColor = vec3(0.0);
        } else {
            finalColor = texture2D(tDiffuse, crtUv).rgb;
            float scanline = sin(crtUv.y * 800.0) * 0.04;
            finalColor -= scanline;
            finalColor *= 1.0 - length(uv - 0.5) * 0.5; // Vignette
        }
    } else if (uEffect == 92) {
        // Hologram
        float scanline = sin(uv.y * 400.0 - uTime * 10.0) * 0.1;
        float lum = luma(color.rgb);
        finalColor = vec3(0.0, lum * 1.5, lum * 2.0) + scanline;
        finalColor *= 0.8 + rand(uv * uTime) * 0.2;
    } else if (uEffect == 93) {
        // Pixel Trail
        vec2 p = floor(uv * 50.0) / 50.0;
        vec3 c = texture2D(tDiffuse, p).rgb;
        vec3 pc = texture2D(tPrev, p).rgb;
        finalColor = mix(c, pc, 0.8);
    } else if (uEffect == 98) {
        // Echo
        vec3 pc = texture2D(tPrev, uv).rgb;
        finalColor = color.rgb * 0.5 + pc * 0.5;
    } else if (uEffect == 102) {
        // Dissolve
        float n = rand(uv * uTime);
        if (n > 0.5) {
            finalColor = prevColor.rgb;
        }
    } else if (uEffect == 105) {
        // Dream
        vec2 texel = 1.0 / uResolution;
        vec3 m = vec3(0.0);
        for(int i=-2; i<=2; i++) {
            for(int j=-2; j<=2; j++) {
                m += texture2D(tDiffuse, uv + vec2(i,j)*texel).rgb;
            }
        }
        finalColor = m / 25.0;
        finalColor *= vec3(1.2, 1.1, 1.3);
        finalColor += (rand(uv * uTime) - 0.5) * 0.1;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

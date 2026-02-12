// Neptune 3D Scene
import { Suspense, useRef, useMemo, useEffect, useLayoutEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';

import { useNeptuneStore, TABS, TAB_COUNT } from './Store';
import type { TabId } from '@/components/TabNavigation';

// -----------------------------------------------------------------------------
// Main Scene Configuration
// -----------------------------------------------------------------------------
const CONFIG = {
    camera: {
        position: [0.48, -5.62, 0.01] as [number, number, number],
        target: [0.48, 0.01, 0.01] as [number, number, number],
        fov: 10,
    },
    neptune: {
        scale: 3.1,
        tilt: [0.13, 0.05, -0.43] as [number, number, number],
        spinSpeed: 0.05,
        position: [0, 0, 0] as [number, number, number],
    },
    texture: {
        baseColor: '#888888',
        roughness: 1,
        metalness: 0,
        normalScale: 20,
        envMapIntensity: 5,
    },
    lighting: {
        rectLight: {
            position: [36, 15.5, 2] as [number, number, number],
            width: 19,
            height: 33,
            intensity: 50,
            color: '#ffffff',
        },
        ambient: 0.5,
        environment: {
            preset: 'night' as const,
            intensity: 0.95,
        },
    },
    postProcessing: {
        bloomIntensity: 1.05,
        bloomThreshold: 0,
        bloomRadius: 0.25,
        noiseOpacity: 0.17,
        vignetteDarkness: 0.8,
    },
    film: {
        exposure: 2,
    },
    animation: {
        initialSpinSpeed: 2.0,
        finalSpinSpeed: 0.05,
        initialLightIntensity: 0,
        finalLightIntensity: 50,
        spinBurstSpeed: 3.0,
        spinBurstDuration: 1.2,
    },
};

// -----------------------------------------------------------------------------
// Intro Configuration
// -----------------------------------------------------------------------------
const INTRO_CONFIG = {
    camera: {
        // Multi-phase orbital camera path
        phases: [
            // Phase 1: Far approach - dramatic reveal
            { position: [8, 3, 50] as [number, number, number], fov: 6, duration: 2.0 },
            // Phase 2: Orbital sweep - cinematic arc
            { position: [-6, 1, 35] as [number, number, number], fov: 9, duration: 2.5 },
            // Phase 3: Close approach - intimate view
            { position: [0, 0, 28] as [number, number, number], fov: 11, duration: 1.5 },
        ],
        startTarget: [0, 0, 0] as [number, number, number],
        // Micro-float (breathing effect) - enhanced
        microFloat: {
            enabled: true,
            amplitude: 0.12,
            frequency: 0.25,
            // Adds subtle X-axis drift for organic feel
            xDrift: 0.04,
        },
        // Camera shake during sunrise peak
        shake: {
            enabled: true,
            intensity: 0.015,
            frequency: 18,
            decay: 0.92,
            startTime: 4.8,  // Just before sunrise peak
            duration: 1.2,
        },
        // Dolly zoom (Vertigo effect) parameters
        dollyZoom: {
            enabled: true,
            startTime: 1.5,
            duration: 1.0,
            fovShift: 3,  // FOV widens while camera approaches
        },
    },
    lighting: {
        // Back light for eclipse effect - enhanced arc movement
        eclipseLight: {
            startPosition: [-30, -8, -25] as [number, number, number],
            peakPosition: [18, 18, -10] as [number, number, number],
            startIntensity: 0,
            peakIntensity: 320,
            // Color temperature shift: cold → warm → neutral
            colorShift: {
                start: '#0a2840',   // Deep cold blue
                peak: '#4da6ff',    // Bright cyan
                end: '#a0c8ff',     // Warm neutral
            },
        },
        // Rim light - enhanced with breathing
        rimLight: {
            position: [-35, 0, -28] as [number, number, number],
            initialIntensity: 3,
            peakIntensity: 45,
            color: '#00D4FF',
            // Organic breathing variation
            breathe: {
                amplitude: 0.15,
                frequency: 0.8,
            },
        },
        // God Ray / Lens Flare - anamorphic horizontal
        godRay: {
            position: [-22, 6, -18] as [number, number, number],
            intensity: 150,
            color: '#4DA6FF',
            // Anamorphic lens characteristics
            anamorphic: {
                stretch: 3.5,      // Horizontal stretch ratio
                falloff: 0.7,      // Edge fade
            },
        },
        // NEW: Secondary fill light for ambient bounce
        fillLight: {
            position: [20, -10, 15] as [number, number, number],
            intensity: 8,
            color: '#1a3a5c',
        },
        // NEW: Atmospheric halo around Neptune
        atmosphericGlow: {
            color: '#1a4a7a',
            intensity: 0.4,
            falloff: 2.5,
        },
    },
    particles: {
        count: 1200,           // More particles for denser effect
        size: 0.018,
        sizeVariation: 0.5,    // 50% size variation
        color: '#0a6bc4',
        opacity: 0.5,
        radius: 9,
        // NEW: Motion blur trails
        trails: {
            enabled: true,
            length: 0.3,
            opacity: 0.2,
        },
        // NEW: Spawn from center outward
        spawnAnimation: {
            enabled: true,
            duration: 1.5,
            delay: 0.3,
        },
    },
    // Intro-specific post-processing (independent from main scene)
    postProcessing: {
        chromaticAberration: {
            start: 0.012,
            peak: 0.025,        // Peaks during sunrise
            end: 0,
        },
        depthOfField: {
            enabled: true,
            focusDistance: 32,
            focalLength: 28,
            bokehScale: 2.5,
            // Gradually increases focus range
            focusRangeStart: 3,
            focusRangeEnd: 50,
        },
        radialBlur: {
            enabled: true,
            intensity: 0.15,
            center: [0.5, 0.5] as [number, number],
            fadeOut: true,      // Fades during transition
        },
        colorGrading: {
            // Teal & orange cinematic look
            shadows: '#0a1628',
            midtones: '#1a3a5c',
            highlights: '#4da6ff',
            saturation: 1.15,
            contrast: 1.08,
        },
        vignette: {
            start: 0.95,
            end: 0.8,
        },
    },
    timing: {
        // Premium timing - slower, more cinematic
        darkness: 0.5,
        cameraPhase1End: 2.0,
        cameraPhase2End: 4.5,
        cameraPhase3End: 6.0,
        rimAppear: 1.8,
        sunriseStart: 2.2,
        sunrisePeak: 5.2,
        godRayFlash: 4.8,
        cameraTransition: 5.5,   // Start transition earlier
        introComplete: 9.0,      // Extended: 3.5s transition time for smooth premium feel
    },
};

// Intro Animation Values Type
interface IntroAnimValues {
    rimIntensity: number;
    sunriseProgress: number;
    cameraTransitionProgress: number;
    bloomIntensity: number;
    environmentIntensity: number;
    dustOpacity: number;
    godRayIntensity: number;
    introTime: number;
    chromaticAberrationOffset: number;
    vignetteIntensity: number;
    mainLightIntensity: number;
}

// Tab Configuration (imported from Store)
// TABS and TAB_COUNT are imported from './Store'

// Custom SVG Button Component
interface HolographicButtonCSSProps {
    tabName: string;
    tabDesc: string;
    buttonOpacity: number;
    textOpacity: number;
    onClick: () => void;
}

function HolographicButtonCSS({ tabName, tabDesc, buttonOpacity, textOpacity, onClick }: HolographicButtonCSSProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const isModalOpen = useNeptuneStore(state => state.isModalOpen);

    // 🔧 FIX: Reset hover/pressed state when modal opens
    // This prevents the button from staying stuck in hover animation
    useEffect(() => {
        if (isModalOpen) {
            setIsHovered(false);
            setIsPressed(false);
        }
    }, [isModalOpen]);

    // TOOLTIP OFFSET - Manually adjustable values (in %)
    // Positive = shifts right, Negative = shifts left
    const TOOLTIP_OFFSETS: Record<string, number> = {
        'DASHBOARD': 9,    // Adjust as needed
        'DAILY LOG': 2,    // Adjust as needed
        'GOALS': -10,        // Adjust as needed
        'ROADMAP': 0,      // Adjust as needed
        'WALLET': -5,       // Adjust as needed
        'SNIPPETS': 0,     // Adjust as needed
        'NOTES': -11,        // Adjust as needed
        'AI COACH': -1,     // Adjust as needed
    };
    const tooltipOffset = TOOLTIP_OFFSETS[tabName] || 0;

    // Hide button when modal is open (blur removed, so button would show through)
    if (isModalOpen || buttonOpacity < 0.01) return null;

    return (
        <>
            <style>{`
                @keyframes subtleFlicker {
                    0%, 100% { opacity: 1; }
                    95% { opacity: 0.95; }
                    96% { opacity: 1; }
                }
                @keyframes pulseGlow {
                    0%, 100% { 
                        filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.7)) drop-shadow(0 0 25px rgba(0, 180, 220, 0.4));
                    }
                    50% { 
                        filter: drop-shadow(0 0 20px rgba(0, 229, 255, 1)) drop-shadow(0 0 40px rgba(0, 180, 220, 0.6));
                    }
                }
                @keyframes lineGlow {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                @keyframes drawLineUp {
                    0% { stroke-dashoffset: 180; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes borderGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 150, 200, 0.05); }
                    50% { box-shadow: 0 0 35px rgba(0, 229, 255, 0.5), inset 0 0 30px rgba(0, 150, 200, 0.1); }
                }
                @keyframes glitchIn {
                    0%, 100% { 
                        transform: translate(0); 
                        text-shadow: 0 0 18px rgba(0, 229, 255, 1), 0 0 35px rgba(0, 200, 255, 0.6);
                        opacity: 1;
                    }
                    3% { 
                        transform: translate(-4px, 0) skewX(-3deg); 
                        text-shadow: -4px 0 #ff00ff, 4px 0 #00ffff, 0 0 18px rgba(0, 229, 255, 1);
                        opacity: 0.9;
                    }
                    6% { opacity: 1; }
                    8% { 
                        transform: translate(5px, 1px) skewX(2deg); 
                        text-shadow: 4px 0 #ff00ff, -4px 0 #00ffff, 0 0 18px rgba(0, 229, 255, 1);
                        opacity: 0.85;
                    }
                    12% { transform: translate(0); opacity: 1; }
                    15% { 
                        transform: translate(-3px, -1px) skewX(-2deg); 
                        text-shadow: -3px 0 #ff00ff, 3px 0 #00ffff;
                        clip-path: polygon(0 5%, 100% 5%, 100% 12%, 0 12%);
                        opacity: 0.8;
                    }
                    18% { clip-path: none; opacity: 1; }
                    22% { 
                        transform: translate(4px, 0);
                        clip-path: polygon(0 40%, 100% 40%, 100% 52%, 0 52%);
                        opacity: 0.9;
                    }
                    26% { transform: translate(-2px, 1px); clip-path: none; opacity: 1; }
                    30% { 
                        transform: translate(3px, 0) skewX(1deg);
                        text-shadow: 3px 0 #ff00ff, -3px 0 #00ffff;
                        opacity: 0.85;
                    }
                    35% { transform: translate(-4px, -1px); opacity: 0.75; }
                    38% { opacity: 1; }
                    42% { 
                        transform: translate(0);
                        clip-path: polygon(0 65%, 100% 65%, 100% 78%, 0 78%);
                    }
                    46% { clip-path: none; }
                    50% { 
                        transform: translate(5px, 0) skewX(-2deg);
                        text-shadow: -4px 0 #ff00ff, 4px 0 #00ffff;
                        opacity: 0.8;
                    }
                    54% { transform: translate(-3px, 1px); opacity: 1; }
                    58% { 
                        transform: translate(2px, 0);
                        clip-path: polygon(0 20%, 100% 20%, 100% 32%, 0 32%);
                    }
                    62% { transform: translate(-1px, -1px); clip-path: none; }
                    66% { 
                        transform: translate(3px, 0) skewX(2deg);
                        text-shadow: 3px 0 #ff00ff, -3px 0 #00ffff;
                        opacity: 0.85;
                    }
                    70% { transform: translate(0); opacity: 0.7; }
                    72% { opacity: 1; }
                    76% { 
                        transform: translate(-3px, 0);
                        clip-path: polygon(0 82%, 100% 82%, 100% 95%, 0 95%);
                    }
                    80% { 
                        transform: translate(2px, 0); 
                        clip-path: none;
                        text-shadow: 0 0 18px rgba(0, 229, 255, 1), 0 0 35px rgba(0, 200, 255, 0.6);
                    }
                    85% { transform: translate(-1px, 0); opacity: 0.9; }
                    90% { transform: translate(1px, 0); opacity: 1; }
                    95% { transform: translate(0); }
                }
                @keyframes scanLines {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 100%; }
                }
                @keyframes fadeSlideIn {
                    0% { opacity: 0; transform: translateY(10px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            <div
                className="fixed bottom-[8%] left-1/2 -translate-x-1/2 z-40"
                style={{ opacity: buttonOpacity }}
            >
                {/* INFO TOOLTIP - ABOVE button - WITH TURTLE DRAW ANIMATION */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        bottom: '100%',
                        marginBottom: '55px',
                        left: '50%',
                        transform: `translateX(${tooltipOffset}%)`,
                    }}
                >
                    {/* Futuristic Info Panel - Delayed appearance with glitch */}
                    <div
                        className="relative px-7 py-4 min-w-[260px] text-center overflow-hidden backdrop-blur-sm"
                        style={{
                            background: 'linear-gradient(180deg, rgba(0,20,40,0.5) 0%, rgba(0,15,30,0.4) 100%)',
                            border: '1.5px solid rgba(0, 229, 255, 0.6)',
                            clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
                            // Delayed fade-in + glitch on entry
                            opacity: isHovered ? 1 : 0,
                            transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                            transition: isHovered
                                ? 'opacity 0.3s ease 0.45s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s'
                                : 'opacity 0.2s ease 0s, transform 0.25s ease 0s',
                            animation: isHovered ? 'glitchIn 0.25s ease 0.75s, borderGlow 2s ease-in-out infinite 1s' : 'none',
                        }}
                    >
                        {/* Corner accents with glow */}
                        <div className="absolute top-0 left-0 w-12 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent" style={{ filter: 'drop-shadow(0 0 3px #00E5FF)' }} />
                        <div className="absolute top-0 left-0 h-12 w-[2px] bg-gradient-to-b from-cyan-400 to-transparent" style={{ filter: 'drop-shadow(0 0 3px #00E5FF)' }} />
                        <div className="absolute bottom-0 right-0 w-12 h-[2px] bg-gradient-to-l from-cyan-400 to-transparent" style={{ filter: 'drop-shadow(0 0 3px #00E5FF)' }} />
                        <div className="absolute bottom-0 right-0 h-12 w-[2px] bg-gradient-to-t from-cyan-400 to-transparent" style={{ filter: 'drop-shadow(0 0 3px #00E5FF)' }} />

                        {/* Corner dots */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" style={{ filter: 'drop-shadow(0 0 4px #00E5FF)' }} />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" style={{ filter: 'drop-shadow(0 0 4px #00E5FF)' }} />

                        {/* Text */}
                        <span
                            className="relative z-10 text-sm tracking-[0.25em] uppercase font-bold"
                            style={{
                                color: '#00E5FF',
                                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                                textShadow: '0 0 18px rgba(0, 229, 255, 1), 0 0 35px rgba(0, 200, 255, 0.6)',
                            }}
                        >
                            {tabDesc}
                        </span>
                    </div>

                    {/* L-Shaped Connector: DRAWS FROM BOTTOM TO TOP (Turtle Style) */}
                    <svg
                        width="120"
                        height="90"
                        className="absolute"
                        style={{
                            top: '100%',
                            left: '50%',
                            marginLeft: '-60px',
                            // Delayed appearance - starts 250ms after hover
                            opacity: isHovered ? 1 : 0,
                            transition: isHovered
                                ? 'opacity 0.15s ease 0.25s'
                                : 'opacity 0.15s ease 0.15s',
                        }}
                    >
                        <defs>
                            <linearGradient id="lineGradient" x1="100%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#00FFFF" />
                                <stop offset="100%" stopColor="#00E5FF" />
                            </linearGradient>
                        </defs>

                        {/* Glow layer - REVERSED PATH: from button upward */}
                        <path
                            d="M 20 85 L 60 50 L 60 0"
                            fill="none"
                            stroke="rgba(0, 229, 255, 0.2)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="180"
                            style={{
                                strokeDashoffset: isHovered ? 0 : 180,
                                transition: isHovered
                                    ? 'stroke-dashoffset 0.8s ease 0.3s'
                                    : 'stroke-dashoffset 0.4s ease 0s',
                            }}
                        />

                        {/* Main line - REVERSED PATH: draws from bottom-left upward */}
                        <path
                            d="M 20 85 L 60 50 L 60 0"
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="180"
                            style={{
                                strokeDashoffset: isHovered ? 0 : 180,
                                filter: 'drop-shadow(0 0 6px #00E5FF)',
                                transition: isHovered
                                    ? 'stroke-dashoffset 0.8s ease 0.3s'
                                    : 'stroke-dashoffset 0.4s ease 0s',
                            }}
                        />

                        {/* Data flow particles - only after line is drawn */}
                        {isHovered && (
                            <>
                                <circle r="2.5" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }}>
                                    <animateMotion dur="1.4s" repeatCount="indefinite" begin="0.6s" path="M 20 85 L 60 50 L 60 0" />
                                </circle>
                                <circle r="2.5" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }}>
                                    <animateMotion dur="1.4s" repeatCount="indefinite" begin="1.07s" path="M 20 85 L 60 50 L 60 0" />
                                </circle>
                                <circle r="2.5" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }}>
                                    <animateMotion dur="1.4s" repeatCount="indefinite" begin="1.53s" path="M 20 85 L 60 50 L 60 0" />
                                </circle>
                            </>
                        )}

                        {/* Start dot (at button) - appears first */}
                        <circle
                            cx="20" cy="85" r="4"
                            fill="#00FFFF"
                            style={{
                                filter: 'drop-shadow(0 0 12px #00FFFF)',
                                opacity: isHovered ? 1 : 0,
                                transition: isHovered
                                    ? 'opacity 0.2s ease 0.2s'
                                    : 'opacity 0.15s ease 0.25s',
                            }}
                        >
                            <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                </div>

                {/* MAIN BUTTON with custom SVG */}
                <button
                    onClick={onClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseUp={() => setIsPressed(false)}
                    className="relative cursor-pointer outline-none border-none bg-transparent"
                    style={{
                        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                        transition: 'transform 0.2s ease',
                    }}
                >
                    {/* Custom SVG with path morphing */}
                    <svg
                        width={isHovered ? "420" : "340"}
                        height="75"
                        viewBox={isHovered ? "812 1300 1276 400" : "892 1300 1116 400"}
                        style={{
                            animation: 'pulseGlow 2.5s ease-in-out infinite',
                            transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), viewBox 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        <defs>
                            <linearGradient id="buttonFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(0, 180, 220, 0.18)" />
                                <stop offset="50%" stopColor="rgba(0, 100, 150, 0.22)" />
                                <stop offset="100%" stopColor="rgba(0, 180, 220, 0.18)" />
                            </linearGradient>
                        </defs>

                        {/* Main frame - path morphs on hover (BOTH sides extend symmetrically) */}
                        <path
                            d={isHovered
                                // Hover: Right +80px, Left -80px (h values adjusted, viewBox compensates)
                                ? "m2084.57 1690.9h-788.6v-48.95h-483.43v-224.49l109.84-109.84h652.61v36.26h343.25l36.26-36.26h232.2v281.15zm-778.83-9.78h774.78l96.41-96.4v-267.33h-218.38l-36.26 36.26h-357.07v-36.26h-638.79l-104.11 104.11v210.67h483.42z"
                                // Normal state
                                : "m2004.57 1690.9h-708.6v-48.95h-403.43v-224.49l109.84-109.84h572.61v36.26h263.25l36.26-36.26h232.2v281.15zm-698.83-9.78h694.78l96.41-96.4v-267.33h-218.38l-36.26 36.26h-277.07v-36.26h-558.79l-104.11 104.11v210.67h403.42z"
                            }
                            fill="url(#buttonFillGradient)"
                            stroke={isHovered ? "#00FFFF" : "#00E5FF"}
                            strokeWidth={isHovered ? "4" : "2.5"}
                            style={{
                                transition: 'd 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease, stroke-width 0.3s ease',
                                filter: isHovered
                                    ? 'drop-shadow(0 0 12px rgba(0, 255, 255, 0.7))'
                                    : 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.4))',
                            }}
                        />
                        {/* Top accent line - also morphs */}
                        <path
                            d={isHovered
                                ? "m1590.14 1307.62v21.88h319.41l21.42-21.14z"
                                : "m1590.14 1307.62v21.88h239.41l21.42-21.14z"
                            }
                            fill={isHovered ? "#00FFFF" : "#00E5FF"}
                            style={{
                                transition: 'd 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.3s ease',
                                filter: isHovered ? 'drop-shadow(0 0 8px #00FFFF)' : 'drop-shadow(0 0 4px #00E5FF)',
                            }}
                        />
                        {/* Bottom accent bar - also morphs for left side */}
                        <path
                            d={isHovered
                                ? "m1276.08 1690.9h-463.54v-35.01h463.54z"
                                : "m1276.08 1690.9h-383.54v-35.01h383.54z"
                            }
                            fill={isHovered ? "#00FFFF" : "#00E5FF"}
                            style={{
                                transition: 'd 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.3s ease',
                                filter: isHovered ? 'drop-shadow(0 0 8px #00FFFF)' : 'drop-shadow(0 0 4px #00E5FF)',
                            }}
                        />
                    </svg>

                    {/* Text overlay */}
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ opacity: textOpacity }}
                    >
                        <span
                            className="tracking-[0.4em] uppercase font-bold"
                            style={{
                                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                                fontSize: '1.15rem',
                                color: '#00E5FF',
                                textShadow: isHovered
                                    ? '0 0 20px rgba(0,255,255,1), 0 0 40px rgba(0,220,255,0.7), 0 0 60px rgba(0,180,220,0.4)'
                                    : '0 0 12px rgba(0,229,255,0.9), 0 0 25px rgba(0,200,255,0.5)',
                                animation: 'subtleFlicker 5s linear infinite',
                                transition: 'text-shadow 0.4s ease',
                                // DASHBOARD text fix - slight right shift
                                marginLeft: tabName === 'DASHBOARD' ? '8px' : '0',
                            }}
                        >
                            {tabName}
                        </span>
                    </div>
                </button>

                {/* Hint */}
                <div
                    className="text-center mt-4 pointer-events-none"
                    style={{ opacity: textOpacity * 0.35 }}
                >
                    <span
                        className="text-[10px] tracking-[0.25em] uppercase"
                        style={{ color: 'rgba(0,200,220,0.6)', fontFamily: "'Rajdhani', monospace" }}
                    >
                        ↵ Enter to Open
                    </span>
                </div>
            </div>
        </>
    );
}

// Intro Fade Overlay
function IntroFadeOverlay({ opacity }: { opacity: number }) {
    // Always render - prevents DOM mount/unmount stutter
    // opacity=0 makes it invisible without removing from DOM
    return (
        <div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
                backgroundColor: '#000000',
                opacity: Math.max(0, opacity),
                visibility: opacity > 0 ? 'visible' : 'hidden',
            }}
        />
    );
}

// Cosmic Dust Particles
interface CosmicDustProps {
    visible: boolean;
    opacity: number;
}

function CosmicDust({ visible, opacity }: CosmicDustProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { count, size, color, radius } = INTRO_CONFIG.particles;

    // Use fewer particles - performance optimization (1200 -> 200)
    const optimizedCount = Math.min(count, 200);

    // Create particle positions - disk shape around Neptune
    const positions = useMemo(() => {
        const pos = new Float32Array(optimizedCount * 3);

        for (let i = 0; i < optimizedCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = radius + (Math.random() - 0.5) * 4; // radius +/- 2
            const height = (Math.random() - 0.5) * 2; // -1 to 1

            pos[i * 3] = Math.cos(angle) * r;
            pos[i * 3 + 1] = height;
            pos[i * 3 + 2] = Math.sin(angle) * r;
        }
        return pos;
    }, [optimizedCount, radius]);

    // Performance optimization: Rotate entire group (instead of per-particle calculation)
    useFrame((_, delta) => {
        if (groupRef.current && visible) {
            // Simple group rotation - much more performant
            groupRef.current.rotation.y += delta * 0.08;
        }
    });

    if (!visible) return null;

    // Always render but control visibility via material opacity
    // This prevents mesh creation/destruction stuttering
    const effectiveOpacity = opacity < 0.01 ? 0 : opacity * INTRO_CONFIG.particles.opacity;

    return (
        <group ref={groupRef}>
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={optimizedCount}
                        array={positions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={size * 1.5}
                    color={color}
                    transparent
                    opacity={effectiveOpacity}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>
            {/* 🔥 Glow layer - larger, more transparent particles */}
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={optimizedCount}
                        array={positions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={size * 4}
                    color="#4da6ff"
                    transparent
                    opacity={effectiveOpacity * 0.3}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>
        </group>
    );
}

// Lens Flare / God Ray
interface LensFlareProps {
    intensity: number; // 0-1
    position: [number, number, number];
}

function LensFlare({ intensity, position }: LensFlareProps) {
    const groupRef = useRef<THREE.Group>(null);
    const mainFlareRef = useRef<THREE.Mesh>(null);
    const streakRef = useRef<THREE.Mesh>(null);

    const { anamorphic } = INTRO_CONFIG.lighting.godRay;

    useFrame((state) => {
        // PERFORMANCE: Early return when intensity is very low
        if (intensity < 0.05) return;

        const time = state.clock.elapsedTime;

        if (mainFlareRef.current) {
            // Simplified pulse - single frequency
            const pulse = 1 + Math.sin(time * 3) * 0.1;
            mainFlareRef.current.scale.setScalar(intensity * pulse * 2.5);
        }

        if (streakRef.current) {
            // Simplified streak
            streakRef.current.scale.set(
                intensity * anamorphic.stretch * 6,
                intensity * 0.25,
                1
            );
        }
    });

    // PERFORMANCE: Don't render anything if intensity is too low
    if (intensity < 0.02) return null;

    return (
        <group ref={groupRef} position={position}>
            {/* Main central flare */}
            <mesh ref={mainFlareRef}>
                <circleGeometry args={[1, 16]} />
                <meshBasicMaterial
                    color={INTRO_CONFIG.lighting.godRay.color}
                    transparent
                    opacity={intensity * 0.6}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Anamorphic horizontal streak */}
            <mesh ref={streakRef}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="#00E5FF"
                    transparent
                    opacity={intensity * 0.35}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}

// Animated Intro Camera
interface IntroCameraProps {
    phase: 'intro' | 'transition' | 'main';
    introAnimRef: React.RefObject<IntroAnimValues>;
}

function IntroCamera({ phase, introAnimRef }: IntroCameraProps) {
    const { camera } = useThree();
    const timeRef = useRef(0);
    const shakeRef = useRef({ x: 0, y: 0, z: 0 });

    // Calculate camera position along multi-phase path
    const getPhasePosition = useCallback((time: number) => {
        const phases = INTRO_CONFIG.camera.phases;
        const { timing } = INTRO_CONFIG;

        // Calculate total intro camera time
        const phase1End = timing.cameraPhase1End;
        const phase2End = timing.cameraPhase2End;
        const phase3End = timing.cameraPhase3End;

        let position: [number, number, number];
        let fov: number;

        if (time <= phase1End) {
            // Phase 1: Initial approach
            const progress = time / phase1End;
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const startPos = [12, 5, 60] as [number, number, number]; // Even further start
            const endPos = phases[0].position;

            position = [
                startPos[0] + (endPos[0] - startPos[0]) * eased,
                startPos[1] + (endPos[1] - startPos[1]) * eased,
                startPos[2] + (endPos[2] - startPos[2]) * eased,
            ];
            fov = 5 + (phases[0].fov - 5) * eased;
        } else if (time <= phase2End) {
            // Phase 2: Orbital sweep
            const phaseProgress = (time - phase1End) / (phase2End - phase1End);
            // Custom bezier-like easing for cinematic feel
            const eased = phaseProgress < 0.5
                ? 2 * phaseProgress * phaseProgress
                : 1 - Math.pow(-2 * phaseProgress + 2, 2) / 2; // easeInOutQuad

            const startPos = phases[0].position;
            const endPos = phases[1].position;

            position = [
                startPos[0] + (endPos[0] - startPos[0]) * eased,
                startPos[1] + (endPos[1] - startPos[1]) * eased,
                startPos[2] + (endPos[2] - startPos[2]) * eased,
            ];
            fov = phases[0].fov + (phases[1].fov - phases[0].fov) * eased;
        } else if (time <= phase3End) {
            // Phase 3: Final approach
            const phaseProgress = (time - phase2End) / (phase3End - phase2End);
            const eased = 1 - Math.pow(1 - phaseProgress, 4); // easeOutQuart

            const startPos = phases[1].position;
            const endPos = phases[2].position;

            position = [
                startPos[0] + (endPos[0] - startPos[0]) * eased,
                startPos[1] + (endPos[1] - startPos[1]) * eased,
                startPos[2] + (endPos[2] - startPos[2]) * eased,
            ];
            fov = phases[1].fov + (phases[2].fov - phases[1].fov) * eased;
        } else {
            // Hold at final intro position
            position = phases[2].position;
            fov = phases[2].fov;
        }

        return { position, fov };
    }, []);

    // Calculate camera shake
    const getShake = useCallback((time: number, delta: number) => {
        const { shake } = INTRO_CONFIG.camera;
        if (!shake.enabled) return { x: 0, y: 0, z: 0 };

        const shakeStart = shake.startTime;
        const shakeEnd = shakeStart + shake.duration;

        if (time < shakeStart || time > shakeEnd) {
            // Decay existing shake
            shakeRef.current.x *= shake.decay;
            shakeRef.current.y *= shake.decay;
            shakeRef.current.z *= shake.decay;
            return shakeRef.current;
        }

        // Calculate shake intensity with falloff
        const shakeProgress = (time - shakeStart) / shake.duration;
        const intensityMultiplier = 1 - Math.pow(shakeProgress, 2); // Quadratic decay
        const currentIntensity = shake.intensity * intensityMultiplier;

        // Generate noise-based shake
        const freq = shake.frequency;
        shakeRef.current.x = Math.sin(time * freq) * currentIntensity;
        shakeRef.current.y = Math.cos(time * freq * 1.3) * currentIntensity * 0.8;
        shakeRef.current.z = Math.sin(time * freq * 0.7) * currentIntensity * 0.5;

        return shakeRef.current;
    }, []);

    // Calculate dolly zoom effect
    const getDollyZoomFovAdjust = useCallback((time: number) => {
        const { dollyZoom } = INTRO_CONFIG.camera;
        if (!dollyZoom.enabled) return 0;

        const dzStart = dollyZoom.startTime;
        const dzEnd = dzStart + dollyZoom.duration;

        if (time < dzStart || time > dzEnd) return 0;

        const progress = (time - dzStart) / dollyZoom.duration;
        // Bell curve: rises then falls
        const bellCurve = Math.sin(progress * Math.PI);
        return dollyZoom.fovShift * bellCurve;
    }, []);

    useFrame((state, delta) => {
        const anim = introAnimRef.current;
        if (!anim) return;

        const { introTime, cameraTransitionProgress } = anim;

        timeRef.current += delta;

        // Enhanced micro-float with X-axis drift
        const { microFloat } = INTRO_CONFIG.camera;
        const floatY = microFloat.enabled && phase === 'intro'
            ? Math.sin(timeRef.current * microFloat.frequency * Math.PI * 2) * microFloat.amplitude
            : 0;
        const floatX = microFloat.enabled && phase === 'intro'
            ? Math.cos(timeRef.current * microFloat.frequency * 0.7 * Math.PI * 2) * microFloat.xDrift
            : 0;

        if (phase === 'intro') {
            // Get base position from phase path
            const { position: basePos, fov: baseFov } = getPhasePosition(introTime);

            // Apply shake
            const shake = getShake(introTime, delta);

            // Apply dolly zoom FOV adjustment
            const fovAdjust = getDollyZoomFovAdjust(introTime);

            camera.position.set(
                basePos[0] + floatX + shake.x,
                basePos[1] + floatY + shake.y,
                basePos[2] + shake.z
            );
            camera.lookAt(...INTRO_CONFIG.camera.startTarget);
            (camera as THREE.PerspectiveCamera).fov = baseFov + fovAdjust;
            (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        } else if (phase === 'transition') {
            // PERFORMANCE: Simplified transition with pre-computed values
            const lastPhase = INTRO_CONFIG.camera.phases[2];
            const startPos = lastPhase.position;
            const endPos = CONFIG.camera.position;
            const startFov = lastPhase.fov;
            const endFov = CONFIG.camera.fov;

            // Simple smooth easing (much faster than complex bezier)
            const t = cameraTransitionProgress;
            const eased = t * t * (3 - 2 * t); // smoothstep

            // Direct position interpolation (no micro-float during transition)
            camera.position.set(
                startPos[0] + (endPos[0] - startPos[0]) * eased,
                startPos[1] + (endPos[1] - startPos[1]) * eased,
                startPos[2] + (endPos[2] - startPos[2]) * eased
            );

            // PERFORMANCE: Use direct target, no Vector3 allocation
            camera.lookAt(
                INTRO_CONFIG.camera.startTarget[0] + (CONFIG.camera.target[0] - INTRO_CONFIG.camera.startTarget[0]) * eased,
                INTRO_CONFIG.camera.startTarget[1] + (CONFIG.camera.target[1] - INTRO_CONFIG.camera.startTarget[1]) * eased,
                INTRO_CONFIG.camera.startTarget[2] + (CONFIG.camera.target[2] - INTRO_CONFIG.camera.startTarget[2]) * eased
            );

            // FOV interpolation
            (camera as THREE.PerspectiveCamera).fov = startFov + (endFov - startFov) * eased;
            (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        } else {
            // Main scene: CONFIG position
            camera.position.set(...CONFIG.camera.position);
            camera.lookAt(...CONFIG.camera.target);
            (camera as THREE.PerspectiveCamera).fov = CONFIG.camera.fov;
            (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
    });

    return null;
}

// Eclipse Lighting
interface EclipseLightingProps {
    introPhase: 'intro' | 'transition' | 'main';
    introAnimRef: React.RefObject<IntroAnimValues>;
}

function EclipseLighting({ introPhase, introAnimRef }: EclipseLightingProps) {
    const rimLightRef = useRef<THREE.PointLight>(null);
    const eclipseLightRef = useRef<THREE.SpotLight>(null);
    const fillLightRef = useRef<THREE.PointLight>(null);
    const mainLightRef = useRef<THREE.RectAreaLight>(null);
    const ambientLightRef = useRef<THREE.AmbientLight>(null);

    const { ambient } = CONFIG.lighting;
    const { eclipseLight, rimLight, fillLight } = INTRO_CONFIG.lighting;

    // Pre-create color objects to avoid GC pressure
    const eclipseColorRef = useRef(new THREE.Color());
    const startColor = useRef(new THREE.Color(eclipseLight.colorShift.start));
    const peakColor = useRef(new THREE.Color(eclipseLight.colorShift.peak));
    const endColor = useRef(new THREE.Color(eclipseLight.colorShift.end));

    useEffect(() => {
        if (mainLightRef.current) {
            mainLightRef.current.lookAt(0, 0, 0);
        }
    }, []);

    // PERFORMANCE: Update ALL lights directly in useFrame - NO React re-renders!
    useFrame(() => {
        const anim = introAnimRef.current;
        if (!anim) return;

        const { sunriseProgress, cameraTransitionProgress, rimIntensity, introTime, mainLightIntensity } = anim;

        // Rim Light with breathing effect
        if (rimLightRef.current) {
            if (rimIntensity <= 0) {
                rimLightRef.current.intensity = 0;
            } else {
                const breathing = 1 + Math.sin(introTime * rimLight.breathe.frequency * Math.PI * 2) * rimLight.breathe.amplitude;
                rimLightRef.current.intensity = rimIntensity * breathing;
            }
        }

        // Eclipse Light
        if (eclipseLightRef.current) {
            // Color temperature shift
            if (sunriseProgress < 0.5) {
                const t = sunriseProgress / 0.5;
                eclipseColorRef.current.lerpColors(startColor.current, peakColor.current, t);
            } else {
                const t = (sunriseProgress - 0.5) / 0.5;
                eclipseColorRef.current.lerpColors(peakColor.current, endColor.current, t);
            }
            eclipseLightRef.current.color.copy(eclipseColorRef.current);

            // Position arc
            const arcProgress = Math.sin(sunriseProgress * Math.PI * 0.5);
            const verticalBoost = Math.sin(sunriseProgress * Math.PI) * 3;
            eclipseLightRef.current.position.set(
                eclipseLight.startPosition[0] + (eclipseLight.peakPosition[0] - eclipseLight.startPosition[0]) * arcProgress,
                eclipseLight.startPosition[1] + (eclipseLight.peakPosition[1] - eclipseLight.startPosition[1]) * arcProgress + verticalBoost,
                eclipseLight.startPosition[2] + (eclipseLight.peakPosition[2] - eclipseLight.startPosition[2]) * arcProgress
            );

            // Intensity
            if (introPhase === 'main') {
                eclipseLightRef.current.intensity = 0;
            } else if (introPhase === 'transition') {
                const baseIntensity = eclipseLight.peakIntensity * 0.6;
                eclipseLightRef.current.intensity = baseIntensity * (1 - cameraTransitionProgress);
            } else if (sunriseProgress < 0.6) {
                const intensityCurve = Math.pow(sunriseProgress / 0.6, 1.5);
                eclipseLightRef.current.intensity = eclipseLight.startIntensity + (eclipseLight.peakIntensity - eclipseLight.startIntensity) * intensityCurve;
            } else {
                eclipseLightRef.current.intensity = eclipseLight.peakIntensity;
            }
        }

        // Fill Light
        if (fillLightRef.current) {
            if (introPhase === 'main') {
                fillLightRef.current.intensity = 0;
            } else if (introPhase === 'transition') {
                const base = fillLight.intensity * 0.3;
                fillLightRef.current.intensity = base * (1 - cameraTransitionProgress);
            } else if (sunriseProgress < 0.2) {
                fillLightRef.current.intensity = 0;
            } else if (sunriseProgress < 0.7) {
                fillLightRef.current.intensity = fillLight.intensity * ((sunriseProgress - 0.2) / 0.5);
            } else {
                fillLightRef.current.intensity = fillLight.intensity * (1 - ((sunriseProgress - 0.7) / 0.3) * 0.7);
            }
        }

        // Main Rect Light
        if (mainLightRef.current) {
            mainLightRef.current.intensity = mainLightIntensity;
        }

        // Ambient Light
        if (ambientLightRef.current) {
            if (introPhase === 'main') {
                // Main scene: use CONFIG value
                ambientLightRef.current.intensity = ambient;
            } else if (introPhase === 'transition') {
                // Smooth transition from intro value to main value
                const introValue = ambient * 0.4; // sunriseProgress=1 at transition start
                const mainValue = ambient;
                ambientLightRef.current.intensity = introValue + (mainValue - introValue) * cameraTransitionProgress;
            } else {
                // Intro phase: fade in based on sunriseProgress
                ambientLightRef.current.intensity = ambient * sunriseProgress * sunriseProgress * 0.4;
            }
        }
    });

    return (
        <>
            {/* Rim Light */}
            <pointLight
                ref={rimLightRef}
                position={rimLight.position}
                intensity={0}
                color={rimLight.color}
                distance={60}
                decay={1.8}
            />

            {/* Eclipse Light */}
            <spotLight
                ref={eclipseLightRef}
                position={eclipseLight.startPosition}
                intensity={0}
                color={eclipseLight.colorShift.start}
                angle={0.7}
                penumbra={0.9}
                distance={120}
                decay={1.2}
            />

            {/* Fill Light */}
            <pointLight
                ref={fillLightRef}
                position={fillLight.position}
                intensity={0}
                color={fillLight.color}
                distance={40}
                decay={2}
            />

            {/* Main Rect Light */}
            <rectAreaLight
                ref={mainLightRef}
                position={CONFIG.lighting.rectLight.position}
                width={CONFIG.lighting.rectLight.width}
                height={CONFIG.lighting.rectLight.height}
                intensity={0}
                color={CONFIG.lighting.rectLight.color}
            />

            {/* Ambient */}
            <ambientLight
                ref={ambientLightRef}
                intensity={0}
                color="#060818"
            />
        </>
    );
}

// Neptune Model
interface NeptuneModelProps {
    spinSpeed: number;
    opacity?: number;
}

const NeptuneModel = forwardRef<THREE.Group, NeptuneModelProps>(
    ({ spinSpeed, opacity = 1 }, ref) => {
        const gltf = useGLTF('./neptune.glb');
        const spinRef = useRef<THREE.Group>(null!);
        const groupRef = useRef<THREE.Group>(null!);
        const { gl } = useThree();

        const { scale, tilt, position } = CONFIG.neptune;
        const { baseColor, roughness, metalness, normalScale, envMapIntensity } = CONFIG.texture;

        useImperativeHandle(ref, () => groupRef.current, []);

        useFrame((_, delta) => {
            if (spinRef.current) {
                spinRef.current.rotation.z += delta * spinSpeed;
            }
        });

        // Clone scene AND apply materials immediately (synchronous, before first render)
        const { clonedScene, offset } = useMemo(() => {
            if (!gltf.scene) {
                return { clonedScene: null, offset: new THREE.Vector3() };
            }

            const clone = gltf.scene.clone(true);
            clone.rotation.set(0, 0, 0);
            clone.traverse((child) => {
                if (child instanceof THREE.Object3D) {
                    if (child.type === 'Group' || child.type === 'Object3D') {
                        child.rotation.set(0, 0, 0);
                    }
                }
            });

            const box = new THREE.Box3().setFromObject(clone);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const s = maxDim > 0 ? scale / maxDim : 1;
            clone.scale.setScalar(s);

            const scaledCenter = center.multiplyScalar(s);
            const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

            // APPLY MATERIALS IMMEDIATELY DURING CLONE (synchronous!)
            clone.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    const material = mesh.material as THREE.MeshStandardMaterial;

                    if (material) {
                        material.roughness = roughness;
                        material.metalness = metalness;
                        material.envMapIntensity = envMapIntensity;
                        material.color.set(baseColor);
                        material.transparent = true;
                        material.opacity = opacity;

                        if (material.normalMap && material.normalScale) {
                            material.normalScale.set(normalScale, normalScale);
                        }

                        if (material.map) {
                            material.map.anisotropy = maxAnisotropy;
                            material.map.needsUpdate = true;
                        }

                        material.needsUpdate = true;
                    }
                }
            });

            return { clonedScene: clone, offset: scaledCenter };
        }, [gltf.scene, scale, opacity, gl, roughness, metalness, normalScale, envMapIntensity, baseColor]);

        if (!clonedScene) {
            return (
                <mesh>
                    <sphereGeometry args={[2, 64, 64]} />
                    <meshBasicMaterial color="#1a4a7a" transparent opacity={opacity} />
                </mesh>
            );
        }

        return (
            <group ref={groupRef} position={position}>
                <group rotation={[Math.PI * tilt[0], Math.PI * tilt[1], Math.PI * tilt[2]]}>
                    <group ref={spinRef}>
                        <group position={[-offset.x, -offset.y, -offset.z]}>
                            <primitive object={clonedScene} />
                        </group>
                    </group>
                </group>
            </group>
        );
    }
);

NeptuneModel.displayName = 'NeptuneModel';

// Starfield
interface StarfieldProps {
    count?: number;
    opacity?: number;
}

function Starfield({ count = 1500, opacity = 0.8 }: StarfieldProps) {
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 50 + Math.random() * 50;

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, [count]);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.15} color="#ffffff" transparent opacity={opacity} sizeAttenuation />
        </points>
    );
}

// Loading Fallback
function LoadingFallback() {
    return (
        <Html center>
            <div className="text-center">
                <div className="w-16 h-16 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin mx-auto mb-4" />
            </div>
        </Html>
    );
}

// Animated Scene Content
interface AnimatedSceneContentProps {
    // Intro phase (only changes 3 times - no performance issue)
    introPhase: 'intro' | 'transition' | 'main';
    // PERFORMANCE: All intro animation values via ref - NO RE-RENDERS!
    introAnimRef: React.RefObject<IntroAnimValues>;
    // Main scene states (these are still needed as props)
    spinSpeed: number;
}

function AnimatedSceneContent({
    introPhase,
    introAnimRef,
    spinSpeed,
}: AnimatedSceneContentProps) {
    const { gl } = useThree();

    // PERFORMANCE: Refs for post-processing effects to update directly
    const bloomRef = useRef<any>(null);
    const vignetteRef = useRef<any>(null);

    // PERFORMANCE: Refs for components that need direct updates
    const starfieldRef = useRef<any>(null);
    const cosmicDustRef = useRef<{ group: THREE.Group | null }>({ group: null });
    const lensFlareRef = useRef<{ setIntensity: (v: number) => void } | null>(null);

    useLayoutEffect(() => {
        gl.toneMappingExposure = CONFIG.film.exposure;
    }, [gl]);

    // PERFORMANCE: Update ALL effects directly in useFrame - ZERO setState!
    useFrame(() => {
        const anim = introAnimRef.current;
        if (!anim) return;

        // Update post-processing effects DIRECTLY
        if (bloomRef.current) {
            bloomRef.current.intensity = anim.bloomIntensity;
        }
        if (vignetteRef.current) {
            vignetteRef.current.darkness = anim.vignetteIntensity;
        }
    });

    // CosmicDust visible during intro, fade out in main
    const showDust = introPhase !== 'main';

    // Read directly from ref - these components will get updated values each frame
    // because React Three Fiber re-renders on useFrame anyway for the camera/lights
    const anim = introAnimRef.current;

    return (
        <>
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 40, 120]} />

            {/* Animated Camera - now uses ref internally */}
            <IntroCamera
                phase={introPhase}
                introAnimRef={introAnimRef}
            />

            {/* Starfield - reads from ref */}
            <Starfield opacity={anim.sunriseProgress > 0.1 ? Math.min((anim.sunriseProgress - 0.1) * 2, 0.8) : 0} />

            {/* Cosmic Dust Particles */}
            <CosmicDust visible={showDust} opacity={anim.dustOpacity} />

            {/* Lens Flare / God Ray */}
            <LensFlare
                intensity={anim.godRayIntensity}
                position={INTRO_CONFIG.lighting.godRay.position}
            />

            {/* Eclipse Lighting System - now uses ref internally */}
            <EclipseLighting
                introPhase={introPhase}
                introAnimRef={introAnimRef}
            />

            {/* Environment - intensity from ref */}
            <Environment
                preset={CONFIG.lighting.environment.preset}
                background={false}
                environmentIntensity={anim.environmentIntensity}
            />

            {/* Neptune Model */}
            <Suspense fallback={<LoadingFallback />}>
                <NeptuneModel spinSpeed={spinSpeed} />
            </Suspense>

            <EffectComposer>
                <Bloom
                    ref={bloomRef}
                    intensity={anim.bloomIntensity}
                    luminanceThreshold={CONFIG.postProcessing.bloomThreshold}
                    luminanceSmoothing={CONFIG.postProcessing.bloomRadius}
                    mipmapBlur={true}
                />
                <Vignette
                    ref={vignetteRef}
                    offset={0.15}
                    darkness={anim.vignetteIntensity}
                    blendFunction={BlendFunction.NORMAL}
                />
                <Noise
                    opacity={CONFIG.postProcessing.noiseOpacity}
                    blendFunction={BlendFunction.OVERLAY}
                />
            </EffectComposer>
        </>
    );
}

// Neptune Scene - Main Component
export function NeptuneScene() {
    // Get store actions
    const { setIntroComplete: setStoreIntroComplete } = useNeptuneStore();

    // INTRO PHASE STATE - only changes 3 times, no performance issue
    const [introPhase, setIntroPhase] = useState<'intro' | 'transition' | 'main'>('intro');
    const [fadeOpacity, setFadeOpacity] = useState(1); // CSS overlay - needs to be state
    const [introComplete, setIntroComplete] = useState(false);

    // Background resource management - pause 3D when app is not visible
    const [isAppVisible, setIsAppVisible] = useState(true);

    useEffect(() => {
        // Listen for visibility changes from Electron main process
        const cleanup = window.electronAPI?.onAppVisibility?.(({ visible, minimized }) => {
            setIsAppVisible(visible && !minimized);
        });
        return () => { cleanup?.(); };
    }, []);

    // PERFORMANCE: All intro animation values in a single ref - NO RE-RENDERS!
    // GSAP directly mutates this ref, AnimatedSceneContent reads from it in useFrame
    const introAnimRef = useRef<IntroAnimValues>({
        rimIntensity: INTRO_CONFIG.lighting.rimLight.initialIntensity,
        sunriseProgress: 0,
        cameraTransitionProgress: 0,
        bloomIntensity: 0.3,
        environmentIntensity: 0,
        dustOpacity: 0,
        godRayIntensity: 0,
        introTime: 0,
        chromaticAberrationOffset: 0,
        vignetteIntensity: INTRO_CONFIG.postProcessing.vignette.start,
        mainLightIntensity: 0,
    });

    // MAIN SCENE STATES - These need to remain as state for tab animations
    const [spinSpeed, setSpinSpeed] = useState(CONFIG.animation.finalSpinSpeed);

    // TAB NAVIGATION STATE
    const [currentTabIndex, setCurrentTabIndex] = useState<number>(0);
    const [buttonOpacity, setButtonOpacity] = useState(0);
    const [textOpacity, setTextOpacity] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const animationRef = useRef<gsap.core.Timeline | null>(null);

    // ECLIPSE AWAKENING INTRO SEQUENCE - OPTIMIZED: Uses ref instead of setState!
    useEffect(() => {
        const { timing } = INTRO_CONFIG;
        const anim = introAnimRef.current;

        const tl = gsap.timeline();

        // Phase 1: Darkness (0 - 0.8s)
        // Only fadeOpacity uses setState because it controls the CSS overlay
        const fadeObj = { value: 1 };
        tl.to(fadeObj, {
            value: 0.95,
            duration: timing.darkness,
            ease: 'power2.out',
            onUpdate: () => setFadeOpacity(fadeObj.value),
        }, 0);

        // PERFORMANCE: All other values update the ref directly - NO setState!
        tl.to(anim, {
            introTime: timing.introComplete,
            duration: timing.introComplete,
            ease: 'none',
            // No onUpdate needed - useFrame reads from ref automatically
        }, 0);

        // Phase 2: Rim Light Appear (0.8s - 2.0s)
        tl.to(fadeObj, {
            value: 0,
            duration: timing.rimAppear,
            ease: 'power2.inOut',
            onUpdate: () => setFadeOpacity(fadeObj.value),
        }, timing.darkness);

        // Direct ref mutation - no setState!
        tl.to(anim, {
            rimIntensity: INTRO_CONFIG.lighting.rimLight.peakIntensity,
            duration: timing.rimAppear,
            ease: 'power2.out',
        }, timing.darkness);

        // Cosmic Dust fade in
        tl.to(anim, {
            dustOpacity: 1,
            duration: timing.rimAppear * 1.5,
            ease: 'power2.out',
        }, timing.darkness);

        // Phase 3: Sunrise (2.0s - 4.5s)
        tl.to(anim, {
            sunriseProgress: 1,
            duration: timing.sunrisePeak - timing.sunriseStart,
            ease: 'power1.inOut',
        }, timing.sunriseStart);

        // Gentler bloom spike
        tl.to(anim, {
            bloomIntensity: 1.8,
            duration: 1.2,
            ease: 'sine.out',
        }, timing.sunrisePeak - 0.6);

        tl.to(anim, {
            bloomIntensity: CONFIG.postProcessing.bloomIntensity,
            duration: 2.5,
            ease: 'sine.inOut',
        }, timing.sunrisePeak + 0.8);

        // Main Light - "Breathing" Transition: Gradually open AFTER GodRay flash
        // Eclipse light enters after showing full effect
        const preTransitionLightLevel = CONFIG.animation.finalLightIntensity * 0.35; // Open up to 35%
        tl.to(anim, {
            mainLightIntensity: preTransitionLightLevel,
            duration: timing.cameraTransition - (timing.godRayFlash + 0.8), // From after GodRay to transition
            ease: 'sine.inOut', // Smooth, breath-like transition
        }, timing.godRayFlash + 0.8); // Start 0.8s after flash

        // God Ray Flash at peak moment
        tl.to(anim, {
            godRayIntensity: 0.7,
            duration: 0.8,
            ease: 'power1.out',
        }, timing.godRayFlash - 0.4);

        // Slower fade-out after peak - longer duration for slower decay
        tl.to(anim, {
            godRayIntensity: 0,
            duration: 3.0,
            ease: 'sine.inOut', // Smoother easing
        }, timing.godRayFlash + 0.6);

        // Phase 4: Camera Transition (5.0s - 9.0s)
        tl.call(() => setIntroPhase('transition'), [], timing.cameraTransition);

        // All transition values animate directly on the ref - zero setState!
        // Using sine.inOut easing for smooth transition
        const transitionDuration = timing.introComplete - timing.cameraTransition;

        // Slowly fade out intro lights (start BEFORE main light - cross-fade)
        tl.to(anim, {
            rimIntensity: 0,
            dustOpacity: 0,
            godRayIntensity: 0,
            duration: transitionDuration * 0.7, // Finish before main light fully opens
            ease: 'sine.out', // Smooth fade out
        }, timing.cameraTransition);

        // Transition to main scene values - start with slight delay (cross-fade effect)
        tl.to(anim, {
            cameraTransitionProgress: 1,
            sunriseProgress: 1,
            mainLightIntensity: CONFIG.animation.finalLightIntensity,
            environmentIntensity: CONFIG.lighting.environment.intensity,
            vignetteIntensity: CONFIG.postProcessing.vignetteDarkness,
            bloomIntensity: CONFIG.postProcessing.bloomIntensity,
            duration: transitionDuration,
            ease: 'sine.inOut', // "Breathing" smooth transition
        }, timing.cameraTransition);

        // Phase 5: Intro Complete (9.0s)
        tl.call(() => {
            setIntroPhase('main');
            setIntroComplete(true);
            setStoreIntroComplete(true); // Notify store that intro is complete

            // Force all ref values to CONFIG settings (ensures main scene is correct)
            anim.vignetteIntensity = CONFIG.postProcessing.vignetteDarkness;
            anim.bloomIntensity = CONFIG.postProcessing.bloomIntensity;
            anim.environmentIntensity = CONFIG.lighting.environment.intensity;
            anim.mainLightIntensity = CONFIG.animation.finalLightIntensity;
            anim.rimIntensity = 0;
            anim.sunriseProgress = 1;
            anim.dustOpacity = 0;
            anim.godRayIntensity = 0;
        }, [], timing.introComplete);

        return () => { tl.kill(); };
    }, []);

    // PLAY NAVIGATION ANIMATION - Receives targetIndex directly from Store
    const playNavigationAnimation = useCallback((targetIndex: number, direction: 'next' | 'prev') => {
        if (!introComplete || isAnimating) return;

        if (animationRef.current) {
            animationRef.current.kill();
        }

        setIsAnimating(true);

        const spinDirection = direction === 'next' ? 1 : -1;
        const burstSpeed = CONFIG.animation.spinBurstSpeed * spinDirection;
        const idleSpeed = CONFIG.animation.finalSpinSpeed;

        const tl = gsap.timeline({
            onComplete: () => {
                setIsAnimating(false);
                animationRef.current = null;
            }
        });

        animationRef.current = tl;

        // Phase 1: Fade out existing button (if visible)
        if (buttonOpacity > 0) {
            const textFadeOut = { value: textOpacity };
            tl.to(textFadeOut, {
                value: 0,
                duration: 0.15,
                onUpdate: () => setTextOpacity(textFadeOut.value),
            });
            const buttonFadeOut = { value: buttonOpacity };
            tl.to(buttonFadeOut, {
                value: 0,
                duration: 0.2,
                onUpdate: () => setButtonOpacity(buttonFadeOut.value),
            });
        }

        // Phase 2: Planet spin burst + update local state
        const spinObj = { speed: burstSpeed };
        tl.call(() => setSpinSpeed(burstSpeed));
        tl.call(() => {
            // Update local state to match Store's targetIndex
            setCurrentTabIndex(targetIndex);
        });
        tl.to(spinObj, {
            speed: idleSpeed,
            duration: CONFIG.animation.spinBurstDuration,
            ease: 'power4.out',
            onUpdate: () => setSpinSpeed(spinObj.speed),
        });

        // Phase 3: Fade in new button
        const buttonOpacityObj = { value: 0 };
        tl.to(buttonOpacityObj, {
            value: 1,
            duration: 0.4,
            ease: 'power2.out',
            onUpdate: () => setButtonOpacity(buttonOpacityObj.value),
        });

        // Phase 4: Fade in text
        const textOpacityObj = { value: 0 };
        tl.to(textOpacityObj, {
            value: 1,
            duration: 0.3,
            ease: 'power2.out',
            onUpdate: () => setTextOpacity(textOpacityObj.value),
        }, '-=0.15');

    }, [introComplete, isAnimating, buttonOpacity, textOpacity]);

    // TAB CLICK HANDLER - Uses Store's openCurrentTab
    const handleTabClick = useCallback(() => {
        if (currentTabIndex === null || isAnimating) return;

        // Simply open the modal - Store already knows the activeTabIndex
        const store = useNeptuneStore.getState();
        store.openCurrentTab();
    }, [currentTabIndex, isAnimating]);

    // 🔗 SYNC WITH STORE - Listen for activeTabIndex changes
    // Also syncs button with Store when modal closes or on first arrow press
    const lastKnownIndex = useRef<number>(0);
    const wasModalOpen = useRef<boolean>(false);
    const wasFirstNavigation = useRef<boolean>(true);

    useEffect(() => {
        const unsubscribe = useNeptuneStore.subscribe((state) => {
            // If modal just closed, sync button with Store's current index
            if (wasModalOpen.current && !state.isModalOpen) {
                // Modal just closed - update button to show current tab
                setCurrentTabIndex(state.activeTabIndex);
                lastKnownIndex.current = state.activeTabIndex;
            }
            wasModalOpen.current = state.isModalOpen;

            // Detect first arrow press: isFirstNavigation went from true to false
            if (wasFirstNavigation.current && !state.isFirstNavigation) {
                wasFirstNavigation.current = false;
                // First press - reveal button at current index (no direction change)
                if (introComplete && !isAnimating) {
                    playNavigationAnimation(state.activeTabIndex, 'next');
                }
                lastKnownIndex.current = state.activeTabIndex;
                return;
            }
            wasFirstNavigation.current = state.isFirstNavigation;

            // Don't trigger animation if intro not complete, animating, or modal is open
            if (!introComplete || isAnimating || state.viewState === 'FOCUS' || state.isModalOpen) {
                lastKnownIndex.current = state.activeTabIndex;
                return;
            }

            const newIndex = state.activeTabIndex;
            if (newIndex !== lastKnownIndex.current) {
                // Determine direction
                const diff = newIndex - lastKnownIndex.current;
                // Handle wrap-around
                const direction = (diff === 1 || diff === -(TAB_COUNT - 1)) ? 'next' : 'prev';
                lastKnownIndex.current = newIndex;
                // Pass targetIndex directly - no calculation needed!
                playNavigationAnimation(newIndex, direction);
            }
        });

        return () => unsubscribe();
    }, [introComplete, isAnimating, playNavigationAnimation]);

    // KEYBOARD NAVIGATION
    useEffect(() => {
        if (!introComplete) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if modal is open (FOCUS mode)
            const state = useNeptuneStore.getState();
            if (state.viewState === 'FOCUS' || state.isModalOpen) return;

            if (e.key === 'ArrowRight') {
                state.setHasInteractedWithArrows(true);
                // Use Store's navigateNext instead of local animation
                state.navigateNext();
            } else if (e.key === 'ArrowLeft') {
                state.setHasInteractedWithArrows(true);
                state.navigatePrev();
            } else if (e.key === 'Enter') {
                // Only allow Enter after first interaction (when arrows stop pulsing)
                if (state.hasInteractedWithArrows) {
                    handleTabClick();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [introComplete, handleTabClick]);

    const tabName = currentTabIndex !== null ? TABS[currentTabIndex].name : '';
    const tabDesc = currentTabIndex !== null ? TABS[currentTabIndex].desc : '';

    return (
        <>
            {/* Intro Fade Overlay */}
            <IntroFadeOverlay opacity={fadeOpacity} />

            {/* CSS Holographic Button - Overlay */}
            <HolographicButtonCSS
                tabName={tabName}
                tabDesc={tabDesc}
                buttonOpacity={buttonOpacity}
                textOpacity={textOpacity}
                onClick={handleTabClick}
            />

            <Canvas
                camera={{ position: INTRO_CONFIG.camera.phases[0].position, fov: INTRO_CONFIG.camera.phases[0].fov }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: '#000000',
                }}
                gl={{
                    localClippingEnabled: true,
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true,
                }}
                dpr={[1, 2]}
                frameloop={isAppVisible ? 'always' : 'demand'}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = CONFIG.film.exposure;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
            >
                <AnimatedSceneContent
                    introPhase={introPhase}
                    introAnimRef={introAnimRef}
                    spinSpeed={spinSpeed}
                />
            </Canvas>
        </>
    );
}

useGLTF.preload('./neptune.glb');

export default NeptuneScene;

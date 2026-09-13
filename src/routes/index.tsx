import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { generateGemini } from '../lib/gemini.functions';
import {
  createPostureVision,
  type PostureVisionAnalysis,
  type PostureVisionEngine,
} from '../lib/postureVision';
import { supabase } from '../lib/supabase';
import AuthScreen from '../components/AuthScreen';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  FileText,
  Globe,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  Mic2,
  Moon,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Sun,
  Target,
  VideoOff,
  Volume2,
  Waves,
  Play,
  Pause,
  Square,
  Activity,
  Gauge,
  Clock3,
  Eye,
  LogOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Float,
  Line,
  PointMaterial,
  Points,
  Stars,
} from '@react-three/drei';
import * as THREE from 'three';

type AudioTone = 'high' | 'moderate' | 'low';

interface AudioMetrics {
  elapsedSeconds: number;
  rms: number;
  peak: number;
  volumePercent: number;
  pitchHz: number;
  tone: AudioTone;
  wordsPerMinute: number;
  pauseCount: number;
  longestPauseMs: number;
  fillerCount: number;
  clarityScore: number;
  energyScore: number;
  consistencyScore: number;
}

interface AudioReport {
  overallScore: number;
  transcriptMatch: number;
  tone: string;
  toneTarget: string;
  averageVolume: number;
  peakVolume: number;
  pitchHz: number;
  wpm: number;
  pauseCount: number;
  longestPause: number;
  fillerCount: number;
  clarity: number;
  energy: number;
  consistency: number;
  feedback: string[];
}

interface PostureMetrics {
  score: number;
  eyeContact: number;
  faceDetected: boolean;
  centerOffset: number;
  faceSize: number;
  status: string;
  advice: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }
}

const EMPTY_AUDIO_METRICS: AudioMetrics = {
  elapsedSeconds: 0, rms: 0, peak: 0, volumePercent: 0, pitchHz: 0, tone: 'moderate',
  wordsPerMinute: 0, pauseCount: 0, longestPauseMs: 0, fillerCount: 0, clarityScore: 0, energyScore: 0, consistencyScore: 0,
};

interface VocalCue {
  textSegment: string;
  tone:
    | 'High Tone'
    | 'Moderate Tone'
    | 'Low Tone';
  pace: string;
  action: string;
  highlightLevel:
    | 'high'
    | 'low'
    | 'moderate';
}

interface SparringChallenge {
  opposingDelegation: string;
  challengeQuestion: string;
  suggestedDefense: string;
}

interface DashboardData {
  ratings: {
    persuasiveness: number;
    clarity: number;
    relevanceToAgenda: number;
  };
  factCheck: {
    claim: string;
    verdict:
      | 'Accurate'
      | 'Inaccurate'
      | 'Needs Context';
    notes: string;
  }[];
  suggestedAdditions: string[];
  vocalScript: VocalCue[];
  chartData: {
    paragraph: number;
    sentiment: number;
  }[];
  sparringChallenge: SparringChallenge;
}

interface SavedSpeech {
  id: string;
  title: string;
  agenda: string;
  transcript: string;
  date: string;
  tag: 'PROJECT' | 'DEBATE';
  data: DashboardData | null;
}

export const Route = createFileRoute('/')({
  component: Index,
});

/* ========================================================================== */
/* PARTICLES                                                                  */
/* ========================================================================== */

function NeuralParticles({
  theme,
}: {
  theme: 'dark' | 'light';
}) {
  const pointsRef =
    useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const values: number[] = [];

    for (let i = 0; i < 1700; i += 1) {
      const radius =
        4 + Math.random() * 5;

      const theta =
        Math.random() *
        Math.PI *
        2;

      const phi =
        Math.acos(
          2 * Math.random() - 1,
        );

      values.push(
        radius *
          Math.sin(phi) *
          Math.cos(theta),

        radius *
          Math.sin(phi) *
          Math.sin(theta),

        radius * Math.cos(phi),
      );
    }

    return new Float32Array(
      values,
    );
  }, []);

  useFrame((state) => {
    if (!pointsRef.current)
      return;

    const time =
      state.clock.getElapsedTime();

    pointsRef.current.rotation.y =
      time * 0.018;

    pointsRef.current.rotation.x =
      Math.sin(time * 0.12) *
      0.025;
  });

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      stride={3}
    >
      <PointMaterial
        transparent
        color={
          theme === 'dark'
            ? '#60a5fa'
            : '#3b82f6'
        }
        size={
          theme === 'dark'
            ? 0.035
            : 0.045
        }
        sizeAttenuation
        depthWrite={false}
        opacity={
          theme === 'dark'
            ? 0.72
            : 0.24
        }
      />
    </Points>
  );
}

/* ========================================================================== */
/* DARK THEME 3D OBJECT                                                       */
/* ========================================================================== */

function DarkHeroObject({
  mouse,
}: {
  mouse: {
    x: number;
    y: number;
  };
}) {
  const groupRef =
    useRef<THREE.Group>(null);

  const knotRef =
    useRef<THREE.Mesh>(null);

  const glowKnotRef =
    useRef<THREE.Mesh>(null);

  const ringsRef =
    useRef<THREE.Group>(null);

  const ringOne = useMemo(() => {
    const points: [
      number,
      number,
      number,
    ][] = [];

    for (let i = 0; i <= 160; i += 1) {
      const angle =
        (i / 160) *
        Math.PI *
        2;

      points.push([
        Math.cos(angle) *
          4.45,

        Math.sin(angle) *
          4.45,

        0,
      ]);
    }

    return points;
  }, []);

  const ringTwo = useMemo(() => {
    const points: [
      number,
      number,
      number,
    ][] = [];

    for (let i = 0; i <= 160; i += 1) {
      const angle =
        (i / 160) *
        Math.PI *
        2;

      points.push([
        Math.cos(angle) *
          4.7,

        Math.sin(angle) *
          1.45,

        Math.sin(angle) *
          1.35,
      ]);
    }

    return points;
  }, []);

  const ringThree = useMemo(() => {
    const points: [
      number,
      number,
      number,
    ][] = [];

    for (let i = 0; i <= 160; i += 1) {
      const angle =
        (i / 160) *
        Math.PI *
        2;

      points.push([
        Math.cos(angle) *
          1.55,

        Math.sin(angle) *
          4.7,

        Math.cos(angle) *
          0.9,
      ]);
    }

    return points;
  }, []);

  useFrame((state) => {
    const time =
      state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.x =
        THREE.MathUtils.lerp(
          groupRef.current.position.x,
          3.45 +
            Math.sin(
              time * 0.22,
            ) *
              0.16 +
            mouse.x * 0.8,
          0.025,
        );

      groupRef.current.position.y =
        THREE.MathUtils.lerp(
          groupRef.current.position.y,
          Math.sin(
            time * 0.34,
          ) *
            0.12 +
            mouse.y * 0.5,
          0.025,
        );

      groupRef.current.rotation.x =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.x,
          Math.sin(
            time * 0.21,
          ) *
            0.035 +
            mouse.y * 0.12,
          0.035,
        );

      groupRef.current.rotation.y =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          Math.sin(
            time * 0.17,
          ) *
            0.045 +
            mouse.x * 0.055,
          0.035,
        );

      groupRef.current.rotation.z =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.z,
          Math.sin(
            time * 0.19,
          ) *
            0.035 +
            mouse.x * 0.1,
          0.035,
        );
    }

    if (knotRef.current) {
      knotRef.current.rotation.x =
        time * 0.16;

      knotRef.current.rotation.y =
        time * 0.25;

      knotRef.current.rotation.z =
        time * 0.075;
    }

    if (glowKnotRef.current) {
      glowKnotRef.current.rotation.x =
        time * 0.16;

      glowKnotRef.current.rotation.y =
        time * 0.25;

      glowKnotRef.current.rotation.z =
        time * 0.075;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y =
        time * 0.065;

      ringsRef.current.rotation.x =
        Math.sin(
          time * 0.25,
        ) * 0.08;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[3.45, 0, 0]}
      scale={1.08}
    >
      <mesh
        position={[
          0,
          0,
          -1.3,
        ]}
      >
        <sphereGeometry
          args={[4.5, 48, 48]}
        />

        <meshBasicMaterial
          color="#2563eb"
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>

      <Float
        speed={0.65}
        rotationIntensity={0.08}
        floatIntensity={0.28}
      >
        <mesh ref={knotRef}>
          <torusKnotGeometry
            args={[
              2.65,
              0.72,
              320,
              64,
              2,
              3,
            ]}
          />

          <meshPhysicalMaterial
            color="#174ea6"
            metalness={0.88}
            roughness={0.18}
            clearcoat={1}
            clearcoatRoughness={0.12}
            transmission={0.18}
            thickness={1.5}
            transparent
            opacity={0.92}
          />
        </mesh>
      </Float>

      <mesh
        ref={glowKnotRef}
        scale={1.025}
      >
        <torusKnotGeometry
          args={[
            2.65,
            0.72,
            220,
            32,
            2,
            3,
          ]}
        />

        <meshBasicMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>

      <group ref={ringsRef}>
        <Line
          points={ringOne}
          color="#3b82f6"
          transparent
          opacity={0.62}
          lineWidth={1.15}
        />

        <Line
          points={ringTwo}
          color="#22d3ee"
          transparent
          opacity={0.52}
          lineWidth={0.95}
        />

        <Line
          points={ringThree}
          color="#60a5fa"
          transparent
          opacity={0.48}
          lineWidth={0.9}
        />
      </group>

      <NeuralParticles theme="dark" />

      <mesh>
        <sphereGeometry
          args={[0.32, 32, 32]}
        />

        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>

      {[
        [4.15, 0.8, 0.2],
        [-3.8, 1.55, 0.3],
        [1.15, 4.05, 0.45],
        [-1.4, -4.0, -0.15],
        [3.25, -2.4, 0.4],
        [-2.95, 2.85, 0.25],
        [0.1, 2.95, 2.0],
        [0.25, -2.95, -2.0],
      ].map(
        (
          position,
          index,
        ) => (
          <Float
            key={index}
            speed={
              0.65 +
              index * 0.1
            }
            floatIntensity={0.55}
            rotationIntensity={0.25}
          >
            <mesh
              position={
                position as [
                  number,
                  number,
                  number,
                ]
              }
            >
              <sphereGeometry
                args={[
                  index % 3 === 0
                    ? 0.095
                    : 0.055,
                  18,
                  18,
                ]}
              />

              <meshBasicMaterial
                color={
                  index % 3 === 0
                    ? '#22d3ee'
                    : '#3b82f6'
                }
              />
            </mesh>
          </Float>
        ),
      )}
    </group>
  );
}

/* ========================================================================== */
/* LIGHT THEME 3D OBJECT                                                      */
/* ========================================================================== */

function LightHeroObject({
  mouse,
}: {
  mouse: {
    x: number;
    y: number;
  };
}) {
  const groupRef =
    useRef<THREE.Group>(null);

  const mainRef =
    useRef<THREE.Mesh>(null);

  const secondRef =
    useRef<THREE.Mesh>(null);

  const thirdRef =
    useRef<THREE.Mesh>(null);

  const orbitRef =
    useRef<THREE.Group>(null);

  useFrame((state) => {
    const time =
      state.clock.getElapsedTime();

    if (groupRef.current) {
      const naturalX =
        Math.sin(
          time * 0.52,
        ) * 0.32 +
        Math.cos(
          time * 0.27,
        ) * 0.12;

      const naturalY =
        Math.sin(
          time * 0.72,
        ) * 0.24 +
        Math.cos(
          time * 0.35,
        ) * 0.08;

      const naturalRotationX =
        Math.sin(
          time * 0.44,
        ) * 0.075;

      const naturalRotationY =
        Math.cos(
          time * 0.38,
        ) * 0.095;

      const naturalRotationZ =
        Math.sin(
          time * 0.48,
        ) * 0.07;

      const cursorTiltX =
        mouse.y * 0.42;

      const cursorTiltY =
        mouse.x * 0.42;

      const cursorTiltZ =
        -mouse.x * 0.16;

      const targetX =
        3.35 +
        naturalX +
        mouse.x * 0.32;

      const targetY =
        naturalY +
        mouse.y * 0.24;

      const targetRotationX =
        naturalRotationX +
        cursorTiltX;

      const targetRotationY =
        naturalRotationY +
        cursorTiltY;

      const targetRotationZ =
        naturalRotationZ +
        cursorTiltZ;

      groupRef.current.position.x =
        THREE.MathUtils.lerp(
          groupRef.current.position.x,
          targetX,
          0.055,
        );

      groupRef.current.position.y =
        THREE.MathUtils.lerp(
          groupRef.current.position.y,
          targetY,
          0.055,
        );

      groupRef.current.rotation.x =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.x,
          targetRotationX,
          0.065,
        );

      groupRef.current.rotation.y =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetRotationY,
          0.065,
        );

      groupRef.current.rotation.z =
        THREE.MathUtils.lerp(
          groupRef.current.rotation.z,
          targetRotationZ,
          0.065,
        );
    }

    if (mainRef.current) {
      mainRef.current.rotation.x =
        time * 0.24;

      mainRef.current.rotation.y =
        time * 0.34;

      mainRef.current.rotation.z =
        time * 0.11;
    }

    if (secondRef.current) {
      secondRef.current.rotation.x =
        -time * 0.19;

      secondRef.current.rotation.y =
        time * 0.27;

      secondRef.current.rotation.z =
        -time * 0.14;
    }

    if (thirdRef.current) {
      thirdRef.current.rotation.x =
        time * 0.15;

      thirdRef.current.rotation.y =
        -time * 0.23;

      thirdRef.current.rotation.z =
        time * 0.19;
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.y =
        time * 0.14;

      orbitRef.current.rotation.x =
        Math.sin(
          time * 0.42,
        ) * 0.11;

      orbitRef.current.rotation.z =
        Math.cos(
          time * 0.3,
        ) * 0.06;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[3.35, 0, 0]}
      scale={1.08}
    >
      <mesh
        position={[
          0,
          0,
          -1.5,
        ]}
      >
        <sphereGeometry
          args={[4.7, 48, 48]}
        />

        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          -1.6,
        ]}
      >
        <sphereGeometry
          args={[3.65, 48, 48]}
        />

        <meshBasicMaterial
          color="#2563eb"
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>

      <Float
        speed={0.9}
        rotationIntensity={0.14}
        floatIntensity={0.38}
      >
        <mesh
          ref={mainRef}
          rotation={[
            0.25,
            -0.25,
            0.65,
          ]}
        >
          <torusGeometry
            args={[
              2.75,
              0.48,
              48,
              180,
            ]}
          />

          <meshPhysicalMaterial
            color="#6daeff"
            metalness={0.76}
            roughness={0.09}
            clearcoat={1}
            clearcoatRoughness={0.05}
            transmission={0.52}
            thickness={1.35}
            transparent
            opacity={0.84}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>

      <Float
        speed={0.78}
        rotationIntensity={0.11}
        floatIntensity={0.3}
      >
        <mesh
          ref={secondRef}
          rotation={[
            -0.55,
            0.35,
            -0.25,
          ]}
          scale={[
            1.12,
            0.82,
            1,
          ]}
        >
          <torusGeometry
            args={[
              2.55,
              0.38,
              44,
              180,
            ]}
          />

          <meshPhysicalMaterial
            color="#3e87ff"
            metalness={0.82}
            roughness={0.075}
            clearcoat={1}
            clearcoatRoughness={0.04}
            transmission={0.48}
            thickness={1.1}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>

      <Float
        speed={1}
        rotationIntensity={0.1}
        floatIntensity={0.28}
      >
        <mesh
          ref={thirdRef}
          rotation={[
            0.9,
            0.15,
            0.35,
          ]}
          scale={[
            0.78,
            1.2,
            1,
          ]}
        >
          <torusGeometry
            args={[
              2.45,
              0.16,
              32,
              160,
            ]}
          />

          <meshPhysicalMaterial
            color="#a7d2ff"
            metalness={0.56}
            roughness={0.055}
            clearcoat={1}
            clearcoatRoughness={0.04}
            transmission={0.64}
            thickness={0.85}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>

      <mesh
        rotation={[
          0.25,
          -0.25,
          0.65,
        ]}
        scale={1.02}
      >
        <torusGeometry
          args={[
            2.75,
            0.485,
            34,
            150,
          ]}
        />

        <meshBasicMaterial
          color="#1677f3"
          wireframe
          transparent
          opacity={0.34}
          depthWrite={false}
        />
      </mesh>

      <group ref={orbitRef}>
        <mesh
          rotation={[
            0,
            0,
            0.25,
          ]}
        >
          <torusGeometry
            args={[
              3.85,
              0.015,
              12,
              180,
            ]}
          />

          <meshBasicMaterial
            color="#4f91ff"
            transparent
            opacity={0.72}
          />
        </mesh>

        <mesh
          rotation={[
            Math.PI / 2,
            0,
            0.5,
          ]}
        >
          <torusGeometry
            args={[
              3.7,
              0.012,
              12,
              180,
            ]}
          />

          <meshBasicMaterial
            color="#22aef2"
            transparent
            opacity={0.6}
          />
        </mesh>

        <mesh
          rotation={[
            0.7,
            0.2,
            -0.25,
          ]}
          scale={[
            1.15,
            0.75,
            1,
          ]}
        >
          <torusGeometry
            args={[
              3.55,
              0.011,
              12,
              180,
            ]}
          />

          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.48}
          />
        </mesh>
      </group>

      {[
        [3.55, 1.25, 0.3],
        [-3.2, 1.8, 0.2],
        [1.55, -3.45, 0.4],
        [-1.8, -3.2, -0.2],
        [3.1, -2.1, 0.1],
        [-2.8, 0.1, 0.5],
      ].map(
        (
          position,
          index,
        ) => (
          <Float
            key={index}
            speed={
              0.9 +
              index * 0.12
            }
            floatIntensity={0.7}
            rotationIntensity={0.32}
          >
            <mesh
              position={
                position as [
                  number,
                  number,
                  number,
                ]
              }
            >
              <sphereGeometry
                args={[
                  index === 0 ||
                  index === 2
                    ? 0.13
                    : 0.075,
                  24,
                  24,
                ]}
              />

              <meshPhysicalMaterial
                color={
                  index % 2 === 0
                    ? '#3b82f6'
                    : '#22aef2'
                }
                metalness={0.45}
                roughness={0.08}
                clearcoat={1}
                clearcoatRoughness={0.04}
                transparent
                opacity={0.96}
              />
            </mesh>
          </Float>
        ),
      )}

      <mesh>
        <sphereGeometry
          args={[0.25, 32, 32]}
        />

        <meshBasicMaterial
          color="#dbeafe"
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>

      <NeuralParticles theme="light" />
    </group>
  );
}

/* ========================================================================== */
/* HERO SCENE                                                                 */
/* ========================================================================== */

function HeroScene({
  theme,
}: {
  theme: 'dark' | 'light';
}) {
  const [mouse, setMouse] =
    useState({
      x: 0,
      y: 0,
    });

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(event) => {
        const rect =
          event.currentTarget.getBoundingClientRect();

        setMouse({
          x:
            ((event.clientX -
              rect.left) /
              rect.width -
              0.5) *
            2,

          y:
            -(
              (event.clientY -
                rect.top) /
                rect.height -
              0.5
            ) *
            2,
        });
      }}
    >
      <Canvas
        camera={{
          position: [
            0,
            0,
            13,
          ],
          fov: 42,
        }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference:
            'high-performance',
        }}
      >
        <ambientLight
          intensity={
            theme === 'dark'
              ? 0.5
              : 1.25
          }
        />

        <pointLight
          position={[
            4,
            5,
            7,
          ]}
          intensity={
            theme === 'dark'
              ? 16
              : 13
          }
          distance={24}
          color="#3b82f6"
        />

        <pointLight
          position={[
            -4,
            -3,
            5,
          ]}
          intensity={
            theme === 'dark'
              ? 9
              : 9
          }
          distance={20}
          color="#22d3ee"
        />

        <pointLight
          position={[
            6,
            -5,
            3,
          ]}
          intensity={
            theme === 'dark'
              ? 7
              : 8
          }
          distance={18}
          color="#60a5fa"
        />

        <directionalLight
          position={[
            -4,
            7,
            9,
          ]}
          intensity={
            theme === 'dark'
              ? 2.2
              : 3.8
          }
          color="#dbeafe"
        />

        {theme === 'dark' && (
          <Stars
            radius={100}
            depth={60}
            count={2800}
            factor={2.7}
            saturation={0}
            fade
            speed={0.3}
          />
        )}

        {theme === 'dark' ? (
          <DarkHeroObject
            mouse={mouse}
          />
        ) : (
          <LightHeroObject
            mouse={mouse}
          />
        )}
      </Canvas>
    </div>
  );
}

/* ========================================================================== */
/* LOGO                                                                       */
/* ========================================================================== */

function LogoMark() {
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-blue-500/60 bg-blue-500/10">
      <div className="absolute h-[27px] w-[27px] rounded-full border-[5px] border-blue-500" />

      <div className="absolute h-[9px] w-[9px] rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.95)]" />

      <div className="absolute bottom-[8px] h-[3px] w-[19px] rounded-full bg-blue-500" />
    </div>
  );
}

/* ========================================================================== */
/* MAIN                                                                       */
/* ========================================================================== */

function Index() {
  const [theme, setTheme] =
    useState<'dark' | 'light'>(
      'light',
    );

  const [
    currentView,
    setCurrentView,
  ] = useState<
    'landing' | 'workspace'
  >('landing');

  const [speeches, setSpeeches] =
    useState<SavedSpeech[]>([]);

  const [authReady, setAuthReady] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [username, setUsername] =
    useState('');

  const [
    activeSpeechId,
    setActiveSpeechId,
  ] = useState<string | null>(
    null,
  );

  const [
    titleText,
    setTitleText,
  ] = useState('');

  const [
    agendaText,
    setAgendaText,
  ] = useState('');

  const [
    accentStyle,
    setAccentStyle,
  ] = useState(
    'International Diplomatic (UN Standard)',
  );

  const [
    speechText,
    setSpeechText,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<DashboardData | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    userRebuttal,
    setUserRebuttal,
  ] = useState('');

  const [
    sparringFeedback,
    setSparringFeedback,
  ] =
    useState<string | null>(null);

  const [
    isEvaluatingRebuttal,
    setIsEvaluatingRebuttal,
  ] = useState(false);

  const [
    isRefreshingChallenge,
    setIsRefreshingChallenge,
  ] = useState(false);

  const [
    isWebcamActive,
    setIsWebcamActive,
  ] = useState(false);

  const [postureStatus, setPostureStatus] = useState('Standby');
  const [postureMetrics, setPostureMetrics] = useState<PostureMetrics>({
    score: 0, eyeContact: 0, faceDetected: false, centerOffset: 0, faceSize: 0,
    status: 'Standby', advice: 'Start the coach to calibrate your camera position.',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const postureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const postureVisionRef = useRef<PostureVisionEngine | null>(null);

  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>(EMPTY_AUDIO_METRICS);
  const [audioReport, setAudioReport] = useState<AudioReport | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recognizedSpeech, setRecognizedSpeech] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const audioStartedAtRef = useRef(0);
  const audioPausedAtRef = useRef(0);
  const audioPausedStateRef = useRef(false);
  const pausedDurationRef = useRef(0);
  const pauseCountRef = useRef(0);
  const longestPauseRef = useRef(0);
  const silenceStartedAtRef = useRef<number | null>(null);
  const pitchSamplesRef = useRef<number[]>([]);
  const volumeSamplesRef = useRef<number[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const dark =
    theme === 'dark';

  const surface = dark
    ? 'border-[#193653] bg-[#071321]/92'
    : 'border-[#c9d9ea] bg-white/95';

  const muted = dark
    ? 'text-[#9aabc0]'
    : 'text-[#334d6d]';

  const strongText = dark
    ? 'text-[#f4f8ff]'
    : 'text-[#06152c]';

  const border = dark
    ? 'border-[#193653]'
    : 'border-[#c9d9ea]';

  const input = dark
    ? 'border-[#193b5d] bg-[#020a14] text-[#eef6ff] placeholder:text-[#667a94]'
    : 'border-[#afc3da] bg-white text-[#07152b] placeholder:text-[#657994]';

  /* ======================================================================== */
  /* CAMERA + POSTURE + EYE CONTACT                                           */
  /* ======================================================================== */

  const analyzePostureFrame = () => {
    const video = videoRef.current;
    const vision = postureVisionRef.current;
    if (!video || !vision || video.readyState < 2) return;

    try {
      const analysis: PostureVisionAnalysis = vision.analyze(video);
      setPostureStatus(analysis.status);
      setPostureMetrics(analysis);
    } catch {
      setPostureStatus('Vision Tracking Error');
      setPostureMetrics((previous) => ({
        ...previous,
        status: 'Vision Tracking Error',
        advice: 'The camera vision model encountered an error. Restart the camera and try again.',
      }));
    }
  };

  const stopWebcam = () => {
    if (postureIntervalRef.current) clearInterval(postureIntervalRef.current);
    postureIntervalRef.current = null;

    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    postureVisionRef.current?.close();
    postureVisionRef.current = null;

    setIsWebcamActive(false);
    setPostureStatus('Standby');
    setPostureMetrics({
      score: 0,
      eyeContact: 0,
      faceDetected: false,
      centerOffset: 0,
      faceSize: 0,
      status: 'Standby',
      advice: 'Start the coach to calibrate your camera position.',
    });
  };

  const toggleWebcam = async () => {
    if (isWebcamActive) {
      stopWebcam();
      return;
    }

    let stream: MediaStream | null = null;
    let cameraStarted = false;

    try {
      stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      const video =
        videoRef.current;

      if (!video) {
        throw new Error(
          'Camera preview element is unavailable.',
        );
      }

      video.srcObject = stream;
      cameraStarted = true;

      /*
       * Mark the camera active immediately after the stream is attached.
       * Vision initialization must never control whether the camera stays on.
       */
      setIsWebcamActive(true);
      setError(null);
      setPostureStatus('Loading Vision');
      setPostureMetrics({
        score: 0,
        eyeContact: 0,
        faceDetected: false,
        centerOffset: 0,
        faceSize: 0,
        status: 'Loading Vision',
        advice:
          'Loading face and posture tracking.',
      });

      /*
       * Wait for the video element to receive metadata before attempting
       * playback. Some browsers expose the MediaStream before the video
       * element is actually ready to render it.
       */
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          const handleMetadata = () => {
            video.removeEventListener(
              'loadedmetadata',
              handleMetadata,
            );
            resolve();
          };

          video.addEventListener(
            'loadedmetadata',
            handleMetadata,
            { once: true },
          );
        });
      }

      /*
       * Playback failure should not automatically kill a working camera
       * stream. The browser may temporarily reject play() while the preview
       * is becoming ready.
       */
      try {
        await video.play();
      } catch (playError) {
        console.warn(
          'Camera preview playback was delayed:',
          playError,
        );
      }

      const vision =
        createPostureVision();

      postureVisionRef.current =
        vision;

      try {
        await vision.initialize();

        /*
         * Calibration is deliberately separate from camera activation.
         * If the ML models fail, the camera remains active and the UI reports
         * the actual vision failure instead of pretending to have metrics.
         */
        setPostureStatus(
          'Calibrating',
        );

        setPostureMetrics(
          (previous) => ({
            ...previous,
            status: 'Calibrating',
            advice:
              'Sit naturally in your normal speaking position and look toward the camera for a moment.',
          }),
        );

        await vision.calibrate(
          video,
          1600,
        );

        setPostureStatus(
          'Analyzing',
        );

        setPostureMetrics(
          (previous) => ({
            ...previous,
            status: 'Analyzing',
            advice:
              'Vision tracking is active. Continue speaking naturally.',
          }),
        );

        analyzePostureFrame();

        postureIntervalRef.current =
          setInterval(() => {
            analyzePostureFrame();
          }, 250);
      } catch (visionError) {
        console.error(
          'Posture vision initialization failed:',
          visionError,
        );

        setPostureStatus(
          'Vision Tracking Error',
        );

        setPostureMetrics(
          (previous) => ({
            ...previous,
            status:
              'Vision Tracking Error',
            advice:
              'The camera is working, but the vision model could not initialize. Your camera will remain active.',
          }),
        );
      }
    } catch (cameraError) {
      console.error(
        'Camera initialization failed:',
        cameraError,
      );

      /*
       * Only stop the stream if the camera itself failed.
       * Never run this branch for MediaPipe/model/calibration failures.
       */
      if (
        stream &&
        !cameraStarted
      ) {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop(),
          );
      }

      setIsWebcamActive(false);

      setPostureStatus(
        'Camera Error',
      );

      setPostureMetrics({
        score: 0,
        eyeContact: 0,
        faceDetected: false,
        centerOffset: 0,
        faceSize: 0,
        status: 'Camera Error',
        advice:
          'Unable to access the camera. Check browser permissions and try again.',
      });

      setError(
        'Unable to access camera. Please check browser permissions.',
      );
    }
  };

  /* ======================================================================== */
  /* AUDIO ENGINE                                                             */
  /* ======================================================================== */

  const detectPitch = (buffer: Float32Array, sampleRate: number) => {
    let rms = 0;
    for (let i = 0; i < buffer.length; i += 1) rms += (buffer[i] ?? 0) * (buffer[i] ?? 0);
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.018) return 0;
    let bestOffset = -1;
    let bestCorrelation = 0;
    const minOffset = Math.floor(sampleRate / 420);
    const maxOffset = Math.floor(sampleRate / 70);
    for (let offset = minOffset; offset <= Math.min(maxOffset, buffer.length - 2); offset += 1) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - offset; i += 1) correlation += (buffer[i] ?? 0) * (buffer[i + offset] ?? 0);
      correlation /= buffer.length - offset;
      if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
    }
    return bestOffset > 0 && bestCorrelation >= 0.001 ? sampleRate / bestOffset : 0;
  };

  const countFillers = (text: string) => (text.toLowerCase().match(/\b(um+|uh+|er+|like|basically|actually|you know|sort of|kind of|i mean)\b/g) || []).length;

  const transcriptMatchScore = (reference: string, spoken: string) => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
    const expected = normalize(reference);
    const actual = normalize(spoken);
    if (!expected.length || !actual.length) return 0;
    const counts = new Map<string, number>();
    expected.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    let matched = 0;
    actual.forEach((word) => { const count = counts.get(word) || 0; if (count > 0) { matched += 1; counts.set(word, count - 1); } });
    return Math.min(100, Math.round((matched / expected.length) * 100));
  };

  const startSpeechRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => { let transcript = ''; for (let i = 0; i < event.results.length; i += 1) transcript += `${event.results[i][0]?.transcript || ''} `; setRecognizedSpeech(transcript.trim()); };
    recognition.onerror = () => {};
    recognition.onend = () => { if (isAudioActive && speechRecognitionRef.current === recognition) { try { recognition.start(); } catch {} } };
    speechRecognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  };

  const stopAudioCoach = () => {
    if (audioFrameRef.current !== null) cancelAnimationFrame(audioFrameRef.current);
    audioFrameRef.current = null;
    if (speechRecognitionRef.current) { try { speechRecognitionRef.current.stop(); } catch {} speechRecognitionRef.current = null; }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach((track) => track.stop()); audioStreamRef.current = null; }
    if (audioContextRef.current) { void audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
    setIsAudioActive(false); setIsAudioPaused(false); audioPausedStateRef.current = false;

    const metrics = audioMetrics;
    const transcriptMatch = transcriptMatchScore(speechText, recognizedSpeech);
    const averageVolume = volumeSamplesRef.current.length ? volumeSamplesRef.current.reduce((a, b) => a + b, 0) / volumeSamplesRef.current.length : metrics.rms;
    const overallScore = Math.round(metrics.clarityScore * 0.25 + metrics.energyScore * 0.20 + metrics.consistencyScore * 0.15 + Math.min(100, transcriptMatch || 70) * 0.20 + Math.max(0, 100 - Math.min(100, metrics.fillerCount * 4)) * 0.10 + Math.max(0, 100 - Math.min(100, metrics.pauseCount * 2)) * 0.10);
    const feedback: string[] = [];
    if (metrics.wordsPerMinute > 160) feedback.push('You are speaking quickly. Slow down slightly so key arguments land clearly.');
    else if (metrics.wordsPerMinute > 0 && metrics.wordsPerMinute < 95) feedback.push('Your pace is slow. Add a little momentum while keeping important pauses.');
    else feedback.push('Your speaking pace is in a controlled range.');
    if (metrics.fillerCount > 3) feedback.push(`You used ${metrics.fillerCount} filler words. Replace them with short silent pauses.`);
    else feedback.push('Filler-word control is strong.');
    if (metrics.energyScore < 45) feedback.push('Increase projection and vocal energy during important claims.');
    else if (metrics.energyScore > 85) feedback.push('Your energy is strong; avoid pushing the voice too hard.');
    else feedback.push('Vocal energy is controlled and usable for a formal speech.');
    if (metrics.longestPauseMs > 2200) feedback.push('One pause was quite long. Use deliberate pauses, but keep the rhythm moving.');
    if (transcriptMatch > 0 && transcriptMatch < 75) feedback.push('Your spoken delivery diverged from the written script. Review the highlighted sections before the next run.');
    setAudioReport({ overallScore, transcriptMatch, tone: metrics.tone === 'high' ? 'High' : metrics.tone === 'low' ? 'Low' : 'Moderate', toneTarget: dashboardData?.vocalScript?.[0]?.tone || 'Moderate Tone', averageVolume: Math.round(Math.min(100, averageVolume * 330)), peakVolume: Math.round(Math.min(100, metrics.peak * 330)), pitchHz: metrics.pitchHz, wpm: metrics.wordsPerMinute, pauseCount: metrics.pauseCount, longestPause: metrics.longestPauseMs, fillerCount: metrics.fillerCount, clarity: metrics.clarityScore, energy: metrics.energyScore, consistency: metrics.consistencyScore, feedback });
  };

  const toggleAudioPause = () => {
    if (!isAudioActive) return;
    const recorder = mediaRecorderRef.current;
    const context = audioContextRef.current;
    if (!isAudioPaused) { if (recorder?.state === 'recording') recorder.pause(); void context?.suspend(); setIsAudioPaused(true); audioPausedStateRef.current = true; audioPausedAtRef.current = performance.now(); }
    else { pausedDurationRef.current += performance.now() - audioPausedAtRef.current; audioPausedAtRef.current = 0; if (recorder?.state === 'paused') recorder.resume(); void context?.resume(); audioPausedStateRef.current = false; setIsAudioPaused(false); }
  };

  const startAudioCoach = async () => {
    if (isAudioActive) return;
    setAudioError(null); setAudioReport(null); setRecognizedSpeech(''); setAudioMetrics(EMPTY_AUDIO_METRICS); pauseCountRef.current = 0; longestPauseRef.current = 0; pausedDurationRef.current = 0; pitchSamplesRef.current = []; volumeSamplesRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
      audioStreamRef.current = stream;
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextCtor(); await context.resume(); audioContextRef.current = context;
      const analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.72; analyserRef.current = analyser; context.createMediaStreamSource(stream).connect(analyser);
      const recorder = new MediaRecorder(stream); recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' }); if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(URL.createObjectURL(blob)); };
      mediaRecorderRef.current = recorder; recorder.start(250); audioStartedAtRef.current = performance.now(); setIsAudioActive(true); setIsAudioPaused(false); startSpeechRecognition();
      const timeData = new Float32Array(analyser.fftSize);
      const loop = () => {
        if (!analyserRef.current) return; analyserRef.current.getFloatTimeDomainData(timeData);
        let sum = 0; let peak = 0; for (let i = 0; i < timeData.length; i += 1) { const v = Math.abs(timeData[i] ?? 0); sum += v * v; if (v > peak) peak = v; }
        const rms = Math.sqrt(sum / timeData.length); const now = performance.now(); const livePaused = audioPausedStateRef.current && audioPausedAtRef.current ? now - audioPausedAtRef.current : 0; const elapsed = Math.max(0, (now - audioStartedAtRef.current - pausedDurationRef.current - livePaused) / 1000);
        const pitchHz = detectPitch(timeData, context.sampleRate);
        if (rms < 0.018) { if (silenceStartedAtRef.current === null) silenceStartedAtRef.current = now; }
        else if (silenceStartedAtRef.current !== null) { const silenceMs = now - silenceStartedAtRef.current; if (silenceMs >= 450) { pauseCountRef.current += 1; longestPauseRef.current = Math.max(longestPauseRef.current, silenceMs); } silenceStartedAtRef.current = null; }
        if (pitchHz > 0) pitchSamplesRef.current.push(pitchHz); volumeSamplesRef.current.push(rms); if (pitchSamplesRef.current.length > 180) pitchSamplesRef.current.shift(); if (volumeSamplesRef.current.length > 180) volumeSamplesRef.current.shift();
        const avgPitch = pitchSamplesRef.current.length ? pitchSamplesRef.current.reduce((a,b)=>a+b,0)/pitchSamplesRef.current.length : 0; const avgVolume = volumeSamplesRef.current.length ? volumeSamplesRef.current.reduce((a,b)=>a+b,0)/volumeSamplesRef.current.length : 0;
        const pitchRatio = avgPitch > 0 ? pitchHz / avgPitch : 1; const volumeRatio = avgVolume > 0 ? rms / avgVolume : 1; let tone: AudioTone = 'moderate'; if (pitchRatio > 1.16 || volumeRatio > 1.42) tone = 'high'; if (pitchRatio < 0.86 || volumeRatio < 0.62) tone = 'low';
        const words = recognizedSpeech.trim() ? recognizedSpeech.trim().split(/\s+/).length : 0; const wpm = elapsed > 3 ? Math.round(words / (elapsed / 60)) : 0; const volumePercent = Math.min(100, Math.round(rms * 330)); const energy = Math.min(100, Math.round(volumePercent * 0.72 + Math.min(100, pitchRatio * 55) * 0.28)); const fillers = countFillers(recognizedSpeech); const paceScore = wpm === 0 ? 70 : Math.max(0, 100 - Math.abs(wpm - 135) * 0.65); const clarity = Math.max(0, Math.min(100, Math.round(paceScore - fillers * 2.5))); const consistency = volumeSamplesRef.current.length > 10 ? Math.max(0, Math.min(100, Math.round(100 - (Math.max(...volumeSamplesRef.current) - Math.min(...volumeSamplesRef.current)) * 260))) : 70;
        setAudioMetrics({ elapsedSeconds: elapsed, rms, peak, volumePercent, pitchHz: Math.round(pitchHz), tone, wordsPerMinute: wpm, pauseCount: pauseCountRef.current, longestPauseMs: Math.round(longestPauseRef.current), fillerCount: fillers, clarityScore: clarity, energyScore: energy, consistencyScore: consistency });
        audioFrameRef.current = requestAnimationFrame(loop);
      };
      audioFrameRef.current = requestAnimationFrame(loop);
    } catch { setAudioError('Unable to access your microphone. Please allow microphone access and try again.'); setIsAudioActive(false); }
  };

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (
      userId: string,
    ) => {
      const [
        profileResult,
        speechResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .maybeSingle(),

        supabase
          .from('speeches')
          .select(
            'id,title,agenda,transcript,tag,analysis,created_at',
          )
          .order('created_at', {
            ascending: false,
          }),
      ]);

      if (!mounted) return;

      if (profileResult.error) {
        setError(
          profileResult.error.message,
        );
      } else {
        setUsername(
          profileResult.data?.username ?? '',
        );
      }

      if (speechResult.error) {
        setError(
          speechResult.error.message,
        );
        setSpeeches([]);
      } else {
        setSpeeches(
          (speechResult.data ?? []).map(
            (row) => ({
              id: row.id,
              title: row.title,
              agenda: row.agenda ?? '',
              transcript:
                row.transcript ?? '',
              date: new Date(
                row.created_at,
              ).toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                },
              ),
              tag:
                row.tag === 'DEBATE'
                  ? 'DEBATE'
                  : 'PROJECT',
              data:
                row.analysis as DashboardData | null,
            }),
          ),
        );
      }
    };

    const initializeAuth = async () => {
      const {
        data,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setError(
          sessionError.message,
        );
        setAuthReady(true);
        return;
      }

      const session = data.session;

      if (!session?.user) {
        setCurrentUserId(null);
        setUsername('');
        setSpeeches([]);
        setAuthReady(true);
        return;
      }

      setCurrentUserId(
        session.user.id,
      );

      await loadUserData(
        session.user.id,
      );

      if (mounted) {
        setAuthReady(true);
      }
    };

    void initializeAuth();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;

          if (!session?.user) {
            setCurrentUserId(null);
            setUsername('');
            setSpeeches([]);
            setActiveSpeechId(null);
            setDashboardData(null);
            setCurrentView('landing');
            return;
          }

          setCurrentUserId(
            session.user.id,
          );

          void loadUserData(
            session.user.id,
          );
        },
      );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => () => { stopWebcam(); stopAudioCoach(); }, []);

  /* ======================================================================== */
  /* NAVIGATION                                                               */
  /* ======================================================================== */

  const openNewSpeech =
    () => {
      setTitleText('');

      setAgendaText('');

      setSpeechText('');

      setDashboardData(
        null,
      );

      setActiveSpeechId(
        null,
      );

      setSparringFeedback(
        null,
      );

      setUserRebuttal(
        '',
      );

      setError(null);

      setCurrentView(
        'workspace',
      );
    };

  const openSpeech = (
    speech: SavedSpeech,
  ) => {
    setTitleText(
      speech.title,
    );

    setAgendaText(
      speech.agenda,
    );

    setSpeechText(
      speech.transcript,
    );

    setDashboardData(
      speech.data,
    );

    setActiveSpeechId(
      speech.id,
    );

    setSparringFeedback(
      null,
    );

    setUserRebuttal(
      '',
    );

    setError(null);

    setCurrentView(
      'workspace',
    );
  };

  /* ======================================================================== */
  /* ANALYZE                                                                  */
  /* ======================================================================== */

  const handleAnalyze =
    async () => {
      if (
        !speechText.trim() ||
        !agendaText.trim()
      ) {
        setError(
          'Please provide both an Agenda and the Speech text.',
        );

        return;
      }

      setIsLoading(true);
      setError(null);
      setSparringFeedback(
        null,
      );

      let retries = 3;
      let success = false;

      while (
        retries > 0 &&
        !success
      ) {
        try {
          const response =
            await generateGemini(
              {
                data: {
                  systemInstruction:
                    {
                      parts: [
                        {
                          text: `You are an elite speech director, rhetoric strategist, vocal coach and debate-performance analyst.

The selected presentation style is:
"${accentStyle}"

You are analyzing a COMPLETE speech transcript.

Your most important requirement is COMPLETE COVERAGE.

Do NOT analyze only the opening portion.
Do NOT stop generating vocal guidance halfway through.
Do NOT summarize or omit later paragraphs.
The vocal direction must continue until the FINAL WORD of the supplied speech.

For the vocalScript specifically, DO NOT create a cue for every individual sentence.

Instead, divide the speech into CONTIGUOUS DELIVERY SECTIONS.

A delivery section may contain:
- one sentence,
- two sentences,
- three sentences,
- or a larger continuous passage,

depending on where the delivery should change.

The purpose is to tell the speaker:

"From THIS part until THAT part, maintain THIS voice level, THIS pace and THIS physical delivery."

Every part of the original speech must belong to exactly one vocalScript section.

IMPORTANT VOCAL SCRIPT RULES:

1. Start at the very beginning of the transcript.
2. Continue sequentially through the transcript.
3. Finish at the very end of the transcript.
4. Preserve the original wording inside textSegment.
5. Do not rewrite the speaker's words.
6. Do not invent sentences.
7. Do not skip sentences.
8. Do not duplicate passages.
9. Group adjacent sentences when they need the same delivery.
10. Create a new section whenever the recommended voice level, pace, emphasis or physical delivery meaningfully changes.
11. For a long speech, prefer meaningful sections rather than hundreds of tiny sentence-by-sentence cues.
12. Aim for roughly 1 section per 2-5 sentences when appropriate, but prioritize meaningful delivery changes over a fixed number.
13. If a paragraph is very long, split it into multiple delivery sections.
14. The final vocalScript section MUST contain the ending portion of the speech.
15. The first vocalScript section MUST contain the opening portion of the speech.
16. Collectively, all textSegment values in order must cover the COMPLETE speech.

TONE MUST BE EXTREMELY SIMPLE.

The "tone" field may ONLY contain one of these three exact values:

"High Tone"
"Moderate Tone"
"Low Tone"

NEVER use rhetorical or complicated descriptions in the tone field.

Do NOT use:
- Critical
- Rhetorical
- Authoritative
- Inquisitive
- Passionate
- Emphatic
- Aggressive
- Diplomatic
- Unyielding
- Formal
- Persuasive
- Assertive
- Serious
- Challenging
- Inspirational

as tone values.

Instead, convert the intended vocal intensity into one of these three levels:

HIGH TONE:
Use when the speaker should sound stronger, more forceful, urgent or emotionally intense.
High Tone does NOT mean shouting.

MODERATE TONE:
Use when the speaker should use a normal, controlled and confident speaking volume.

LOW TONE:
Use when the speaker should become softer, calmer, slower or more deliberate so the words have greater weight.

IMPORTANT:
Tone means VOICE LEVEL, not emotion.

A speaker can be passionate while using a Moderate Tone.
A speaker can be serious while using a Low Tone.
A speaker can be confident while using a Moderate Tone.

Choose the tone based mainly on how strongly and loudly the speaker should deliver that section.

PACE is separate from tone.

Use simple pace descriptions such as:
"Slow"
"Moderate"
"Fast"
"Moderate-Slow"
"Moderate-Fast"

Do not use complicated rhetorical terminology in pace either.

Examples:

{
  "textSegment": "This is not merely a statistic.",
  "tone": "Low Tone",
  "pace": "Slow",
  "action": "Lower your voice slightly, slow down and pause after the sentence.",
  "highlightLevel": "high"
}

Another example:

{
  "textSegment": "Where is the urgency? Women make up nearly half of this country.",
  "tone": "High Tone",
  "pace": "Moderate",
  "action": "Raise your vocal energy, maintain direct eye contact and emphasize the key words.",
  "highlightLevel": "high"
}

Another example:

{
  "textSegment": "The delegation believes that coordinated action remains essential.",
  "tone": "Moderate Tone",
  "pace": "Moderate",
  "action": "Maintain a steady voice, upright posture and controlled gestures.",
  "highlightLevel": "moderate"
}

The "action" field may explain emotion, emphasis, gestures, pauses, eye contact and posture in simple language.

Do not use complicated rhetorical terminology in the tone or pace fields.

Analyze:

1. Persuasiveness.
2. Clarity.
3. Relevance to the agenda.
4. Every important factual claim.
5. COMPLETE vocal delivery coverage from beginning to end.
6. Opposing committee challenges.
7. Emotional trajectory.
8. Content improvements.

Return ONLY valid JSON.

Use exactly this structure:

{
  "ratings": {
    "persuasiveness": 8,
    "clarity": 8,
    "relevanceToAgenda": 9
  },
  "factCheck": [
    {
      "claim": "claim",
      "verdict": "Accurate",
      "notes": "verification or context"
    }
  ],
  "suggestedAdditions": [
    "specific improvement"
  ],
  "vocalScript": [
    {
      "textSegment": "exact contiguous passage from the speech",
      "tone": "Moderate Tone",
      "pace": "Moderate",
      "action": "Maintain a steady voice and controlled eye contact.",
      "highlightLevel": "moderate"
    }
  ],
  "chartData": [
    {
      "paragraph": 1,
      "sentiment": 5
    }
  ],
  "sparringChallenge": {
    "opposingDelegation": "Delegation of France",
    "challengeQuestion": "sharp challenging question",
    "suggestedDefense": "strategic diplomatic defense"
  }
}

VOCAL SCRIPT QUALITY STANDARD:

The vocalScript is NOT a summary.

The textSegment must contain the actual words spoken by the user.

For example, if the speech says:

"Honourable Chair, today we face a serious challenge. We cannot ignore it. The people deserve action. This is not merely a statistic."

A good output could be:

Section 1:
textSegment = "Honourable Chair, today we face a serious challenge. We cannot ignore it."
tone = "Moderate Tone"
pace = "Moderate"

Section 2:
textSegment = "The people deserve action. This is not merely a statistic."
tone = "High Tone"
pace = "Slow"

Do NOT produce:

"Opening"
"Main argument"
"Conclusion"

without the actual speech text.

Every section must contain actual transcript text.

If the transcript contains 100 sentences, it is completely acceptable to return 20-35 meaningful delivery sections rather than 100 individual cues.

The number of sections is less important than COMPLETE COVERAGE.

FINAL VERIFICATION BEFORE RETURNING JSON:

Make sure:
- the first vocal section begins at the beginning of the speech,
- every major passage is covered,
- sections remain in the original order,
- no passage is skipped,
- the final vocal section reaches the end of the speech,
- every tone value is EXACTLY "High Tone", "Moderate Tone" or "Low Tone",
- no complex rhetorical terminology appears in the tone field,
- no complex rhetorical terminology appears in the pace field.`,
                        },
                      ],
                    },

                  contents: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: `STYLE:
${accentStyle}

AGENDA:
${agendaText}

COMPLETE SPEECH TRANSCRIPT:
${speechText}

IMPORTANT:
Analyze the ENTIRE transcript above.
The vocalScript must cover the speech from its first words through its final words.
Group contiguous sentences into meaningful delivery sections rather than generating one cue for every sentence.`,
                        },
                      ],
                    },
                  ],

                  generationConfig:
                    {
                      responseMimeType:
                        'application/json',
                      temperature: 0.2,
                    },
                },
              },
            );

          const cleaned =
            response
              .replace(
                /```json/g,
                '',
              )
              .replace(
                /```/g,
                '',
              )
              .trim();

          const data =
            JSON.parse(
              cleaned,
            ) as DashboardData;

          if (
            !Array.isArray(
              data.vocalScript,
            )
          ) {
            data.vocalScript =
              [];
          }

          data.vocalScript =
            data.vocalScript.filter(
              (cue) =>
                cue &&
                typeof cue.textSegment ===
                  'string' &&
                cue.textSegment.trim()
                  .length > 0,
            );

          data.vocalScript =
            data.vocalScript.map(
              (cue) => ({
                ...cue,
                tone:
                  cue.tone ===
                    'High Tone' ||
                  cue.tone ===
                    'Low Tone'
                    ? cue.tone
                    : 'Moderate Tone',
              }),
            );

          setDashboardData(
            data,
          );

          const existingTag =
            speeches.find(
              (speech) =>
                speech.id ===
                activeSpeechId,
            )?.tag;

          const newSpeech: SavedSpeech =
            {
              id:
                activeSpeechId ||
                Date.now().toString(),

              title:
                titleText ||
                'Untitled Speech',

              agenda:
                agendaText,

              transcript:
                speechText,

              date:
                new Date().toLocaleDateString(
                  'en-US',
                  {
                    month:
                      'long',
                    day: 'numeric',
                    year: 'numeric',
                  },
                ),

              tag:
                existingTag ||
                'PROJECT',

              data,
            };

          if (!currentUserId) {
            throw new Error(
              'Your session has expired. Please sign in again.',
            );
          }

          if (activeSpeechId) {
            const { error: updateError } =
              await supabase
                .from('speeches')
                .update({
                  title: newSpeech.title,
                  agenda: newSpeech.agenda,
                  transcript:
                    newSpeech.transcript,
                  tag: newSpeech.tag,
                  analysis: newSpeech.data,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  'id',
                  activeSpeechId,
                )
                .eq(
                  'user_id',
                  currentUserId,
                );

            if (updateError) {
              throw updateError;
            }

            setSpeeches(
              (
                previous,
              ) =>
                previous.map(
                  (
                    speech,
                  ) =>
                    speech.id ===
                    activeSpeechId
                      ? newSpeech
                      : speech,
                ),
            );
          } else {
            const {
              data: insertedSpeech,
              error: insertError,
            } = await supabase
              .from('speeches')
              .insert({
                user_id:
                  currentUserId,
                title: newSpeech.title,
                agenda: newSpeech.agenda,
                transcript:
                  newSpeech.transcript,
                tag: newSpeech.tag,
                analysis: newSpeech.data,
              })
              .select(
                'id,title,agenda,transcript,tag,analysis,created_at',
              )
              .single();

            if (insertError) {
              throw insertError;
            }

            const savedSpeech: SavedSpeech =
              {
                ...newSpeech,
                id: insertedSpeech.id,
                date: new Date(
                  insertedSpeech.created_at,
                ).toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  },
                ),
              };

            setSpeeches(
              (
                previous,
              ) => [
                savedSpeech,
                ...previous,
              ],
            );

            setActiveSpeechId(
              savedSpeech.id,
            );
          }

          success = true;
        } catch (err) {
          if (
            retries === 1
          ) {
            setError(
              err instanceof
                Error
                ? err.message
                : 'Failed to analyze speech.',
            );
          }

          retries -= 1;

          if (
            retries > 0
          ) {
            await new Promise(
              (
                resolve,
              ) =>
                setTimeout(
                  resolve,
                  1500,
                ),
            );
          }
        }
      }

      setIsLoading(false);
    };

  /* ======================================================================== */
  /* REFRESH CHALLENGE                                                        */
  /* ======================================================================== */

  const handleRefreshChallenge =
    async () => {
      if (
        !dashboardData
      )
        return;

      setIsRefreshingChallenge(
        true,
      );

      setSparringFeedback(
        null,
      );

      setUserRebuttal(
        '',
      );

      try {
        const response =
          await generateGemini(
            {
              data: {
                systemInstruction:
                  {
                    parts: [
                      {
                        text: `Generate a new sharp opposing committee interjection based on the speech.

Return ONLY JSON:

{
  "opposingDelegation": "Delegation name",
  "challengeQuestion": "sharp question",
  "suggestedDefense": "strategic diplomatic defense"
}`,
                      },
                    ],
                  },

                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `SPEECH:
${speechText}`,
                      },
                    ],
                  },
                ],

                generationConfig:
                  {
                    responseMimeType:
                      'application/json',
                    temperature: 0.7,
                  },
              },
            },
          );

        const challenge =
          JSON.parse(
            response
              .replace(
                /```json/g,
                '',
              )
              .replace(
                /```/g,
                '',
              )
              .trim(),
          ) as SparringChallenge;

        setDashboardData({
          ...dashboardData,
          sparringChallenge:
            challenge,
        });
      } catch {
        /* Preserve current challenge. */
      }

      setIsRefreshingChallenge(
        false,
      );
    };

  /* ======================================================================== */
  /* REBUTTAL                                                                 */
  /* ======================================================================== */

  const handleEvaluateRebuttal =
    async () => {
      if (
        !userRebuttal.trim() ||
        !dashboardData
      ) {
        return;
      }

      setIsEvaluatingRebuttal(
        true,
      );

      try {
        const response =
          await generateGemini(
            {
              data: {
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `Evaluate this rebuttal in 2-3 concise sentences.

CHALLENGE:
${dashboardData.sparringChallenge.challengeQuestion}

USER REBUTTAL:
${userRebuttal}

Grade diplomacy, firmness and effectiveness, followed by a score out of 10.`,
                      },
                    ],
                  },
                ],
              },
            },
          );

        setSparringFeedback(
          response,
        );
      } catch {
        setSparringFeedback(
          'Strong diplomatic structure with clear defensive positioning. Tighten the final sentence for greater authority. Score: 8.5/10.',
        );
      }

      setIsEvaluatingRebuttal(
        false,
      );
    };

  /* ======================================================================== */
  /* RENDER                                                                   */
  /* ======================================================================== */

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020812] text-blue-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <AuthScreen theme={theme} />
    );
  }

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
        dark
          ? 'bg-[#020812] text-[#eef6ff]'
          : 'bg-[#f6f9fd] text-[#07152b]'
      }`}
    >
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: ${
            dark
              ? '#28588a #020812'
              : '#91add0 #f6f9fd'
          };
        }

        ::selection {
          background: rgba(37, 99, 235, 0.22);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        {dark ? (
          <>
            <div className="absolute inset-0 bg-[#020812]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_38%,rgba(37,99,235,0.13),transparent_32%)]" />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,18,0.02),#020812_96%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[#f6f9fd]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(37,99,235,0.045),transparent_30%)]" />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(246,249,253,0.78)_80%,#f6f9fd_100%)]" />
          </>
        )}

        {currentView ===
          'landing' && (
          <div className="absolute inset-0 z-10">
            <HeroScene
              theme={theme}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1550px] px-6 pb-16 pt-7 sm:px-10 lg:px-14">
        <header className="relative z-30 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setCurrentView(
                'landing',
              )
            }
            className="group flex items-center gap-3 text-left"
          >
            <LogoMark />

            <div>
              <div
                className={`text-[25px] font-extrabold tracking-[-0.055em] sm:text-[29px] ${
                  dark
                    ? 'text-white'
                    : 'text-[#07152b]'
                }`}
              >
                Rhetorica{' '}
                <span className="text-[#2563eb]">
                  AI
                </span>
              </div>

              <div
                className={`mt-[-2px] text-[8px] font-bold uppercase tracking-[0.20em] ${
                  dark
                    ? 'text-[#8ca1bb]'
                    : 'text-[#526883]'
                }`}
              >
                Speech Intelligence
                Platform
              </div>
            </div>
          </button>

          <div className="flex items-center gap-5 sm:gap-7">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </span>

              <span
                className={`text-[10px] font-extrabold uppercase tracking-[0.20em] ${
                  dark
                    ? 'text-[#cddbef]'
                    : 'text-[#203a5d]'
                }`}
              >
                AI DIRECTOR
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`hidden max-w-[150px] truncate text-xs font-bold sm:block ${
                  dark
                    ? 'text-[#bcd0e7]'
                    : 'text-[#355274]'
                }`}
                title={username}
              >
                {username ||
                  'Account'}
              </div>

              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-[9px] border transition-all hover:border-blue-500 ${border} ${
                  dark
                    ? 'bg-[#071321]'
                    : 'bg-white'
                }`}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-[18px] w-[18px] text-blue-500" />
              </button>
            </div>

            {currentView ===
              'workspace' && (
              <button
                type="button"
                onClick={() =>
                  setCurrentView(
                    'landing',
                  )
                }
                className={`hidden items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold sm:flex ${surface}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Library
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setTheme(
                  dark
                    ? 'light'
                    : 'dark',
                )
              }
              className={`flex h-12 w-12 items-center justify-center rounded-[9px] border transition-all hover:border-blue-500 ${border} ${
                dark
                  ? 'bg-[#071321]'
                  : 'bg-white'
              }`}
            >
              {dark ? (
                <Sun className="h-[19px] w-[19px] text-blue-400" />
              ) : (
                <Moon className="h-[19px] w-[19px] text-blue-600" />
              )}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentView ===
          'landing' ? (
            <motion.main
              key="landing"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.35,
              }}
            >
              <section className="relative min-h-[590px] pt-20 sm:pt-24 lg:min-h-[630px] lg:pt-[92px]">
                {!dark && (
                  <div className="pointer-events-none absolute left-[-40px] top-[25px] z-[5] h-[470px] w-[690px] rounded-[40px] bg-white/80 blur-[25px]" />
                )}

                {dark && (
                  <div className="pointer-events-none absolute left-[-60px] top-[10px] z-[5] h-[500px] w-[690px] rounded-[40px] bg-[#020812]/35 blur-[35px]" />
                )}

                <div className="relative z-20 max-w-[700px]">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="h-px w-8 bg-blue-500" />

                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-[0.22em] ${
                        dark
                          ? 'text-blue-300'
                          : 'text-blue-700'
                      }`}
                    >
                      Intelligent Speech
                      Direction
                    </span>
                  </div>

                  <h1
                    className={`font-serif text-[54px] font-bold leading-[0.97] tracking-[-0.048em] sm:text-[67px] lg:text-[76px] ${
                      dark
                        ? 'text-[#f7faff] drop-shadow-[0_3px_20px_rgba(0,0,0,0.35)]'
                        : 'text-[#03152f] drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)]'
                    }`}
                    style={{
                      fontFamily:
                        'Georgia, "Times New Roman", serif',
                    }}
                  >
                    Your speech.
                    <br />

                    <span className="text-[#1769ed]">
                      Directed by AI.
                    </span>
                  </h1>

                  <p
                    className={`mt-7 max-w-[585px] text-[16px] leading-[1.7] sm:text-[17px] ${
                      dark
                        ? 'text-[#b0c1d5]'
                        : 'text-[#29425f]'
                    }`}
                  >
                    Analyse rhetoric,
                    delivery, facts,
                    posture and rebuttal
                    <br className="hidden sm:block" />
                    strategy in one
                    intelligent workspace.
                  </p>

                  <div className="mt-9 flex flex-wrap items-center gap-8">
                    <motion.button
                      type="button"
                      whileHover={{
                        y: -2,
                        scale: 1.015,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={
                        openNewSpeech
                      }
                      className="flex h-[57px] items-center gap-3 rounded-[9px] bg-[#1769ed] px-7 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_12px_40px_rgba(37,99,235,0.28)] transition hover:bg-[#2878f5]"
                    >
                      <Plus className="h-5 w-5" />
                      NEW SPEECH
                    </motion.button>

                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(
                            'speech-library',
                          )
                          ?.scrollIntoView(
                            {
                              behavior:
                                'smooth',
                            },
                          )
                      }
                      className={`group flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.15em] ${
                        dark
                          ? 'text-[#d1ddec]'
                          : 'text-[#173555]'
                      }`}
                    >
                      YOUR LIBRARY

                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="relative z-30 -mt-1">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:max-w-[1095px]">
                  {[
                    {
                      icon: Mic2,
                      label:
                        'DELIVERY',
                    },
                    {
                      icon: Shield,
                      label:
                        'FACT INTELLIGENCE',
                    },
                    {
                      icon: Target,
                      label:
                        'STRATEGY',
                    },
                    {
                      icon: Radio,
                      label:
                        'POSTURE AI',
                    },
                  ].map(
                    ({
                      icon: Icon,
                      label,
                    }) => (
                      <div
                        key={label}
                        className={`flex h-[62px] items-center gap-3 rounded-[9px] border px-5 backdrop-blur-xl ${surface}`}
                      >
                        <Icon className="h-[24px] w-[24px] shrink-0 text-[#198cff] stroke-[1.7]" />

                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-[0.07em] ${
                            dark
                              ? 'text-[#dce8f7]'
                              : 'text-[#132b4a]'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section
                id="speech-library"
                className="relative z-30 mt-16 sm:mt-20"
              >
                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-500">
                      Workspace
                    </div>

                    <h2
                      className={`font-serif text-[31px] font-bold tracking-[-0.025em] sm:text-[35px] ${strongText}`}
                      style={{
                        fontFamily:
                          'Georgia, "Times New Roman", serif',
                      }}
                    >
                      Speech Library
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openNewSpeech
                    }
                    className="hidden h-[49px] items-center gap-2 rounded-[9px] bg-[#1769ed] px-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_8px_25px_rgba(37,99,235,0.25)] sm:flex"
                  >
                    <Plus className="h-4 w-4" />
                    New Speech
                  </button>
                </div>

                <div
                  className={`overflow-hidden rounded-[10px] border backdrop-blur-xl ${surface}`}
                >
                  {speeches.map(
                    (
                      speech,
                      index,
                    ) => (
                      <motion.button
                        type="button"
                        key={
                          speech.id
                        }
                        onClick={() =>
                          openSpeech(
                            speech,
                          )
                        }
                        whileHover={{
                          backgroundColor:
                            dark
                              ? 'rgba(13,32,53,.72)'
                              : 'rgba(239,246,255,.82)',
                        }}
                        className={`group flex w-full items-center gap-5 px-4 py-5 text-left sm:px-5 ${
                          index !== 0
                            ? `border-t ${border}`
                            : ''
                        }`}
                      >
                        <div
                          className={`flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-[9px] border ${
                            dark
                              ? 'border-[#214463] bg-[#091a2b]'
                              : 'border-[#cfdeee] bg-[#edf5fd]'
                          }`}
                        >
                          <FileText className="h-7 w-7 text-[#2695ff] stroke-[1.6]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3
                              className={`font-serif text-[16px] font-bold sm:text-[17px] ${
                                dark
                                  ? 'text-[#edf4ff]'
                                  : 'text-[#0b1b31]'
                              }`}
                              style={{
                                fontFamily:
                                  'Georgia, "Times New Roman", serif',
                              }}
                            >
                              {
                                speech.title
                              }
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-[9px] font-extrabold tracking-[0.08em] ${
                                dark
                                  ? 'bg-blue-500/15 text-cyan-300'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {
                                speech.tag
                              }
                            </span>
                          </div>

                          <p
                            className={`mt-1.5 truncate text-[12px] ${muted}`}
                          >
                            {
                              speech.agenda
                            }
                          </p>
                        </div>

                        <div className="hidden shrink-0 items-center gap-8 sm:flex">
                          <span
                            className={`text-[12px] ${muted}`}
                          >
                            {
                              speech.date
                            }
                          </span>

                          <ArrowRight
                            className={`h-[19px] w-[19px] transition-transform group-hover:translate-x-1 ${
                              dark
                                ? 'text-[#a9bdd4]'
                                : 'text-[#45617f]'
                            }`}
                          />
                        </div>

                        <ArrowRight
                          className={`h-[18px] w-[18px] sm:hidden ${muted}`}
                        />
                      </motion.button>
                    ),
                  )}
                </div>
              </section>
            </motion.main>
          ) : (
            <motion.main
              key="workspace"
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -15,
              }}
              transition={{
                duration: 0.35,
              }}
              className="pt-10"
            >
              <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-500">
                    AI Director Workspace
                  </div>

                  <h1
                    className={`font-serif text-[36px] font-bold tracking-[-0.03em] ${strongText}`}
                    style={{
                      fontFamily:
                        'Georgia, "Times New Roman", serif',
                    }}
                  >
                    {titleText ||
                      'New Speech'}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={
                    openNewSpeech
                  }
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1769ed] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-white"
                >
                  <Plus className="h-4 w-4" />
                  New Speech
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[390px_1fr]">
                <div className="space-y-5">
                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                      <FileText className="h-4 w-4" />
                      Project Title
                    </label>

                    <input
                      value={
                        titleText
                      }
                      onChange={(event) =>
                        setTitleText(
                          event.target.value,
                        )
                      }
                      className={`w-full rounded-lg border px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 ${input}`}
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                        <Radio className="h-4 w-4" />
                        Posture & Body AI
                      </label>

                      <button
                        type="button"
                        onClick={
                          toggleWebcam
                        }
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
                          isWebcamActive
                            ? 'border border-blue-500/40 bg-blue-500/10 text-blue-500'
                            : 'bg-[#1769ed] text-white'
                        }`}
                      >
                        {isWebcamActive ? (
                          <>
                            <VideoOff className="h-3.5 w-3.5" />
                            Stop Coach
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5" />
                            Start Coach
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      className={`relative h-44 overflow-hidden rounded-lg border ${
                        dark
                          ? 'border-[#173552] bg-[#020914]'
                          : 'border-[#ccdced] bg-[#eef5fc]'
                      }`}
                    >
                      <video
                        ref={
                          videoRef
                        }
                        autoPlay
                        playsInline
                        muted
                        className={`h-full w-full object-cover ${
                          isWebcamActive
                            ? 'block'
                            : 'hidden'
                        }`}
                      />

                      {!isWebcamActive && (
                        <div className="flex h-full items-center justify-center px-8 text-center">
                          <div>
                            <Waves className="mx-auto mb-3 h-8 w-8 text-blue-500/60" />

                            <p
                              className={`text-xs leading-5 ${muted}`}
                            >
                              Start the
                              coach to
                              enable live
                              posture
                              alignment
                              tracking.
                            </p>
                          </div>
                        </div>
                      )}

                      {isWebcamActive && (
                        <>
                          <div className={`absolute bottom-2 left-2 flex items-center gap-2 rounded-md border px-3 py-1.5 backdrop-blur-md ${dark ? 'border-blue-500/20 bg-[#020914]/80' : 'border-blue-200 bg-white/90'}`}>
                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.08em]">{postureStatus}</span>
                          </div>
                          <div className="absolute right-2 top-2 rounded-md border border-blue-500/20 bg-[#020914]/75 px-2 py-1 text-[9px] font-black text-white backdrop-blur-md">{postureMetrics.score}/100</div>
                        </>
                      )}
                    </div>

                    {isWebcamActive && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className={`rounded-lg border p-3 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}>
                          <div className="flex items-center gap-1.5">
                            <Eye className="h-3 w-3 text-blue-500" />
                            <p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>Eye Contact</p>
                          </div>
                          <p className="mt-1 text-sm font-black text-blue-500">{postureMetrics.eyeContact}%</p>
                        </div>
                        <div className={`rounded-lg border p-3 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}>
                          <p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>Face Tracking</p>
                          <p className="mt-1 text-sm font-black text-blue-500">{postureMetrics.faceDetected ? 'Active' : 'Check'}</p>
                        </div>
                      </div>
                    )}

                    {isWebcamActive && (
                      <p className={`mt-3 text-[10px] leading-4 ${muted}`}>
                        <span className="font-extrabold text-blue-500">Director:</span> {postureMetrics.advice}
                      </p>
                    )}
                  </div>

                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                        <Volume2 className="h-4 w-4" />
                        Live Audio Coach
                      </label>
                      <div className="flex items-center gap-2">
                        {isAudioActive && (
                          <button type="button" onClick={toggleAudioPause} className={`rounded-md border px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider ${border}`}>
                            {isAudioPaused ? <Play className="mr-1 inline h-3 w-3" /> : <Pause className="mr-1 inline h-3 w-3" />}
                            {isAudioPaused ? 'Resume' : 'Pause'}
                          </button>
                        )}
                        <button type="button" onClick={isAudioActive ? stopAudioCoach : startAudioCoach} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] ${isAudioActive ? 'border border-blue-500/40 bg-blue-500/10 text-blue-500' : 'bg-[#1769ed] text-white'}`}>
                          {isAudioActive ? <><Square className="h-3 w-3" /> Stop Recording</> : <><Mic2 className="h-3 w-3" /> Start Recording</>}
                        </button>
                      </div>
                    </div>
                    <div className={`rounded-lg border p-4 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${muted}`}>Live Voice Signal</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">{isAudioActive ? (isAudioPaused ? 'Paused' : 'Listening') : 'Standby'}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-blue-500/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 transition-all duration-100" style={{ width: `${audioMetrics.volumePercent}%` }} /></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[['Tone', audioMetrics.tone === 'high' ? 'High' : audioMetrics.tone === 'low' ? 'Low' : 'Moderate'], ['Pitch', audioMetrics.pitchHz ? `${audioMetrics.pitchHz} Hz` : '--'], ['Pace', audioMetrics.wordsPerMinute ? `${audioMetrics.wordsPerMinute} WPM` : '--'], ['Pauses', `${audioMetrics.pauseCount}`]].map(([label,value]) => (
                        <div key={label} className={`rounded-lg border p-2.5 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}><p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>{label}</p><p className="mt-1 text-sm font-black text-blue-500">{value}</p></div>
                      ))}
                    </div>
                    {audioError && <p className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-[10px] font-semibold text-blue-500">{audioError}</p>}
                  </div>

                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                      <Globe className="h-4 w-4" />
                      Target Style /
                      Accent
                    </label>

                    <select
                      value={
                        accentStyle
                      }
                      onChange={(event) =>
                        setAccentStyle(
                          event.target.value,
                        )
                      }
                      className={`w-full rounded-lg border px-3.5 py-3 text-sm outline-none focus:border-blue-500 ${input}`}
                    >
                      <option>
                        International
                        Diplomatic (UN
                        Standard)
                      </option>

                      <option>
                        British
                        Parliamentary &
                        Formal
                      </option>

                      <option>
                        American
                        Persuasive &
                        Direct
                      </option>

                      <option>
                        Indian
                        Parliamentary &
                        Rhetorical
                      </option>
                    </select>
                  </div>

                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                      <Target className="h-4 w-4" />
                      Speech Agenda /
                      Goal
                    </label>

                    <textarea
                      value={
                        agendaText
                      }
                      onChange={(event) =>
                        setAgendaText(
                          event.target.value,
                        )
                      }
                      className={`h-24 w-full resize-none rounded-lg border px-3.5 py-3 text-sm leading-6 outline-none focus:border-blue-500 ${input}`}
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-5 backdrop-blur-xl ${surface}`}
                  >
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-500">
                      <Mic2 className="h-4 w-4" />
                      Speech Transcript
                    </label>

                    <textarea
                      value={
                        speechText
                      }
                      onChange={(event) =>
                        setSpeechText(
                          event.target.value,
                        )
                      }
                      className={`h-72 w-full resize-none rounded-lg border px-3.5 py-3 text-sm leading-6 outline-none focus:border-blue-500 ${input}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleAnalyze
                    }
                    disabled={
                      isLoading ||
                      !speechText.trim() ||
                      !agendaText.trim()
                    }
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#1769ed] text-xs font-extrabold uppercase tracking-[0.13em] text-white shadow-[0_8px_30px_rgba(37,99,235,0.22)] transition hover:bg-[#2878f5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analysing Script
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate
                        Director&apos;s
                        Cut
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-600">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                      {error}
                    </div>
                  )}
                </div>

                <div
                  className={`min-h-[800px] rounded-xl border p-5 backdrop-blur-xl sm:p-7 ${surface}`}
                >
                  {!dashboardData &&
                    !isLoading && (
                      <div className="flex min-h-[700px] flex-col items-center justify-center text-center">
                        <div
                          className={`mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border ${
                            dark
                              ? 'border-blue-500/20 bg-blue-500/5'
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <LayoutGrid className="h-9 w-9 text-blue-500" />
                        </div>

                        <h2
                          className={`font-serif text-2xl font-bold ${strongText}`}
                          style={{
                            fontFamily:
                              'Georgia, "Times New Roman", serif',
                          }}
                        >
                          Director Dashboard
                        </h2>

                        <p
                          className={`mt-2 max-w-md text-sm leading-6 ${muted}`}
                        >
                          Generate your
                          director&apos;s
                          cut to unlock
                          rhetoric,
                          fact
                          intelligence,
                          vocal
                          execution,
                          rebuttal
                          strategy and
                          delivery
                          analytics.
                        </p>
                      </div>
                    )}

                  {isLoading && (
                    <div className="flex min-h-[700px] flex-col items-center justify-center text-center">
                      <Loader2 className="mb-5 h-12 w-12 animate-spin text-blue-500" />

                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-500">
                        Breaking down
                        every line
                      </p>

                      <p
                        className={`mt-2 text-sm ${muted}`}
                      >
                        Building your
                        director&apos;s
                        cut...
                      </p>

                      <div
                        className={`mt-6 h-1.5 w-64 overflow-hidden rounded-full ${
                          dark
                            ? 'bg-[#10233a]'
                            : 'bg-[#dbe7f4]'
                        }`}
                      >
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                      </div>
                    </div>
                  )}

                  {dashboardData &&
                    !isLoading && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              label:
                                'Persuasiveness',
                              value:
                                dashboardData
                                  .ratings
                                  .persuasiveness,
                            },
                            {
                              label:
                                'Clarity',
                              value:
                                dashboardData
                                  .ratings
                                  .clarity,
                            },
                            {
                              label:
                                'Agenda Match',
                              value:
                                dashboardData
                                  .ratings
                                  .relevanceToAgenda,
                            },
                          ].map(
                            (
                              stat,
                            ) => (
                              <div
                                key={
                                  stat.label
                                }
                                className={`rounded-lg border p-5 text-center ${
                                  dark
                                    ? 'border-[#173754] bg-[#06111e]'
                                    : 'border-[#d3dfed] bg-[#f8fbff]'
                                }`}
                              >
                                <p
                                  className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${muted}`}
                                >
                                  {
                                    stat.label
                                  }
                                </p>

                                <div className="mt-2">
                                  <span className="text-3xl font-black text-blue-500">
                                    {
                                      stat.value
                                    }
                                  </span>

                                  <span
                                    className={`ml-1 text-xs ${muted}`}
                                  >
                                    /10
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        <div
                          className={`rounded-lg border p-5 ${
                            dark
                              ? 'border-blue-500/20 bg-blue-500/[0.035]'
                              : 'border-blue-200 bg-blue-50/50'
                          }`}
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-500">
                              <MessageSquareQuote className="h-4 w-4" />
                              Committee
                              Sparring
                            </h3>

                            <button
                              type="button"
                              onClick={
                                handleRefreshChallenge
                              }
                              disabled={
                                isRefreshingChallenge
                              }
                              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] ${border}`}
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                  isRefreshingChallenge
                                    ? 'animate-spin'
                                    : ''
                                }`}
                              />
                              Refresh
                            </button>
                          </div>

                          <div
                            className={`rounded-lg border p-4 ${
                              dark
                                ? 'border-[#173552] bg-[#020914]'
                                : 'border-[#d4e1ef] bg-white'
                            }`}
                          >
                            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-cyan-500">
                              {
                                dashboardData
                                  .sparringChallenge
                                  .opposingDelegation
                              }
                            </p>

                            <p
                              className={`mt-2 font-serif text-[16px] font-bold leading-6 ${strongText}`}
                              style={{
                                fontFamily:
                                  'Georgia, "Times New Roman", serif',
                              }}
                            >
                              “
                              {
                                dashboardData
                                  .sparringChallenge
                                  .challengeQuestion
                              }
                              ”
                            </p>

                            <p
                              className={`mt-3 text-xs leading-5 ${muted}`}
                            >
                              <strong className="text-blue-500">
                                Suggested
                                defense:
                              </strong>{' '}
                              {
                                dashboardData
                                  .sparringChallenge
                                  .suggestedDefense
                              }
                            </p>

                            <div className="mt-5 flex gap-2">
                              <input
                                value={
                                  userRebuttal
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setUserRebuttal(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Type your rebuttal..."
                                className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-xs outline-none focus:border-blue-500 ${input}`}
                              />

                              <button
                                type="button"
                                onClick={
                                  handleEvaluateRebuttal
                                }
                                disabled={
                                  isEvaluatingRebuttal ||
                                  !userRebuttal.trim()
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-[#1769ed] px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                              >
                                {isEvaluatingRebuttal ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-3.5 w-3.5" />
                                    Defend
                                  </>
                                )}
                              </button>
                            </div>

                            {sparringFeedback && (
                              <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-5 text-blue-600">
                                <strong>
                                  Director
                                  Feedback:
                                </strong>{' '}
                                {
                                  sparringFeedback
                                }
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={`rounded-lg border p-5 ${surface}`}
                        >
                          <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-500">
                            <Volume2 className="h-4 w-4" />
                            Line-by-Line
                            Vocal
                            Execution
                          </h3>

                          <div className="space-y-3">
                            {dashboardData.vocalScript.map(
                              (
                                cue,
                                index,
                              ) => {
                                const accent =
                                  cue.highlightLevel ===
                                  'high'
                                    ? 'border-l-blue-600'
                                    : cue.highlightLevel ===
                                        'low'
                                      ? 'border-l-cyan-400'
                                      : 'border-l-indigo-400';

                                return (
                                  <div
                                    key={
                                      index
                                    }
                                    className={`rounded-lg border border-l-[3px] p-4 ${accent} ${
                                      dark
                                        ? 'border-[#173552] bg-[#030c17]'
                                        : 'border-[#d5e1ee] bg-white'
                                    }`}
                                  >
                                    <div className="mb-2 flex flex-wrap gap-2">
                                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-blue-500">
                                        {
                                          cue.tone
                                        }
                                      </span>

                                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-cyan-500">
                                        {
                                          cue.pace
                                        }
                                      </span>
                                    </div>

                                    <p
                                      className={`font-serif text-[15px] font-bold leading-6 ${strongText}`}
                                      style={{
                                        fontFamily:
                                          'Georgia, "Times New Roman", serif',
                                      }}
                                    >
                                      “
                                      {
                                        cue.textSegment
                                      }
                                      ”
                                    </p>

                                    <p
                                      className={`mt-2 text-xs leading-5 ${muted}`}
                                    >
                                      <strong className="text-blue-500">
                                        Action:
                                      </strong>{' '}
                                      {
                                        cue.action
                                      }
                                    </p>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {audioReport && (
                          <div className={`rounded-lg border p-5 ${surface}`}>
                            <div className="mb-5 flex items-center justify-between">
                              <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-500"><Activity className="h-4 w-4" /> Audio Performance Report</h3>
                              <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">Score {audioReport.overallScore}/100</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {[['Tone', audioReport.tone], ['Pitch', audioReport.pitchHz ? `${audioReport.pitchHz} Hz` : '--'], ['Pace', audioReport.wpm ? `${audioReport.wpm} WPM` : '--'], ['Script Match', `${audioReport.transcriptMatch}%`], ['Clarity', `${audioReport.clarity}%`], ['Energy', `${audioReport.energy}%`], ['Consistency', `${audioReport.consistency}%`], ['Filler Words', `${audioReport.fillerCount}`]].map(([label,value]) => (
                                <div key={label} className={`rounded-lg border p-3 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}><p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>{label}</p><p className="mt-1 text-sm font-black text-blue-500">{value}</p></div>
                              ))}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className={`rounded-lg border p-3 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}><p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>Avg / Peak Volume</p><p className="mt-1 text-sm font-black text-blue-500">{audioReport.averageVolume}% / {audioReport.peakVolume}%</p></div>
                              <div className={`rounded-lg border p-3 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}><p className={`text-[8px] font-extrabold uppercase tracking-wider ${muted}`}>Pauses / Longest</p><p className="mt-1 text-sm font-black text-blue-500">{audioReport.pauseCount} / {(audioReport.longestPause / 1000).toFixed(1)}s</p></div>
                            </div>
                            <div className="mt-4 space-y-2">{audioReport.feedback.map((item, index) => <div key={index} className={`rounded-lg border p-3 text-[10px] leading-4 ${dark ? 'border-[#173552] bg-[#020914]' : 'border-[#d4e1ef] bg-white'}`}><span className="font-extrabold text-blue-500">Director:</span> {item}</div>)}</div>
                            {recordedAudioUrl && <audio className="mt-4 h-9 w-full" controls src={recordedAudioUrl} />}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          <div
                            className={`rounded-lg border p-5 ${surface}`}
                          >
                            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-500">
                              <Shield className="h-4 w-4" />
                              Fact
                              Intelligence
                            </h3>

                            <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
                              {dashboardData.factCheck.map(
                                (
                                  fact,
                                  index,
                                ) => {
                                  const verdictClass =
                                    fact.verdict ===
                                    'Accurate'
                                      ? 'bg-cyan-500/10 text-cyan-500'
                                      : fact.verdict ===
                                          'Inaccurate'
                                        ? 'bg-blue-600/15 text-blue-600'
                                        : 'bg-indigo-500/10 text-indigo-500';

                                  return (
                                    <div
                                      key={
                                        index
                                      }
                                      className={`rounded-lg border p-4 ${
                                        dark
                                          ? 'border-[#173552] bg-[#030c17]'
                                          : 'border-[#d5e1ee] bg-white'
                                      }`}
                                    >
                                      <div className="mb-2 flex items-center justify-between gap-3">
                                        <span
                                          className={`text-[9px] font-extrabold uppercase tracking-[0.1em] ${muted}`}
                                        >
                                          Claim #
                                          {
                                            index +
                                            1
                                          }
                                        </span>

                                        <span
                                          className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em] ${verdictClass}`}
                                        >
                                          {
                                            fact.verdict
                                          }
                                        </span>
                                      </div>

                                      <p
                                        className={`font-serif text-sm font-bold leading-5 ${strongText}`}
                                        style={{
                                          fontFamily:
                                            'Georgia, "Times New Roman", serif',
                                        }}
                                      >
                                        “
                                        {
                                          fact.claim
                                        }
                                        ”
                                      </p>

                                      <p
                                        className={`mt-2 text-xs leading-5 ${muted}`}
                                      >
                                        {
                                          fact.notes
                                        }
                                      </p>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>

                          <div
                            className={`rounded-lg border p-5 ${surface}`}
                          >
                            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-500">
                              <Lightbulb className="h-4 w-4" />
                              Content
                              Upgrades
                            </h3>

                            <div className="space-y-3">
                              {dashboardData.suggestedAdditions.map(
                                (
                                  tip,
                                  index,
                                ) => (
                                  <div
                                    key={
                                      index
                                    }
                                    className={`flex gap-3 rounded-lg border p-3 text-xs leading-5 ${
                                      dark
                                        ? 'border-[#173552] bg-[#030c17]'
                                        : 'border-[#d5e1ee] bg-white'
                                    }`}
                                  >
                                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

                                    <span>
                                      {
                                        tip
                                      }
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`rounded-lg border p-5 ${surface}`}
                        >
                          <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-500">
                            <Waves className="h-4 w-4" />
                            Emotional Arc
                            Trajectory
                          </div>

                          <div className="h-[230px]">
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >
                              <AreaChart
                                data={
                                  dashboardData.chartData
                                }
                                margin={{
                                  top: 5,
                                  right: 5,
                                  left: -25,
                                  bottom: 0,
                                }}
                              >
                                <defs>
                                  <linearGradient
                                    id="rhetoricaBlueArc"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#3b82f6"
                                      stopOpacity={
                                        0.35
                                      }
                                    />

                                    <stop
                                      offset="95%"
                                      stopColor="#3b82f6"
                                      stopOpacity={
                                        0
                                      }
                                    />
                                  </linearGradient>
                                </defs>

                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke={
                                    dark
                                      ? '#24405e'
                                      : '#d2dfed'
                                  }
                                  opacity={
                                    0.45
                                  }
                                  vertical={
                                    false
                                  }
                                />

                                <XAxis
                                  dataKey="paragraph"
                                  hide
                                />

                                <YAxis
                                  domain={[
                                    -10,
                                    10,
                                  ]}
                                  tick={{
                                    fill: dark
                                      ? '#758aa5'
                                      : '#5f7693',
                                    fontSize: 10,
                                  }}
                                  axisLine={
                                    false
                                  }
                                  tickLine={
                                    false
                                  }
                                />

                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor:
                                      dark
                                        ? '#071321'
                                        : '#ffffff',
                                    border: `1px solid ${
                                      dark
                                        ? '#1c3a5a'
                                        : '#d2dfed'
                                    }`,
                                    borderRadius:
                                      '8px',
                                    color:
                                      dark
                                        ? '#ffffff'
                                        : '#07152b',
                                  }}
                                />

                                <Area
                                  type="monotone"
                                  dataKey="sentiment"
                                  stroke="#3b82f6"
                                  strokeWidth={
                                    2.5
                                  }
                                  fill="url(#rhetoricaBlueArc)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
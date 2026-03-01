'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '@/lib/shaders';

export interface WebcamCanvasRef {
  capturePhoto: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  setEffect: (id: number) => void;
  setBaseColor: (hex: string) => void;
}

interface Props {
  onRecordingChange: (isRecording: boolean) => void;
  facingMode: 'user' | 'environment';
}

const WebcamCanvas = forwardRef<WebcamCanvasRef, Props>(({ onRecordingChange, facingMode }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const rtA = useRef<THREE.WebGLRenderTarget | null>(null);
  const rtB = useRef<THREE.WebGLRenderTarget | null>(null);
  const effectIdRef = useRef<number>(0);
  const baseColorRef = useRef<THREE.Color>(new THREE.Color('#ff0000'));

  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let isDisposed = false;
    const container = containerRef.current;
    setError(null);

    const init = async (useDemo = false) => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.crossOrigin = 'anonymous';

        if (useDemo) {
          // Use a sample video for demo mode
          video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
          await video.play();
          videoRef.current = video;
        } else {
          let stream: MediaStream;
          const constraints = {
            video: {
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 60 }
            },
            audio: true,
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (err: any) {
            // Fallback for devices (like some Huawei) that might reject specific ideal constraints
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
                audio: true
              });
            } catch (fallbackErr: any) {
               // Try without audio as a last resort
               try {
                 stream = await navigator.mediaDevices.getUserMedia({
                   video: { facingMode: facingMode }
                 });
               } catch (noAudioErr: any) {
                 if (noAudioErr.name === 'NotAllowedError' || noAudioErr.name === 'PermissionDeniedError') {
                    throw new Error('Доступ к камере запрещен. Пожалуйста, разрешите доступ в настройках браузера (значок замка в адресной строке).');
                 } else if (noAudioErr.name === 'NotFoundError' || noAudioErr.name === 'DevicesNotFoundError') {
                    throw new Error('Камера не найдена на вашем устройстве.');
                 } else {
                    throw new Error(`Ошибка доступа к медиаустройствам: ${noAudioErr.message || noAudioErr.name}`);
                 }
               }
            }
          }
          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();
          videoRef.current = video;
        }

        if (isDisposed) return;

        let width = video.videoWidth || 1280;
        let height = video.videoHeight || 720;

        const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: false });
        renderer.setSize(width, height);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.objectFit = 'cover';
        renderer.setPixelRatio(1);
        if (container) {
          container.appendChild(renderer.domElement);
        }
        canvasRef.current = renderer.domElement;
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBAFormat;

        rtA.current = new THREE.WebGLRenderTarget(width, height);
        rtB.current = new THREE.WebGLRenderTarget(width, height);

        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            tDiffuse: { value: videoTexture },
            tPrev: { value: rtA.current.texture },
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uEffect: { value: effectIdRef.current },
            uBaseColor: { value: baseColorRef.current },
            uMirror: { value: facingMode === 'user' ? 1 : 0 },
          },
        });
        materialRef.current = material;

        video.onloadedmetadata = () => {
          if (isDisposed) return;
          width = video.videoWidth || 1280;
          height = video.videoHeight || 720;
          renderer.setSize(width, height);
          rtA.current?.setSize(width, height);
          rtB.current?.setSize(width, height);
          material.uniforms.uResolution.value.set(width, height);
        };

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(quad);

        const clock = new THREE.Clock();
        let pingPong = true;

        const render = () => {
          if (isDisposed) return;
          animationFrameId = requestAnimationFrame(render);

          const time = clock.getElapsedTime();
          material.uniforms.uTime.value = time;
          material.uniforms.uEffect.value = effectIdRef.current;
          material.uniforms.uBaseColor.value = baseColorRef.current;
          material.uniforms.uMirror.value = facingMode === 'user' ? 1 : 0;

          // Ping-pong for accumulation
          if (pingPong) {
            material.uniforms.tPrev.value = rtA.current?.texture;
            renderer.setRenderTarget(rtB.current);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
          } else {
            material.uniforms.tPrev.value = rtB.current?.texture;
            renderer.setRenderTarget(rtA.current);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
          }
          pingPong = !pingPong;
        };

        render();
      } catch (err: any) {
        console.error('Error accessing media devices.', err);
        setError(err.message || 'Произошла неизвестная ошибка при доступе к камере.');
      }
    };

    init(isDemoMode);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      rtA.current?.dispose();
      rtB.current?.dispose();
      materialRef.current?.dispose();
    };
  }, [facingMode, isDemoMode]);

  useImperativeHandle(ref, () => ({
    capturePhoto: () => {
      if (!canvasRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `fx-photo-${Date.now()}.png`;
      link.click();
    },
    startRecording: () => {
      if (!canvasRef.current || !streamRef.current) return;
      const canvasStream = canvasRef.current.captureStream(60);
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }

      let mimeType = '';
      let extension = 'mp4';

      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          extension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
          mimeType = 'video/webm; codecs=vp9';
          extension = 'webm';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
          extension = 'webm';
        }
      }

      const options = mimeType ? { mimeType } : {};
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(canvasStream, options);
      } catch (e) {
        recorder = new MediaRecorder(canvasStream); // fallback
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || mimeType || 'video/mp4' });
        recordedChunksRef.current = [];
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fx-video-${Date.now()}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      onRecordingChange(true);
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        onRecordingChange(false);
      }
    },
    setEffect: (id: number) => {
      effectIdRef.current = id;
    },
    setBaseColor: (hex: string) => {
      baseColorRef.current.set(hex);
    },
  }));

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative"
    >
      {error && !isDemoMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm p-6 text-center z-50">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
            <h3 className="text-red-400 font-semibold mb-2 text-lg">Ошибка доступа</h3>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Я разрешил доступ, обновить
              </button>
              <button 
                onClick={() => {
                  setError(null);
                  setIsDemoMode(true);
                }} 
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Продолжить в Демо-режиме (без камеры)
              </button>
            </div>
          </div>
        </div>
      )}
      {isDemoMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-indigo-500/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium tracking-wide">
          ДЕМО-РЕЖИМ
        </div>
      )}
    </div>
  );
});

WebcamCanvas.displayName = 'WebcamCanvas';

export default WebcamCanvas;

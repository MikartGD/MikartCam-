'use client';

import React, { useRef, useState, useMemo } from 'react';
import WebcamCanvas, { WebcamCanvasRef } from '@/components/WebcamCanvas';
import { EFFECTS } from '@/lib/effects';
import { Camera, Video, Square, Palette, Settings2, SwitchCamera, Search, Shuffle, X, Wand2 } from 'lucide-react';

export default function Home() {
  const canvasRef = useRef<WebcamCanvasRef>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeEffect, setActiveEffect] = useState(0);
  const [baseColor, setBaseColor] = useState('#ff0000');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleEffectChange = React.useCallback((id: number) => {
    setActiveEffect(id);
    canvasRef.current?.setEffect(id);
  }, []);

  const setRandomEffect = React.useCallback(() => {
    const randomEffect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
    handleEffectChange(randomEffect.id);
  }, [handleEffectChange]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setBaseColor(color);
    canvasRef.current?.setBaseColor(color);
  };

  const handlePhoto = () => {
    canvasRef.current?.capturePhoto();
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      canvasRef.current?.stopRecording();
    } else {
      canvasRef.current?.startRecording();
    }
  };

  // Group effects by category and filter by search
  const filteredEffects = useMemo(() => {
    if (!searchQuery) return EFFECTS;
    const lowerQuery = searchQuery.toLowerCase();
    return EFFECTS.filter(e => e.name.toLowerCase().includes(lowerQuery) || e.category.toLowerCase().includes(lowerQuery));
  }, [searchQuery]);

  const categories = Array.from(new Set(filteredEffects.map((e) => e.category)));

  return (
    <main className="h-screen w-screen bg-black text-white overflow-hidden font-sans relative">
      {/* Camera Background */}
      <div className="absolute inset-0 z-0">
        <WebcamCanvas ref={canvasRef} onRecordingChange={setIsRecording} facingMode={facingMode} />
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-500 uppercase tracking-wider">ЗАП</span>
        </div>
      )}

      {/* App Branding */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tighter text-white drop-shadow-md">
          Mikart<span className="text-indigo-400">Cam</span>
        </h1>
        <a 
          href="https://t.me/Avveo" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-medium text-zinc-400 hover:text-indigo-300 transition-colors drop-shadow-sm"
        >
          telegram: @Avveo
        </a>
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-10 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-2 sm:p-4 rounded-full shadow-2xl overflow-x-auto pointer-events-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={toggleCamera}
            className="p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0"
            title="Сменить камеру"
          >
            <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handlePhoto}
            className="p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0"
            title="Сделать фото"
          >
            <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <button
            onClick={handleRecordToggle}
            className={`p-3 sm:p-4 rounded-full transition-colors flex items-center justify-center shrink-0 ${
              isRecording ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={isRecording ? 'Остановить запись' : 'Начать запись'}
          >
            {isRecording ? <Square className="w-6 h-6 sm:w-7 sm:h-7 fill-current" /> : <Video className="w-6 h-6 sm:w-7 sm:h-7" />}
          </button>
          
          <div className="w-px h-8 sm:h-10 bg-white/20 mx-1 sm:mx-2 shrink-0" />
          
          <div className="relative flex items-center gap-2 px-1 sm:px-2 shrink-0" title="Базовый цвет (для некоторых эффектов)">
            <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
            <input
              type="color"
              value={baseColor}
              onChange={handleColorChange}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </div>

          <div className="w-px h-8 sm:h-10 bg-white/20 mx-1 sm:mx-2 shrink-0" />

          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`p-3 sm:p-4 rounded-full transition-colors shrink-0 ${
              isSidebarOpen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Эффекты"
          >
            <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={`absolute top-0 right-0 h-full w-full sm:w-96 bg-zinc-950/90 backdrop-blur-3xl border-l border-white/10 flex flex-col z-20 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-indigo-400" />
              <h1 className="text-lg font-medium tracking-tight">Эффекты ({EFFECTS.length})</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={setRandomEffect}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Случайный эффект"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск эффектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {categories.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-8">
              Эффекты не найдены
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="space-y-3">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">
                  {category}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {filteredEffects.filter((e) => e.category === category).map((effect) => (
                    <button
                      key={effect.id}
                      onClick={() => handleEffectChange(effect.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left truncate ${
                        activeEffect === effect.id
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                          : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-200'
                      }`}
                      title={effect.name}
                    >
                      {effect.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

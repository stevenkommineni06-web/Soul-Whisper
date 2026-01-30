
import React, { useState, useEffect, useRef } from 'react';
import { SITUATIONS, LANGUAGES, VOICES } from './constants';
import { AppState, PrayerResponse, SubTopic, SavedPrayer, User } from './types';
import { SituationCard } from './components/SituationCard';
import { generatePrayer, generateAudio, generateImage } from './services/geminiService';

const APP_VERSION = "1.1";
const DEVELOPER_NAME = "Steven Kommineni";

const FONT_SIZES = [
  { label: 'S', class: 'text-base md:text-lg', storyClass: 'text-sm md:text-base' },
  { label: 'M', class: 'text-xl md:text-2xl', storyClass: 'text-lg' },
  { label: 'L', class: 'text-2xl md:text-3xl', storyClass: 'text-xl' },
  { label: 'XL', class: 'text-3xl md:text-4xl', storyClass: 'text-2xl' }
];

const LINE_SPACINGS = [
  { label: 'Tight', class: 'leading-normal' },
  { label: 'Relaxed', class: 'leading-relaxed' },
  { label: 'Loose', class: 'leading-loose' }
];

function decodeBase64(base64: string) {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed", e);
    return new Uint8Array(0);
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [selectedSituation, setSelectedSituation] = useState<string>(SITUATIONS[0].id);
  const [selectedSubTopic, setSelectedSubTopic] = useState<SubTopic | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].id);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<PrayerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persistence features
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sw_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [favorites, setFavorites] = useState<SavedPrayer[]>(() => {
    const saved = localStorage.getItem('sw_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [lineSpacingIndex, setLineSpacingIndex] = useState(2);

  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('sw_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (user) localStorage.setItem('sw_user', JSON.stringify(user));
    else localStorage.removeItem('sw_user');
  }, [user]);

  useEffect(() => {
    const sit = SITUATIONS.find(s => s.id === selectedSituation);
    if (sit?.subTopics && sit.subTopics.length > 0) {
      setSelectedSubTopic(sit.subTopics[0]);
    } else {
      setSelectedSubTopic(null);
    }
  }, [selectedSituation]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // When voice changes, clear audio buffer so it regenerates on next play
  useEffect(() => {
    stopAudio();
    audioBufferRef.current = null;
    pausedTimeRef.current = 0;
    setCurrentPlaybackTime(0);
    setDuration(0);
  }, [selectedVoice]);

  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        if (audioContextRef.current) {
          const elapsed = pausedTimeRef.current + (audioContextRef.current.currentTime - startTimeRef.current);
          setCurrentPlaybackTime(Math.min(elapsed, duration));
        }
      }, 100) as unknown as number;
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, duration]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      if (audioContextRef.current) {
        pausedTimeRef.current += audioContextRef.current.currentTime - startTimeRef.current;
        stopAudio();
      }
      return;
    }
    if (audioBufferRef.current) {
      playBuffer(audioBufferRef.current, pausedTimeRef.current);
      return;
    }
    if (!result) return;
    setAudioLoading(true);
    setAudioError(null);
    try {
      const fullText = `${result.story}\n\n${result.prayer}`;
      const base64Audio = await generateAudio(fullText, selectedVoice);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioData = decodeBase64(base64Audio);
      if (audioData.length === 0) throw new Error("Audio data is empty");
      const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      playBuffer(audioBuffer, 0);
    } catch (err) {
      console.error(err);
      setAudioError("Unable to load narration.");
    } finally {
      setAudioLoading(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer, offset: number) => {
    if (!audioContextRef.current) return;
    stopAudio();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    gainNodeRef.current.gain.value = volume;
    source.connect(gainNodeRef.current);
    source.onended = () => {
      if (audioSourceRef.current === source) {
        setIsPlaying(false);
        pausedTimeRef.current = 0;
        setCurrentPlaybackTime(0);
      }
    };
    const startAt = audioContextRef.current.currentTime;
    source.start(0, offset % buffer.duration);
    startTimeRef.current = startAt;
    pausedTimeRef.current = offset % buffer.duration;
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioBufferRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = percentage * duration;
    pausedTimeRef.current = seekTime;
    setCurrentPlaybackTime(seekTime);
    if (isPlaying) {
      playBuffer(audioBufferRef.current, seekTime);
    }
  };

  const handleGenerate = async (overrideTopic?: string) => {
    stopAudio();
    audioBufferRef.current = null;
    pausedTimeRef.current = 0;
    setCurrentPlaybackTime(0);
    setDuration(0);
    setAudioError(null);
    setAppState(AppState.LOADING);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const situationObj = SITUATIONS.find(s => s.id === selectedSituation);
      const situationLabel = situationObj?.label || selectedSituation;
      const subTopicLabel = overrideTopic || selectedSubTopic?.label || situationLabel;
      const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
      
      const data = await generatePrayer(situationLabel, subTopicLabel, langName);
      
      try {
        const imageUrl = await generateImage(data.imagePrompt);
        data.imageUrl = imageUrl;
      } catch (imgErr) {
        console.error("Image generation failed", imgErr);
      }

      setResult(data);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "The path to the soul is currently quiet. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    stopAudio();
    audioBufferRef.current = null;
    pausedTimeRef.current = 0;
    setCurrentPlaybackTime(0);
    setDuration(0);
    setAudioError(null);
    setAppState(AppState.IDLE);
    setResult(null);
    setError(null);
  };

  const handleShareWhatsApp = () => {
    if (!result) return;
    const text = `*Soul Whispers: ${result.title}*\n\n${result.story.substring(0, 100)}...\n\nRead the full prayer here: ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Soul Whispers',
        text: 'A vast sanctuary of unique reflections. Every click, a new word.',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("App link copied to clipboard!");
    }
  };

  const toggleFavorite = () => {
    if (!result) return;
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    const isFav = favorites.find(f => f.title === result.title);
    if (isFav) {
      setFavorites(favorites.filter(f => f.title !== result.title));
    } else {
      const newFav: SavedPrayer = {
        ...result,
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      setFavorites([newFav, ...favorites]);
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    setUser({ name, email });
    setShowLoginModal(false);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] flex flex-col items-center">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Top Navigation / Header Actions */}
      <div className="relative z-20 w-full max-w-5xl px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleShareApp}
            className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-500 hover:text-amber-500 hover:border-amber-100 transition-all group"
            title="Share App"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
          </button>
          <button 
            onClick={() => setShowFavorites(true)}
            className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-500 hover:text-amber-500 hover:border-amber-100 transition-all flex items-center gap-2"
          >
             <svg className={`w-5 h-5 ${favorites.length > 0 ? 'fill-red-400 text-red-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             {favorites.length > 0 && <span className="text-xs font-black bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center">{favorites.length}</span>}
          </button>
        </div>

        <div className="flex items-center gap-4">
           {user ? (
             <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Welcome</p>
                 <p className="text-xs font-bold text-slate-700">{user.name}</p>
               </div>
               <button 
                 onClick={() => setUser(null)}
                 className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-red-500 transition-all"
                 title="Logout"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
             </div>
           ) : (
             <button 
               onClick={() => setShowLoginModal(true)}
               className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
             >
               Sign In
             </button>
           )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 py-8 md:py-16">
        <header className="flex flex-col items-center mb-12 text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-2xl mb-6 transform rotate-3">
             <span className="text-white text-3xl font-bold">SW</span>
          </div>
          <h1 className="serif-font text-5xl md:text-7xl text-slate-900 font-bold tracking-tight mb-4">
            Soul Whispers
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-light italic max-w-2xl">
            "A vast sanctuary of unique reflections. Every click, a new word."
          </p>
        </header>

        {appState === AppState.IDLE || appState === AppState.ERROR ? (
          <div className="space-y-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-amber-500/20 transition-all duration-700"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest">Generative Sanctuary</span>
                    <h2 className="serif-font text-3xl md:text-4xl font-bold leading-tight">Infinite Spiritual Journeys</h2>
                    <p className="text-slate-300 text-base md:text-lg max-w-md">Discover scripture-based stories and prayers with AI-generated spiritual art in 15+ languages.</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Language</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <select 
                        className="bg-white/10 border border-white/20 rounded-full px-6 py-2.5 text-sm font-bold text-white focus:ring-amber-500 cursor-pointer backdrop-blur-md outline-none"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                      >
                         {LANGUAGES.map(l => (
                           <option key={l.code} value={l.code} className="text-slate-900">{l.nativeName}</option>
                         ))}
                      </select>
                    </div>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
               <div className="md:col-span-8 space-y-16">
                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                      <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                      1. Choose a Category
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {SITUATIONS.map((situation) => (
                        <SituationCard
                          key={situation.id}
                          situation={situation}
                          isSelected={selectedSituation === situation.id}
                          onClick={setSelectedSituation}
                        />
                      ))}
                    </div>
                  </div>

                  {selectedSituation && (
                    <div className="space-y-8 pt-8 border-t border-slate-100 animate-in slide-in-from-bottom duration-500">
                      <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                        2. Select Deep Focus Point
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                         {SITUATIONS.find(s => s.id === selectedSituation)?.subTopics?.map(topic => (
                           <button
                             key={topic.label}
                             onClick={() => setSelectedSubTopic(topic)}
                             className={`p-6 rounded-[2rem] text-sm font-bold border transition-all flex flex-col items-center gap-4 text-center h-full group
                               ${selectedSubTopic?.label === topic.label 
                                 ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03] translate-y-[-4px]' 
                                 : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:shadow-xl hover:translate-y-[-2px]'}`}
                           >
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all
                               ${selectedSubTopic?.label === topic.label ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-amber-50'}`}>
                               {topic.icon}
                             </div>
                             <span className="leading-tight">{topic.label}</span>
                             {selectedSubTopic?.label === topic.label && (
                               <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                 <svg className="w-2 h-2 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                 </svg>
                               </div>
                             )}
                           </button>
                         ))}
                      </div>
                    </div>
                  )}
               </div>

               <div className="md:col-span-4 space-y-8">
                  <div className="sticky top-8 bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-8">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center relative">
                       <span className="text-4xl">🕊️</span>
                       <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping"></div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-2xl font-bold text-slate-800 leading-tight">Begin Reflection</h4>
                      <p className="text-slate-500 text-sm italic">
                        Select a category and deep focus point to receive your unique sacred word.
                      </p>
                    </div>
                    <button
                      onClick={() => handleGenerate()}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Receive Reflection
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Powered by Gemini AI</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Sacred Art Integration</p>
                    </div>
                  </div>
                  {error && (
                    <div className="p-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-center text-sm font-medium animate-pulse">
                      {error}
                    </div>
                  )}
               </div>
            </div>
          </div>
        ) : appState === AppState.LOADING ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-10 animate-in fade-in duration-500">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-[6px] border-amber-100 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-amber-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl">🕯️</div>
            </div>
            <div className="text-center space-y-3">
              <h2 className="serif-font text-3xl text-slate-800 font-bold italic animate-pulse">Illuminating the path...</h2>
              <p className="text-slate-400 text-lg max-w-md mx-auto">Crafting your unique story, prayer, and sacred imagery.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <button 
                onClick={reset}
                className="bg-white px-6 py-3 rounded-full shadow-md text-slate-500 hover:text-slate-800 flex items-center gap-2 group transition-all"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-bold text-sm uppercase tracking-widest">Seek Again</span>
              </button>
              
              <div className="flex flex-wrap items-center gap-4 bg-white/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-100 shadow-xl">
                <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
                  {FONT_SIZES.map((size, idx) => (
                    <button key={size.label} onClick={() => setFontSizeIndex(idx)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${fontSizeIndex === idx ? 'bg-amber-500 text-white shadow-sm scale-110' : 'text-slate-400 hover:bg-slate-50'}`}>{size.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                   {LINE_SPACINGS.map((spacing, idx) => (
                    <button key={spacing.label} onClick={() => setLineSpacingIndex(idx)} className={`px-3 h-8 rounded-lg flex items-center justify-center text-[8px] uppercase font-bold transition-all ${lineSpacingIndex === idx ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>{spacing.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <article className="bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200"></div>
              
              <div className="p-8 md:p-20 relative space-y-12">
                <div className="space-y-6 text-center">
                  <span className="text-amber-500 font-bold uppercase tracking-[0.3em] text-[10px]">A Unique Word For You</span>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <h2 className="serif-font text-4xl md:text-6xl text-slate-900 font-bold leading-tight">
                      {result?.title}
                    </h2>
                    <button 
                      onClick={toggleFavorite}
                      className={`p-4 rounded-full transition-all shadow-sm ${favorites.find(f => f.title === result?.title) ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-red-400'}`}
                      title="Favorite"
                    >
                      <svg className={`w-6 h-6 ${favorites.find(f => f.title === result?.title) ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                  </div>
                </div>

                {result?.imageUrl && (
                  <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.01] transition-transform duration-700 relative group">
                    <img 
                      src={result.imageUrl} 
                      alt={result.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700"></div>
                  </div>
                )}

                <div className="flex flex-col gap-8 py-10 px-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner overflow-hidden relative">
                  {audioError && <div className="absolute inset-0 bg-red-50/95 flex items-center justify-center z-50"><p className="text-red-700 font-bold">{audioError}</p></div>}
                  
                  {/* Voice Selector */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-200/60 pb-8">
                    <div className="flex flex-col items-center sm:items-start gap-1">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Narration Voice</span>
                      <p className="text-xs text-slate-500 italic">Select your preferred style</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {VOICES.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            selectedVoice === voice.id 
                              ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'
                          }`}
                        >
                          <span>{voice.icon}</span>
                          <span>{voice.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    <button disabled={audioLoading} onClick={togglePlayback} className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center shadow-lg transition-all ${audioLoading ? 'bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                      {audioLoading ? <div className="w-5 h-5 border-2 border-amber-500 rounded-full border-t-transparent animate-spin"></div> : isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                    <div className="flex-1 w-full space-y-3">
                       <div className="flex justify-between text-[10px] font-black text-slate-400 tracking-widest uppercase">
                          <span>{formatTime(currentPlaybackTime)}</span>
                          <span>{duration > 0 ? `-${formatTime(duration - currentPlaybackTime)}` : '--:--'}</span>
                       </div>
                       <div className="relative h-1.5 bg-slate-200 rounded-full cursor-pointer" onClick={handleSeek}>
                          <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all duration-100" style={{ width: `${duration ? (currentPlaybackTime / duration) * 100 : 0}%` }}></div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-amber-500 cursor-pointer h-1 rounded-full appearance-none bg-slate-200" />
                    </div>
                  </div>
                </div>

                <div className={`space-y-6 text-slate-600 transition-all duration-500 ${FONT_SIZES[fontSizeIndex].storyClass} ${LINE_SPACINGS[lineSpacingIndex].class}`}>
                   <div className="whitespace-pre-wrap first-letter:text-7xl first-letter:font-bold first-letter:text-amber-500 first-letter:mr-4 first-letter:float-left first-letter:serif-font first-letter:leading-none">
                      {result?.story}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {result?.focusPoints.map((point, i) => (
                    <div key={i} className="p-8 rounded-[2rem] bg-amber-50/20 border border-amber-100/30 space-y-4 hover:bg-white hover:shadow-xl transition-all group">
                      <h5 className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors text-lg">{point.title}</h5>
                      <p className="text-sm text-slate-600 leading-relaxed">{point.description}</p>
                      <p className="text-xs text-amber-600 font-bold italic border-l-2 border-amber-200 pl-3">{point.scripture}</p>
                    </div>
                  ))}
                </div>

                <div className={`serif-font text-slate-800 whitespace-pre-wrap text-center px-4 italic transition-all duration-500 bg-slate-50/30 py-12 rounded-[3rem] ${FONT_SIZES[fontSizeIndex].class} ${LINE_SPACINGS[lineSpacingIndex].class}`}>
                   {result?.prayer}
                </div>

                {result?.crossReferences && (
                  <div className="space-y-8 pt-12 border-t border-slate-100">
                    <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em] text-center">Interconnected Wisdom</h4>
                    <div className="flex flex-wrap justify-center gap-4">
                      {result.crossReferences.map((cr, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleGenerate(cr.theme)}
                          className="px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:bg-white hover:shadow-lg transition-all text-left outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                        >
                           <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📖</span>
                           <div className="flex flex-col">
                             <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{cr.theme}</span>
                             <span className="text-[10px] text-amber-600 font-bold italic">{cr.reference}</span>
                           </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-10">
                   <div className="text-center space-y-2">
                     <p className="text-slate-400 text-[10px] font-black tracking-[0.5em] uppercase">Soul Whispers Reflection</p>
                     <p className="serif-font text-slate-800 text-3xl font-bold italic">Amen.</p>
                   </div>
                   <div className="flex gap-8 md:gap-12 flex-wrap justify-center">
                      <button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-all hover:-translate-y-1">
                        <div className="w-14 h-14 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-2xl shadow-sm text-[#25D366]">
                           <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">WhatsApp</span>
                      </button>
                      <button onClick={() => { if(result) { navigator.clipboard.writeText(`${result.title}\n\n${result.story}\n\n${result.prayer}`); alert("The words have been copied to your clipboard."); } }} className="flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-all hover:-translate-y-1">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">📋</div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Copy</span>
                      </button>
                      <button onClick={() => window.print()} className="flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-all hover:-translate-y-1">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🖨️</div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Print</span>
                      </button>
                   </div>
                </div>
              </div>
            </article>

            <div className="text-center pt-8">
               <button 
                 onClick={() => handleGenerate()} 
                 className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-4 mx-auto"
               >
                 Discover Another Perspective
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
               </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-32 w-full max-w-4xl px-4 text-center border-t border-slate-100 pt-20 pb-20 space-y-10">
        <div className="serif-font text-3xl font-bold text-slate-900">Soul Whispers</div>
        <div className="flex justify-center gap-6">
           <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
           <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
           <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
        </div>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed italic">
          "For where two or three are gathered in my name, there am I among them."
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Developed by {DEVELOPER_NAME}</p>
          <p className="text-[10px] uppercase font-black text-slate-300 tracking-[0.2em]">Version {APP_VERSION}</p>
          <button 
            onClick={() => setShowPrivacy(true)}
            className="text-[10px] uppercase font-black text-amber-500 hover:text-amber-600 transition-all underline underline-offset-4 tracking-[0.2em]"
          >
            Privacy Policy
          </button>
        </div>
        <p className="text-[10px] uppercase font-black text-slate-300 tracking-[0.5em]">Powered by Sacred Arts AI • {new Date().getFullYear()}</p>
      </footer>

      {/* MODALS & DRAWERS */}
      
      {/* Favorites Drawer */}
      {showFavorites && (
        <div className="fixed inset-0 z-[100] flex justify-end">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFavorites(false)}></div>
           <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Your Sanctuary</h3>
                <button onClick={() => setShowFavorites(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <span className="text-4xl">🕯️</span>
                    <p className="text-slate-400 text-sm font-medium italic">Your saved reflections will appear here.</p>
                  </div>
                ) : (
                  favorites.map((fav) => (
                    <div 
                      key={fav.id} 
                      className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer relative"
                      onClick={() => {
                        setResult(fav);
                        setAppState(AppState.RESULT);
                        setShowFavorites(false);
                      }}
                    >
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setFavorites(favorites.filter(f => f.id !== fav.id));
                         }}
                         className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                       <p className="text-[10px] uppercase font-black text-amber-500 mb-1">{new Date(fav.timestamp).toLocaleDateString()}</p>
                       <h4 className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors">{fav.title}</h4>
                       <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">{fav.story}</p>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowLoginModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <header className="text-center mb-8 space-y-2">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">SW</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Welcome Back</h3>
              <p className="text-slate-500 text-xs font-medium">Join our sanctuary to save your reflections.</p>
            </header>
            <form onSubmit={handleLogin} className="space-y-6">
               <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-2">Name</label>
                    <input name="name" required placeholder="John Doe" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-2">Email</label>
                    <input name="email" type="email" required placeholder="john@example.com" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none" />
                 </div>
               </div>
               <button type="submit" className="w-full bg-slate-900 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all transform active:scale-95">
                 Sign In
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowPrivacy(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <header className="mb-8">
              <h3 className="text-3xl font-bold text-slate-800 serif-font">Privacy Policy</h3>
              <p className="text-amber-500 font-bold text-xs uppercase tracking-widest mt-2">Soul Whispers Sanctuary</p>
            </header>
            <div className="space-y-6 text-slate-600 text-sm leading-loose">
              <section className="space-y-3">
                <h4 className="font-bold text-slate-800 text-base">1. Information We Collect</h4>
                <p>Soul Whispers is designed to be a private sanctuary. We collect basic identifier information (Name and Email) only if you choose to sign in, primarily to synchronize your saved favorites across your local device.</p>
              </section>
              <section className="space-y-3">
                <h4 className="font-bold text-slate-800 text-base">2. How We Use Data</h4>
                <p>Your inputs (categories and focus points) are processed by Google's Gemini AI to generate unique reflections. We do not store your personal conversations on our servers. Your "Favorites" are stored locally on your device browser.</p>
              </section>
              <section className="space-y-3">
                <h4 className="font-bold text-slate-800 text-base">3. AI-Generated Content</h4>
                <p>The stories, prayers, and images are generated by artificial intelligence. While we strive for spiritual accuracy and compassion, content should be used for personal reflection and is not a substitute for professional spiritual or medical advice.</p>
              </section>
              <section className="space-y-3">
                <h4 className="font-bold text-slate-800 text-base">4. Your Rights</h4>
                <p>You can clear your local data at any time by clearing your browser cache or choosing "Sign Out". We value your peace of mind above all else.</p>
              </section>
            </div>
            <div className="mt-12 flex justify-center">
              <button onClick={() => setShowPrivacy(false)} className="px-10 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black uppercase text-xs tracking-widest rounded-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

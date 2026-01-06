
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateWebsiteCodeStream, editWebsiteCode } from './services/geminiService';
import { GeneratedSite, AppState, EditRecord } from './types';
import { Button } from './components/Button';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Icons } from './constants';
import JSZip from 'jszip';

const InteractiveSpaceBackground: React.FC<{ mousePos: { x: number, y: number } }> = ({ mousePos }) => {
  const layers = useMemo(() => [
    { count: 120, speed: 30, size: 1.2, blur: 0, drift: '15s' },
    { count: 60, speed: 60, size: 2.2, blur: 0.5, drift: '25s' },
    { count: 25, speed: 120, size: 3.5, blur: 1.2, drift: '40s' }
  ], []);

  const starFields = useMemo(() => {
    return layers.map(layer => 
      Array.from({ length: layer.count }).map((_, i) => ({
        id: `${layer.size}-${i}`,
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.7 + 0.3,
        size: Math.random() * layer.size + 0.5,
        speed: layer.speed,
        twinkle: Math.random() * 5 + 2
      }))
    );
  }, [layers]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020617]">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/30 via-transparent to-indigo-950/20" />
      
      {starFields.map((field, layerIdx) => (
        <div 
          key={layerIdx} 
          className="absolute inset-0 star-layer" 
          style={{ animationDuration: layers[layerIdx].drift }}
        >
          {field.map(star => (
            <div
              key={star.id}
              className="absolute bg-white rounded-full transition-transform duration-700 ease-out"
              style={{
                width: star.size,
                height: star.size,
                top: `${star.top}%`,
                left: `${star.left}%`,
                opacity: star.opacity,
                boxShadow: star.size > 2 ? '0 0 15px rgba(255, 255, 255, 0.5)' : 'none',
                filter: `blur(${layers[layerIdx].blur}px)`,
                transform: `translate(${(mousePos.x - 0.5) * star.speed}px, ${(mousePos.y - 0.5) * star.speed}px)`,
                animation: `pulse ${star.twinkle}s infinite alternate`
              }}
            />
          ))}
        </div>
      ))}

      <div 
        className="absolute w-[1200px] h-[1200px] rounded-full opacity-20 mix-blend-screen transition-transform duration-[1500ms] ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${(mousePos.x - 0.5) * 150}px), calc(-50% + ${(mousePos.y - 0.5) * 150}px))`,
          filter: 'blur(100px)'
        }}
      />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="shooting-star" style={{ top: '10%', right: '10%', animationDelay: '1s' }} />
        <div className="shooting-star" style={{ top: '40%', right: '5%', animationDelay: '4s' }} />
        <div className="shooting-star" style={{ top: '70%', right: '15%', animationDelay: '7s' }} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentSite: null,
    isLoading: false,
    isSearching: false,
    error: null
  });
  const [prompt, setPrompt] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editHistory, setEditHistory] = useState<EditRecord[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (appTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appTheme]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleAppTheme = () => {
    setAppTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setView('editor');
    setActiveTab('code'); 
    
    const initialSite: GeneratedSite = {
      id: Math.random().toString(36).substr(2, 9),
      prompt,
      code: "<!-- TechCode: Initializing Full-Stack Modules... -->",
      timestamp: Date.now(),
      sources: []
    };

    setState(prev => ({ 
      ...prev, 
      currentSite: initialSite,
      isLoading: true, 
      isSearching: useSearch, 
      error: null 
    }));

    try {
      const finalCode = await generateWebsiteCodeStream(
        prompt, 
        useSearch,
        (chunk) => {
          setState(prev => ({
            ...prev,
            currentSite: prev.currentSite ? { ...prev.currentSite, code: chunk } : null
          }));
        },
        (sources) => {
          setState(prev => ({
            ...prev,
            currentSite: prev.currentSite ? { ...prev.currentSite, sources } : null
          }));
        }
      );

      setState(prev => ({ ...prev, isLoading: false, isSearching: false }));
      setCodeHistory([finalCode]);
      setHistoryIndex(0);
      setEditHistory([]);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, isSearching: false, error: err.message }));
      setView('home');
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !state.currentSite) return;
    setIsEditing(true);
    setEditError(null);
    setEditSuccess(false);
    
    try {
      const newCode = await editWebsiteCode(state.currentSite.code, editPrompt);
      const newHistory = codeHistory.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      setCodeHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setEditHistory(prev => [{ prompt: editPrompt, timestamp: Date.now(), code: newCode }, ...prev]);
      
      setState(prev => ({
        ...prev,
        currentSite: { ...prev.currentSite!, code: newCode }
      }));
      setEditPrompt("");
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  const restoreFromHistory = (code: string) => {
    setState(prev => ({
      ...prev,
      currentSite: prev.currentSite ? { ...prev.currentSite, code } : null
    }));
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(code);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const code = codeHistory[prevIndex];
      setState(prev => ({
        ...prev,
        currentSite: prev.currentSite ? { ...prev.currentSite, code } : null
      }));
    }
  }, [historyIndex, codeHistory]);

  const redo = useCallback(() => {
    if (historyIndex < codeHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const code = codeHistory[nextIndex];
      setState(prev => ({
        ...prev,
        currentSite: prev.currentSite ? { ...prev.currentSite, code } : null
      }));
    }
  }, [historyIndex, codeHistory]);

  const handleDownloadZip = async () => {
    if (!state.currentSite) return;
    const zip = new JSZip();
    zip.file("index.html", state.currentSite.code);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `techcode-fullstack-${state.currentSite.id}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateCode = (newCode: string) => {
    if (!state.currentSite) return;
    setState(prev => ({
      ...prev,
      currentSite: { ...prev.currentSite!, code: newCode }
    }));
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 relative selection:bg-blue-500/30">
      <InteractiveSpaceBackground mousePos={mousePos} />
      
      {view === 'home' ? (
        <HomeView 
          prompt={prompt} 
          setPrompt={setPrompt} 
          useSearch={useSearch}
          setUseSearch={setUseSearch}
          onGenerate={handleGenerate} 
          error={state.error}
          theme={appTheme}
          toggleTheme={toggleAppTheme}
        />
      ) : (
        <EditorView 
          site={state.currentSite!} 
          onBack={() => setView('home')} 
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          onDownload={handleDownloadZip}
          onUpdateCode={updateCode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          editPrompt={editPrompt}
          setEditPrompt={setEditPrompt}
          onEdit={handleEdit}
          isEditing={isEditing || state.isLoading} 
          editError={editError || state.error}
          editSuccess={editSuccess}
          undo={undo}
          redo={redo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < codeHistory.length - 1}
          editHistory={editHistory}
          onRestore={restoreFromHistory}
          theme={appTheme}
          toggleTheme={toggleAppTheme}
          isGenerating={state.isLoading}
        />
      )}
    </div>
  );
};

const HomeView: React.FC<{ 
  prompt: string; 
  setPrompt: (v: string) => void; 
  useSearch: boolean;
  setUseSearch: (v: boolean) => void;
  onGenerate: () => void;
  error: string | null;
  theme: string;
  toggleTheme: () => void;
}> = ({ prompt, setPrompt, useSearch, setUseSearch, onGenerate, error, theme, toggleTheme }) => (
  <div className="flex-1 flex flex-col items-center relative z-10">
    <button 
      onClick={toggleTheme}
      className="fixed top-6 right-6 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 hover:scale-110 transition-all shadow-2xl z-20"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
    </button>

    <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 max-w-4xl w-full text-center space-y-12">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-black tracking-widest backdrop-blur-md uppercase">
          <Icons.Magic /> TechCode v3.0
        </div>
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-[0.9]">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-500 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] italic">
            TechCode
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
          Synthesize <span className="text-white font-bold">Full-Stack functional prototypes</span> with mock databases and state management. 
        </p>
      </div>

      <div className="relative max-w-3xl mx-auto w-full group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-600 to-indigo-600 rounded-[2.5rem] blur-2xl opacity-30 group-focus-within:opacity-100 transition duration-700"></div>
        <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-3xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a full-stack experience (e.g. A CRM dashboard with client management and task persistence...)"
            className="w-full h-48 bg-transparent border-none text-white p-6 focus:ring-0 resize-none text-2xl placeholder-slate-600 leading-tight font-medium"
          />
          <div className="flex flex-wrap items-center justify-between p-4 gap-6 border-t border-white/5 mt-2">
            <label className="flex items-center gap-4 cursor-pointer group/label">
              <div className={`w-14 h-8 rounded-full transition-all duration-500 relative ${useSearch ? 'bg-blue-600 shadow-[0_0_25px_rgba(37,99,235,0.6)]' : 'bg-white/10'}`}>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={useSearch} 
                  onChange={() => setUseSearch(!useSearch)} 
                />
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-500 shadow-md ${useSearch ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-black text-slate-400 group-hover/label:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                <Icons.Search /> Logic Grounding
              </span>
            </label>
            <Button onClick={onGenerate} className="px-12 py-5 rounded-2xl text-xl font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.03] transition-transform shadow-[0_10px_40px_rgba(37,99,235,0.3)]">
              Build Full-Stack
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-10 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
        <span className="hover:text-blue-400 transition-colors cursor-pointer">CRM Dashboards</span>
        <span className="opacity-20">•</span>
        <span className="hover:text-emerald-400 transition-colors cursor-pointer">Task Managers</span>
        <span className="opacity-20">•</span>
        <span className="hover:text-indigo-400 transition-colors cursor-pointer">Interactive Portfolios</span>
      </div>
    </div>

    <footer className="w-full py-16 border-t border-white/5 bg-black/20 backdrop-blur-md mt-auto">
      <div className="max-w-5xl mx-auto px-8 flex flex-col items-center gap-8 text-slate-500 font-medium">
        <div className="flex flex-wrap justify-center gap-10 items-center">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-black text-white uppercase tracking-[0.2em] text-[10px] opacity-40">Developed By</span>
            <span className="text-white text-lg font-bold tracking-tight uppercase">GAGAN V</span>
          </div>
          <div className="w-px h-8 bg-white/5 hidden md:block" />
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-black text-white uppercase tracking-[0.2em] text-[10px] opacity-40">Contact</span>
            <span className="text-slate-300 font-semibold tabular-nums">6361314885</span>
          </div>
          <div className="w-px h-8 bg-white/5 hidden md:block" />
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-black text-white uppercase tracking-[0.2em] text-[10px] opacity-40">Email</span>
            <a href="mailto:Gagan00270@gmail.com" className="text-slate-300 hover:text-blue-400 transition-all font-semibold">Gagan00270@gmail.com</a>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <a 
            href="https://www.linkedin.com/in/gagan-v-b12936371" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-blue-600/10 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all duration-500 font-black uppercase tracking-widest text-xs"
          >
            <svg className="w-5 h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            LinkedIn Profile
          </a>
          <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-black">© 2025 TechCode Engine • Built with Full-Stack Precision</p>
        </div>
      </div>
    </footer>
  </div>
);

const EditorView: React.FC<{
  site: GeneratedSite;
  onBack: () => void;
  previewMode: 'desktop' | 'mobile';
  setPreviewMode: (m: 'desktop' | 'mobile') => void;
  onDownload: () => void;
  onUpdateCode: (c: string) => void;
  activeTab: 'preview' | 'code';
  setActiveTab: (t: 'preview' | 'code') => void;
  editPrompt: string;
  setEditPrompt: (v: string) => void;
  onEdit: () => void;
  isEditing: boolean;
  editError: string | null;
  editSuccess: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  editHistory: EditRecord[];
  onRestore: (code: string) => void;
  theme: string;
  toggleTheme: () => void;
  isGenerating?: boolean;
}> = ({ 
  site, onBack, previewMode, setPreviewMode, onDownload, onUpdateCode, 
  activeTab, setActiveTab, editPrompt, setEditPrompt, onEdit, isEditing, 
  editError, editSuccess, undo, redo, canUndo, canRedo, editHistory, onRestore, theme, toggleTheme, isGenerating
}) => {
  const codeEndRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isGenerating && codeEndRef.current) {
      codeEndRef.current.scrollTop = codeEndRef.current.scrollHeight;
    }
  }, [site.code, isGenerating]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-slate-950">
      <nav className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <Button variant="ghost" onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white">
            <Icons.ChevronLeft />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-black tracking-tight text-xl uppercase italic">Full-Stack Studio</h2>
              {isGenerating && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest animate-pulse border border-blue-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                  Synthesizing Logic...
                </div>
              )}
            </div>
            <span className="text-[10px] text-blue-400/60 uppercase font-black tracking-widest">Instance {site.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-8 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Live App
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`px-8 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'code' ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Code Layer
          </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/5 hidden md:flex">
            <button onClick={() => setPreviewMode('desktop')} className={`p-2.5 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-white/10 text-blue-400 shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}><Icons.Desktop /></button>
            <button onClick={() => setPreviewMode('mobile')} className={`p-2.5 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-white/10 text-blue-400 shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}><Icons.Mobile /></button>
          </div>
          <Button onClick={onDownload} variant="primary" className="px-8 py-3 rounded-2xl font-black text-xs tracking-widest" disabled={isGenerating}>
            <Icons.Download /> SHIP APP
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'code' ? (
            <div className="flex-1 bg-black overflow-hidden p-6 flex flex-col">
              <textarea
                ref={codeEndRef}
                value={site.code}
                onChange={(e) => !isGenerating && onUpdateCode(e.target.value)}
                spellCheck={false}
                readOnly={isGenerating}
                className={`w-full h-full bg-slate-900/40 border border-white/5 rounded-3xl text-emerald-400 p-10 code-font focus:outline-none resize-none leading-relaxed shadow-2xl transition-opacity ${isGenerating ? 'opacity-80 cursor-wait' : 'opacity-100'}`}
                style={{ fontSize: '15px' }}
              />
              {isGenerating && (
                <div className="absolute bottom-12 right-12 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase shadow-2xl flex items-center gap-3 animate-bounce">
                   <Icons.Magic /> Writing Data Models...
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-[#0f172a] p-10 md:p-16 flex items-center justify-center overflow-auto relative">
              <div className={`bg-white shadow-[0_0_120px_rgba(0,0,0,0.6)] transition-all duration-1000 overflow-hidden relative ${
                previewMode === 'mobile' ? 'w-[390px] h-[800px] rounded-[4rem] border-[16px] border-slate-900' : 'w-full h-full rounded-3xl'
              }`}>
                {previewMode === 'mobile' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-9 bg-slate-900 rounded-b-[2rem] z-10" />}
                <iframe title="Preview" srcDoc={site.code} className="w-full h-full border-none" />
                {isGenerating && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-white font-black uppercase tracking-widest text-xs">Assembling Logic Engine...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-85 border-l border-white/5 bg-black/80 backdrop-blur-3xl p-8 flex flex-col gap-10 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3">
              <Icons.Sparkles /> Full-Stack Refine
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={undo} disabled={!canUndo || isGenerating} className="p-2.5 rounded-xl bg-white/5 text-slate-500 disabled:opacity-10 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
              <button onClick={redo} disabled={!canRedo || isGenerating} className="p-2.5 rounded-xl bg-white/5 text-slate-500 disabled:opacity-10 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={isGenerating ? "Synthesizing data models..." : "Add functional features (e.g. Add a search bar that filters the list...)"}
              disabled={isGenerating}
              className={`w-full h-44 bg-black/60 border border-white/10 rounded-[1.5rem] p-6 text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-all placeholder-slate-700 shadow-inner leading-relaxed ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
            />
            {editError && <div className="text-[11px] font-black text-red-400 bg-red-400/5 p-4 rounded-2xl border border-red-400/10 uppercase tracking-widest">{editError}</div>}
            {editSuccess && <div className="text-[11px] font-black text-emerald-400 bg-emerald-400/5 p-4 rounded-2xl border border-emerald-400/10 uppercase tracking-widest">Logic Updated</div>}
            <Button onClick={onEdit} isLoading={isEditing && !isGenerating} className="w-full font-black py-5 rounded-2xl shadow-2xl shadow-blue-500/20 text-xs tracking-widest uppercase" disabled={!editPrompt.trim() || isGenerating}>
              Re-Engineer App
            </Button>
          </div>

          <div className="space-y-6">
            <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">Logic Timeline</h4>
            {editHistory.length > 0 ? (
              <div className="space-y-4">
                {editHistory.map((edit, i) => (
                  <div key={i} className="text-[11px] bg-white/[0.02] border border-white/5 p-5 rounded-3xl group transition-all hover:bg-white/[0.04] hover:border-white/10">
                    <p className="text-slate-400 line-clamp-2 italic mb-4 font-medium leading-relaxed">"{edit.prompt}"</p>
                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                      <span className="text-[9px] text-slate-700 font-black tracking-widest uppercase">{new Date(edit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex gap-5">
                        <button onClick={() => setEditPrompt(edit.prompt)} disabled={isGenerating} className="text-blue-500 hover:text-blue-400 font-black uppercase text-[9px] tracking-widest disabled:opacity-30">Reuse</button>
                        <button onClick={() => onRestore(edit.code)} disabled={isGenerating} className="text-emerald-500 hover:text-emerald-400 font-black uppercase text-[9px] tracking-widest disabled:opacity-30">Restore</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-slate-700 text-center py-12 border-2 border-dashed border-white/5 rounded-[2rem] font-black uppercase tracking-widest">No Previous States</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  generateWebsiteCodeStream, 
  chatWithAI, 
  fastEditResponse, 
  analyzeMedia,
  getCodingSuggestions,
  autoFixCode,
  estimateGenerationTime
} from './services/geminiService';
import { GeneratedSite, AppState, EditRecord } from './types';
import { Button } from './components/Button';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Icons } from './constants';
import JSZip from 'jszip';

const UltraEtherealBackground: React.FC<{ mousePos: { x: number, y: number } }> = ({ mousePos }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020617]">
      {/* Dynamic Nebulas */}
      <div 
        className="nebula bg-blue-600 top-[-10%] left-[-10%] animate-nebula-float" 
        style={{ transform: `translate(${(mousePos.x - 0.5) * 50}px, ${(mousePos.y - 0.5) * 50}px)` }}
      />
      <div 
        className="nebula bg-purple-600 bottom-[-10%] right-[-10%] animate-nebula-float" 
        style={{ 
          animationDelay: '-10s',
          transform: `translate(${(mousePos.x - 0.5) * -40}px, ${(mousePos.y - 0.5) * -40}px)` 
        }}
      />
      <div 
        className="nebula bg-cyan-600 top-[30%] left-[40%] opacity-10 animate-pulse-slow" 
        style={{ 
          width: '600px', height: '600px',
          transform: `translate(${(mousePos.x - 0.5) * 20}px, ${(mousePos.y - 0.5) * 20}px)` 
        }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ currentSite: null, isLoading: false, isSearching: false, error: null });
  const [prompt, setPrompt] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  
  const [mediaFile, setMediaFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(45);
  
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [highlighting, setHighlighting] = useState(false);

  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-scroll the code editor during generation
  useEffect(() => {
    if (state.isLoading && codeEditorRef.current && activeTab === 'code') {
      codeEditorRef.current.scrollTop = codeEditorRef.current.scrollHeight;
    }
  }, [state.currentSite?.code, state.isLoading, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFile({ data: (reader.result as string).split(',')[1], mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // 1. Initial State
    setState(prev => ({ ...prev, isLoading: true, error: null, currentSite: { id: 'new', prompt, code: '', timestamp: Date.now() } }));
    
    // 2. Immediate transition to editor view
    setView('editor');
    setActiveTab('code'); 
    
    // 3. Estimate time
    const estimate = await estimateGenerationTime(prompt);
    setEstimatedTime(estimate.seconds);

    try {
      const media = mediaFile ? [mediaFile] : undefined;
      const finalCode = await generateWebsiteCodeStream(
        prompt, 
        (chunk) => setState(prev => ({ ...prev, currentSite: { id: 'new', prompt, code: chunk, timestamp: Date.now() } })),
        useSearch, 
        media
      );
      setState(prev => ({ ...prev, isLoading: false }));
      triggerSuggestions(finalCode);
      
      // Keep it in editor but maybe shift to preview after a pause
      setTimeout(() => setActiveTab('preview'), 2000);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message, currentSite: null }));
      setView('home');
    }
  };

  const triggerSuggestions = async (code: string) => {
    setIsFetchingSuggestions(true);
    const results = await getCodingSuggestions(code);
    setSuggestions(results);
    setIsFetchingSuggestions(false);
  };

  const handleAutoFix = async () => {
    if (!state.currentSite || isFixing) return;
    setIsFixing(true);
    try {
      const fixedCode = await autoFixCode(state.currentSite.code);
      setState(prev => ({ ...prev, currentSite: { ...prev.currentSite!, code: fixedCode } }));
      setHighlighting(true);
      setTimeout(() => setHighlighting(false), 2000);
      triggerSuggestions(fixedCode);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !state.currentSite) return;
    setIsEditing(true); setEditError(null);
    try {
      const newCode = await fastEditResponse(state.currentSite.code, editPrompt);
      setState(prev => ({ ...prev, currentSite: { ...prev.currentSite!, code: newCode } }));
      setEditPrompt(""); setHighlighting(true);
      setTimeout(() => setHighlighting(false), 2000);
      triggerSuggestions(newCode);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user' as const, parts: [{ text: chatInput }] };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    const response = await chatWithAI(chatInput, chatHistory);
    setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
  };

  const handleDownloadZip = async () => {
    if (!state.currentSite) return;
    const zip = new JSZip(); zip.file("index.html", state.currentSite.code);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url; link.download = `techcode-${Date.now()}.zip`;
    link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-cyan-500/30">
      <UltraEtherealBackground mousePos={mousePos} />
      
      {state.isLoading && <LoadingOverlay estimatedSeconds={estimatedTime} currentCode={state.currentSite?.code} />}

      {view === 'home' ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 max-w-5xl mx-auto w-full text-center space-y-16">
          <div className="space-y-8 animate-[fadeIn_1s_ease-out]">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full glass-panel text-cyan-400 text-[10px] font-extrabold tracking-[0.3em] uppercase hover:scale-110 hover:shadow-glow-cyan cursor-default">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]" />
              Gemini 3 Pro Engine
            </div>
            
            <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter text-white leading-[0.85] italic relative group">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-glow transition-all duration-700 hover:tracking-normal cursor-default block">
                TechCode
              </span>
              <div className="absolute -top-12 -right-12 text-sm font-normal not-italic tracking-widest text-white/20 uppercase transition-all group-hover:text-cyan-500/40">v3.5 Intelligence</div>
            </h1>
            
            <p className="text-xl text-indigo-100/60 max-w-2xl mx-auto font-light leading-relaxed hover:text-white transition-colors cursor-default">
              Synthesize high-performance full-stack prototypes using <span className="text-white font-semibold">Thinking Mode</span> and multi-modal synthesis.
            </p>
          </div>

          <div className="refractive-border w-full max-w-4xl group shadow-2xl hover:shadow-cyan-500/10">
            <div className="refractive-inner p-2">
              <div className="bg-slate-900/40 rounded-[1.3rem] overflow-hidden transition-all duration-500 group-hover:bg-slate-900/60">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision... (e.g., A luxury watch e-commerce site with parallax scroll and dark glassmorphism)"
                  className="w-full h-56 bg-transparent border-none text-white p-10 focus:ring-0 resize-none text-2xl placeholder-slate-700 font-medium leading-relaxed transition-all focus:placeholder-transparent"
                />
                
                <div className="flex flex-wrap items-center justify-between p-6 gap-6 bg-black/40 border-t border-white/5 transition-colors group-hover:bg-black/60">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group/toggle interactive-hover">
                      <div className={`w-10 h-5 rounded-full transition-all duration-500 p-1 ${useSearch ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]' : 'bg-slate-800'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-500 ${useSearch ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${useSearch ? 'text-cyan-400' : 'text-slate-500'} group-hover/toggle:text-white`}>
                        Search Grounding
                      </span>
                      <input type="checkbox" className="hidden" checked={useSearch} onChange={() => setUseSearch(!useSearch)} />
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer py-2 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white hover:border-cyan-500/30 group/file">
                      <div className="group-hover/file:rotate-12 transition-transform"><Icons.Desktop /></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{mediaFile ? 'Media Attached' : 'Attach Assets'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" />
                    </label>
                  </div>
                  
                  <Button 
                    onClick={handleGenerate} 
                    className="px-12 py-5 text-xl font-black uppercase tracking-widest italic hover:scale-105 active:scale-95"
                  >
                    Synthesize
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {state.error && (
            <div className="animate-bounce bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-500/20 transition-colors">
              {state.error}
            </div>
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
          <header className="h-20 glass-panel flex items-center justify-between px-10 shrink-0 border-b border-white/5 z-20">
            <div className="flex items-center gap-8 group">
              <button onClick={() => setView('home')} className="p-3 bg-white/5 hover:bg-white/15 rounded-2xl text-white transition-all hover:scale-110 active:scale-90">
                <Icons.ChevronLeft />
              </button>
              <div className="flex flex-col group-hover:translate-x-1 transition-transform">
                <h2 className="text-white font-black tracking-tighter text-2xl uppercase italic italic-gradient hover-text-glow cursor-default">Pro Studio</h2>
                <span className="text-[10px] font-bold text-cyan-500 tracking-[0.4em] uppercase animate-pulse">Session Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button onClick={handleAutoFix} isLoading={isFixing} variant="outline" className="text-[10px] font-black px-6 py-3 tracking-widest hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
                <Icons.Wrench /> AUTO-OPTIMIZE
              </Button>
              <Button onClick={handleDownloadZip} className="px-8 py-3 text-[10px] font-black tracking-widest hover:shadow-cyan-500/40">
                SHIP PACKAGE
              </Button>
            </div>
          </header>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden p-8 gap-8">
              <div className="flex items-center gap-2 p-1.5 glass-panel w-fit rounded-2xl">
                <button 
                  onClick={() => setActiveTab('preview')} 
                  className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:translate-y-[-1px] ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Live Render
                </button>
                <button 
                  onClick={() => setActiveTab('code')} 
                  className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:translate-y-[-1px] ${activeTab === 'code' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Source Code
                </button>
              </div>
              
              <div className={`flex-1 relative glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border-white/5 transition-all duration-700 hover:border-white/20 ${highlighting ? 'ring-4 ring-cyan-500/40 scale-[0.995]' : ''}`}>
                {activeTab === 'code' ? (
                  <textarea 
                    ref={codeEditorRef}
                    readOnly 
                    value={state.currentSite?.code} 
                    className="w-full h-full bg-[#020617]/40 p-12 text-cyan-300/80 code-font text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar transition-all selection:bg-cyan-500/50" 
                  />
                ) : (
                  <iframe srcDoc={state.currentSite?.code} className="w-full h-full border-none bg-white" title="Preview" />
                )}
                {/* Secondary loader for refinements/fixes */}
                {(isEditing || isFixing) && <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                  <LoadingOverlay estimatedSeconds={estimatedTime} />
                </div>}
              </div>
            </div>

            <aside className="w-[420px] glass-panel border-l border-white/5 p-10 flex flex-col gap-12 shrink-0 overflow-y-auto custom-scrollbar group/aside">
              <section className="space-y-8 group/reasoning">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-3 transition-transform group-hover/reasoning:translate-x-1">
                    <Icons.Sparkles /> Reasoning Core
                  </h3>
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse group-hover/reasoning:scale-150 transition-transform" />
                </div>
                <div className="space-y-4">
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Refine interface logic..."
                    className="w-full h-36 bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all placeholder-slate-800 hover:border-white/20"
                  />
                  <Button onClick={handleEdit} isLoading={isEditing} className="w-full font-black py-5 text-[10px] tracking-widest uppercase italic active:scale-95">
                    Push Refinement
                  </Button>
                </div>
              </section>

              <section className="space-y-6 pt-10 border-t border-white/5">
                <h3 className="text-cyan-400 font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-3">
                  <Icons.Lightbulb /> Heuristic Insights
                </h3>
                <div className="space-y-4">
                  {isFetchingSuggestions ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : suggestions.length > 0 ? suggestions.map((s, i) => (
                    <div key={i} className="group p-5 rounded-2xl bg-white/5 border border-white/5 text-indigo-100/70 text-[11px] leading-relaxed transition-all hover:bg-white/10 hover:-translate-y-1 hover:border-cyan-500/20 hover:shadow-glow-cyan">
                      <div className="flex items-start gap-4">
                        <span className="text-cyan-500 font-black tabular-nums transition-transform group-hover:scale-125">0{i+1}</span>
                        <span className="group-hover:text-white transition-colors">{s}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-700 text-[10px] italic">No active insights.</p>
                  )}
                </div>
              </section>
              
              <section className="flex-1 flex flex-col pt-10 border-t border-white/5 min-h-[300px]">
                <h3 className="text-slate-500 font-black uppercase tracking-[0.2em] text-[11px] mb-8">Neural Chat</h3>
                <div className="flex-1 overflow-y-auto space-y-5 mb-6 pr-4 custom-scrollbar">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`p-5 rounded-3xl text-[11px] leading-relaxed border transition-all hover:brightness-110 ${msg.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100 ml-8 hover:bg-indigo-600/20' : 'bg-white/5 border-white/10 text-slate-400 mr-8 shadow-inner hover:bg-white/10'}`}>
                      {msg.parts[0].text}
                    </div>
                  ))}
                </div>
                <div className="relative group/chat">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur opacity-20 group-focus-within/chat:opacity-50 transition duration-500" />
                  <div className="relative">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                      placeholder="Discuss technical logic..."
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-5 text-[11px] text-white focus:outline-none transition-all placeholder-slate-700 focus:border-cyan-500/50 hover:border-white/20"
                    />
                    <button onClick={handleChat} className="absolute right-5 top-1/2 -translate-y-1/2 text-cyan-500 hover:text-white transition-all hover:scale-125 hover:rotate-12">
                      <Icons.Magic />
                    </button>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
      
      {view === 'home' && (
        <footer className="mt-auto py-16 px-10 glass-panel border-t border-white/5 relative z-10 hover:bg-black/40 transition-colors">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-12">
            <div className="flex items-center gap-10">
              <div className="flex flex-col group/arch transition-all hover:translate-x-1">
                <span className="text-[10px] uppercase font-black text-indigo-400/40 tracking-[0.4em] mb-1 group-hover/arch:text-cyan-500/60 transition-colors">Architect</span>
                <span className="text-white font-bold tracking-tighter text-lg transition-all group-hover/arch:tracking-normal group-hover/arch:text-glow">GAGAN V</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col group/terminal transition-all hover:translate-x-1">
                <span className="text-[10px] uppercase font-black text-indigo-400/40 tracking-[0.4em] mb-1 group-hover/terminal:text-indigo-400/80 transition-colors">Terminal</span>
                <span className="text-slate-400 font-mono text-sm tracking-widest hover:text-white transition-colors">+91 6361314885</span>
              </div>
            </div>
            
            <div className="flex items-center gap-12">
              <a href="mailto:Gagan00270@gmail.com" className="text-slate-500 hover:text-cyan-400 transition-all text-xs font-black uppercase tracking-[0.3em] hover:scale-105">Gagan00270@gmail.com</a>
              <div className="flex items-center gap-4">
                 <a href="https://www.linkedin.com/in/gagan-v-b12936371" target="_blank" className="w-12 h-12 flex items-center justify-center rounded-2xl glass-panel hover:bg-indigo-600 hover:border-indigo-500 hover:scale-110 active:scale-90 transition-all text-white group shadow-lg">
                  <svg className="w-5 h-5 fill-current transition-transform group-hover:rotate-[360deg] duration-700" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;

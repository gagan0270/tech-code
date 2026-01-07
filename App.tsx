
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
        <div key={layerIdx} className="absolute inset-0 star-layer" style={{ animationDuration: layers[layerIdx].drift }}>
          {field.map(star => (
            <div key={star.id} className="absolute bg-white rounded-full transition-transform duration-700 ease-out"
              style={{
                width: star.size, height: star.size, top: `${star.top}%`, left: `${star.left}%`,
                opacity: star.opacity, transform: `translate(${(mousePos.x - 0.5) * star.speed}px, ${(mousePos.y - 0.5) * star.speed}px)`,
                animation: `pulse ${star.twinkle}s infinite alternate`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ currentSite: null, isLoading: false, isSearching: false, error: null });
  const [prompt, setPrompt] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  
  // Media states
  const [mediaFile, setMediaFile] = useState<{ data: string; mimeType: string } | null>(null);
  
  // Chatbot states
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  
  // Intelligence States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(45);
  const [complexity, setComplexity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [highlighting, setHighlighting] = useState(false);
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFile({
          data: (reader.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Step 1: Preliminary Analysis for Time Estimation
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const estimate = await estimateGenerationTime(prompt);
    setEstimatedTime(estimate.seconds);
    setComplexity(estimate.complexity);

    // Step 2: Main Generation
    setView('editor');
    setActiveTab('code'); 
    setState(prev => ({ ...prev, isSearching: useSearch }));

    try {
      const media = mediaFile ? [mediaFile] : undefined;
      const finalCode = await generateWebsiteCodeStream(
        prompt, 
        (chunk) => setState(prev => ({ ...prev, currentSite: { id: 'new', prompt, code: chunk, timestamp: Date.now() } })),
        useSearch, 
        media,
        (sources) => setState(prev => ({ ...prev, currentSite: prev.currentSite ? { ...prev.currentSite, sources } : null }))
      );
      setState(prev => ({ ...prev, isLoading: false, isSearching: false }));
      setCodeHistory([finalCode]);
      setHistoryIndex(0);
      triggerSuggestions(finalCode);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, isSearching: false, error: err.message }));
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
      setEditError("Auto-fix failed: " + err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !state.currentSite) return;
    setIsEditing(true); setEditError(null); setEditSuccess(false);
    
    try {
      const newCode = await fastEditResponse(state.currentSite.code, editPrompt);
      setState(prev => ({ ...prev, currentSite: { ...prev.currentSite!, code: newCode } }));
      setEditPrompt(""); setEditSuccess(true); setHighlighting(true);
      setTimeout(() => { setEditSuccess(false); setHighlighting(false); }, 3000);
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
    link.href = url; link.download = `techcode-${state.currentSite.id}.zip`;
    link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-blue-500/30 overflow-x-hidden">
      <InteractiveSpaceBackground mousePos={mousePos} />
      
      {state.isLoading && view === 'home' && <LoadingOverlay estimatedSeconds={estimatedTime} />}

      {view === 'home' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 max-w-4xl mx-auto w-full text-center space-y-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-black tracking-widest backdrop-blur-md uppercase">
              <Icons.Magic /> Gemini 3 Engine
            </div>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-[0.9]">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-500 italic text-shadow-glow">TechCode</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
              Multimodal Website Synthesis with <span className="text-white font-bold italic">Thinking Mode</span>.
            </p>
          </div>

          <div className="relative w-full group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-[2.5rem] blur-2xl opacity-20 group-focus-within:opacity-50 transition duration-700"></div>
            <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-3xl">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision or upload a sketch/video..."
                className="w-full h-48 bg-transparent border-none text-white p-6 focus:ring-0 resize-none text-2xl placeholder-slate-600 font-medium"
              />
              <div className="flex flex-wrap items-center justify-between p-4 gap-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-blue-400 transition-colors">
                    <Icons.Search /> <span className="text-xs font-black uppercase tracking-widest">Search Grounding</span>
                    <input type="checkbox" checked={useSearch} onChange={() => setUseSearch(!useSearch)} className="hidden" />
                    <div className={`w-8 h-4 rounded-full transition-colors ${useSearch ? 'bg-blue-600' : 'bg-slate-700'} relative`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${useSearch ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300">
                    <Icons.Desktop /> <span className="text-xs font-black uppercase tracking-widest">{mediaFile ? 'File Added' : 'Add Media'}</span>
                    <input type="file" onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
                  </label>
                </div>
                <Button onClick={handleGenerate} className="px-12 py-5 rounded-2xl text-xl font-black uppercase bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20">
                  Synthesize
                </Button>
              </div>
            </div>
          </div>
          {state.error && <div className="text-red-400 font-black uppercase text-xs tracking-[0.2em] bg-red-400/10 p-4 rounded-2xl border border-red-400/20">{state.error}</div>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-slate-950">
          <nav className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-6">
              <Button onClick={() => setView('home')} variant="ghost" className="p-3 bg-white/5 rounded-2xl text-white"><Icons.ChevronLeft /></Button>
              <h2 className="text-white font-black tracking-tight text-xl uppercase italic">Pro Studio</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleAutoFix} 
                isLoading={isFixing}
                variant="outline"
                className="px-6 py-2 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-black tracking-widest uppercase"
              >
                <Icons.Wrench /> Auto-Fix
              </Button>
              <Button onClick={handleDownloadZip} variant="primary" className="px-8 py-3 rounded-2xl font-black text-xs tracking-widest">SHIP APP</Button>
            </div>
          </nav>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
              <div className="flex items-center gap-2 bg-black/60 p-1.5 w-fit rounded-2xl border border-white/5">
                <button onClick={() => setActiveTab('preview')} className={`px-8 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Live App</button>
                <button onClick={() => setActiveTab('code')} className={`px-8 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Code</button>
              </div>
              
              <div className={`flex-1 relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all ${highlighting ? 'ring-2 ring-emerald-500/50 scale-[0.99]' : ''}`}>
                {activeTab === 'code' ? (
                  <textarea readOnly value={state.currentSite?.code} className="w-full h-full bg-transparent p-10 text-emerald-400 code-font text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar" />
                ) : (
                  <iframe srcDoc={state.currentSite?.code} className="w-full h-full border-none bg-white" title="Preview" />
                )}
                {state.isLoading && (
                  <LoadingOverlay estimatedSeconds={estimatedTime} />
                )}
              </div>
            </div>

            <aside className="w-96 border-l border-white/5 bg-black/80 backdrop-blur-3xl p-8 flex flex-col gap-10 shrink-0 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3">
                  <Icons.Sparkles /> Intelligence Refine
                </h3>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Ask for complex features..."
                  className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-6 text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none transition-all placeholder-slate-700"
                />
                <Button onClick={handleEdit} isLoading={isEditing} className="w-full font-black py-5 rounded-2xl uppercase text-xs">Apply Reasoning</Button>
                {editError && <p className="text-red-400 text-[10px] font-black uppercase">{editError}</p>}
              </div>

              {/* AI Coding Suggestions Section */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3">
                    <Icons.Lightbulb /> AI Insights
                  </h3>
                  {isFetchingSuggestions && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <div className="space-y-3">
                  {suggestions.length > 0 ? suggestions.map((s, i) => (
                    <div key={i} className="group p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[11px] leading-relaxed transition-all hover:bg-white/10 hover:border-blue-500/30">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-500 font-black mt-0.5">#0{i+1}</span>
                        <span>{s}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-600 text-[10px] font-medium italic">Analyzing code for optimizations...</p>
                  )}
                </div>
              </div>
              
              <div className="flex-1 border-t border-white/5 pt-10 flex flex-col">
                <h3 className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-6">Chat Assistant</h3>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar max-h-64">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`p-4 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-blue-600/10 border border-blue-500/20 text-blue-200 ml-4' : 'bg-white/5 border border-white/10 text-slate-300 mr-4 shadow-sm'}`}>
                      {msg.parts[0].text}
                    </div>
                  ))}
                  {chatHistory.length === 0 && (
                    <p className="text-slate-600 text-[10px] font-medium italic text-center">Ask for technical advice or documentation.</p>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Ask AI anything..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-700"
                  />
                  <button onClick={handleChat} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-white transition-colors"><Icons.Magic /></button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
      
      {/* Footer Details */}
      {view === 'home' && (
        <footer className="mt-auto py-12 px-8 border-t border-white/5 bg-black/20 backdrop-blur-md">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Built By</span>
                <span className="text-white font-bold uppercase tracking-tight">GAGAN V</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Contact</span>
                <span className="text-slate-300 tabular-nums">6361314885</span>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <a href="mailto:Gagan00270@gmail.com" className="text-slate-500 hover:text-blue-400 transition-colors text-sm font-black uppercase tracking-widest">Gagan00270@gmail.com</a>
              <a href="https://www.linkedin.com/in/gagan-v-b12936371" target="_blank" className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all">
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;

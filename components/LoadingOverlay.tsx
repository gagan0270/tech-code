
import React, { useMemo } from 'react';

const messages = [
  "Mapping Neural Architecture...",
  "Synthesizing Visual Logic...",
  "Compiling Design Systems...",
  "Forging Ethereal Layouts...",
  "Injecting Responsive DNA...",
  "Polishing Interactive Surface...",
  "Manifesting Creative Vision..."
];

interface LoadingOverlayProps {
  estimatedSeconds: number;
  currentCode?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ estimatedSeconds, currentCode = "" }) => {
  const [msgIndex, setMsgIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [remaining, setRemaining] = React.useState(estimatedSeconds);

  // Extract a few lines of code to show a 'scrolling' typing effect
  const codeLines = useMemo(() => {
    if (!currentCode) return [];
    const lines = currentCode.split('\n').filter(l => l.trim().length > 0);
    return lines.slice(-15); // Last 15 lines
  }, [currentCode]);

  React.useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    const startTime = Date.now();
    const endTime = startTime + estimatedSeconds * 1000;

    const progressInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      const elapsed = now - startTime;
      
      const currentProgress = Math.min(99, (elapsed / (estimatedSeconds * 1000)) * 100);
      setProgress(currentProgress);
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }, 50);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [estimatedSeconds]);

  return (
    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[8px] z-[100] flex flex-col items-center justify-center p-8 overflow-hidden transition-all duration-1000">
      
      {/* Background Code Stream Visualization */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] flex flex-col justify-end p-12 select-none overflow-hidden">
        <div className="space-y-2 font-mono text-[10px] text-cyan-500 animate-[slideUp_20s_linear_infinite]">
          {codeLines.map((line, i) => (
            <div key={i} className="whitespace-pre overflow-hidden text-ellipsis border-l-2 border-cyan-500/20 pl-4">
              {line}
            </div>
          ))}
          {/* Filler for better visuals when code is short */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`filler-${i}`} className="opacity-20">
              01011010 11001010 11100010 10101111 00011010 11001010 ... 0x{Math.floor(Math.random() * 16777215).toString(16)}
            </div>
          ))}
        </div>
      </div>

      {/* Background Neural Sparks */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-blue-500 rounded-full blur-[120px] animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 400 + 200}px`,
              height: `${Math.random() * 400 + 200}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 15 + 10}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* Central Core */}
        <div className="relative w-56 h-56 mb-12 group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 animate-spin-slow blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="absolute inset-0 rounded-full border-2 border-white/5 animate-spin-slow shadow-[0_0_60px_rgba(59,130,246,0.1)]" />
          <div className="absolute inset-4 rounded-full border border-white/10 animate-[spin_12s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <span className="text-white text-5xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {Math.round(progress)}%
              </span>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mt-2 animate-pulse">Syncing</span>
            </div>
          </div>
        </div>

        <div className="space-y-8 w-full text-center">
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
              Generating Codebase
            </h2>
            <div className="flex items-center justify-center gap-4 text-indigo-200/50 font-bold tracking-[0.5em] text-[9px] uppercase">
               <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
               {messages[msgIndex]}
            </div>
          </div>
          
          <div className="space-y-4 px-12">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 transition-all duration-500 ease-out shadow-[0_0_20px_rgba(6,182,212,0.5)] rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-cyan-500/40">Real-time Stream Active</span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-400/40">{remaining}s Estimated</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual scanning line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="w-full h-[4px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_4s_linear_infinite]" />
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        @keyframes slideUp {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}} />
    </div>
  );
};


import React from 'react';

const messages = [
  "Dreaming up your layout...",
  "Choosing the perfect color palette...",
  "Writing semantic HTML...",
  "Applying Tailwind utility classes...",
  "Optimizing for mobile devices...",
  "Polishing animations...",
  "Adding professional touch..."
];

interface LoadingOverlayProps {
  estimatedSeconds: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ estimatedSeconds }) => {
  const [msgIndex, setMsgIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [remaining, setRemaining] = React.useState(estimatedSeconds);

  React.useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    const startTime = Date.now();
    const endTime = startTime + estimatedSeconds * 1000;

    const progressInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      const elapsed = now - startTime;
      
      const currentProgress = Math.min(95, (elapsed / (estimatedSeconds * 1000)) * 100);
      setProgress(currentProgress);
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }, 100);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [estimatedSeconds]);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-blue-500/5 rounded-full flex items-center justify-center">
           <svg className="w-12 h-12 text-blue-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
      </div>

      <div className="space-y-4 max-w-md w-full">
        <h2 className="text-3xl font-black text-white tracking-tight uppercase italic italic-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Synthesizing Core</h2>
        <p className="text-slate-400 font-medium h-6">{messages[msgIndex]}</p>
        
        <div className="pt-8 space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Progressive Build</span>
            <span>Est. {remaining}s Remaining</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

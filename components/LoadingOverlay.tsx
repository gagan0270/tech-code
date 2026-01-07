
import React from 'react';

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
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ estimatedSeconds }) => {
  const [msgIndex, setMsgIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [remaining, setRemaining] = React.useState(estimatedSeconds);

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
      
      const currentProgress = Math.min(98, (elapsed / (estimatedSeconds * 1000)) * 100);
      setProgress(currentProgress);
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }, 50);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [estimatedSeconds]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Neural Sparks */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-blue-500 rounded-full blur-xl animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 200 + 50}px`,
              height: `${Math.random() * 200 + 50}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* Central Core */}
        <div className="relative w-48 h-48 mb-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 animate-spin-slow blur-xl opacity-50" />
          <div className="absolute inset-0 rounded-full border border-white/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-white/10 animate-[spin_12s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-3xl font-black italic tracking-tighter drop-shadow-2xl">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        <div className="space-y-8 w-full text-center">
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold text-white tracking-tighter italic uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              TechCode AI
            </h2>
            <p className="text-indigo-200/60 font-medium tracking-widest text-xs uppercase animate-pulse">
              {messages[msgIndex]}
            </p>
          </div>
          
          <div className="space-y-3 px-4">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(6,182,212,0.6)] rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400/50">
              <span>Initializing Logic</span>
              <span>{remaining}s Est.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

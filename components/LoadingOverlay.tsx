
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

export const LoadingOverlay: React.FC = () => {
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse flex items-center justify-center text-blue-400">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Generating Your Website</h2>
      <p className="text-slate-400 animate-pulse transition-opacity duration-500">{messages[msgIndex]}</p>
    </div>
  );
};

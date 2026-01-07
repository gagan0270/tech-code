
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative group px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-95 hover:-translate-y-0.5";
  
  const variants = {
    primary: "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_35px_-5px_rgba(79,70,229,0.9)] hover:brightness-110",
    secondary: "bg-slate-800/80 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20 hover:shadow-glow-indigo",
    outline: "border-2 border-indigo-500/30 hover:border-indigo-500/80 text-indigo-300 hover:text-white bg-indigo-500/5 hover:bg-indigo-500/10",
    ghost: "hover:bg-white/5 text-slate-400 hover:text-white hover:px-7",
    glass: "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/15 hover:border-white/30 text-white shadow-glass-inner"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : children}
    </button>
  );
};

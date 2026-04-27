"use client";

import React from 'react';

export default function ProfessionalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#050505]">
      {/* Technical Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`, 
          backgroundSize: '60px 60px' 
        }} 
      />
      
      {/* Ambient Animated Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '15s', animationDelay: '3s' }} />
      
      {/* Radial Vignette for Depth */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)' 
        }} 
      />

      {/* Very subtle noise texture if possible, but keeping it clean for now */}
    </div>
  );
}

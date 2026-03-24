import React from 'react';

const brands = [
  'Aputure',
  'Amaran',
  'DZO',
  'Astera',
  'Canon',
  'Sony',
  'Blackmagic',
  'RED',
  'ARRI',
  'Zeiss'
];

export function BrandMarquee() {
  // Triple the list to ensure a smooth loop
  const list = [...brands, ...brands, ...brands];

  return (
    <div className="w-full bg-zinc-950/50 border-y border-zinc-800/50 py-10 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex animate-marquee whitespace-nowrap">
        {list.map((brand, idx) => (
          <div
            key={idx}
            className="mx-12 text-3xl md:text-5xl font-black tracking-tighter text-zinc-800 hover:text-emerald-500 transition-colors cursor-default select-none uppercase italic"
          >
            {brand}
          </div>
        ))}
      </div>
    </div>
  );
}

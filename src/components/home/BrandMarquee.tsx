import React, { useState } from 'react';

const brands = [
  { name: 'Sony', logo: 'https://cdn.worldvectorlogo.com/logos/sony-logo-1.svg' },
  { name: 'ARRI', logo: 'https://cdn.worldvectorlogo.com/logos/arri.svg' },
  { name: 'RED', logo: 'https://cdn.worldvectorlogo.com/logos/red-digital-cinema.svg' },
  { name: 'Canon', logo: 'https://cdn.worldvectorlogo.com/logos/canon-logo-1.svg' },
  { name: 'Blackmagic', logo: 'https://cdn.worldvectorlogo.com/logos/blackmagic-design.svg' },
  { name: 'DJI', logo: 'https://cdn.worldvectorlogo.com/logos/dji-1.svg' },
  { name: 'Zeiss', logo: 'https://cdn.worldvectorlogo.com/logos/carl-zeiss-logo.svg' },
];

const BrandItem = ({ brand }: { brand: typeof brands[0] }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return <span className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-800 uppercase">{brand.name}</span>;
  }

  return (
    <img 
      src={brand.logo} 
      alt={brand.name} 
      className="h-8 md:h-10 object-contain min-w-[100px] max-w-[160px] brightness-0 invert opacity-30 hover:opacity-100 transition-all duration-500"
      onError={() => setError(true)}
    />
  );
};

export function BrandMarquee() {
  // Triple the list to ensure a smooth loop
  const list = [...brands, ...brands, ...brands, ...brands];

  return (
    <div className="w-full bg-zinc-950/50 border-y border-zinc-800/50 py-8 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex animate-marquee whitespace-nowrap items-center w-max gap-16 md:gap-32">
        {list.map((brand, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center cursor-default select-none shrink-0"
          >
            <BrandItem brand={brand} />
          </div>
        ))}
      </div>
    </div>
  );
}

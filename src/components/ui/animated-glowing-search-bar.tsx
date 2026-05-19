import React from 'react';

interface AnimatedGlowingSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

const AnimatedGlowingSearchBar = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
}: AnimatedGlowingSearchBarProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      <div className="relative flex items-center justify-center group w-full">

        {/* Outer glow layers */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[70px] rounded-xl blur-[3px]
                        before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                        before:bg-[conic-gradient(#000,#7a0020_5%,#000_38%,#000_50%,#D81545_60%,#000_87%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] rounded-xl blur-[3px]
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#5a0015,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#7a001a,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] rounded-xl blur-[3px]
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#5a0015,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#7a001a,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]" />

        {/* Inner glow layers */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[63px] rounded-lg blur-[2px]
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#f87171,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#fca5a5,rgba(0,0,0,0)_58%)] before:brightness-[1.4]
                        before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[59px] rounded-xl blur-[0.5px]
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                        before:bg-[conic-gradient(#1c191c,#7a0020_5%,#1c191c_14%,#1c191c_50%,#D81545_60%,#1c191c_64%)] before:brightness-[1.3]
                        before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]" />

        {/* Input wrapper */}
        <div className="relative group w-full">
          <input
            placeholder={placeholder}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#010201] border-none w-full h-[52px] md:h-[56px] rounded-lg text-white px-[52px] md:px-[59px] text-sm md:text-base focus:outline-none placeholder-zinc-500"
          />
          <div className="pointer-events-none w-[80px] h-[20px] absolute bg-gradient-to-r from-transparent to-black top-[16px] left-[60px] group-focus-within:hidden" />
          <div className="pointer-events-none w-[30px] h-[20px] absolute bg-[#D81545] top-[10px] left-[5px] blur-2xl opacity-80 transition-all duration-[2000ms] group-hover:opacity-0" />

          {/* Right spinning border */}
          <div className="absolute h-[38px] w-[36px] md:h-[42px] md:w-[40px] overflow-hidden top-[7px] right-[7px] rounded-lg
                          before:absolute before:content-[''] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-90
                          before:bg-[conic-gradient(rgba(0,0,0,0),#4f1a1a,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_50%,#4f1a1a,rgba(0,0,0,0)_100%)]
                          before:brightness-[1.35] before:animate-spin-slow" />

          {/* Filter / search button */}
          <button
            type="button"
            onClick={onSearch}
            className="absolute top-[6px] right-[6px] md:top-2 md:right-2 flex items-center justify-center z-[2] h-[38px] w-[34px] md:max-h-10 md:max-w-[38px] md:h-full md:w-full [isolation:isolate] overflow-hidden rounded-lg bg-gradient-to-b from-[#1a0808] via-black to-[#1a0808] border border-transparent"
            aria-label="Buscar"
          >
            <svg preserveAspectRatio="none" height="24" width="24" viewBox="4.8 4.56 14.832 15.408" fill="none">
              <path d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z" stroke="#d6d6e6" strokeWidth="1" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Search icon */}
          <div className="absolute left-4 md:left-5 top-[14px] md:top-[15px] pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="22" fill="none">
              <circle stroke="url(#search-grad)" r="8" cy="11" cx="11" />
              <line stroke="url(#searchl-grad)" y2="16.65" y1="22" x2="16.65" x1="22" />
              <defs>
                <linearGradient gradientTransform="rotate(50)" id="search-grad">
                  <stop stopColor="#ffb3b3" offset="0%" />
                  <stop stopColor="#e57373" offset="50%" />
                </linearGradient>
                <linearGradient id="searchl-grad">
                  <stop stopColor="#e57373" offset="0%" />
                  <stop stopColor="#b71c1c" offset="50%" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedGlowingSearchBar;

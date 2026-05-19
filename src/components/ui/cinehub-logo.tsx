interface CineHubLogoProps {
  className?: string;
}

const CineHubLogo = ({ className = '' }: CineHubLogoProps) => (
  <div className={`flex items-baseline gap-0 select-none ${className}`}>
    <span
      className="font-display font-black tracking-[-0.04em] text-white"
      style={{ fontSize: '1.35rem', letterSpacing: '-0.04em' }}
    >
      CINE
    </span>
    <span
      className="font-display font-black"
      style={{
        fontSize: '1.1rem',
        color: 'hsl(348, 83%, 47%)',
        margin: '0 1px',
        lineHeight: 1,
      }}
    >
      •
    </span>
    <span
      className="font-display font-black tracking-[-0.04em] text-white"
      style={{ fontSize: '1.35rem', letterSpacing: '-0.04em' }}
    >
      HUB
    </span>
  </div>
);

export default CineHubLogo;

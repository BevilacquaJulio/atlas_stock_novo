interface BrandLogoProps {
  /** `on-dark` inverte a logo para fundos escuros; `on-light` mantém a versão original. */
  variant?: 'on-dark' | 'on-light';
  className?: string;
}

export function BrandLogo({ variant = 'on-light', className = '' }: BrandLogoProps) {
  return (
    <img
      src="/logo/atlas_stock_logo.png"
      alt="Atlas Stock"
      className={`object-contain ${variant === 'on-dark' ? 'brightness-0 invert' : ''} ${className}`}
    />
  );
}

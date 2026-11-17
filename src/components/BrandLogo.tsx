import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import defaultBrandLogo from '../assets/images/brand_logo_diary_sunflower_1794893111674.jpg';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl',
  md: 'w-11 h-11 rounded-xl',
  lg: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  className = '',
}) => {
  const { settings } = useApp();
  const customLogoUrl = settings.brand_logo_url?.trim() || '';
  const [customFailed, setCustomFailed] = useState(false);

  useEffect(() => {
    setCustomFailed(false);
  }, [customLogoUrl]);

  const useCustom = Boolean(customLogoUrl && !customFailed);

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 border border-[#DFD4C2] dark:border-[#3A3129] bg-[#FAF6EF] shadow-xs ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={useCustom ? customLogoUrl : defaultBrandLogo}
        alt="मधुच्या जाणीवा — खुली डायरी आणि सूर्यफूल लोगो"
        referrerPolicy="no-referrer"
        loading="eager"
        onError={() => {
          if (useCustom) setCustomFailed(true);
        }}
        className={
          useCustom
            ? 'w-full h-full object-contain'
            : 'w-full h-full object-cover scale-[1.28]'
        }
      />
    </span>
  );
};

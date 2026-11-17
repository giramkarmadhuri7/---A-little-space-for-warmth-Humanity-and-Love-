import React, { useEffect, useState } from 'react';
import { Feather } from 'lucide-react';
import { resolveAssetUrl } from '../lib/editorialAssets.ts';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  eager = false,
}) => {
  const resolvedSrc = resolveAssetUrl(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`w-full min-h-[12rem] flex flex-col items-center justify-center bg-gradient-to-br from-[#EFE8DC] via-[#E5DAC8] to-[#D8CBB6] dark:from-[#26201A] dark:via-[#201B16] dark:to-[#181410] text-[#6E5B50] dark:text-[#A99A88] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Feather className="w-7 h-7 mb-2 opacity-60" />
        {fallbackLabel && (
          <span className="font-editorial text-sm italic max-w-[24ch] line-clamp-2">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

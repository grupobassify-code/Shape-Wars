import React, { useState, useEffect } from 'react';
import { HeroId, HERO_DEFINITIONS } from '../game/types';
import { HERO_AVATARS } from '../assets/heroAvatars';
import { ShapeIcon } from './ShapeIcon';

interface HeroPortraitProps {
  heroId?: HeroId;
  avatarUrl?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  glow?: boolean;
  shapeSize?: number;
  roundedClassName?: string;
  children?: React.ReactNode;
}

export const HeroPortrait: React.FC<HeroPortraitProps> = ({
  heroId,
  avatarUrl,
  alt,
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  glow = false,
  shapeSize = 36,
  roundedClassName = 'rounded-2xl',
  children,
}) => {
  const heroDef = heroId ? HERO_DEFINITIONS[heroId] : null;
  const resolvedUrl = avatarUrl || (heroId ? HERO_AVATARS[heroId] || heroDef?.avatarUrl : '');
  const heroName = alt || heroDef?.name || 'Héroe';

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Check if image is already cached or reload when URL changes
  useEffect(() => {
    if (!resolvedUrl) {
      setIsLoaded(false);
      setHasError(true);
      return;
    }

    setHasError(false);
    setIsLoaded(false);

    const testImg = new Image();
    testImg.onload = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    testImg.onerror = () => {
      setHasError(true);
      setIsLoaded(false);
    };
    testImg.src = resolvedUrl;

    if (testImg.complete && testImg.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
    }
  }, [resolvedUrl]);

  const primaryColor = heroDef?.primaryColor || '#0284c7';
  const accentColor = heroDef?.accentColor || '#38bdf8';

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        backgroundColor: '#0f172a', // slate-900
      }}
    >
      {/* Background Glow / Themed Gradient Fallback */}
      <div
        className="absolute inset-0 opacity-40 transition-opacity"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}33 0%, ${primaryColor}15 60%, transparent 100%)`,
        }}
      />

      {/* Geometric ShapeIcon Fallback (always rendered underneath, visible while loading or on error) */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isLoaded && !hasError ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {heroId && (
          <div className="flex flex-col items-center justify-center">
            <ShapeIcon heroId={heroId} size={shapeSize} glow={glow} />
          </div>
        )}
      </div>

      {/* High-Resolution Portrait Image */}
      {resolvedUrl && !hasError && (
        <img
          src={resolvedUrl}
          alt={heroName}
          loading="eager"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
          className={`${imgClassName} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Optional Children Overlay (Badges, Gradients, Shaders) */}
      {children}
    </div>
  );
};

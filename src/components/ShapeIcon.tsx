/**
 * Shape Wars - Geometric Hero Shape Renderer
 */

import React from 'react';
import { HeroId, HERO_DEFINITIONS } from '../game/types';

interface ShapeIconProps {
  heroId: HeroId;
  size?: number;
  className?: string;
  glow?: boolean;
}

export const ShapeIcon: React.FC<ShapeIconProps> = ({ heroId, size = 48, className = '', glow = false }) => {
  const def = HERO_DEFINITIONS[heroId];
  const half = size / 2;
  const padding = size * 0.15;
  const r = half - padding;

  let shapeElement = null;

  switch (def.shape) {
    case 'circle':
      shapeElement = (
        <>
          <circle cx={half} cy={half} r={r} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <circle cx={half} cy={half} r={r * 0.4} fill={def.darkColor} />
        </>
      );
      break;
    case 'triangle': {
      const topX = half;
      const topY = padding;
      const leftX = padding;
      const leftY = size - padding;
      const rightX = size - padding;
      const rightY = size - padding;
      const points = `${topX},${topY} ${rightX},${rightY} ${leftX},${leftY}`;
      shapeElement = (
        <>
          <polygon points={points} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <polygon
            points={`${half},${padding + r * 0.5} ${half + r * 0.4},${size - padding - r * 0.3} ${half - r * 0.4},${size - padding - r * 0.3}`}
            fill={def.darkColor}
          />
        </>
      );
      break;
    }
    case 'square': {
      const boxSize = r * 1.6;
      const boxStart = half - boxSize / 2;
      shapeElement = (
        <>
          <rect
            x={boxStart}
            y={boxStart}
            width={boxSize}
            height={boxSize}
            rx={size * 0.08}
            fill={def.primaryColor}
            stroke={def.accentColor}
            strokeWidth="3"
          />
          <rect
            x={half - boxSize * 0.25}
            y={half - boxSize * 0.25}
            width={boxSize * 0.5}
            height={boxSize * 0.5}
            fill={def.darkColor}
          />
        </>
      );
      break;
    }
    case 'hexagon': {
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const x = half + Math.cos(a) * r;
        const y = half + Math.sin(a) * r;
        points.push(`${x},${y}`);
      }
      const innerPoints: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const x = half + Math.cos(a) * (r * 0.45);
        const y = half + Math.sin(a) * (r * 0.45);
        innerPoints.push(`${x},${y}`);
      }
      shapeElement = (
        <>
          <polygon points={points.join(' ')} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <polygon points={innerPoints.join(' ')} fill={def.darkColor} />
        </>
      );
      break;
    }
    case 'diamond': {
      const points = `${half},${padding} ${size - padding},${half} ${half},${size - padding} ${padding},${half}`;
      const innerPoints = `${half},${half - r * 0.45} ${half + r * 0.45},${half} ${half},${half + r * 0.45} ${half - r * 0.45},${half}`;
      shapeElement = (
        <>
          <polygon points={points} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <polygon points={innerPoints} fill={def.darkColor} />
        </>
      );
      break;
    }
    case 'octagon': {
      const points: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 8;
        const x = half + Math.cos(a) * r;
        const y = half + Math.sin(a) * r;
        points.push(`${x},${y}`);
      }
      const innerPoints: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 8;
        const x = half + Math.cos(a) * (r * 0.45);
        const y = half + Math.sin(a) * (r * 0.45);
        innerPoints.push(`${x},${y}`);
      }
      shapeElement = (
        <>
          <polygon points={points.join(' ')} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <polygon points={innerPoints.join(' ')} fill={def.darkColor} />
        </>
      );
      break;
    }
    case 'crescent': {
      shapeElement = (
        <>
          <path
            d={`M ${half + r * 0.6} ${padding} A ${r} ${r} 0 1 0 ${half + r * 0.6} ${size - padding} A ${r * 0.75} ${r * 0.75} 0 0 1 ${half + r * 0.6} ${padding} Z`}
            fill={def.primaryColor}
            stroke={def.accentColor}
            strokeWidth="3"
          />
          <circle cx={half - r * 0.15} cy={half} r={r * 0.28} fill={def.darkColor} />
        </>
      );
      break;
    }
    case 'star': {
      const points: string[] = [];
      for (let i = 0; i < 8; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const x = half + Math.cos(a) * radius;
        const y = half + Math.sin(a) * radius;
        points.push(`${x},${y}`);
      }
      shapeElement = (
        <>
          <polygon points={points.join(' ')} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <circle cx={half} cy={half} r={r * 0.25} fill={def.darkColor} />
        </>
      );
      break;
    }
    case 'shield': {
      const pathD = `M ${padding} ${padding + r * 0.2} L ${half} ${padding} L ${size - padding} ${padding + r * 0.2} L ${size - padding} ${half + r * 0.3} Q ${size - padding} ${size - padding} ${half} ${size - padding} Q ${padding} ${size - padding} ${padding} ${half + r * 0.3} Z`;
      shapeElement = (
        <>
          <path d={pathD} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <rect
            x={half - r * 0.3}
            y={half - r * 0.3}
            width={r * 0.6}
            height={r * 0.6}
            rx={size * 0.05}
            fill={def.darkColor}
          />
        </>
      );
      break;
    }
    case 'pentagon': {
      const points: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = half + Math.cos(a) * r;
        const y = half + Math.sin(a) * r;
        points.push(`${x},${y}`);
      }
      const innerPoints: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = half + Math.cos(a) * (r * 0.45);
        const y = half + Math.sin(a) * (r * 0.45);
        innerPoints.push(`${x},${y}`);
      }
      shapeElement = (
        <>
          <polygon points={points.join(' ')} fill={def.primaryColor} stroke={def.accentColor} strokeWidth="3" />
          <polygon points={innerPoints.join(' ')} fill={def.darkColor} />
        </>
      );
      break;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`inline-block ${glow ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : ''} ${className}`}
    >
      {shapeElement}
    </svg>
  );
};

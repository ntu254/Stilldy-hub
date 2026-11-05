'use client';

import { easeOut, motion } from 'motion/react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FlipCardProps {
  isFlipped?: boolean;
  onFlip?: () => void;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  front: React.ReactNode;
  back: React.ReactNode;
  id?: string;
}

export function FlipCard({
  isFlipped: controlledIsFlipped,
  onFlip,
  onClick,
  className,
  style,
  front,
  back,
  id,
}: FlipCardProps) {
  const [localIsFlipped, setLocalIsFlipped] = React.useState(false);
  const isFlipped = controlledIsFlipped !== undefined ? controlledIsFlipped : localIsFlipped;

  const handleClick = (e: React.MouseEvent) => {
    // Ngăn chặn lật nếu click vào các nút bên trong card (như nút Star)
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }

    if (onClick) onClick();
    if (controlledIsFlipped === undefined) {
      setLocalIsFlipped(!localIsFlipped);
    }
    if (onFlip) onFlip();
  };

  const cardVariants = {
    front: { 
      rotateY: 0, 
      opacity: 1,
      transition: { duration: 0.3, ease: easeOut } 
    },
    back: { 
      rotateY: 180, 
      opacity: 0,
      transition: { duration: 0.3, ease: easeOut } 
    },
  };

  return (
    <div
      id={id}
      className={cn('relative perspective-1000 cursor-pointer mx-auto', className)}
      style={style}
      onClick={handleClick}
    >
      {/* FRONT */}
      <motion.div
        className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden"
        animate={isFlipped ? 'back' : 'front'}
        variants={cardVariants}
        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
      >
        {front}
      </motion.div>

      {/* BACK */}
      <motion.div
        className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={isFlipped ? 'front' : 'back'}
        variants={cardVariants}
        style={{ transformStyle: 'preserve-3d', rotateY: 180, backfaceVisibility: 'hidden' }}
      >
        {back}
      </motion.div>
    </div>
  );
}

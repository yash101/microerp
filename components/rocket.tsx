'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export function Rocket() {
  const [animationKey, setAnimationKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [randomRotation, setRandomRotation] = useState(0);
  const [randomStartX, setRandomStartX] = useState(0);
  const [randomStartY, setRandomStartY] = useState(0);
  const [endX, setEndX] = useState(0);
  const [endY, setEndY] = useState(0);

  useEffect(() => {
    // Generate random values for this animation cycle
    const rotation = Math.random() * 360;
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;

    setRandomRotation(rotation);
    setRandomStartX(startX);
    setRandomStartY(startY);

    // Calculate end position based on rotation and distance
    const distance = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const radians = (rotation * Math.PI) / 180;
    setEndX(startX + Math.cos(radians) * distance);
    setEndY(startY + Math.sin(radians) * distance);

    setIsVisible(true);

    // Calculate when animation ends (duration is 3s for the zoom-out)
    const animationDuration = 3000; // 3 seconds for the zoom-out animation

    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait 5-10 seconds before next rocket
      const waitTime = 5000 + Math.random() * 5000;
      setTimeout(() => {
        setAnimationKey((prev) => prev + 1);
      }, waitTime);
    }, animationDuration);

    return () => clearTimeout(timer);
  }, [animationKey]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes rocketFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes rocketZoom {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(${endX - randomStartX}px, ${endY - randomStartY}px) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes rocketChatter {
          0%, 100% {
            transform: rotateZ(-1deg);
          }
          25% {
            transform: rotateZ(1deg);
          }
          50% {
            transform: rotateZ(-0.5deg);
          }
          75% {
            transform: rotateZ(0.5deg);
          }
        }
        .rocket-container {
          animation: rocketFadeIn 0.5s ease-out, rocketZoom 3s ease-in 0.5s forwards;
        }
      `}</style>
      <div
        key={animationKey}
        className="fixed pointer-events-none z-50 rocket-container"
        style={{
          left: `${randomStartX}px`,
          top: `${randomStartY}px`,
        }}
      >
        <div
          className="rocket-chatter"
          style={{
            transform: `rotate(${randomRotation}deg)`,
            transformOrigin: 'center center',
            width: 'fit-content',
            height: 'fit-content',
          }}
        >
          <Image src="/images/rocketman.png" alt="rocketman" width={355} height={175} />
        </div>
      </div>
    </>
  );
}

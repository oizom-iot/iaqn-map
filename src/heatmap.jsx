import React, { useState, useEffect } from 'react';
import { ImageOverlay } from 'react-leaflet';

const AQIHeatmapLayer = ({ 
  heatmaps, 
  currentIndex, 
  polygonBounds, 
  opacity,
  transitionSteps = 20,
  transitionIntervalInMs = 250,
}) => {
  const [transitionStage, setTransitionStage] = useState({
    currentImage: heatmaps[currentIndex],
    nextImage: null,
    transitionProgress: 0
  });
  
  useEffect(() => {
    // When currentIndex changes, prepare for transition
    if (heatmaps[currentIndex] !== transitionStage.currentImage) {
      setTransitionStage(prev => ({
        currentImage: prev.nextImage ?? prev.currentImage,
        nextImage: heatmaps[currentIndex],
        transitionProgress: 0
      }));
      // Start the transition
      const transitionInterval = setInterval(() => {
        setTransitionStage(prev => {
            const newProgress = prev.transitionProgress + (1 / transitionSteps); // Adjust speed as needed
          
          if (newProgress >= 1) {
            clearInterval(transitionInterval);
            return {
              currentImage: prev.nextImage,
              nextImage: null,
              transitionProgress: 0
            };
          }
          
          return {
            ...prev,
            transitionProgress: newProgress
          };
        });
      }, transitionIntervalInMs / transitionSteps); // Adjust interval for smoother/faster transition

      return () => clearInterval(transitionInterval);
    }
  }, [currentIndex, heatmaps, transitionSteps, transitionIntervalInMs, transitionStage.currentImage]);

  // If no transition is happening, just render the current image
  if (!transitionStage.nextImage) {
    return (
      <ImageOverlay
        url={transitionStage.currentImage}
        bounds={polygonBounds}
        opacity={opacity}
        zIndex={100}
      />
    );
  }

  // During transition, render both images with blending
  return (
    <>
      <ImageOverlay
        url={transitionStage.currentImage}
        bounds={polygonBounds}
        opacity={opacity * (1 - transitionStage.transitionProgress)}
        zIndex={100}
      />
      <ImageOverlay
        url={transitionStage.nextImage}
        bounds={polygonBounds}
        opacity={opacity * transitionStage.transitionProgress}
        zIndex={101}
      />
    </>
  );
};

export default AQIHeatmapLayer;
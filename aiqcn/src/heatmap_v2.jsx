import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ImageOverlay } from 'react-leaflet';

const AQIColorTransitionLayer = ({ 
  heatmaps, 
  currentIndex, 
  polygonBounds, 
  opacity = 0.7,
  transitionSteps = 20,
  transitionIntervalInMs = 250,
}) => {
  const [transitionStage, setTransitionStage] = useState({
    currentImage: heatmaps[currentIndex],
    nextImage: null,
    transitionProgress: 0,
    transitionImage: null
  });

  // Create a cross-origin safe transition approach
  const createTransitionImage = useCallback((currentImgSrc, nextImgSrc, progress) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const currentImg = new Image();
      const nextImg = new Image();

      // Disable CORS for these images
      currentImg.crossOrigin = 'Anonymous';
      nextImg.crossOrigin = 'Anonymous';

      let imagesLoaded = 0;
      
      const checkComplete = () => {
        imagesLoaded++;
        if (imagesLoaded === 2) {
          canvas.width = currentImg.width;
          canvas.height = currentImg.height;

          // Draw current image
          ctx.globalAlpha = 1 - progress;
          ctx.drawImage(currentImg, 0, 0);

          // Draw next image with progress-based opacity
          ctx.globalAlpha = progress;
          ctx.drawImage(nextImg, 0, 0);

          // Convert to data URL
          const transitionImageUrl = canvas.toDataURL();
          resolve(transitionImageUrl);
        }
      };

      currentImg.onload = checkComplete;
      nextImg.onload = checkComplete;
      
      currentImg.onerror = nextImg.onerror = (error) => {
        console.error('Image loading error:', error);
        reject(error);
      };

      currentImg.src = currentImgSrc;
      nextImg.src = nextImgSrc;
    });
  }, []);

  // Transition effect
  useEffect(() => {
    // Check if the image has actually changed
    if (heatmaps[currentIndex] !== transitionStage.currentImage) {
      // Prepare for transition
      setTransitionStage(prev => ({
        currentImage: prev.currentImage,
        nextImage: heatmaps[currentIndex],
        transitionProgress: 0,
        transitionImage: null
      }));

      // Start the transition
      const transitionInterval = setInterval(() => {
        setTransitionStage(prev => {
          const newProgress = prev.transitionProgress + (1 / transitionSteps);
          
          // Attempt to create transition image
          if (prev.currentImage && prev.nextImage && newProgress <= 1) {
            createTransitionImage(prev.currentImage, prev.nextImage, newProgress)
              .then(transitionImage => {
                setTransitionStage(currentState => ({
                  ...currentState,
                  transitionImage
                }));
              })
              .catch(error => {
                console.error('Transition image creation failed:', error);
              });
          }
          
          // Complete transition
          if (newProgress >= 1) {
            clearInterval(transitionInterval);
            return {
              currentImage: prev.nextImage,
              nextImage: null,
              transitionProgress: 0,
              transitionImage: null
            };
          }
          
          return {
            ...prev,
            transitionProgress: newProgress
          };
        });
      }, transitionIntervalInMs / transitionSteps);

      return () => clearInterval(transitionInterval);
    }
  }, [currentIndex, heatmaps, transitionSteps, transitionIntervalInMs, createTransitionImage]);

  // Rendering logic
  const imageToRender = transitionStage.transitionImage || 
                        transitionStage.currentImage;

  return (
    <ImageOverlay
      url={imageToRender}
      bounds={polygonBounds}
      opacity={opacity}
      zIndex={100}
    />
  );
};

export default AQIColorTransitionLayer;
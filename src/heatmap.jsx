import React, { useState, useEffect } from 'react';
import { ImageOverlay, GeoJSON } from 'react-leaflet';
import L from 'leaflet'; // Import Leaflet for marker customization

const AQIHeatmapLayer = ({ 
  heatmaps, 
  firemaps, 
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
    // Handle image transitions
    if (heatmaps[currentIndex] !== transitionStage.currentImage) {
      setTransitionStage(prev => ({
        currentImage: prev.nextImage ?? prev.currentImage,
        nextImage: heatmaps[currentIndex],
        transitionProgress: 0
      }));
      const transitionInterval = setInterval(() => {
        setTransitionStage(prev => {
          const newProgress = prev.transitionProgress + (1 / transitionSteps);
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
      }, transitionIntervalInMs / transitionSteps);

      return () => clearInterval(transitionInterval);
    }
  }, [currentIndex, heatmaps, transitionSteps, transitionIntervalInMs, transitionStage.currentImage]);

  const pointToLayer = (feature, latlng) => {
    const marker = L.circleMarker(latlng, {
      radius: 3, // Adjust marker size
      fillColor: "red", // Marker color
      color: "transparent", // Remove border by making it transparent
      fillOpacity: 0.3 // Fill opacity
    });
  
    // Add tooltip to the marker
    if (feature.properties) {
      const { satellite, brightness } = feature.properties; // Extract desired properties
      marker.bindTooltip(
        `Satellite: ${satellite || 'N/A'}<br>Brightness: ${brightness || 'N/A'}`, 
        {
          permanent: false, // Tooltip only shows on hover
          direction: 'top', // Position of the tooltip relative to the marker
          offset: [0, -10] // Adjust tooltip position
        }
      );
    }
  
    return marker;
  };

  return (
    <>
      {/* Transitioning Image Overlay */}
      {transitionStage.nextImage ? (
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
      ) : (
        <ImageOverlay
          url={transitionStage.currentImage}
          bounds={polygonBounds}
          opacity={opacity}
          zIndex={100}
        />
      )}

      {/* Render GeoJSON layer with custom markers */}
      {firemaps[currentIndex] && (
        <GeoJSON
          key={currentIndex} // Force re-render when currentIndex changes
          data={firemaps[currentIndex]} // Use preloaded GeoJSON data
          pointToLayer={pointToLayer} // Customize point markers
        />
      )}
    </>
  );
};

export default AQIHeatmapLayer;
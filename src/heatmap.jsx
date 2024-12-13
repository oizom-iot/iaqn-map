import React, { useState, useEffect } from 'react';
import { ImageOverlay, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet'; // Import Leaflet for marker customization
import { FireIcon } from './assets/assets';
const AQIHeatmapLayer = ({ 
  heatmaps, 
  firemaps,
  stations,
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

  const firePointToLayer = (feature, latlng) => {
    const marker = L.marker(latlng, {
      icon: L.icon({
        iconUrl: 'src/assets/fire.png',
        iconSize: [15, 15],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        shadowUrl: null,
        shadowSize: [0, 0]
      })
    });
    
    // Add tooltip to the marker
    if (feature.properties) {
      const { satellite, brightness } = feature.properties; // Extract desired properties
      marker.bindTooltip(
        `Satellite: ${satellite || 'N/A'}<br>Brightness: ${brightness || 'N/A'}`, 
        {
          permanent: false, // Tooltip only shows on hover
          direction: 'top', 
          offset: [0, -10] 
        }
      );
    }
    
    return marker;
    
  };
  const stationPointToLayer = (feature, latlng) => {
    const marker = L.marker(latlng, {
      icon: L.icon({
        iconUrl: 'src/assets/circle.png',
        iconSize: [20, 20 ],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        shadowUrl: null,
        shadowSize: [0, 0]
      })
    });
  
    
    if (feature.properties) {
      const { properties, geometry } = feature; // Extract desired properties
      marker.bindTooltip(
        `Station: ${properties.name || 'N/A'}<br>Lattitude: ${geometry.coordinates[0] || 'N/A'}<br>Longitude: ${geometry.coordinates[1]}`, 
        {
          permanent: false, // Tooltip only shows on hover
          direction: 'top', 
          offset: [0, -10]
        }
      );
    }
  
    return marker;
  };
  return (
    <>
      {/* Render GeoJSON layer with custom markers */}
      {firemaps[currentIndex] && (
        <GeoJSON
          key={firemaps[currentIndex]._uniqueId}
          data={firemaps[currentIndex]}
          pointToLayer={firePointToLayer}
        />
      )}
      {stations && (
        <GeoJSON
          key={stations._uniqueId}
          data={stations}
          pointToLayer={stationPointToLayer} // 
        />
      )}
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
    </>
  );
};

export default AQIHeatmapLayer;
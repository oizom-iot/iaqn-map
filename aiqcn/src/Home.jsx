'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Box, Flex, Text, Button, VStack, Stack } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap, ImageOverlay, ZoomControl } from 'react-leaflet';
import { IoPlay, IoPause, IoCalendar } from "react-icons/io5";
import { PopoverArrow, PopoverBody, PopoverContent, PopoverRoot, PopoverTrigger } from "@/components/ui/popover";
import { Field } from '@/components/ui/field';
import geojsonBounds from '@/constants/geojsonBounds.json';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const s3BaseURL = "https://iaqn.s3.us-east-2.amazonaws.com"; // Replace with your S3 base URL

const Home = () => {
  const [startDate, setStartDate] = useState('2024-11-01');
  const [endDate, setEndDate] = useState('2024-12-01');
  const [parameter, setParameter] = useState('pm25');
  const [heatmaps, setHeatmaps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heatmapPlaying, setHeatmapPlaying] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [polygonBounds, setPolygonBounds] = useState(null); // Assuming geojsonBounds is precomputed GeoJSON bounds
  const playIntervalRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const map = useRef();


  // Utility: Generate heatmap URLs based on the date range and selected parameter
  const generateHeatmapUrls = (start, end, param) => {
    const urls = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const formattedDate = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      urls.push(`${s3BaseURL}/${param}/${formattedDate}.png`);
    }
    return urls;
  };

  // Update heatmap overlay
  const updateHeatmap = (index) => {
    if (heatmaps.length === 0 || index >= heatmaps.length) return;
    setCurrentIndex(index);
  };

  // Play/Pause heatmap animation
  const togglePlayPause = () => {
    if (heatmaps.length === 0) return;
    if (heatmapPlaying) {
      console.log('clearing interval');
      
      clearInterval(playIntervalRef.current);
    } else {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % heatmaps.length);
      }, 1000); // Change heatmap every second
    }
    setHeatmapPlaying(!heatmapPlaying);
  };

  // Handle slider input
  const handleSliderChange = (e) => {
    setCurrentIndex(parseInt(e.target.value, 10));
    clearInterval(playIntervalRef.current);
    setHeatmapPlaying(false);
  };

  // Load heatmaps based on date range and parameter
  const loadHeatmaps = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const urls = generateHeatmapUrls(start, end, parameter);
    setHeatmaps(urls);
    setCurrentIndex(0);
    setPopoverOpen(false);
    togglePlayPause();
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    // Add custom zoom control at the bottom right
    const geojson = L.geoJSON(geojsonBounds);
    setPolygonBounds(geojson.getBounds());
    loadHeatmaps();
    return () => {
      clearInterval(playIntervalRef.current);
    };
  }, []);

  return (
    <Flex direction="column" height="100vh" width="100vw">
      {/* Top Toolbar */}
      <Box
        as="header"
        bg="white"
        color="black"
        p={4}
        zIndex={1000}
        position="absolute"
        top={0}
        width="100%"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontSize="lg" fontWeight="bold">
          Air India Quality Control Network
        </Text>
        <Button bg={'black'} outline={'none !important'} color={'white'} border={'none'} variant={'outline'}>
          How To?
        </Button>
      </Box>

      {/* Map */}
      <Box flex="1" mt={16} position="relative">
        <MapContainer
          center={[27.0, 80.0]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          ref={map}
        >
          
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png"
          />
          {heatmaps.length > 0 && polygonBounds && (
            <ImageOverlay
              url={heatmaps[currentIndex]}
              bounds={polygonBounds || geojsonBounds}
              opacity={opacity}
              zIndex={100}
            />)} 
        </MapContainer>

        {/* Controls */}
        <Box
          display="flex"
          position="absolute"
          bottom={0}
          bg="transparent"
          p={4}
          borderRadius="lg"
          zIndex={1000}
          gap={3}
          width="100vw"
          justifyContent="center"
        >
          <VStack width={'100%'} spacing={5}>
            <div className="slider-container">
              {/* Date Picker */}
              <PopoverRoot open={popoverOpen} onOpenChange={(e) => setPopoverOpen(e.open)} positioning={{ placement: "top-end" }}>
                <PopoverTrigger asChild>
                  <div className="play-button">
                    <Button onClick={() => {setPopoverOpen(true); togglePlayPause();}} padding={0} color={'white'} bg={'transparent'} outline={'none'} width={'1rem'}>
                      <IoCalendar />
                    </Button>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverBody bg="rgba(36, 34, 32, 0.9);">
                    <Stack gap="4">
                      <Field label="From">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className='datepicker'
                        />
                      </Field>
                      <Field label="To">
                        <input
                          type="date"
                          value={endDate}
                          className='datepicker'
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </Field>
                      <Button bg={'white'} onClick={loadHeatmaps}>
                        Apply
                      </Button>
                    </Stack>
                  </PopoverBody>
                </PopoverContent>
              </PopoverRoot>

              {/* Play/Pause Button */}
              <div className="play-button">
                <Button
                  padding={0}
                  color={'white'}
                  bg={'transparent'}
                  outline={'none'}
                  width={'1rem'}
                  onClick={togglePlayPause}
                >
                  {heatmapPlaying ? <IoPause /> : <IoPlay />}
                </Button>
              </div>

              {/* Slider */}
              <div style={{ width: '100%' }}>
                <input
                  type="range"
                  min="0"
                  max={heatmaps.length - 1}
                  value={currentIndex}
                  onChange={handleSliderChange}
                  className="slider"
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="timestamp">
                    {heatmaps[currentIndex]?.split('/').pop()?.replace('.png', '') || '--'}
                  </span>
                </div>
              </div>

              {/* Opacity Control */}
              <div style={{width: 'fit-content', display: 'flex', justifyContent: 'space-between', flexDirection: 'column', height: '100%', padding: '0.7rem 1rem 0'}}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(e.target.value)}
                  className='slider'
                  style={{ width: '10rem', backgroundColor: 'orange' }}
                />
                <p style={{ fontSize: '12px', display: 'flex', justifyContent: 'center'}}>Opacity</p>
              </div>
            </div>
          </VStack>
        </Box>
      </Box>
    </Flex>
  );
};

export default Home;

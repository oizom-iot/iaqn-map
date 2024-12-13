'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Box, Flex, Text, Button, VStack, Stack, HStack, createListCollection, Select, Switch } from '@chakra-ui/react';
import { MapContainer, TileLayer, useMap, ImageOverlay, ZoomControl } from 'react-leaflet';
import { IoPlay, IoPause, IoCalendar } from "react-icons/io5";
import { PopoverArrow, PopoverBody, PopoverContent, PopoverRoot, PopoverTrigger } from "@/components/ui/popover";
import { Field } from '@/components/ui/field';
import geojsonBounds from '@/constants/geojsonBounds.json';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Import Leaflet
import AQIHeatmapLayer from './heatmap';

const s3BaseURL = "https://iaqn.s3.us-east-2.amazonaws.com"; // Replace with your S3 base URL

const images = {};
function preload(urls) {
  for (const url of urls) {
    images[url] = new Image();
    images[url].src = url;
  }
}

const geojsons = {}; // Global dictionary to store preloaded GeoJSON data

const preloadGeoJSON = async (urls, setFiremaps) => {
  for (const url of urls) {
    if (!geojsons[url]) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        geojsons[url] = data; // Store parsed GeoJSON data

        // Update firemaps incrementally
        setFiremaps((prevFiremaps) => [...prevFiremaps, data]);
      } catch (error) {
        console.error(`Error preloading GeoJSON: ${url}`, error);
        geojsons[url] = null; // Mark as failed to load
      }
    }
  }
};

const MapControl = ({
  // currentParameter,
  // setCurrentParameter,
  parameter,
  setParameter,
  firemapsEnabled, 
  setFiremapsEnabled, 
  stationsEnabled, 
  setStationsEnabled 
}) => {
  const map = useMap(); // Access Leaflet map instance
  const parametersList = [
    { label: "PM 2.5", value: "pm25" },
    { label: "PM 10", value: "pm10" },
  ]

  useEffect(() => {
    // Create a custom control wrapper for the map controls
    const controlWrapper = L.control({ position: 'topright' });

    controlWrapper.onAdd = function () {
      const wrapperDiv = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
      
      // Dark theme styling for the wrapper to create rounded borders
      wrapperDiv.style.backgroundColor = '#2D2D2D'; // Dark background
      wrapperDiv.style.borderRadius = '12px';
      wrapperDiv.style.padding = '10px';
      wrapperDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      wrapperDiv.style.display = 'flex';
      wrapperDiv.style.flexDirection = 'column';
      wrapperDiv.style.gap = '10px';

      // Parameter Dropdown Control
      const parameterDiv = L.DomUtil.create('div');
      parameterDiv.style.backgroundColor = '#444'; // Dark background for dropdown
      parameterDiv.style.color = 'white'; // White text for contrast
      parameterDiv.style.padding = '10px';
      parameterDiv.style.borderRadius = '8px';
      parameterDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      parameterDiv.style.cursor = 'pointer';
      parameterDiv.innerHTML = `<label style="color: white;">Select Parameter: </label><select class="parameter-dropdown" style="padding: 5px; border-radius: 5px; background-color: #333; color: white; border: none;">${parametersList.map(item => `<option value="${item.value}" ${parameter === item.value ? 'selected' : ''}>${item.label}</option>`).join('')}</select>`;

      parameterDiv.querySelector('select').onchange = (e) => {
        setParameter(e.target.value);
      };

      // Firemaps Toggle Control
      const firemapsDiv = L.DomUtil.create('div');
      firemapsDiv.style.backgroundColor = firemapsEnabled ? '#FF6347' : '#808080'; // Tomato Red for enabled, Gray for disabled
      firemapsDiv.style.color = 'white';
      firemapsDiv.style.padding = '10px';
      firemapsDiv.style.borderRadius = '8px';
      firemapsDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      firemapsDiv.style.cursor = 'pointer';
      firemapsDiv.style.fontWeight = 'bold';
      firemapsDiv.innerHTML = firemapsEnabled ? 'Disable Firemaps' : 'Enable Firemaps';

      firemapsDiv.onclick = () => {
        setFiremapsEnabled((prev) => !prev);
        firemapsDiv.innerHTML = !firemapsEnabled ? 'Disable Firemaps' : 'Enable Firemaps';
        firemapsDiv.style.backgroundColor = !firemapsEnabled ? '#FF6347' : '#808080'; // Update color
      };

      // Stations Toggle Control
      const stationsDiv = L.DomUtil.create('div');
      stationsDiv.style.backgroundColor = stationsEnabled ? '#1E90FF' : '#808080';
      stationsDiv.style.color = 'white';
      stationsDiv.style.padding = '10px';
      stationsDiv.style.borderRadius = '8px';
      stationsDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      stationsDiv.style.cursor = 'pointer';
      stationsDiv.style.fontWeight = 'bold';
      stationsDiv.innerHTML = stationsEnabled ? 'Disable Stations' : 'Enable Stations';

      stationsDiv.onclick = () => {
        setStationsEnabled((prev) => !prev);
        stationsDiv.innerHTML = !stationsEnabled ? 'Disable Stations' : 'Enable Stations';
        stationsDiv.style.backgroundColor = !stationsEnabled ? '#1E90FF' : '#808080'; // Update color
      };

      // Append controls to the wrapper div
      wrapperDiv.appendChild(parameterDiv);
      wrapperDiv.appendChild(firemapsDiv);
      wrapperDiv.appendChild(stationsDiv);

      return wrapperDiv;
    };

    controlWrapper.addTo(map);

    // Cleanup on unmount
    return () => {
      controlWrapper.remove();
    };
  }, [map, parameter, setParameter, firemapsEnabled, stationsEnabled, setFiremapsEnabled, setStationsEnabled]);

  return null; // No visible React component, just Leaflet controls
};



const playSpeedMs = 1000;
const transitionTimeMs = playSpeedMs / 4;
const transitionSteps = 100;
const Home = () => {
  const [startDate, setStartDate] = useState('2024-10-15');
  const [endDate, setEndDate] = useState('2024-12-15');
  const [parameter, setParameter] = useState('pm25');
  const [heatmaps, setHeatmaps] = useState([]);
  const [firemaps, setFiremaps] = useState([]);
  const [staions, setStaions] = useState([]);
  const [staionsEnabled, setStationsEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heatmapPlaying, setHeatmapPlaying] = useState(false);
  const [opacity, setOpacity] = useState(0.6);
  const [polygonBounds, setPolygonBounds] = useState(null); // Assuming geojsonBounds is precomputed GeoJSON bounds
  const playIntervalRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [firemapsEnabled, setFiremapsEnabled] = useState(true);
  const map = useRef();

  const generateFiremapUrls = (start, end, param = "fire") => {
    const urls = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const formattedDate = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      urls.push(`${s3BaseURL}/${param}/${formattedDate}.geojson`);
    }
    return urls;
  };


  const fetchStationsData = async () => {
    const stationData = await fetch("src/constants/stations.geojson")
    return stationData.json()
  }
  const initializeStations = async () => {
    const stationsData = await fetchStationsData()
    setStaions(stationsData.features)
  }
  // Utility: Generate heatmap URLs based on the date range and selected parameter
  const generateHeatmapUrls = (start, end, param) => {
    const urls = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const formattedDate = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      urls.push(`${s3BaseURL}/${param}/${formattedDate}.png`);
    }
    return urls;
  };

  // Play/Pause heatmap animation
  const togglePlayPause = () => {
    if (heatmaps.length === 0) return;
    if (heatmapPlaying) {
      clearInterval(playIntervalRef.current);
    } else {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % heatmaps.length);
      }, playSpeedMs); // Change heatmap every second
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
  const loadHeatmaps = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    // Generate URLs for heatmaps and GeoJSON
    const heatmapUrls = generateHeatmapUrls(start, end, parameter);
    const firemapUrls = generateFiremapUrls(start, end);
  
    setHeatmaps(heatmapUrls);
    setCurrentIndex(0);
    setPopoverOpen(false);

    // Start GeoJSON preloading in the background
    // Start GeoJSON preloading in the background with incremental updates
    preloadGeoJSON(firemapUrls, setFiremaps);

    // Start heatmap playback
    togglePlayPause();  
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    // Add custom zoom control at the bottom right
    const geojson = L.geoJSON(geojsonBounds);
    setPolygonBounds(geojson.getBounds());
    loadHeatmaps();


    //loading stations data on mount
    initializeStations()
    return () => {
      clearInterval(playIntervalRef.current);
    };
  }, []);

  preload(heatmaps);
  return (
    <Flex direction="column" height="100vh" width="100vw">
      {/* Top Toolbar */}
      <Box
        as="header"
        bg="white"
        color="black"
        padding={'0.8rem 1rem'}
        zIndex={1000}
        width="100%"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <img src="https://static.wixstatic.com/media/e2710f_453b16e486d74e45a568e095ca6e19dd~mv2.png/v1/fill/w_178,h_55,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/e2710f_453b16e486d74e45a568e095ca6e19dd~mv2.png" alt="The Indian Air Quality Network (IAQN) is a dynamic platform uniting visionaries—environmentalists, researchers, policymakers, and industry leaders—on a mission to tackle India’s air quality crisis." style={{ width: '142px', height: '44px', objectFit: 'cover' }} width="142" height="44" srcSet="https://static.wixstatic.com/media/e2710f_453b16e486d74e45a568e095ca6e19dd~mv2.png/v1/fill/w_178,h_55,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/e2710f_453b16e486d74e45a568e095ca6e19dd~mv2.png" fetchpriority="high" />
        <Button bg={'black'} outline={'none !important'} color={'white'} border={'none'} variant={'outline'}>
          How To?
        </Button>
      </Box>

      {/* Map */}
      <Box display={'flex'} flex="1">
        <MapContainer
          center={[27.0, 80.0]}
          zoom={6}
          minZoom={6}
          maxZoom={18}
          style={{ width: '100%', flexGrow: 1, display: 'flex' }}
          ref={map}
        >
          <TileLayer
            url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="iaqn.org"
            zIndex={0}
          />
          {heatmaps.length > 0 && polygonBounds && (
            <AQIHeatmapLayer 
              heatmaps={heatmaps}
              firemaps={firemapsEnabled ? firemaps : []}
              stations={staionsEnabled ? staions : []}
              currentIndex={currentIndex}
              polygonBounds={polygonBounds}
              opacity={opacity}
              transitionIntervalInMs={transitionTimeMs}
              transitionSteps={transitionSteps}
            />
          )}

          <MapControl 
            parameter={parameter}
            setParameter={setParameter}
            firemapsEnabled={firemapsEnabled}
            setFiremapsEnabled={setFiremapsEnabled}
            stationsEnabled={staionsEnabled}
            setStationsEnabled={setStationsEnabled}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.pngcl"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="iaqn.org"
            opacity={0.5}
            zIndex={200}
            pane='overlayPane'
          />

        </MapContainer>

        {/* Controls */}
        <Box
          display="flex"
          position="fixed"
          bottom={2}
          bg="transparent"
          borderRadius="lg"
          zIndex={1000}
          width="100vw"
          justifyContent="center"
          height={'fit-content'}
        >

          <VStack width={'100%'} display={'flex'} gap={0}>
            <div className="slider-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%' }}>
                {/* Date Picker */}
                <PopoverRoot open={popoverOpen} onOpenChange={(e) => setPopoverOpen(e.open)} positioning={{ placement: "top-end" }}>
                  <PopoverTrigger asChild>
                    <div className="play-button">
                      <Button onClick={() => { setPopoverOpen(true); heatmapPlaying && togglePlayPause(); }} padding={0} color={'white'} bg={'transparent'} outline={'none'} width={'1rem'}>
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


                {/* Parameter Selector */}
                {/* <SelectRoot
                  collection={parameters}
                  width="320px"
                  value={currentParameter}
                  onValueChange={(e) => {setCurrentParameter(e.value); console.log(e.value)}}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Select parameter" />
                  </SelectTrigger>
                  <SelectContent>
                    {parameters.items.map((param) => (
                      <SelectItem item={param} key={param.value}>
                        {param.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot> */}

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
                <div style={{ width: '100%', marginRight: '0.5rem' }}>
                  <div style={{width:'100%', textAlign:'center', margin:'2px 0 0', lineHeight:'5px'}} className='timestamp'> {new Date(heatmaps[currentIndex]?.split('/').pop()?.replace('.png', '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || '--'}</div>
                  <input
                    type="range"
                    min="0"
                    max={heatmaps.length - 1}
                    value={currentIndex}
                    onChange={handleSliderChange}
                    className="slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{display:'flex', alignItems:'center', justifyContent:'space-between'}} className="timestamp">
                     {new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{display:'flex', alignItems:'center', justifyContent:'space-between'}} className="timestamp">
                     {new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="aqi-container">
                  <div className="aqi-bar">
                    <div className="aqi-segment green"></div>
                    <div className="aqi-segment lightgreen"></div>
                    <div className="aqi-segment yellow"></div>
                    <div className="aqi-segment orange"></div>
                    <div className="aqi-segment red"></div>
                    <div className="aqi-segment maroon"></div>
                  </div>
                  <div className="aqi-scale">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                    <span>200</span>
                    <span>300</span>
                    <span>400</span>
                    <span>500</span>
                  </div>
                </div>
                <a className='aqi-footer' target='_blank' href="https://cpcb.nic.in/National-Air-Quality-Index/">National Air Quality Index • Learn More</a>
              </div>
            </div>

          </VStack>

        </Box>
      </Box>
    </Flex>
  );
};

export default Home;

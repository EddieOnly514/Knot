
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Users } from 'lucide-react';

interface CurrentLocationProps {
  onFindRides: (data: { currentLocation: string; destination: string; radius: string; coordinates?: { lat: number; lng: number } }) => void;
}

const CurrentLocation: React.FC<CurrentLocationProps> = ({ onFindRides }) => {
  const { user, updateLocation } = useAuth();
  const [locationData, setLocationData] = useState({
    currentLocation: '',
    destination: '',
    radius: '1000', // Default 1000 feet
    coordinates: null as { lat: number; lng: number } | null
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<string[]>([]);

  const radiusOptions = [
    { value: '500', label: '500 feet' },
    { value: '1000', label: '1000 feet' },
    { value: '2500', label: '0.5 miles' },
    { value: '5000', label: '1 mile' },
    { value: '10000', label: '2 miles' },
    { value: 'building', label: 'Same building' }
  ];

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              const address = result.formatted;
              
              setLocationData(prev => ({
                ...prev,
                currentLocation: address,
                coordinates: { lat: latitude, lng: longitude }
              }));
              
              // Generate nearby places based on location components
              const components = result.components;
              const generatedNearby = generateNearbyPlaces(components, latitude, longitude);
              setNearbyPlaces(generatedNearby);
            } else {
              // Fallback to coordinates
              setLocationData(prev => ({
                ...prev,
                currentLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                coordinates: { lat: latitude, lng: longitude }
              }));
              setNearbyPlaces(getDefaultNearbyPlaces());
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            // Fallback without geocoding
            setLocationData(prev => ({
              ...prev,
              currentLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              coordinates: { lat: latitude, lng: longitude }
            }));
            setNearbyPlaces(getDefaultNearbyPlaces());
          }
          
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationLoading(false);
          alert('Unable to get your location. Please check your location settings.');
        }
      );
    } else {
      setLocationLoading(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  const generateNearbyPlaces = (components: any, lat: number, lng: number) => {
    const places = [];
    
    // Add specific building/venue if available
    if (components.building) places.push(components.building);
    if (components.house_number && components.road) {
      places.push(`${components.house_number} ${components.road}`);
    }
    
    // Add neighborhood/area
    if (components.neighbourhood) places.push(components.neighbourhood);
    if (components.suburb) places.push(components.suburb);
    
    // Add city landmarks based on city
    const city = components.city || components.town || components.village;
    if (city) {
      const landmarks = getCityLandmarks(city);
      places.push(...landmarks.slice(0, 3)); // Add up to 3 landmarks
    }
    
    // Add nearby transit if near airport coordinates
    if (isNearAirport(lat, lng)) {
      places.unshift('LAX International Airport', 'LAX Terminal 1', 'LAX Terminal 2');
    }
    
    return places.slice(0, 6); // Limit to 6 options
  };

  const getCityLandmarks = (city: string) => {
    const landmarkMap: { [key: string]: string[] } = {
      'Los Angeles': ['Santa Monica Pier', 'Hollywood Walk of Fame', 'Griffith Observatory', 'Venice Beach', 'Beverly Hills'],
      'Santa Monica': ['Santa Monica Pier', 'Third Street Promenade', 'Santa Monica Beach'],
      'Beverly Hills': ['Rodeo Drive', 'Beverly Hills Hotel', 'Greystone Mansion'],
      'Hollywood': ['Hollywood Walk of Fame', 'TCL Chinese Theatre', 'Hollywood Bowl'],
      'Irvine': ['UCI Campus', 'Irvine Spectrum Center', 'Great Park'],
      'Pasadena': ['Rose Bowl', 'Old Town Pasadena', 'Huntington Library']
    };
    
    return landmarkMap[city] || [];
  };

  const isNearAirport = (lat: number, lng: number) => {
    // LAX coordinates: 33.9425, -118.4081
    const laxLat = 33.9425;
    const laxLng = -118.4081;
    const distance = Math.sqrt(Math.pow(lat - laxLat, 2) + Math.pow(lng - laxLng, 2));
    return distance < 0.01; // Roughly within 1km
  };

  const getDefaultNearbyPlaces = () => [
    'Santa Monica Pier',
    'Venice Beach', 
    'Beverly Hills',
    'Hollywood Walk of Fame',
    'LAX Airport',
    'Downtown LA'
  ];

  const handleFindRides = () => {
    if (!locationData.currentLocation || !locationData.destination) {
      alert('Please set your current location and destination');
      return;
    }
    
    // Save to matching history
    const historyEntry = {
      id: Date.now().toString(),
      type: 'current',
      currentLocation: locationData.currentLocation,
      destination: locationData.destination,
      timestamp: new Date().toISOString(),
      coordinates: locationData.coordinates
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('knot_matching_history') || '[]');
    existingHistory.unshift(historyEntry);
    localStorage.setItem('knot_matching_history', JSON.stringify(existingHistory.slice(0, 20)));
    
    onFindRides(locationData);
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
      <div className="space-y-6">
        {/* Current Location */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Current Location
          </Label>
          
          {!locationData.currentLocation ? (
            <div className="space-y-3">
              <Button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="w-full h-12 bg-knot-blue hover:bg-blue-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {locationLoading ? (
                  <div className="animate-pulse flex items-center space-x-2">
                    <Navigation className="w-4 h-4 animate-spin" />
                    <span>Finding your location...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Use My Location</span>
                  </div>
                )}
              </Button>
              
              <div className="text-center text-gray-500 text-sm">or enter manually</div>
              
              <Input
                placeholder="Enter your address"
                className="h-12 rounded-xl border-gray-200 transition-all duration-200 focus:scale-105"
                onChange={(e) => setLocationData(prev => ({ ...prev, currentLocation: e.target.value }))}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl animate-fade-in">
                <span className="text-gray-700 text-sm">{locationData.currentLocation}</span>
                <Button
                  onClick={() => setLocationData(prev => ({ ...prev, currentLocation: '' }))}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:scale-110 transition-all duration-200"
                >
                  Change
                </Button>
              </div>
              
              {nearbyPlaces.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Or choose nearby place:</Label>
                  <Select onValueChange={(value) => setLocationData(prev => ({ ...prev, currentLocation: value }))}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 transition-all duration-200 hover:scale-105">
                      <SelectValue placeholder="Select nearby place" />
                    </SelectTrigger>
                    <SelectContent>
                      {nearbyPlaces.map((place) => (
                        <SelectItem key={place} value={place}>
                          {place}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Destination */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Where are you going?
          </Label>
          
          <Input
            type="text"
            placeholder="Enter destination address"
            value={locationData.destination}
            onChange={(e) => setLocationData(prev => ({ ...prev, destination: e.target.value }))}
            className="h-12 rounded-xl border-gray-200 transition-all duration-200 focus:scale-105"
          />
        </div>

        {/* Radius Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Match Range</span>
          </Label>
          
          <Select value={locationData.radius} onValueChange={(value) => setLocationData(prev => ({ ...prev, radius: value }))}>
            <SelectTrigger className="h-12 rounded-xl border-gray-200 transition-all duration-200 hover:scale-105">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Find Rides Button */}
        <Button
          onClick={handleFindRides}
          disabled={!locationData.currentLocation || !locationData.destination}
          className="w-full bg-knot-blue hover:bg-blue-600 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50 transform hover:scale-105 active:scale-95"
        >
          Find Ride Buddies
        </Button>
      </div>
    </Card>
  );
};

export default CurrentLocation;

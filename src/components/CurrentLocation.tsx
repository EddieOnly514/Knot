
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';

interface CurrentLocationProps {
  onFindRides: (data: { currentLocation: string; destination: string; coordinates?: { lat: number; lng: number } }) => void;
}

const CurrentLocation: React.FC<CurrentLocationProps> = ({ onFindRides }) => {
  const { user, updateLocation } = useAuth();
  const [locationData, setLocationData] = useState({
    currentLocation: '',
    destination: '',
    coordinates: null as { lat: number; lng: number } | null
  });
  const [locationLoading, setLocationLoading] = useState(false);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
          
          // Reverse geocoding to get address (simplified)
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=demo`
            );
            const data = await response.json();
            const address = data.results?.[0]?.formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            setLocationData(prev => ({
              ...prev,
              currentLocation: address,
              coordinates: { lat: latitude, lng: longitude }
            }));
          } catch (error) {
            setLocationData(prev => ({
              ...prev,
              currentLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              coordinates: { lat: latitude, lng: longitude }
            }));
          }
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const handleFindRides = () => {
    if (!locationData.currentLocation || !locationData.destination) {
      alert('Please set your current location and destination');
      return;
    }
    
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
          <div className="flex space-x-2">
            <Input
              value={locationData.currentLocation}
              onChange={(e) => setLocationData(prev => ({ ...prev, currentLocation: e.target.value }))}
              placeholder="Enter your current location"
              className="flex-1 h-12 rounded-xl border-gray-200"
            />
            <Button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="h-12 px-4 bg-knot-blue hover:bg-blue-600 rounded-xl"
            >
              {locationLoading ? (
                <div className="animate-pulse">
                  <Navigation className="w-4 h-4" />
                </div>
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Where are you going?
          </Label>
          <Input
            value={locationData.destination}
            onChange={(e) => setLocationData(prev => ({ ...prev, destination: e.target.value }))}
            placeholder="e.g., UCLA, Downtown LA, Santa Monica"
            className="h-12 rounded-xl border-gray-200"
          />
        </div>

        {/* Find Rides Button */}
        <Button
          onClick={handleFindRides}
          className="w-full bg-knot-blue hover:bg-blue-600 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md"
        >
          Find Ride Buddies
        </Button>
      </div>
    </Card>
  );
};

export default CurrentLocation;


import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Plus } from 'lucide-react';

interface CurrentLocationProps {
  onFindRides: (data: { currentLocation: string; destination: string; coordinates?: { lat: number; lng: number } }) => void;
}

const nearbyPlaces = [
  'Santa Monica Pier',
  'Venice Beach',
  'Beverly Hills',
  'Hollywood Walk of Fame',
  'Griffith Observatory',
  'Downtown LA',
  'LAX Airport',
  'UCLA',
  'USC',
  'The Grove',
  'Rodeo Drive',
  'Manhattan Beach',
  'Hermosa Beach',
  'Malibu',
  'Pasadena'
];

const destinationSuggestions = [
  'UCLA',
  'USC',
  'Santa Monica Pier',
  'Venice Beach',
  'Beverly Hills',
  'Hollywood',
  'Downtown LA',
  'LAX Airport',
  'Disneyland',
  'Universal Studios',
  'The Grove',
  'Rodeo Drive',
  'Manhattan Beach',
  'Hermosa Beach',
  'Malibu',
  'Pasadena',
  'Long Beach',
  'Huntington Beach'
];

const CurrentLocation: React.FC<CurrentLocationProps> = ({ onFindRides }) => {
  const { user, updateLocation } = useAuth();
  const [locationData, setLocationData] = useState({
    currentLocation: '',
    destination: '',
    coordinates: null as { lat: number; lng: number } | null
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showDestinationInput, setShowDestinationInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualDestination, setManualDestination] = useState('');

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
          
          // Find nearby places based on coordinates (simplified logic)
          const nearbyOptions = nearbyPlaces.slice(0, 5); // Show first 5 options
          
          setLocationData(prev => ({
            ...prev,
            coordinates: { lat: latitude, lng: longitude }
          }));
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

  const handleManualLocationSubmit = () => {
    if (manualAddress.trim()) {
      setLocationData(prev => ({ ...prev, currentLocation: manualAddress }));
      setShowManualInput(false);
      setManualAddress('');
    }
  };

  const handleManualDestinationSubmit = () => {
    if (manualDestination.trim()) {
      setLocationData(prev => ({ ...prev, destination: manualDestination }));
      setShowDestinationInput(false);
      setManualDestination('');
    }
  };

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
    localStorage.setItem('knot_matching_history', JSON.stringify(existingHistory.slice(0, 20))); // Keep last 20
    
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
              <div className="flex space-x-2">
                <Button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="flex-1 h-12 bg-knot-blue hover:bg-blue-600 rounded-xl"
                >
                  {locationLoading ? (
                    <div className="animate-pulse flex items-center space-x-2">
                      <Navigation className="w-4 h-4" />
                      <span>Finding...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Use My Location</span>
                    </div>
                  )}
                </Button>
              </div>
              
              <div className="text-center text-gray-500 text-sm">or</div>
              
              <Select onValueChange={(value) => setLocationData(prev => ({ ...prev, currentLocation: value }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Choose nearby place" />
                </SelectTrigger>
                <SelectContent>
                  {nearbyPlaces.map((place) => (
                    <SelectItem key={place} value={place}>
                      {place}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => setShowManualInput(true)}
                variant="outline"
                className="w-full h-10 rounded-xl border-gray-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Enter Address Manually
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl">
              <span className="text-gray-700">{locationData.currentLocation}</span>
              <Button
                onClick={() => setLocationData(prev => ({ ...prev, currentLocation: '' }))}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                Change
              </Button>
            </div>
          )}
          
          {showManualInput && (
            <div className="mt-3 space-y-2">
              <Input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Enter your address"
                className="h-10 rounded-xl border-gray-200"
              />
              <div className="flex space-x-2">
                <Button onClick={handleManualLocationSubmit} size="sm" className="bg-knot-blue hover:bg-blue-600 rounded-xl">
                  Set Location
                </Button>
                <Button onClick={() => setShowManualInput(false)} variant="outline" size="sm" className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Destination */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Where are you going?
          </Label>
          
          {!locationData.destination ? (
            <div className="space-y-3">
              <Select onValueChange={(value) => setLocationData(prev => ({ ...prev, destination: value }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Popular destinations" />
                </SelectTrigger>
                <SelectContent>
                  {destinationSuggestions.map((destination) => (
                    <SelectItem key={destination} value={destination}>
                      {destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => setShowDestinationInput(true)}
                variant="outline"
                className="w-full h-10 rounded-xl border-gray-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Enter Custom Destination
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl">
              <span className="text-gray-700">{locationData.destination}</span>
              <Button
                onClick={() => setLocationData(prev => ({ ...prev, destination: '' }))}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                Change
              </Button>
            </div>
          )}
          
          {showDestinationInput && (
            <div className="mt-3 space-y-2">
              <Input
                value={manualDestination}
                onChange={(e) => setManualDestination(e.target.value)}
                placeholder="Enter destination address"
                className="h-10 rounded-xl border-gray-200"
              />
              <div className="flex space-x-2">
                <Button onClick={handleManualDestinationSubmit} size="sm" className="bg-knot-blue hover:bg-blue-600 rounded-xl">
                  Set Destination
                </Button>
                <Button onClick={() => setShowDestinationInput(false)} variant="outline" size="sm" className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Find Rides Button */}
        <Button
          onClick={handleFindRides}
          disabled={!locationData.currentLocation || !locationData.destination}
          className="w-full bg-knot-blue hover:bg-blue-600 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50"
        >
          Find Ride Buddies
        </Button>
      </div>
    </Card>
  );
};

export default CurrentLocation;

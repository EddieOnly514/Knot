
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Profile from '@/components/Profile';
import CurrentLocation from '@/components/CurrentLocation';

const airports = [
  'LAX - Los Angeles International',
  'JFK - John F. Kennedy International',
  'ORD - Chicago OHare International',
  'ATL - Hartsfield-Jackson Atlanta International',
  'DFW - Dallas/Fort Worth International',
  'DEN - Denver International',
  'SFO - San Francisco International',
  'SEA - Seattle-Tacoma International',
  'LAS - McCarran International',
  'PHX - Phoenix Sky Harbor International'
];

const Home = () => {
  const { user, updateLocation } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('current');
  const [airportFormData, setAirportFormData] = useState({
    airport: '',
    arrivalDate: '',
    arrivalTime: '',
    destination: '',
    radius: '1000'
  });

  const radiusOptions = [
    { value: '500', label: '500 feet' },
    { value: '1000', label: '1000 feet' },
    { value: '2500', label: '0.5 miles' },
    { value: '5000', label: '1 mile' },
    { value: '10000', label: '2 miles' },
    { value: 'building', label: 'Same building' }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (navigator.geolocation && !user.location) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, [user, navigate, updateLocation]);

  const handleAirportInputChange = (field: string, value: string) => {
    setAirportFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFindAirportMatches = () => {
    if (!airportFormData.airport || !airportFormData.arrivalDate || !airportFormData.arrivalTime || !airportFormData.destination) {
      alert('Please fill in all fields');
      return;
    }
    
    // Save to matching history
    const historyEntry = {
      id: Date.now().toString(),
      type: 'airport',
      airport: airportFormData.airport,
      arrivalDate: airportFormData.arrivalDate,
      arrivalTime: airportFormData.arrivalTime,
      destination: airportFormData.destination,
      timestamp: new Date().toISOString()
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('knot_matching_history') || '[]');
    existingHistory.unshift(historyEntry);
    localStorage.setItem('knot_matching_history', JSON.stringify(existingHistory.slice(0, 20)));
    
    localStorage.setItem('knot_search', JSON.stringify({ ...airportFormData, type: 'airport' }));
    navigate('/matching');
  };

  const handleFindCurrentLocationRides = (data: any) => {
    localStorage.setItem('knot_search', JSON.stringify({ ...data, type: 'current' }));
    navigate('/matching');
  };

  if (!user) {
    return null;
  }

  const getBackgroundClasses = () => {
    if (activeTab === 'current') {
      return 'bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100';
    } else {
      return 'bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ease-in-out ${getBackgroundClasses()}`}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100 px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-knot-blue">Knot</h1>
          </div>
          <Profile />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Ride Buddies</h2>
            <p className="text-gray-600">Match with travelers heading your way</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/70 backdrop-blur-sm">
              <TabsTrigger 
                value="current" 
                className="data-[state=active]:bg-knot-blue data-[state=active]:text-white transition-all duration-300 transform data-[state=active]:scale-105 hover:scale-102"
              >
                Current Location
              </TabsTrigger>
              <TabsTrigger 
                value="airport" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-300 transform data-[state=active]:scale-105 hover:scale-102"
              >
                Airport Arrival
              </TabsTrigger>
            </TabsList>

            {/* Current Location Tab */}
            <TabsContent 
              value="current" 
              className="space-y-6 animate-fade-in"
            >
              <CurrentLocation onFindRides={handleFindCurrentLocationRides} />
            </TabsContent>

            {/* Airport Arrival Tab */}
            <TabsContent 
              value="airport" 
              className="space-y-6 animate-fade-in"
            >
              <Card className="p-6 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <div className="space-y-6">
                  {/* Airport Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Airport of Arrival
                    </Label>
                    <Select onValueChange={(value) => handleAirportInputChange('airport', value)}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-gray-200 bg-white/70 transition-all duration-200 hover:scale-105">
                        <SelectValue placeholder="Select airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport) => (
                          <SelectItem key={airport} value={airport}>
                            {airport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrival Date */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Arrival Date
                    </Label>
                    <Input
                      type="date"
                      value={airportFormData.arrivalDate}
                      onChange={(e) => handleAirportInputChange('arrivalDate', e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white/70 transition-all duration-200 focus:scale-105"
                    />
                  </div>

                  {/* Arrival Time */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Arrival Time
                    </Label>
                    <Input
                      type="time"
                      value={airportFormData.arrivalTime}
                      onChange={(e) => handleAirportInputChange('arrivalTime', e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white/70 transition-all duration-200 focus:scale-105"
                    />
                  </div>

                  {/* Destination */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Destination
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter destination address"
                      value={airportFormData.destination}
                      onChange={(e) => handleAirportInputChange('destination', e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white/70 transition-all duration-200 focus:scale-105"
                    />
                  </div>

                  {/* Radius Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Match Range
                    </Label>
                    <Select value={airportFormData.radius} onValueChange={(value) => handleAirportInputChange('radius', value)}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/70 transition-all duration-200 hover:scale-105">
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

                  {/* Find Matches Button */}
                  <Button
                    onClick={handleFindAirportMatches}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md transform hover:scale-105 active:scale-95"
                  >
                    Find Airport Matches
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-6 animate-fade-in">
            <p className="text-sm text-gray-500">
              We don't book rides. We just match travelers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

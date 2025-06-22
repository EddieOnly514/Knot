
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
  const [airportFormData, setAirportFormData] = useState({
    airport: '',
    arrivalDate: '',
    arrivalTime: '',
    destination: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Request location on component mount
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Ride Buddies</h2>
            <p className="text-gray-600">Match with travelers heading your way</p>
          </div>

          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/70 backdrop-blur-sm">
              <TabsTrigger value="current" className="data-[state=active]:bg-knot-blue data-[state=active]:text-white">
                Current Location
              </TabsTrigger>
              <TabsTrigger value="airport" className="data-[state=active]:bg-knot-blue data-[state=active]:text-white">
                Airport Arrival
              </TabsTrigger>
            </TabsList>

            {/* Current Location Tab */}
            <TabsContent value="current" className="space-y-6">
              <CurrentLocation onFindRides={handleFindCurrentLocationRides} />
            </TabsContent>

            {/* Airport Arrival Tab */}
            <TabsContent value="airport" className="space-y-6">
              <Card className="p-6 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <div className="space-y-6">
                  {/* Airport Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Airport of Arrival
                    </Label>
                    <Select onValueChange={(value) => handleAirportInputChange('airport', value)}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-gray-200 bg-white/70">
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
                      className="h-12 rounded-xl border-gray-200 bg-white/70"
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
                      className="h-12 rounded-xl border-gray-200 bg-white/70"
                    />
                  </div>

                  {/* Destination */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Destination
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g., UCI, Downtown LA, Santa Monica"
                      value={airportFormData.destination}
                      onChange={(e) => handleAirportInputChange('destination', e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white/70"
                    />
                  </div>

                  {/* Find Matches Button */}
                  <Button
                    onClick={handleFindAirportMatches}
                    className="w-full bg-knot-blue hover:bg-blue-600 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md"
                  >
                    Find Airport Matches
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-6">
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

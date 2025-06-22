
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { user, logout, updateLocation } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFindMatches = () => {
    if (!formData.airport || !formData.arrivalDate || !formData.arrivalTime || !formData.destination) {
      alert('Please fill in all fields');
      return;
    }
    
    // Store search criteria in localStorage for the matching page
    localStorage.setItem('knot_search', JSON.stringify(formData));
    navigate('/matching');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-knot-blue">Knot</h1>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Ride Buddies</h2>
            <p className="text-gray-600">Match with travelers heading your way</p>
          </div>

          <Card className="p-6 shadow-lg border-0 bg-white">
            <div className="space-y-6">
              {/* Airport Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Airport of Arrival
                </Label>
                <Select onValueChange={(value) => handleInputChange('airport', value)}>
                  <SelectTrigger className="w-full h-12 rounded-xl border-gray-200">
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
                  value={formData.arrivalDate}
                  onChange={(e) => handleInputChange('arrivalDate', e.target.value)}
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>

              {/* Arrival Time */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Arrival Time
                </Label>
                <Input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => handleInputChange('arrivalTime', e.target.value)}
                  className="h-12 rounded-xl border-gray-200"
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
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>

              {/* Find Matches Button */}
              <Button
                onClick={handleFindMatches}
                className="w-full bg-knot-blue hover:bg-blue-600 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-md"
              >
                Find Matches
              </Button>
            </div>
          </Card>

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

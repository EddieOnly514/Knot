
import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, MapPin, Plane } from 'lucide-react';

interface HistoryEntry {
  id: string;
  type: 'current' | 'airport';
  currentLocation?: string;
  destination: string;
  airport?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  timestamp: string;
}

const MatchingHistory = () => {
  const history: HistoryEntry[] = JSON.parse(localStorage.getItem('knot_matching_history') || '[]');

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No matching history yet</p>
        <p className="text-sm text-gray-400">Your ride searches will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {history.map((entry) => (
        <Card key={entry.id} className="p-4 bg-gray-50 border-0">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {entry.type === 'airport' ? (
                <Plane className="w-4 h-4 text-knot-blue" />
              ) : (
                <MapPin className="w-4 h-4 text-green-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  entry.type === 'airport' 
                    ? 'bg-blue-100 text-knot-blue' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {entry.type === 'airport' ? 'Airport' : 'Current Location'}
                </span>
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
              </div>
              
              {entry.type === 'airport' ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {entry.airport}
                  </p>
                  <p className="text-xs text-gray-600">
                    {entry.arrivalDate} at {entry.arrivalTime}
                  </p>
                  <p className="text-xs text-gray-600">
                    → {entry.destination}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    {entry.currentLocation} → {entry.destination}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MatchingHistory;

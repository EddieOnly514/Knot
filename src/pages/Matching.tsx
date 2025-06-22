
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface TravelMatch {
  id: string;
  name: string;
  arrivalTime: string;
  destination: string;
  avatar: string;
}

const Matching = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<TravelMatch[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Get search criteria from localStorage
    const savedSearch = localStorage.getItem('knot_search');
    if (savedSearch) {
      setSearchCriteria(JSON.parse(savedSearch));
    }

    // Simulate finding matches
    const mockMatches: TravelMatch[] = [
      {
        id: '1',
        name: 'Sarah Chen',
        arrivalTime: '3:45 PM',
        destination: 'UCI Campus',
        avatar: 'SC'
      },
      {
        id: '2',
        name: 'Mike Rodriguez',
        arrivalTime: '4:15 PM',
        destination: 'UCI Medical Center',
        avatar: 'MR'
      },
      {
        id: '3',
        name: 'Emma Wilson',
        arrivalTime: '3:30 PM',
        destination: 'Irvine Spectrum',
        avatar: 'EW'
      }
    ];

    setMatches(mockMatches);
  }, [user, navigate]);

  const handleMatchAndChat = (matchId: string, matchName: string) => {
    // Create a chat session
    const chatId = `chat_${user?.id}_${matchId}`;
    localStorage.setItem(`knot_chat_${chatId}`, JSON.stringify({
      participants: [user?.name, matchName],
      messages: []
    }));
    navigate(`/chat/${chatId}`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Travel Matches</h1>
            {searchCriteria && (
              <p className="text-sm text-gray-600">
                {searchCriteria.destination} • {searchCriteria.arrivalDate}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => (
                <Card key={match.id} className="p-4 shadow-sm border border-gray-100 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-knot-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">{match.avatar}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{match.name}</h3>
                        <p className="text-sm text-gray-600">Arriving at {match.arrivalTime}</p>
                        <p className="text-sm text-knot-blue">Also going to {match.destination}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleMatchAndChat(match.id, match.name)}
                      className="bg-knot-green hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                    >
                      Match & Chat
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
              <p className="text-sm text-gray-600 mb-6">
                Try widening your arrival window or changing destination radius.
              </p>
              <Button
                onClick={() => navigate('/home')}
                variant="outline"
                className="border-knot-blue text-knot-blue hover:bg-knot-blue hover:text-white"
              >
                Update Search
              </Button>
            </div>
          )}

          {matches.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 text-center">
                Coordinate rides on Uber/Lyft after matching. No payments through this app.
              </p>
              <p className="text-xs text-gray-500 text-center mt-2">
                Splitting an UberXL to UCI can save ~$50 per person.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matching;

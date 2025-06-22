
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, User, History } from 'lucide-react';
import MatchingHistory from './MatchingHistory';

const Profile = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    profilePhoto: user?.profilePhoto || '',
    verificationPhotos: []
  });
  const [isOpen, setIsOpen] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'verification') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoUrl = e.target?.result as string;
        if (type === 'profile') {
          setProfileData(prev => ({ ...prev, profilePhoto: photoUrl }));
        } else {
          setProfileData(prev => ({ 
            ...prev, 
            verificationPhotos: [...prev.verificationPhotos, photoUrl] 
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('knot_profile', JSON.stringify(profileData));
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profileData.profilePhoto} />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <span className="text-gray-700">{profileData.name || 'Profile'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-4">
            {/* Profile Photo */}
            <div className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={profileData.profilePhoto} />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="profile-photo" className="cursor-pointer">
                <div className="flex items-center justify-center space-x-2 text-knot-blue">
                  <Camera className="w-4 h-4" />
                  <span>Change Photo</span>
                </div>
              </Label>
              <Input
                id="profile-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, 'profile')}
              />
            </div>

            {/* Name */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Name
              </Label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border-gray-200"
                placeholder="Enter your name"
              />
            </div>

            {/* Identity Verification */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Identity Verification
              </Label>
              <p className="text-xs text-gray-500 mb-3">
                Upload photos to verify your identity for safer rides
              </p>
              <Label htmlFor="verification-photo" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-knot-blue transition-colors">
                  <Camera className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Add Verification Photo</span>
                </div>
              </Label>
              <Input
                id="verification-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, 'verification')}
              />
              
              {profileData.verificationPhotos.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {profileData.verificationPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Verification ${index + 1}`}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleSave} className="flex-1 bg-knot-blue hover:bg-blue-600 rounded-xl">
                Save Profile
              </Button>
              <Button onClick={logout} variant="outline" className="flex-1 rounded-xl">
                Sign Out
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <MatchingHistory />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Profile;

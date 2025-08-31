"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { AnalysisPanel } from '@/components/analysis-panel';
import { MapControlPanel } from '@/components/map-control-panel';
import { StoryPanel } from '@/components/story-panel';
import { FeedbackPanel } from '@/components/feedback-panel';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type MapRef } from 'react-map-gl';
import { LoaderCircle } from 'lucide-react';
import { ToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';

const MapComponent = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-background flex items-center justify-center"><p>Loading Map...</p></div>
});


export default function Home() {
  const mapRef = React.useRef<MapRef>(null);
  const [selectedPlace, setSelectedPlace] = React.useState<any | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mapData, setMapData] = React.useState<any | null>(null);

  const [visibleLayers, setVisibleLayers] = React.useState({
    Natural: true,
    Human: true,
    Social: true,
    Manufactured: true,
    Financial: true,
  });
  const router = useRouter();
  
  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);
  
  // This effect now fetches the aggregated data when a place is selected.
  React.useEffect(() => {
    if (selectedPlace?.id && user) {
        const fetchPlaceData = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/places/${selectedPlace.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch place data.');
                const data = await response.json();
                setMapData(data.mapData);
            } catch (error) {
                console.error("Error fetching place data:", error);
            }
        };
        fetchPlaceData();
    } else {
      setMapData(null); // Clear map data when no place is selected
    }
  }, [selectedPlace, user]);


  if (loading || !user) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Authenticating...</p>
      </div>
    );
  }
  
  return (
    <ToastProvider>
      <main className="relative h-screen w-screen bg-background text-foreground">
        <MapComponent mapRef={mapRef} mapData={mapData} visibleLayers={visibleLayers}/>
        <AnalysisPanel 
          onPlaceChange={setSelectedPlace}
          selectedPlace={selectedPlace}
          visibleLayers={visibleLayers}
          onLayerVisibilityChange={setVisibleLayers}
        />
        <div className="absolute right-3 top-14 z-10 flex flex-col gap-2">
            <StoryPanel place={selectedPlace} />
            <FeedbackPanel place={selectedPlace} user={user} />
        </div>
      </main>
      <Toaster />
    </ToastProvider>
  );
}

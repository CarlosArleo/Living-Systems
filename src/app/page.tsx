"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { AnalysisPanel } from '@/components/analysis-panel';
import { MapControlPanel } from '@/components/map-control-panel';
import { StoryPanel } from '@/components/story-panel';
import { FeedbackPanel } from '@/components/feedback-panel'; // Import the new component
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
  const [selectedPlace, setSelectedPlace] = React.useState<DocumentData | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
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
  
  React.useEffect(() => {
    if (selectedPlace?.id) {
      const db = getFirestore(app);
      const placeDocRef = doc(db, 'places', selectedPlace.id);
      const unsubscribe = onSnapshot(placeDocRef, (doc) => {
        if (doc.exists()) {
          setSelectedPlace({ id: doc.id, ...doc.data() });
        }
      });
      return () => unsubscribe();
    }
  }, [selectedPlace?.id]);


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
        <MapComponent mapRef={mapRef} selectedPlaceId={selectedPlace?.id} visibleLayers={visibleLayers}/>
        <AnalysisPanel 
          onPlaceChange={(place) => setSelectedPlace(place)}
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

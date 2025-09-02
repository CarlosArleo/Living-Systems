
'use client';

import * as React from 'react';
import {
  ChevronLeft,
  LoaderCircle,
  Plus,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, onSnapshot, query, orderBy, type DocumentData } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { PlaceDetailView } from './place-detail-view';
import { UserProfile } from './user-profile';
import { UploadDialog } from './upload-dialog';

// Corrected Type Definition for Place
type Place = {
  id: string;
  name: string;
  [key: string]: any;
};

type AnalysisPanelProps = {
  onPlaceChange: (place: Place | null) => void;
  selectedPlace: Place | null;
  onLayerVisibilityChange: (layers: any) => void;
  visibleLayers: any;
};

export function AnalysisPanel({ onPlaceChange, selectedPlace, onLayerVisibilityChange, visibleLayers }: AnalysisPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [isCreatingPlace, setIsCreatingPlace] = React.useState(false);
  const [isCreatePlaceDialogOpen, setCreatePlaceDialogOpen] = React.useState(false);

  const [user, setUser] = React.useState<FirebaseUser | null>(null);
    
  const [detailedPlaceData, setDetailedPlaceData] = React.useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) return; 

    const db = getFirestore(app);
    const placesQuery = query(collection(db, 'places'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(placesQuery, (snapshot) => {
      const placesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Place));
      setPlaces(placesData);
    }, (error) => {
        console.error("Error fetching places:", error);
        toast({ variant: 'destructive', title: 'Error Fetching Places', description: error.message });
        setPlaces([]);
    });
    return () => unsubscribe();
  }, [user, toast]);

  React.useEffect(() => {
    if (selectedPlace?.id && user) {
        const fetchDetails = async () => {
            setIsDetailLoading(true);
            setDetailError(null);
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/places/${selectedPlace.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.details || 'Failed to fetch place details.');
                }
                const data = await response.json();
                setDetailedPlaceData(data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                console.error("Error fetching place details:", error);
                setDetailError(errorMessage);
                toast({ variant: 'destructive', title: 'Error', description: errorMessage });
            } finally {
                setIsDetailLoading(false);
            }
        };
        fetchDetails();
    } else {
        setDetailedPlaceData(null);
    }
  }, [selectedPlace, user, toast]);

  const handleCreatePlace = async () => {
    if (!user || !newPlaceName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Place name cannot be empty." });
      return;
    }
    setIsCreatingPlace(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/places', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newPlaceName }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to create place.");
      }
      toast({ title: "Place Created", description: `Successfully created "${newPlaceName}".` });
      setNewPlaceName('');
      setCreatePlaceDialogOpen(false);
    } catch (error) {
      console.error("Error creating place:", error);
      toast({ variant: "destructive", title: "Error Creating Place", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsCreatingPlace(false);
    }
  };
  
  if (!isOpen) {
    return (
      <div className="absolute left-3 top-3 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setIsOpen(true)} className="h-8 w-8 rounded-none border-border/20 bg-background/50 backdrop-blur-lg">
                <ChevronLeft className="rotate-180" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Show Analysis Panel</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
  
  const renderPanelContent = () => {
    if (selectedPlace) {
        if (isDetailLoading) {
            return <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin" /></div>;
        }
        if (detailError) {
            return <div className="p-4 text-center text-sm text-destructive">{detailError}</div>;
        }
        if (detailedPlaceData) {
            return <PlaceDetailView placeData={detailedPlaceData} onBack={() => onPlaceChange(null)} />;
        }
         return <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin" /></div>;
    }
    
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="uppercase text-xs text-muted-foreground tracking-wider font-semibold">Places</h3>
                <Dialog open={isCreatePlaceDialogOpen} onOpenChange={setCreatePlaceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 font-body text-xs rounded-none">
                      <Plus className="mr-1 h-3 w-3" /> Add Place
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-none">
                    <DialogHeader>
                      <DialogTitle>Create New Place</DialogTitle>
                      <DialogDescription>Define a new geographic area for analysis.</DialogDescription>
                    </DialogHeader>
                    <Input value={newPlaceName} onChange={(e) => setNewPlaceName(e.target.value)} placeholder="e.g., Willow Creek Watershed" className="rounded-none" />
                    <DialogFooter>
                      <Button onClick={handleCreatePlace} disabled={isCreatingPlace} className="rounded-none">
                        {isCreatingPlace && <LoaderCircle className="animate-spin mr-2 h-4 w-4" />}
                        Create Place
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
               {places.map((p: Place) => ( // Add explicit type here for safety
                <div key={p.id} onClick={() => onPlaceChange(p)}
                  className={cn( "flex w-full items-center gap-2 p-2 text-left font-body text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer border border-transparent rounded-none",
                    selectedPlace?.id === p.id && "bg-accent/80 text-foreground border-border" )}>
                  <div className="w-1.5 h-1.5 bg-purple-400 shrink-0 rounded-none"></div>
                  <div className='flex-col min-w-0'> <span className="truncate flex-1 font-semibold">{p.name}</span></div>
                </div>
              ))}
            </div>
            <Separator className="bg-border/20" />
            <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
                <p className="text-center text-muted-foreground text-xs p-4">Select a place to see details.</p>
            </div>
        </div>
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full p-2">
        <Card className="pointer-events-auto flex w-80 flex-col rounded-none border-border/20 bg-background/50 shadow-2xl backdrop-blur-lg">
          <div className="flex-shrink-0 p-2 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <svg className="h-5 w-5 text-foreground/80" viewBox="0 0 22 15">
                  <g transform="translate(11, -3) rotate(45.000000)">
                    <rect fill="currentColor" x="0" y="5" width="10" height="10"></rect>
                    <rect fill="hsl(var(--foreground))" x="5" y="0" width="10" height="10"></rect>
                  </g>
                </svg>
                <div className="flex flex-col">
                  <CardTitle className="font-headline text-xs font-semibold tracking-wider text-foreground/90">RDI PLATFORM</CardTitle>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6 rounded-none">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
            <div className="flex-1 flex flex-col min-h-0 m-0">
              {renderPanelContent()}
            </div>
           <div className="flex-shrink-0 border-t border-border/20 p-2">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground rounded-none">
                        <User className="mr-2 h-4 w-4" />
                        User Profile
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card rounded-none">
                    <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                    <DialogDescription>
                        View your user information and sign out.
                    </DialogDescription>
                    </DialogHeader>
                    {user && <UserProfile user={user} />}
                </DialogContent>
            </Dialog>
           </div>
        </Card>
      </div>
    </>
  );
}

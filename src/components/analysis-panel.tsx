'use client';

import * as React from 'react';
import {
  ChevronLeft,
  LoaderCircle,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  Database,
  BrainCircuit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { app } from '@/lib/firebase';
import { DocumentDetailSheet } from './document-detail-sheet';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HolisticInquirySheet } from './holistic-inquiry-sheet';


type Place = {
  id: string;
  name: string;
};

// Represents a document in the 'documents' subcollection
type DocumentMetadata = DocumentData & {
  id: string;
  placeId: string;
};

type VisibleLayers = {
  Natural: boolean;
  Human: boolean;
  Social: boolean;
  Manufactured: boolean;
  Financial: boolean;
};

type AnalysisPanelProps = {
  onPlaceChange: (place: Place | null) => void;
  selectedPlace: DocumentData | null;
  visibleLayers: VisibleLayers;
  onLayerVisibilityChange: (layers: VisibleLayers) => void;
};

export function AnalysisPanel({ onPlaceChange, selectedPlace, visibleLayers, onLayerVisibilityChange }: AnalysisPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [newPlaceName, setNewPlaceName] = React.useState('');
  const [isCreatingPlace, setIsCreatingPlace] = React.useState(false);
  const [isCreatePlaceDialogOpen, setCreatePlaceDialogOpen] = React.useState(false);

  // CORRECTED: This state now holds metadata from the 'documents' collection
  const [sourceDocs, setSourceDocs] = React.useState<DocumentMetadata[]>([]);
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentMetadata | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAddDataOpen, setAddDataOpen] = React.useState(false);
  const [isHolisticInquiryOpen, setHolisticInquiryOpen] = React.useState(false);
  const [isIndexing, setIsIndexing] = React.useState(false);
  
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
    if (!selectedPlace?.id) {
      setSourceDocs([]);
      return;
    }
    const db = getFirestore(app);
    // CORRECTED: Listen to the 'documents' subcollection
    const docsQuery = query(
      collection(db, 'places', selectedPlace.id, 'documents'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        placeId: selectedPlace.id,
        ...doc.data(),
      }));
      setSourceDocs(docsData);
    }, (error) => {
      console.error("Error fetching source documents:", error);
      toast({ variant: 'destructive', title: 'Error Fetching Documents', description: error.message });
      setSourceDocs([]);
    });

    return () => unsubscribe();
  }, [selectedPlace, toast]);


  const handleCreatePlace = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated" });
        return;
    }
    if (!newPlaceName.trim()) {
        toast({ variant: "destructive", title: "Validation Error" });
        return;
    }

    setIsCreatingPlace(true);
    try {
        await user.getIdToken(true);
        const db = getFirestore(app);
        const docRef = await addDoc(collection(db, 'places'), {
            name: newPlaceName,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Place Created", description: `Successfully created "${newPlaceName}".` });
        setNewPlaceName('');
        handlePlaceChange(docRef.id);
        setCreatePlaceDialogOpen(false);
    } catch (error) {
        console.error("Error creating place:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ variant: "destructive", title: "Error Creating Place", description: errorMessage });
    } finally {
        setIsCreatingPlace(false);
    }
  };

  const handleBuildKnowledgeBase = async () => {
    if (!selectedPlace?.id) return;
    setIsIndexing(true);
    toast({ title: "Building Knowledge Base...", description: "This may take a moment." });

    try {
        const response = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: selectedPlace.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.details || 'Failed to index documents.');
        toast({ title: "Knowledge Base Updated", description: `Indexed ${result.documentsWritten} new insights.`});
    } catch (error) {
        console.error("Error building knowledge base:", error);
        toast({ variant: 'destructive', title: "Indexing Failed", description: error instanceof Error ? error.message : "An unknown error occurred."});
    } finally {
        setIsIndexing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async (capitalCategory: string) => {
    if (!user || !file || !selectedPlace?.id) {
      toast({ variant: 'destructive', title: 'Missing Information' });
      return;
    }
    setIsUploading(true);
    toast({ title: 'Uploading document...', description: 'Your file is being saved securely.' });

    try {
      const storage = getStorage(app);
      const storagePath = `uploads/${user.uid}/${selectedPlace.id}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      // Now call the API that triggers the new, simpler harmonize flow
      const response = await fetch('/api/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: selectedPlace.id,
          capitalCategory,
          storagePath: storagePath,
          sourceFile: file.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error);
      
      toast({ title: 'Upload Successful', description: `'${file.name}' is saved and ready for analysis.` });
      setFile(null);
      setAddDataOpen(false);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error instanceof Error ? error.message : "Unknown error." });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlaceChange = (id: string) => {
    const place = places.find(p => p.id === id) || null;
    onPlaceChange(place);
  }

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
                  <CardTitle className="font-headline text-xs font-semibold tracking-wider text-foreground/90">RDD PLATFORM</CardTitle>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6 rounded-none">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
             <div className="p-3 border-b border-border/20">
                <TabsList className="grid w-full grid-cols-2 h-8 rounded-none">
                    <TabsTrigger value="analysis" className="text-xs rounded-none">Analysis</TabsTrigger>
                    <TabsTrigger value="inquiry" className="text-xs rounded-none">Inquiry</TabsTrigger>
                </TabsList>
             </div>
             <TabsContent value="analysis" className="flex-1 flex flex-col min-h-0 m-0">
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
                   {places.map(p => (
                    <div key={p.id} onClick={() => handlePlaceChange(p.id)}
                      className={cn( "flex w-full items-center gap-2 p-2 text-left font-body text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer border border-transparent rounded-none",
                        selectedPlace?.id === p.id && "bg-accent/80 text-foreground border-border" )}>
                      <div className="w-1.5 h-1.5 bg-purple-400 shrink-0 rounded-none"></div>
                      <div className='flex-col min-w-0'> <span className="truncate flex-1 font-semibold">{p.name}</span></div>
                    </div>
                  ))}
                </div>
                <Separator className="bg-border/20" />
                <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
                    <div className='flex items-center justify-between'>
                      <h3 className="uppercase text-xs text-muted-foreground tracking-wider font-semibold">Source Documents</h3>
                       <Dialog open={isAddDataOpen} onOpenChange={setAddDataOpen}>
                            <DialogTrigger asChild>
                               <Button variant="outline" size="sm" className="h-7 px-2 font-body text-xs rounded-none" disabled={!selectedPlace}> Add Data</Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-none">
                              <DialogHeader> <DialogTitle>Add New Data</DialogTitle> <DialogDescription>Upload a document for {selectedPlace?.name}. The AI will analyze it.</DialogDescription></DialogHeader>
                              <Input id="data-file" type="file" onChange={handleFileChange} accept=".pdf,.txt,.md,.json" className="rounded-none"/>
                              <DialogFooter>
                                <Button onClick={() => handleUpload('Natural')} disabled={isUploading || !file} className="rounded-none">
                                  {isUploading && <LoaderCircle className="animate-spin mr-2 h-4 w-4" />}
                                  Upload
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                    </div>
                    <ScrollArea className="flex-1 -mr-3 pr-3">
                      <div className="space-y-1.5">
                        {sourceDocs.length > 0 ? (
                          sourceDocs.map(doc => (
                            <div key={doc.id} className="group relative w-full border border-border/50 bg-background/30 hover:border-border cursor-pointer rounded-none">
                              <div onClick={() => setSelectedDoc(doc)} className="flex items-stretch gap-2 p-2 text-left min-w-0">
                                <div className="w-1 self-stretch bg-green-500 rounded-none"></div>
                                <div className="flex-1 flex flex-col min-w-0">
                                    <span className="font-body truncate text-xs text-foreground font-medium">
                                      {doc.sourceFile || 'Untitled Document'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/80 capitalize">
                                      Status: {doc.status || 'Unknown'}
                                    </span>
                                </div>
                                {doc.status === 'uploaded' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button onClick={(e) => {e.stopPropagation(); setSelectedDoc(doc);}} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground opacity-100 hover:bg-accent/20 hover:text-foreground rounded-none">
                                          <Sparkles className="h-3.5 w-3.5"/>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top"><p>Run Analysis</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-6 font-body"><p>No documents for this place.</p></div>
                        )}
                      </div>
                    </ScrollArea>
                </div>
            </TabsContent>
            <TabsContent value="inquiry" className="flex-1 flex flex-col min-h-0 m-0">
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                     <p className="text-sm text-muted-foreground">Ask questions about {selectedPlace?.name || 'your place'}.</p>
                     <Button variant="outline" onClick={() => setHolisticInquiryOpen(true)} disabled={!selectedPlace} className="rounded-none w-full">
                        <BrainCircuit className="mr-2" /> Holistic Inquiry
                    </Button>
                    <Button variant="secondary" onClick={handleBuildKnowledgeBase} disabled={!selectedPlace || isIndexing} className="rounded-none w-full">
                        {isIndexing ? <LoaderCircle className="animate-spin mr-2" /> : <Database className="mr-2" />}
                        {isIndexing ? 'Indexing...' : 'Build Knowledge Base'}
                    </Button>
                     <p className="text-xs text-muted-foreground/80 pt-2">
                        First, build the knowledge base from your uploaded documents. Then, start an inquiry.
                    </p>
                </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      <DocumentDetailSheet document={selectedDoc} isOpen={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)} />
       <HolisticInquirySheet 
        isOpen={isHolisticInquiryOpen} 
        onOpenChange={setHolisticInquiryOpen} 
        placeId={selectedPlace?.id}
        placeName={selectedPlace?.name || ''}
      />
    </>
  );
}

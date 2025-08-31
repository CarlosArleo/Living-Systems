/**
 * @fileoverview A dialog component for uploading documents.
 */
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoaderCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from '@/lib/firebase';

type UploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
};

const capitalCategories = ['Natural', 'Human', 'Social', 'Manufactured', 'Financial'];

export function UploadDialog({ isOpen, onOpenChange, placeId }: UploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [capitalCategory, setCapitalCategory] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!file || !capitalCategory || !user || !placeId) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a file and a category.' });
      return;
    }

    setIsUploading(true);

    try {
      const storage = getStorage(app);
      // Generate a unique document ID on the client for the filename
      const docId = Date.now().toString() + Math.random().toString(36).substring(2);
      const storagePath = `uploads/${user.uid}/${placeId}/${docId}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      
      const token = await user.getIdToken();
      const response = await fetch('/api/harmonize', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
              placeId,
              initialCapitalCategory: capitalCategory,
              storagePath,
              sourceFile: file.name
          }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to initiate harmonization.');
      }
      
      toast({ title: 'Upload Successful', description: 'File uploaded and analysis has begun.' });
      setFile(null);
      setCapitalCategory('');
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>Add Data</DialogTitle>
          <DialogDescription>Upload a document to analyze its contribution to the Five Capitals.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="capital-category" className="text-right">Capital</Label>
            <Select onValueChange={setCapitalCategory} value={capitalCategory}>
              <SelectTrigger className="col-span-3 rounded-none">
                <SelectValue placeholder="Select a capital category" />
              </SelectTrigger>
              <SelectContent>
                {capitalCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-upload" className="text-right">Document</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} className="col-span-3 rounded-none" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={isUploading || !file || !capitalCategory} className="rounded-none">
            {isUploading ? <LoaderCircle className="animate-spin mr-2" /> : <Upload className="mr-2" />}
            Upload & Analyze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

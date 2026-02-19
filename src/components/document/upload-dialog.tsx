'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useUser, useFirebaseApp } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { Progress } from '../ui/progress';

const uploadFormSchema = z.object({
  file: z.instanceof(File).refine(file => file.size > 0, 'Please select a file to upload.'),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const storage = getStorage(firebaseApp);
  const { toast } = useToast();
  const { user } = useUser();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  });
  
  const onSubmit = async (data: UploadFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0); // Reset progress

    const file = data.file;
    const filePath = `documents/${Date.now()}-${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);

    try {
        // Simulate progress for a better UX, as uploadBytes doesn't provide it directly
        setUploadProgress(30);
        await uploadBytes(fileStorageRef, file);
        setUploadProgress(70);

        const downloadURL = await getDownloadURL(fileStorageRef);
        setUploadProgress(90);

        const docsCollection = collection(firestore, 'documents');
        await addDoc(docsCollection, {
            name: file.name,
            url: downloadURL,
            storagePath: filePath,
            uploaderId: user.uid,
            uploaderName: user.displayName,
            createdAt: serverTimestamp(),
        });
        
        setUploadProgress(100);

        toast({
            title: 'Upload Successful',
            description: `Document "${file.name}" has been uploaded.`,
        });
        
        form.reset();
        onOpenChange(false);

    } catch (error: any) {
        console.error("File upload error:", error);
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message || 'An unexpected error occurred during upload.',
        });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isUploading) {
            onOpenChange(isOpen);
            form.reset();
        }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Select a file to share with your team. This will be visible to all users.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>File</FormLabel>
                    <FormControl>
                        <Input
                        type="file"
                        {...rest}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onChange(file);
                        }}
                        disabled={isUploading}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {isUploading && (
                <div className='space-y-2'>
                    <Label>Uploading...</Label>
                    <Progress value={uploadProgress} className="h-2" />
                </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

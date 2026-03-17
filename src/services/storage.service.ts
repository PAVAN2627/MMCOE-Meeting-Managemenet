import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from '@/integrations/firebase/config';

class StorageService {
  async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      
      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } else {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadAudio(meetingId: string, audioFile: File, onProgress?: (progress: number) => void): Promise<string> {
    const path = `meetings/${meetingId}/audio/${audioFile.name}`;
    return this.uploadFile(audioFile, path, onProgress);
  }

  async uploadDocument(meetingId: string, document: File, onProgress?: (progress: number) => void): Promise<string> {
    const path = `meetings/${meetingId}/documents/${document.name}`;
    return this.uploadFile(document, path, onProgress);
  }

  async uploadMoM(meetingId: string, momFile: File): Promise<string> {
    const path = `meetings/${meetingId}/mom/${momFile.name}`;
    return this.uploadFile(momFile, path);
  }

  async downloadFile(url: string): Promise<Blob> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  }

  isValidFileType(file: File, allowedTypes: string[]): boolean {
    const extension = this.getFileExtension(file.name).toLowerCase();
    return allowedTypes.some(type => type.toLowerCase() === extension);
  }

  isValidFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}

export const storageService = new StorageService();

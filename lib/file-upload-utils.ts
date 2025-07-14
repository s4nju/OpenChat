/**
 * File Upload Utilities
 * Helper functions for file uploads, validation, and attachment handling
 */

import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { humaniseUploadError } from './chat-error-utils';
import { toast } from '@/components/ui/toast';

export interface FileAttachment {
  storageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface VercelAiAttachment {
  name: string;
  contentType: string;
  url: string;
  storageId: string;
}

/**
 * Uploads a single file and saves attachment metadata
 */
export async function uploadAndSaveFile(
  file: File,
  chatId: Id<'chats'>,
  generateUploadUrl: () => Promise<string>,
  saveFileAttachment: (attachment: {
    storageId: Id<'_storage'>;
    chatId: Id<'chats'>;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => Promise<FileAttachment>
): Promise<FileAttachment | null> {
  try {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const { storageId } = await response.json() as { storageId: Id<'_storage'> };
    
    return await saveFileAttachment({
      storageId,
      chatId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (uploadError) {
    const friendly = humaniseUploadError(uploadError);
    toast({ title: friendly, status: 'error' });
    return null;
  }
}

/**
 * Uploads multiple files in parallel and creates Vercel AI attachments
 */
export async function uploadFilesInParallel(
  files: File[],
  chatId: Id<'chats'>,
  generateUploadUrl: () => Promise<string>,
  saveFileAttachment: (attachment: {
    storageId: Id<'_storage'>;
    chatId: Id<'chats'>;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => Promise<FileAttachment>,
  getStorageUrl: (storageId: string) => Promise<string | null>
): Promise<VercelAiAttachment[]> {
  const vercelAiAttachments: VercelAiAttachment[] = [];

  // Upload all files in parallel
  const uploadPromises = files.map((file) =>
    uploadAndSaveFile(file, chatId, generateUploadUrl, saveFileAttachment)
  );
  const uploadResults = await Promise.all(uploadPromises);

  // Generate URLs for successful uploads
  const urlPromises = uploadResults.map(async (attachment) => {
    if (!attachment) {
      return null;
    }

    try {
      const url = await getStorageUrl(attachment.storageId);
      if (url) {
        return {
          name: attachment.fileName,
          contentType: attachment.fileType,
          url,
          storageId: attachment.storageId,
        };
      }
    } catch {
      // Failed to generate URL for this attachment
      return null;
    }

    return null;
  });

  const urlResults = await Promise.all(urlPromises);

  // Collect successful attachments
  for (const attachment of urlResults) {
    if (attachment) {
      vercelAiAttachments.push(attachment);
    }
  }

  return vercelAiAttachments;
}

/**
 * Creates optimistic attachments for immediate UI feedback
 */
export function createOptimisticAttachments(files: File[]) {
  return files.map((file) => ({
    name: file.name,
    contentType: file.type,
    url: URL.createObjectURL(file),
  }));
}
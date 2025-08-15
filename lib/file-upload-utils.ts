/**
 * File Upload Utilities
 * Helper functions for file uploads, validation, and attachment handling
 */

import type { FileUIPart } from 'ai';
import { toast } from '@/components/ui/toast';
import type { Id } from '@/convex/_generated/dataModel';
import { humaniseUploadError } from './chat-error-utils';

export type FileAttachment = {
  fileName: string; // This is the storage ID
  fileType: string;
  fileSize: number;
};

// Use FileUIPart from AI SDK instead of custom interface

/**
 * Uploads a single file and saves attachment metadata
 */
export async function uploadAndSaveFile(
  file: File,
  chatId: Id<'chats'>,
  generateUploadUrl: () => Promise<string>,
  saveFileAttachment: (attachment: {
    chatId: Id<'chats'>;
    fileName: Id<'_storage'>;
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

    const { storageId } = (await response.json()) as {
      storageId: Id<'_storage'>;
    };

    return await saveFileAttachment({
      chatId,
      fileName: storageId,
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
 * Uploads multiple files in parallel and creates FileUIPart attachments
 */
export async function uploadFilesInParallel(
  files: File[],
  chatId: Id<'chats'>,
  generateUploadUrl: () => Promise<string>,
  saveFileAttachment: (attachment: {
    chatId: Id<'chats'>;
    fileName: Id<'_storage'>;
    fileType: string;
    fileSize: number;
  }) => Promise<FileAttachment>,
  getStorageUrl: (storageId: string) => Promise<string | null>
): Promise<FileUIPart[]> {
  const fileAttachments: FileUIPart[] = [];

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
      const url = await getStorageUrl(attachment.fileName);
      if (url) {
        return {
          type: 'file',
          filename: attachment.fileName, // This is the storage ID
          mediaType: attachment.fileType,
          url,
        } satisfies FileUIPart;
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
      fileAttachments.push(attachment);
    }
  }

  return fileAttachments;
}

/**
 * Creates optimistic attachments for immediate UI feedback
 */
export function createOptimisticAttachments(files: File[]): FileUIPart[] {
  return files.map((file) => ({
    type: 'file' as const,
    filename: file.name,
    mediaType: file.type,
    url: URL.createObjectURL(file),
  }));
}

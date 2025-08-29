/**
 * File Upload Utilities
 * Helper functions for file uploads, validation, and attachment handling
 */

import type { FileUIPart } from 'ai';
import { toast } from '@/components/ui/toast';
import type { Id } from '@/convex/_generated/dataModel';
import { humaniseUploadError } from './chat-error-utils';

export type FileAttachment = {
  key: string; // R2 object key
  fileName: string; // display name
  fileType: string;
  fileSize: number;
  url?: string;
};

// Use FileUIPart from AI SDK instead of custom interface

/**
 * Uploads a single file and saves attachment metadata
 */
export async function uploadAndSaveFile(
  file: File,
  chatId: Id<'chats'>,
  uploadToR2: (f: File) => Promise<string>,
  saveFileAttachment: (attachment: {
    chatId: Id<'chats'>;
    key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => Promise<FileAttachment>
): Promise<FileAttachment | null> {
  try {
    const key = await uploadToR2(file);
    return await saveFileAttachment({
      chatId,
      key,
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
 * Uploads multiple files in parallel and creates FileUIPart attachments
 */
export async function uploadFilesInParallel(
  files: File[],
  chatId: Id<'chats'>,
  uploadToR2: (file: File) => Promise<string>,
  saveFileAttachment: (attachment: {
    chatId: Id<'chats'>;
    key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => Promise<FileAttachment>
): Promise<FileUIPart[]> {
  const fileAttachments: FileUIPart[] = [];

  // Upload all files in parallel
  const uploadPromises = files.map((file) =>
    uploadAndSaveFile(file, chatId, uploadToR2, saveFileAttachment)
  );
  const uploadResults = await Promise.all(uploadPromises);

  // Collect successful attachments
  for (const attachment of uploadResults) {
    if (!attachment) {
      continue;
    }
    // Use stored permanent URL from server
    if (attachment.url) {
      fileAttachments.push({
        type: 'file',
        filename: attachment.fileName,
        mediaType: attachment.fileType,
        url: attachment.url,
      });
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

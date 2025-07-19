/**
 * File Handling Hook
 * Manages file uploads and attachment processing for chat
 */

import type { FileUIPart } from 'ai';
import { useAction, useConvex } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  createOptimisticAttachments,
  uploadFilesInParallel,
} from '@/lib/file-upload-utils';

export function useFileHandling() {
  const [files, setFiles] = useState<File[]>([]);
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const saveFileAttachment = useAction(api.files.saveFileAttachment);
  const convex = useConvex();

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const processFiles = useCallback(
    async (chatId: Id<'chats'>): Promise<FileUIPart[]> => {
      if (files.length === 0) {
        return [];
      }

      const getStorageUrl = async (storageId: string) => {
        return await convex.query(api.files.getStorageUrl, {
          storageId: storageId as Id<'_storage'>,
        });
      };

      return await uploadFilesInParallel(
        files,
        chatId,
        generateUploadUrl,
        saveFileAttachment,
        getStorageUrl
      );
    },
    [files, generateUploadUrl, saveFileAttachment, convex]
  );

  const createOptimisticFiles = useCallback(() => {
    return createOptimisticAttachments(files);
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    processFiles,
    createOptimisticFiles,
    hasFiles: files.length > 0,
  };
}

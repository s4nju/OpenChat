/**
 * Chat Error Utilities
 * Handles error classification and user-friendly error messages for chat operations
 */

import { toast } from '@/components/ui/toast';
import { classifyError, shouldShowAsToast } from '@/lib/error-utils';

/**
 * Maps backend upload error codes to user-friendly messages
 */
export function humaniseUploadError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Error uploading file';
  }
  const msg = err.message;
  if (msg.includes('ERR_UNSUPPORTED_MODEL')) {
    return 'File uploads are not supported for the selected model.';
  }
  if (msg.includes('ERR_BAD_MIME')) {
    return 'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.';
  }
  if (msg.includes('ERR_FILE_TOO_LARGE')) {
    return 'Files can be at most 10 MB.';
  }
  return 'Error uploading file';
}

/**
 * Processes branch operation errors and returns user-friendly messages
 */
export function processBranchError(branchError: unknown): string {
  const errorMsg =
    branchError instanceof Error ? branchError.message : String(branchError);
  if (errorMsg.includes('Can only branch from assistant messages')) {
    return 'You can only branch from assistant messages';
  }
  if (errorMsg.includes('not found')) {
    return 'Message not found or chat unavailable';
  }
  if (errorMsg.includes('unauthorized')) {
    return "You don't have permission to branch this chat";
  }
  return 'Failed to branch chat';
}

/**
 * Standardized error handler for chat operations
 * Integrates with AI SDK error handling patterns
 */
export function handleChatError(error: Error): void {
  if (shouldShowAsToast(error)) {
    const classified = classifyError(error);
    toast({
      title: classified.userFriendlyMessage,
      status: 'error',
    });
  }
}

/**
 * Creates an error callback for useChat hook
 */
export function createChatErrorHandler() {
  return (error: Error) => {
    handleChatError(error);
  };
}

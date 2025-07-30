// Client-safe utility functions for Composio connectors
// This file contains only utility functions that can be safely used on the client-side

export type ConnectorType =
  | 'gmail'
  | 'googlecalendar'
  | 'notion'
  | 'googledrive';

// Map connector types to auth config IDs using public environment variables
export const getAuthConfigId = (connectorType: ConnectorType): string => {
  switch (connectorType) {
    case 'gmail':
      return process.env.NEXT_PUBLIC_GMAIL_AUTH_CONFIG_ID || 'gmail_oauth';
    case 'googlecalendar':
      return (
        process.env.NEXT_PUBLIC_CALENDAR_AUTH_CONFIG_ID ||
        'googlecalendar_oauth'
      );
    case 'notion':
      return process.env.NEXT_PUBLIC_NOTION_AUTH_CONFIG_ID || 'notion_oauth';
    case 'googledrive':
      return (
        process.env.NEXT_PUBLIC_GOOGLE_DRIVE_AUTH_CONFIG_ID ||
        'googledrive_oauth'
      );
    default:
      throw new Error(`Unknown connector type: ${connectorType}`);
  }
};

/**
 * Validate environment setup (can be used server-side only due to non-public env var)
 */
export const validateEnvironment = (): {
  isValid: boolean;
  message?: string;
} => {
  if (!process.env.COMPOSIO_API_KEY) {
    return {
      isValid: false,
      message: 'COMPOSIO_API_KEY environment variable is not set',
    };
  }

  return { isValid: true };
};

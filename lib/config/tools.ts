import { Gmail, GoogleDrive, Notion } from '@ridemountainpig/svgl-react';
import type { ComponentType } from 'react';
import { GoogleCalendarIcon } from '@/components/icons/google-calendar';
import type { ConnectorType } from '@/lib/types';

export interface ConnectorConfig {
  type: ConnectorType;
  displayName: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  authConfigId: string;
}

export const CONNECTOR_CONFIGS: Record<ConnectorType, ConnectorConfig> = {
  gmail: {
    type: 'gmail',
    displayName: 'Gmail',
    icon: Gmail,
    description: 'Access and manage your Gmail messages directly from chat.',
    authConfigId: process.env.NEXT_PUBLIC_GMAIL_AUTH_CONFIG_ID || 'gmail_oauth',
  },
  googlecalendar: {
    type: 'googlecalendar',
    displayName: 'Google Calendar',
    icon: GoogleCalendarIcon,
    description: 'View and schedule events in your Google Calendar.',
    authConfigId:
      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_AUTH_CONFIG_ID ||
      'googlecalendar_oauth',
  },
  googledrive: {
    type: 'googledrive',
    displayName: 'Google Drive',
    icon: GoogleDrive,
    description: 'Access and manage your Google Drive files and folders.',
    authConfigId:
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_AUTH_CONFIG_ID ||
      'googledrive_oauth',
  },
  notion: {
    type: 'notion',
    displayName: 'Notion',
    icon: Notion,
    description: 'Read and write to your Notion workspace pages.',
    authConfigId:
      process.env.NEXT_PUBLIC_NOTION_AUTH_CONFIG_ID || 'notion_oauth',
  },
};

export const SUPPORTED_CONNECTORS: ConnectorType[] = Object.keys(
  CONNECTOR_CONFIGS
) as ConnectorType[];

export const getConnectorConfig = (type: ConnectorType): ConnectorConfig => {
  const config = CONNECTOR_CONFIGS[type];
  if (!config) {
    throw new Error(`Unknown connector type: ${type}`);
  }
  return config;
};

// Connector tool detection configuration
export const CONNECTOR_TOOL_NAMES = SUPPORTED_CONNECTORS;

/**
 * Check if a tool name corresponds to a connector tool
 */
export const isConnectorTool = (toolName: string): boolean => {
  const lowerToolName = toolName.toLowerCase();

  // Check for specific patterns that indicate connector tools
  return (
    lowerToolName.includes('gmail') ||
    lowerToolName.includes('calendar') ||
    lowerToolName.includes('notion') ||
    lowerToolName.includes('drive')
  );
};

/**
 * Determine the connector type from a tool name
 */
export const getConnectorTypeFromToolName = (
  toolName: string
): ConnectorType => {
  const lowerToolName = toolName.toLowerCase();

  if (lowerToolName.includes('gmail')) {
    return 'gmail';
  }
  if (lowerToolName.includes('calendar')) {
    return 'googlecalendar';
  }
  if (lowerToolName.includes('notion')) {
    return 'notion';
  }
  if (lowerToolName.includes('drive')) {
    return 'googledrive';
  }

  // Default fallback - this should not happen if isConnectorTool returns true
  return 'gmail';
};

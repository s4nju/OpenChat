import { create } from 'zustand';
import type { Model } from '@/lib/types';

interface SettingsState {
  // State
  apiKey: string;
  tempApiKey: string;
  selectedModel: string;
  models: Model[];
  isLoading: boolean;
  error: string | null;
  showFreeOnly: boolean;
  settingsOpen: boolean;
  
  // Actions
  setApiKey: (apiKey: string) => void;
  setTempApiKey: (tempApiKey: string) => void;
  setSelectedModel: (modelId: string) => void;
  setModels: (models: Model[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setShowFreeOnly: (showFreeOnly: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  
  // Operations
  saveApiKey: () => void;
  fetchModels: (currentApiKey?: string) => Promise<void>;
  toggleSettings: () => void;
  
  // Derived state
  getFilteredModels: () => Model[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // State
  apiKey: '',
  tempApiKey: '',
  selectedModel: '',
  models: [],
  isLoading: false,
  error: null,
  showFreeOnly: false,
  settingsOpen: false,
  
  // Actions
  setApiKey: (apiKey) => set({ apiKey }),
  setTempApiKey: (tempApiKey) => set({ tempApiKey }),
  setSelectedModel: (modelId) => set({ selectedModel: modelId }),
  setModels: (models) => set({ models }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setShowFreeOnly: (showFreeOnly) => set({ showFreeOnly }),
  setSettingsOpen: (isOpen) => set({ settingsOpen: isOpen }),
  
  // Operations
  saveApiKey: () => {
    const { tempApiKey } = get();
    const trimmedApiKey = tempApiKey.trim();
    
    if (trimmedApiKey) {
      localStorage.setItem("openrouter_api_key", trimmedApiKey);
      set({ 
        apiKey: trimmedApiKey,
        error: null,
        settingsOpen: false
      });
    } else {
      localStorage.removeItem("openrouter_api_key");
      set({ 
        apiKey: "",
        tempApiKey: "",
        error: "API Key removed.",
        settingsOpen: false
      });
    }
  },
  
  fetchModels: async (currentApiKey) => {
    const { apiKey } = get();
    const keyToUse = currentApiKey !== undefined ? currentApiKey : apiKey;
    
    set({ isLoading: true, error: null });
    
    try {
      const headers: HeadersInit = {
        "HTTP-Referer": "https://openchat.dev",
        "X-Title": "OpenChat",
      };
      
      if (keyToUse) {
        headers["Authorization"] = `Bearer ${keyToUse}`;
      }

      const response = await fetch("https://openrouter.ai/api/v1/models", { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch models:", response.status, errorText);
        let userError = `Failed to fetch models: ${response.status} ${response.statusText}`;
        
        if (response.status === 401) {
          userError = keyToUse
            ? "Failed to fetch models: Invalid API Key. Please check your key in Settings."
            : "API Key needed to fetch all models. Add one in Settings or continue with public models.";
        }
        
        set({ error: userError });
        
        if (response.status !== 401 || keyToUse) {
          set({ models: [], selectedModel: "" });
        }
        
        if (response.status === 401 && !keyToUse) {
          // Allow parsing public models
        } else {
          return;
        }
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const formattedModels = data.data.map((model: any) => {
          // Determine the base name first
          let baseName = model.name || model.id.split("/").pop() || model.id;

          // Clean the name: remove "(free)" suffix, case-insensitive, handling potential spaces
          const cleanedName = baseName.replace(/\s*\(free\)\s*$/i, '').trim();

          // Determine if it's free based on multiple criteria
          const isActuallyFree = Boolean(
            (model.pricing?.prompt === "0" && model.pricing?.completion === "0") ||
            model.id.endsWith(":free") ||
            baseName.toLowerCase().includes("(free)") // Check original name too
          );

          return {
            id: model.id,
            name: cleanedName, // Use the cleaned name
            provider: model.id.split("/")[0] || "Unknown",
            isFree: isActuallyFree, // Use the determined free status
          };
        });

        set({ models: formattedModels });

        const { selectedModel } = get();
        const currentModelExists = formattedModels.some((m: Model) => m.id === selectedModel);
        
        if ((!selectedModel || !currentModelExists) && formattedModels.length > 0) {
          const preferredFreeModelId = "deepseek/deepseek-chat-v3-0324:free";
          const preferredModel = formattedModels.find((m: Model) => m.id === preferredFreeModelId);
          const firstFreeModel = formattedModels.find((m: Model) => m.isFree);
          const firstModel = formattedModels[0];

          if (preferredModel) set({ selectedModel: preferredModel.id });
          else if (firstFreeModel) set({ selectedModel: firstFreeModel.id });
          else if (firstModel) set({ selectedModel: firstModel.id });
        } else if (selectedModel && !currentModelExists) {
          set({ selectedModel: "" });
        }

      } else {
        console.error("Invalid models data format:", data);
        set({ 
          error: "Invalid response format from OpenRouter API",
          models: [],
          selectedModel: ""
        });
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      set({ 
        error: `Failed to fetch models: ${err instanceof Error ? err.message : "Unknown error"}`,
        models: [],
        selectedModel: ""
      });
    } finally {
      set({ isLoading: false });
    }
  },
  
  toggleSettings: () => {
    set((state) => ({ settingsOpen: !state.settingsOpen }));
  },
  
  // Derived state
  getFilteredModels: () => {
    const { models, showFreeOnly } = get();
    return showFreeOnly ? models.filter((model) => model.isFree) : models;
  }
})); 
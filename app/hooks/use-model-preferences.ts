'use client';

import { useMutation } from 'convex/react';
import { useCallback, useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../providers/user-provider';

export function useModelPreferences() {
  const { user } = useUser();
  const updateUserProfile = useMutation(api.users.updateUserProfile);

  const favoriteModels = useMemo(
    () => user?.favoriteModels ?? [],
    [user?.favoriteModels]
  );

  const toggleFavoriteModel = useCallback(
    async (modelId: string) => {
      if (!user) {
        return;
      }

      const currentFavorites = user.favoriteModels ?? [];
      const isFavorite = currentFavorites.includes(modelId);

      // Prevent removing the last favorite model
      if (isFavorite && currentFavorites.length <= 1) {
        return;
      }

      let newFavorites: string[];
      let newDisabled = user.disabledModels ?? [];

      if (isFavorite) {
        // Remove from favorites
        newFavorites = currentFavorites.filter((id) => id !== modelId);
      } else {
        // Add to favorites and ensure it's enabled
        newFavorites = [...currentFavorites, modelId];
        // Remove from disabled models if it was disabled
        newDisabled = newDisabled.filter((id) => id !== modelId);
      }

      await updateUserProfile({
        updates: {
          favoriteModels: newFavorites,
          disabledModels: newDisabled,
        },
      });
    },
    [user, updateUserProfile]
  );

  return {
    favoriteModels,
    toggleFavoriteModel,
  };
}

"use client"

// Use a more specific path if lib is moved later
import { API_ROUTE_CSRF } from "@/lib/routes"
import { useEffect } from "react"

export function LayoutClient() {
  useEffect(() => {
    // Fetch CSRF token on initial client load
    // We don't need the response, just triggering the GET request
    // to set the cookie.
    fetch(API_ROUTE_CSRF).catch(error => {
      console.error("Failed to fetch initial CSRF token:", error);
      // Handle error appropriately, maybe show a notification to the user
    });
  }, []) // Empty dependency array ensures this runs only once on mount

  return null // This component doesn't render anything visible
}

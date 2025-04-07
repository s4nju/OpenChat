// lib/fetch.ts

/**
 * Helper function to get a cookie value by name from the browser's document.cookie
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or null if not found or not in a browser environment
 */
function getCookie(name: string): string | null {
  // Return null if not in a browser environment
  if (typeof document === 'undefined') {
    console.warn("getCookie called in a non-browser environment.");
    return null;
  }

  // Simple cookie parsing logic
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    // Get the value part and remove any trailing semicolon and value
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * A wrapper around the native fetch function that automatically adds the
 * CSRF token header ('x-csrf-token') for POST, PUT, and DELETE requests,
 * reading the token value from the 'csrf_token' cookie.
 *
 * @param input - The resource that you wish to fetch. This can either be a string or a URL object.
 * @param init - An object containing any custom settings that you want to apply to the request.
 * @returns A Promise that resolves to the Response to that request.
 */
export async function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase();
  // Create a Headers object from init.headers, or an empty one
  const headers = new Headers(init?.headers);

  // Add CSRF token for relevant methods
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const encodedCsrfToken = getCookie('csrf_token'); // Might be URL encoded
    if (encodedCsrfToken) {
      const decodedCsrfToken = decodeURIComponent(encodedCsrfToken); // Decode the token
      headers.set('x-csrf-token', decodedCsrfToken); // Set the decoded token in the header
    } else {
      // Log a warning if the cookie is missing, as the request will likely fail
      console.warn(`CSRF token cookie ('csrf_token') not found for ${method} request to ${input}. Request might be rejected.`);
      // Depending on requirements, you might want to throw an error here instead
      // throw new Error("CSRF token cookie not found. Cannot proceed with the request.");
    }
  }

  // Ensure Content-Type is set to application/json by default for POST/PUT
  // if a body is present and Content-Type wasn't explicitly set.
  if ((method === 'POST' || method === 'PUT') && init?.body && !headers.has('Content-Type')) {
     headers.set('Content-Type', 'application/json');
  }

  // Create the updated init object with the potentially modified headers
  const updatedInit: RequestInit = {
    ...init,
    headers: headers, // Assign the Headers object back
  };

  // Perform the actual fetch call
  return fetch(input, updatedInit);
}

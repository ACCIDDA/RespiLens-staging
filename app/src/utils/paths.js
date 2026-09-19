export const getDataPath = (path) => {
  const baseUrl = import.meta.env.BASE_URL || "";
  // Remove trailing slash from baseUrl if it exists
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/processed_data/${path}`;
};

export const fetchJson = async (url, errorMessage) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      errorMessage ||
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
};

// Configuration utility to determine backend URL based on frontend URL
const getBackendUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Get current window location
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Determine backend port and path
  const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
  
  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${backendPort}`;
  }
  
  // For network access (same host, different port)
  return `${protocol}//${hostname}:${backendPort}`;
};

const getApiUrl = () => {
  return `${getBackendUrl()}/api`;
};

const getSocketUrl = () => {
  return getBackendUrl();
};

export { getBackendUrl, getApiUrl, getSocketUrl };
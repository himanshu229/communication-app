import { getBackendUrl } from './urls';

// Function to check and prompt user to accept backend SSL certificate
export const checkAndAcceptBackendSSL = async () => {
  const backendUrl = getBackendUrl();
  
  // Only check for HTTPS backends
  if (!backendUrl.startsWith('https://')) {
    return true;
  }

  try {
    // Try a simple fetch to the backend
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.log('SSL certificate issue with backend:', error);
    
    // Show user instructions to accept certificate
    const message = `
🔒 SSL Certificate Required

To enable video calling with camera access, you need to accept the SSL certificate for the backend server.

Please:
1. Open a new tab and navigate to: ${backendUrl}
2. Click "Advanced" and then "Proceed to localhost (unsafe)"
3. Come back to this tab and refresh the page

This is required for HTTPS camera access on network devices.
    `;
    
    alert(message);
    
    // Open the backend URL in a new tab to help user accept certificate
    window.open(backendUrl, '_blank');
    
    return false;
  }
};

// Function to create a health check endpoint response for testing
export const createHealthCheckResponse = () => {
  return {
    status: 'ok',
    message: 'Backend SSL certificate accepted',
    timestamp: new Date().toISOString()
  };
};
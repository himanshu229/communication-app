import CryptoJS from 'crypto-js';

// Generate a random encryption key (in production, this should be derived from user credentials)
const ENCRYPTION_KEY = 'pkjsamdfe@)(&NJJIH^JHG%BVGH!NBLK$qjuayiuzo+_){}asdf:qazdf">nasuifqpower';

export const encryptMessage = (message) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Fallback to plain text if encryption fails
  }
};

export const decryptMessage = (encryptedMessage) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedMessage; // Fallback if decryption fails
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedMessage; // Fallback to encrypted text if decryption fails
  }
};

export const generateRoomKey = (participants) => {
  // Generate a unique key based on participants
  const sortedParticipants = [...participants].sort();
  return CryptoJS.SHA256(sortedParticipants.join('')).toString();
};
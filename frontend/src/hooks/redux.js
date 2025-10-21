import { useSelector, useDispatch } from 'react-redux';

// Custom hooks for Redux state and dispatch
export const useAppSelector = useSelector;
export const useAppDispatch = () => useDispatch();

// Specific selector hooks for different slices
export const useAuth = () => useAppSelector((state) => state.auth);
export const useUsers = () => useAppSelector((state) => state.users);
export const useChat = () => useAppSelector((state) => state.chat);
export const useMessages = () => useAppSelector((state) => state.messages);

// Combined selector hooks for common use cases
export const useAuthUser = () => useAppSelector((state) => state.auth.user);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
export const useAuthLoading = () => useAppSelector((state) => state.auth.loading);

export const useUsersList = () => useAppSelector((state) => state.users.usersList);
export const useOnlineUsers = () => useAppSelector((state) => state.users.onlineUsers);

export const useCurrentRoom = () => useAppSelector((state) => state.chat.currentRoom);
export const useSelectedUser = () => useAppSelector((state) => state.chat.selectedUser);
export const useTypingUsers = () => useAppSelector((state) => state.chat.typingUsers);

export const useCurrentRoomMessages = () => useAppSelector((state) => state.messages.currentRoomMessages);
export const useMessagesSending = () => useAppSelector((state) => state.messages.sending);
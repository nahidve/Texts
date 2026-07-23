# Frontend Design & User Flow

This document outlines the frontend architecture, state management, and user flows for the application.

## 1. Application Overview
The application is a real-time messaging platform (similar to Telegram) featuring one-to-one text messaging, online status tracking, and WebRTC-based one-to-one voice and video calling. 

- **Framework**: React (Vite)
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Real-time Communication**: Socket.io (Signaling) & WebRTC (Media)

---

## 2. User Flows

### Authentication Flow
1. **Unauthenticated State**: 
   - Users land on the `/login` or `/signup` page.
   - Successful auth stores the user token (via HTTP-only cookies in backend) and updates `authUser` in the store.
2. **Authenticated State**: 
   - Users are redirected to the Home (`/`) page.
   - The application immediately connects to the WebSocket server using the authenticated user's ID.

### Messaging Flow
1. **Sidebar**: Displays a list of all users. Users with active WebSocket connections show a green "Online" indicator.
2. **Chat Selection**: Clicking a user sets the `selectedUser` in `useChatStore`.
3. **Chat Container**: 
   - Fetches historical messages from the REST API.
   - Listens for real-time `newMessage` events via Socket.io.
   - Displays a split view: incoming messages on the left, outgoing on the right.

### Calling Flow (Voice & Video)
1. **Initiation**: User clicks the Phone or Video icon in the `ChatHeader`. 
   - Triggers `initiateCall()` in `useCallStore`.
   - The UI overlays a "Calling..." screen.
2. **Incoming**: The recipient receives a `CALL_INCOMING` socket event.
   - The global `<CallUI />` component mounts, showing a ringing popup with Accept/Reject buttons.
3. **Connection**: 
   - If accepted, the `WebRTCManager` negotiates an SDP offer/answer exchange via WebSockets.
   - ICE candidates are exchanged to establish a peer-to-peer connection.
   - `<CallUI />` transitions to the `connected` state, rendering audio/video streams.

---

## 3. State Management (Zustand Stores)

The application uses modular Zustand stores to separate concerns:

### `useAuthStore.ts`
- **Responsibilities**: User authentication status, profile updates, and global Socket.io connection.
- **Key State**: `authUser`, `onlineUsers`, `socket`.

### `useChatStore.ts`
- **Responsibilities**: Managing chat history and message interactions.
- **Key State**: `messages`, `users`, `selectedUser`.
- **Key Actions**: `sendMessage`, `getMessages`, `subscribeToMessages`.

### `useCallStore.ts`
- **Responsibilities**: Managing the lifecycle and UI state of voice/video calls.
- **Key State**: 
  - `callState`: `'idle' | 'calling' | 'ringing' | 'incoming' | 'connected'`
  - `localStream` & `remoteStream`: MediaStream objects for WebRTC.
- **Key Actions**: `initiateCall`, `acceptCall`, `rejectCall`, `endCall`.

### `useThemeStore.ts`
- **Responsibilities**: Handling dynamic UI themes.
- **Key State**: `theme` (synced with `localStorage` and DaisyUI `data-theme` attribute).

---

## 4. Component Architecture

### Global Layout
- **`App.tsx`**: The root component. Handles routing, theme initialization, global authentication checks, and renders global overlays (e.g., `<Toaster />`, `<CallUI />`).
- **`Navbar.tsx`**: Persistent top navigation with links to Settings, Profile, and Logout.

### Pages
- **`HomePage.tsx`**: The main interface layout containing the `Sidebar` and `ChatContainer`.
- **`SettingsPage.tsx`**: Theme selection interface.
- **`ProfilePage.tsx`**: User profile management (avatar uploads).

### Chat Components
- **`Sidebar.tsx`**: Renders the user list and online indicators.
- **`ChatContainer.tsx`**: The main chat window. Combines `ChatHeader`, `MessageList`, and `MessageInput`.
- **`ChatHeader.tsx`**: Displays the selected user's info, online status, and Call buttons.
- **`MessageInput.tsx`**: Input field for text and image attachments.

### Call Components
- **`CallUI.tsx`**: A global overlay component that listens to `useCallStore`. It dynamically renders the Incoming, Outgoing, and Connected call screens to ensure calls persist even if the user navigates between routes.

---

## 5. Network Architecture

- **REST API**: Used for authentication, fetching user lists, fetching chat history, and updating profiles.
- **WebSockets (Socket.io)**: Used for real-time lightweight events (typing indicators, new messages, online status, and WebRTC signaling).
- **WebRTC (Peer-to-Peer)**: Used exclusively for transmitting heavy media streams (audio and video) directly between clients to minimize server bandwidth.

# End-to-End Encryption (E2EE) Roadmap

Implementing End-to-End Encryption means that **only the communicating users can read the messages or access the media**. The server (your Node.js backend) will only act as a delivery mechanism for scrambled, unreadable data.

Here is a conceptual roadmap on how you can start building this into your application.

---

## 1. Text Chats (Messages)

For text messages, you need to implement **Asymmetric Cryptography** (Public/Private Key pairs).

### The Core Concept
1. **Key Generation**: When a user registers or logs in on a new device, their frontend (React) generates a pair of cryptographic keys: a **Public Key** and a **Private Key**.
2. **Key Distribution**: 
   - The **Public Key** is sent to your backend and saved in the MongoDB database alongside the user's profile.
   - The **Private Key** never leaves the user's device. It is stored securely in the browser (e.g., using `IndexedDB` or `localStorage`).
3. **Sending a Message**:
   - When User A wants to message User B, User A's frontend asks the backend for User B's Public Key.
   - User A's frontend encrypts the text message using User B's Public Key.
   - The encrypted gibberish is sent to your Node.js server, which saves it to MongoDB and forwards it via Socket.io to User B.
4. **Receiving a Message**:
   - User B receives the encrypted gibberish.
   - User B's frontend uses their own **Private Key** to decrypt the message back into readable text.

### Recommended Libraries
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)**: Built directly into modern browsers. Highly secure and doesn't require massive external libraries.
- **[libsignal-protocol-javascript](https://github.com/signalapp/libsignal-protocol-javascript)**: The gold standard for modern messaging (used by WhatsApp and Signal). It handles advanced features like "Perfect Forward Secrecy" (generating new keys for every single message so that if one key is compromised, past messages are still safe).

---

## 2. Voice and Video Calls

The standard technology for building voice and video calls in browsers is **WebRTC**.

### The Core Concept
WebRTC is inherently a Peer-to-Peer (P2P) technology. By default, when User A and User B establish a direct WebRTC connection, **the media stream is already End-to-End Encrypted** using DTLS and SRTP protocols.

However, the challenge arises when you add group calls or want to optimize bandwidth using a media server (SFU - Selective Forwarding Unit). 
- If you use a simple P2P WebRTC architecture, E2EE is handled for you automatically!
- If you use an SFU (like mediasoup, Janus, or LiveKit) for group calls, the media is decrypted at the server and re-encrypted. To maintain true E2EE here, you must use **WebRTC Insertable Streams**.

### How to Start
1. **Start with standard P2P WebRTC**: Build 1-on-1 calls using raw WebRTC and Socket.io for "signaling" (the process of exchanging connection details between peers). Because it's direct peer-to-peer, the browser encrypts it end-to-end automatically.
2. **WebRTC Insertable Streams (Advanced)**: If you eventually build group calls using a server-side media router, you will use the WebRTC Insertable Streams API. This allows the frontend to apply a second layer of encryption to the video frames *before* they are sent to the server, and the receiving frontend decrypts them.

---

## 3. The Backend's Role

Once you implement E2EE, your backend's responsibilities shift slightly:
- It becomes completely "blind" to message content.
- `Message.text` in MongoDB will no longer be `"Hello World"`, it will be a base64 string like `"U2FsdGVkX1+vX3..."`
- You can no longer implement server-side search (e.g., searching chat history) or server-side content moderation. All searching must happen on the frontend using decrypted local data.

## Your Next Steps
To get started, don't dive into WebRTC just yet. Start small:
1. Research the **Web Crypto API**.
2. Write a small script in your React app that generates an RSA Key Pair when the app loads.
3. Try encrypting a string with the public key and decrypting it with the private key locally in the browser console.
4. Once you understand that flow, update your MongoDB User schema to accept a `publicKey` string.

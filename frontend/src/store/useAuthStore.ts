import { create } from 'zustand'
import { axiosInstance } from '../lib/axios'
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5001' : import.meta.env.VITE_API_URL;


type AuthStore = {
  authUser: any; // or a specific user type if you have one
  isCheckingAuth: boolean; //loading state
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  checkAuth: () => Promise<void>;
  signUp: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  login: (data: any) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  onlineUsers: any[];
  socket: any;
  connectSocket: () => void;
  disconnectSocket: () => void;

};

export const useAuthStore = create<AuthStore>((set,get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => { //this is a function that checks if the user is authenticated present  in backend
    try { //CONNECTING FRONTEND TO BACKEND
        const res = await axiosInstance.get('/auth/check') //refreshes the user data to check if the user is logged in or not
        set({ authUser: res.data })
        get().connectSocket()
    } catch (error) {
        console.log("Error in checkAuth", error);
        set({ authUser: null })
    } finally{
        set({ isCheckingAuth: false })
    }
  },

  //SIGNUP FUNCTION
  signUp: async (data: any) => {
    set({ isSigningUp: true })
    try {
        const res = await axiosInstance.post('/auth/signup', data) //sending data to backend for signup
        set({authUser: res.data})
        toast.success("Account created successfully")
        
        get().connectSocket()
    } catch (error) {
        toast.error((error as any).response.data.message)
        console.log("Error in signUp", error)
    } finally {
        set({ isSigningUp: false })
    }
  },

  //LOGIN FUNCTION
  login: async (data: any) => {
    set({ isLoggingIn: true })
    try {
        const res = await axiosInstance.post('/auth/login', data)
        set({authUser: res.data})
        toast.success("Logged in successfully")
        get().connectSocket()
    } catch (error) {
        toast.error((error as any).response.data.message)
        console.log("Error in login", error)
    } finally {
        set({ isLoggingIn: false })
    }
  },

  //LOGOUT FUNCTION
  logout: async () => {
    try {
        await axiosInstance.post('/auth/logout')
        set({authUser: null})
        toast.success("Logged out successfully")
        get().disconnectSocket()
    } catch (error) {
        console.log("Error in logout", error)
        toast.error((error as any).response.data.message)
    }
  },

  //UPDATE PROFILE FUNCTION
  updateProfile: async (data: any) => {
    set({ isUpdatingProfile: true })
    try {
        const res = await axiosInstance.put('/auth/update-profile', data)
        set({authUser: res.data})
        toast.success("Profile updated successfully")
    } catch (error) {
        console.log("Error in updateProfile", error)
        toast.error((error as any).response.data.message)
    } finally {
        set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();
    set({ socket }); //Save the socket instance in the store

    socket.on("getOnlineUsers", (userIds: any) => {
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    if(get().socket?.connected) get().socket.disconnect()
  },
}));
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

interface AuthState {
  authUser: any; // Substitua `any` pelo tipo correto para `authUser`
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  checkAuth: () => Promise<void>; // Tipo da função `checkAuth`
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  login: (data: any) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  onlineUsers: any[];
  socket: any;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (err) {
      console.log(err);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      console.log(res);
      toast.success("Account created successfully");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        toast.error(err.response.data.error);
      } else {
        toast.error("An unexpected error occurred");
      }
      console.log(err);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      console.log(res);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        toast.error(err.response.data.error);
      } else {
        toast.error("An unexpected error occurred");
      }
      console.log(err);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      toast.success("Logged out successfully");
      set({ authUser: null });
      get().disconnectSocket();
    } catch (err) {
      console.log(err);
      toast.error("An unexpected error occurred");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const { authUser } = get();

      const userId = authUser.id;

      const res = await axiosInstance.put(
        `/auth/update-profile/${userId}`,
        data
      );
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.log("error in update profile:", err);
      if (err instanceof AxiosError && err.response) {
        toast.error(err.response.data.error);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io("http://localhost:5001", {
      query: {
        userId: authUser.id,
      },
    });
    socket.connect();
    set({ socket: socket });

    socket.on("getOnlineUsers", (usersId: string[]) => {
      set({ onlineUsers: usersId });
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));

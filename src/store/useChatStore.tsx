import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

interface UseChatStoreProps {
	messages: any[];
	users: any[];
	selectedUser: any;
	isUsersLoading: boolean;
	isMessagesLoading: boolean;
	getUsers: () => Promise<void>;
	getMessages: (userId: string) => Promise<void>;
	setSelectedUser: (userId: string) => void;
	sendMessages: (messageData: {
		text: string;
		image: string | null;
	}) => Promise<void>;
	subscribeToMessages: () => void;
	unsubscribeToMessages: () => void;
}

export const useChatStore = create<UseChatStoreProps>((set, get) => ({
	messages: [],
	users: [],
	selectedUser: null,
	isUsersLoading: false,
	isMessagesLoading: false,

	getUsers: async () => {
		set({ isUsersLoading: true });

		try {
			const res = await axiosInstance.get("/messages/users");
			set({ users: res.data });
		} catch (err) {
			if (err instanceof AxiosError && err.response) {
				toast.error(err.response.data.error);
			} else {
				toast.error("An unexpected error occurred");
			}
		} finally {
			set({ isUsersLoading: false });
		}
	},

	getMessages: async (userId: string) => {
		set({ isMessagesLoading: true });

		try {
			const res = await axiosInstance.get(`/messages/${userId}`);
			set({ messages: res.data });
		} catch (err) {
			if (err instanceof AxiosError && err.response) {
				toast.error(err.response.data.error);
			} else {
				toast.error("An unexpected error occurred");
			}
		} finally {
			set({ isMessagesLoading: false });
		}
	},

	sendMessages: async (messageData) => {
		const { selectedUser, messages } = get();
		try {
			const res = await axiosInstance.post(
				`/messages/send/${selectedUser._id}`,
				messageData,
			);
			set({ messages: [...messages, res.data] });
		} catch (err) {
			if (err instanceof AxiosError && err.response) {
				toast.error(err.response.data.error);
			} else {
				toast.error("An unexpected error occurred");
			}
		}
	},

	subscribeToMessages: () => {
		const { selectedUser } = get();
		if (!selectedUser) return;

		const socket = useAuthStore.getState().socket;

		socket.on("newMessage", (newMessage) => {
			const isMessageSenteFromSelectedUser =
				newMessage.senderId === selectedUser._id;
			if (!isMessageSenteFromSelectedUser) return;
			set({
				messages: [...get().messages, newMessage],
			});
		});
	},

	unsubscribeToMessages: () => {
		const socket = useAuthStore.getState().socket;
		socket.off("newMessage");
	},

	setSelectedUser: (selectedUser) => set({ selectedUser }),
}));

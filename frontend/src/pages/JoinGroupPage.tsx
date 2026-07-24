import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";

const JoinGroupPage = () => {
  const { link } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { getGroups } = useChatStore();
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) {
      // Will be redirected by protected route wrapper, but just in case
      return;
    }

    const joinGroup = async () => {
      try {
        await axiosInstance.post(`/groups/join/${link}`);
        toast.success("Successfully joined the group!");
        await getGroups(); // Refresh groups list
        navigate("/"); // Go to home page where the new group will be in the sidebar
      } catch (error: any) {
        console.error("Error joining group:", error);
        setError(error.response?.data?.message || "Failed to join group.");
        toast.error(error.response?.data?.message || "Failed to join group.");
      } finally {
        setIsJoining(false);
      }
    };

    if (link) {
      joinGroup();
    }
  }, [link, authUser, navigate, getGroups]);

  if (!authUser) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen items-center justify-center bg-[#313338]">
      <div className="bg-[#2b2d31] p-8 rounded-xl shadow-lg flex flex-col items-center max-w-sm w-full text-center">
        {isJoining ? (
          <>
            <span className="loading loading-spinner loading-lg text-discord-blurple mb-4"></span>
            <h2 className="text-xl font-bold text-white mb-2">Joining Group...</h2>
            <p className="text-discord-ink/70">Please wait while we add you to the group.</p>
          </>
        ) : error ? (
          <>
            <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <span className="text-red-400 text-3xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
            <p className="text-discord-ink/70 mb-6">{error}</p>
            <button onClick={() => navigate("/")} className="btn w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white border-none">
              Return Home
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default JoinGroupPage;

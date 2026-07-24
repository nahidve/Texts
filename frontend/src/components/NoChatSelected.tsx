import { MessageSquare, Heart, Sparkles, Send } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center h-full relative overflow-hidden bg-base-100/50">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-0"></div>
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-accent/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 z-0"></div>

      {/* Floating Elements in Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Heart className="absolute top-[20%] left-[20%] text-pink-500/30 w-12 h-12 animate-float-slow" />
        <Sparkles className="absolute top-[30%] right-[25%] text-yellow-500/30 w-10 h-10 animate-float-medium delay-100" />
        <Send className="absolute bottom-[25%] right-[20%] text-primary/30 w-14 h-14 animate-float-slow delay-300 transform -rotate-45" />
      </div>

      <div className="relative z-10 w-full max-w-xl px-6 text-center animate-fade-in-up">
        {/* Central Icon */}
        <div className="flex justify-center mb-10">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative bg-base-100 ring-1 ring-base-300 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transform transition-transform duration-500 group-hover:scale-110">
              <MessageSquare className="w-16 h-16 text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary drop-shadow-sm" style={{ stroke: 'url(#gradient)' }} />
              <svg width="0" height="0">
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop stopColor="var(--fallback-p,oklch(var(--p)/1))" offset="0%" />
                  <stop stopColor="var(--fallback-s,oklch(var(--s)/1))" offset="100%" />
                </linearGradient>
              </svg>
            </div>
            
            {/* Notification Badge on the Icon */}
            <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-base-100 animate-bounce"></div>
          </div>
        </div>

        {/* Text Content */}
        <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-6 tracking-tight drop-shadow-sm">
          Welcome to Texts
        </h2>
        <p className="text-base-content/70 text-lg font-medium max-w-md mx-auto leading-relaxed">
          Connect with your friends, share stories, and start conversations. Select a chat from the sidebar to begin.
        </p>

        {/* Call to action hint */}
        <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-base-200/50 border border-base-300 shadow-sm backdrop-blur-sm animate-pulse-slow">
          <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>
          <span className="text-sm font-semibold text-base-content/80">You're online and ready to chat!</span>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-10deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 4s ease-in-out infinite;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default NoChatSelected;
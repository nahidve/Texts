import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { Send, Palette, Eye, Sparkles, Settings as SettingsIcon, Bell, Volume2, AtSign } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
  { id: 3, content: "That sounds amazing! Can't wait to see it.", isSent: false },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { soundEnabled, pushEnabled, mentionsOnly, toggleSound, togglePush, toggleMentionsOnly } = useNotificationStore();

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-base-200/50 via-base-100 to-base-200/50">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm">
              <SettingsIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-base-content to-base-content/80 bg-clip-text text-transparent mb-3">
            Settings
          </h1>
          <p className="text-lg text-base-content/70 max-w-md mx-auto">
            Customize your chat experience with themes and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Theme Selection Section */}
          <div className="space-y-8">
            <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-base-content">Theme Selection</h2>
              </div>
              
              <p className="text-base-content/70 mb-6">
                Choose a theme that matches your style and mood
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    className={`
                      group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300
                      ${theme === t 
                        ? "bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/50 shadow-lg scale-105" 
                        : "bg-base-200/50 hover:bg-base-200 hover:scale-105 hover:shadow-md border-2 border-transparent"
                      }
                    `}
                    onClick={() => setTheme(t)}
                  >
                    <div className="relative h-12 w-full rounded-xl overflow-hidden shadow-md" data-theme={t}>
                      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2">
                        <div className="rounded-lg bg-primary shadow-sm"></div>
                        <div className="rounded-lg bg-secondary shadow-sm"></div>
                        <div className="rounded-lg bg-accent shadow-sm"></div>
                        <div className="rounded-lg bg-neutral shadow-sm"></div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${
                      theme === t ? "text-primary" : "text-base-content/70"
                    }`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                    {theme === t && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-8">
            <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-success/20 to-info/20">
                  <Eye className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-base-content">Live Preview</h2>
              </div>
              
              <p className="text-base-content/70 mb-6">
                See how your selected theme looks in action
              </p>

              <div className="rounded-2xl border border-base-300/50 overflow-hidden bg-base-100 shadow-lg">
                <div className="p-6 bg-gradient-to-r from-base-200/50 to-base-300/50">
                  <div className="max-w-lg mx-auto">
                    {/* Enhanced Mock Chat UI */}
                    <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden border border-base-300/50">
                      {/* Chat Header */}
                      <div className="px-6 py-4 border-b border-base-300/50 bg-base-100/90 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-primary-content font-semibold shadow-md">
                              J
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-base-100 shadow-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base-content">John Doe</h3>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                              <p className="text-sm text-success font-medium">Online</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="p-6 space-y-4 min-h-[240px] max-h-[240px] overflow-y-auto bg-base-100">
                        {PREVIEW_MESSAGES.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isSent ? "justify-end" : "justify-start"} animate-fade-in-up`}
                          >
                            <div
                              className={`
                                max-w-[80%] rounded-2xl p-4 shadow-md border border-base-300/30
                                ${message.isSent 
                                  ? "bg-primary text-primary-content" 
                                  : "bg-base-200/80 backdrop-blur-sm"
                                }
                              `}
                            >
                              <p className="text-sm font-medium">{message.content}</p>
                              <p
                                className={`
                                  text-xs mt-2 font-medium
                                  ${message.isSent ? "text-primary-content/80" : "text-base-content/60"}
                                `}
                              >
                                12:00 PM
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chat Input */}
                      <div className="p-6 border-t border-base-300/50 bg-base-100/90 backdrop-blur-sm">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            className="input input-bordered flex-1 h-12 rounded-xl border-base-300/50 bg-base-200/50 backdrop-blur-sm"
                            placeholder="Type a message..."
                            value="This is a preview"
                            readOnly
                          />
                          <button className="btn btn-primary h-12 min-h-0 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mt-12">
          <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-base-content">Notifications</h2>
            </div>
            
            <p className="text-base-content/70 mb-6">
              Control how you are alerted about new messages.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Push Notifications Toggle */}
              <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300/30 flex items-center justify-between transition-all hover:bg-base-200 cursor-pointer" onClick={togglePush}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base-content">Desktop Push</h3>
                    <p className="text-xs text-base-content/70">Show browser popups</p>
                  </div>
                </div>
                <input type="checkbox" className="toggle toggle-primary" checked={pushEnabled} readOnly />
              </div>

              {/* Sound Notifications Toggle */}
              <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300/30 flex items-center justify-between transition-all hover:bg-base-200 cursor-pointer" onClick={toggleSound}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base-content">Sound Effects</h3>
                    <p className="text-xs text-base-content/70">Play a pop sound</p>
                  </div>
                </div>
                <input type="checkbox" className="toggle toggle-success" checked={soundEnabled} readOnly />
              </div>

              {/* Mentions Only Toggle */}
              <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300/30 flex items-center justify-between transition-all hover:bg-base-200 cursor-pointer" onClick={toggleMentionsOnly}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <AtSign className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base-content">Mentions Only</h3>
                    <p className="text-xs text-base-content/70">Only notify on @</p>
                  </div>
                </div>
                <input type="checkbox" className="toggle toggle-secondary" checked={mentionsOnly} readOnly />
              </div>

            </div>
          </div>
        </div>

        {/* Additional Settings Section */}
        <div className="mt-12">
          <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-r from-warning/20 to-error/20">
                <Sparkles className="w-5 h-5 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-base-content">Coming Soon</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">

              
              <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <div className="w-4 h-4 bg-secondary rounded" />
                  </div>
                  <h3 className="font-semibold text-base-content">Privacy</h3>
                </div>
                <p className="text-sm text-base-content/70">Manage your privacy and security settings</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <div className="w-4 h-4 bg-accent rounded" />
                  </div>
                  <h3 className="font-semibold text-base-content">Accessibility</h3>
                </div>
                <p className="text-sm text-base-content/70">Adjust font sizes and contrast settings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animations */}
        <style>{`
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SettingsPage;
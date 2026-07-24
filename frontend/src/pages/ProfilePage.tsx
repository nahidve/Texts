import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Calendar, Shield, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result as string;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-base-200/50 via-base-100 to-base-200/50">
      <div className="max-w-4xl mx-auto p-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-base-content to-base-content/80 bg-clip-text text-transparent mb-3">
            Profile Settings
          </h1>
          <p className="text-lg text-base-content/70 max-w-md mx-auto">
            Manage your account information and personalize your experience
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
              <div className="text-center space-y-6">
                <h2 className="text-xl font-semibold text-base-content">Profile Picture</h2>
                
                {/* Enhanced Avatar */}
                <div className="relative group">
                  <div className="relative mx-auto">
                    <div className="size-40 rounded-3xl border-4 border-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 bg-gradient-to-br from-base-200 to-base-300 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
                      <img
                        src={selectedImg || authUser.profilePic || "/avatar.png"}
                        alt="Profile"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    
                    {/* Upload Button */}
                    <label
                      htmlFor="avatar-upload"
                      className={`
                        absolute -bottom-2 -right-2 
                        bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90
                        p-4 rounded-2xl cursor-pointer shadow-lg
                        transition-all duration-300 hover:scale-110 hover:shadow-xl
                        ${isUpdatingProfile ? "animate-pulse pointer-events-none opacity-70" : ""}
                      `}
                    >
                      <Camera className="w-6 h-6 text-white" />
                      <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUpdatingProfile}
                      />
                    </label>
                  </div>
                </div>

                {/* Status Message */}
                <div className="space-y-2">
                  <p className="text-sm text-base-content/60 font-medium">
                    {isUpdatingProfile ? "Uploading your photo..." : "Click the camera to update your photo"}
                  </p>
                  {isUpdatingProfile && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-base-content">Personal Information</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-base-content/70">
                    <User className="w-4 h-4" />
                    Full Name
                  </div>
                  <div className="px-6 py-4 bg-base-200/50 rounded-2xl border border-base-300/50 backdrop-blur-sm">
                    <p className="font-medium text-base-content">{authUser?.fullName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-base-content/70">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                  <div className="px-6 py-4 bg-base-200/50 rounded-2xl border border-base-300/50 backdrop-blur-sm">
                    <p className="font-medium text-base-content">{authUser?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-base-100/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-base-300/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-success/20 to-info/20">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-base-content">Account Information</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 px-6 bg-base-200/30 rounded-2xl border border-base-300/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-base-content/60" />
                    <span className="font-medium text-base-content">Member Since</span>
                  </div>
                  <span className="font-semibold text-base-content/80 bg-base-200/50 px-3 py-1 rounded-xl">
                    {authUser.createdAt?.split("T")[0]}
                  </span>
                </div>

                <div className="flex items-center justify-between py-4 px-6 bg-base-200/30 rounded-2xl border border-base-300/30">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-success" />
                    </div>
                    <span className="font-medium text-base-content">Account Status</span>
                  </div>
                  <span className="font-semibold text-success bg-success/10 px-4 py-1 rounded-xl border border-success/20">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .border-gradient-to-r {
          border-image: linear-gradient(to right, var(--tw-gradient-stops)) 1;
        }
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
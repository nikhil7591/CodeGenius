import React, { useState, useEffect } from "react";
import useLoginStore from "../../store/useLoginStore";
import * as yup from 'yup';
import { yupResolver } from "@hookform/resolvers/yup";
import useUserStore from "../../store/useUserStore";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/themeStore";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { FaWhatsapp, FaUser, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { sendOtp, verifyOtp, updateUserProfile } from "../../services/user.service";
import Spinner from "../../utils/Spinner";
import { toast } from "react-toastify";

// validation schema for email only
const loginValidationSchema = yup.object().shape({
    email: yup
        .string()
        .required("Email is required")
        .email("Please enter a valid email address")
});

const otpValidationSchema = yup.object().shape({
    otp: yup.string().length(6, "OTP must be exactly 6 digits").required("OTP is required")
});

const profileValidationSchema = yup.object().shape({
    username: yup.string().required("Username is required").min(3, "Username must be at least 3 characters"),
    agreed: yup.bool().oneOf([true], "You must agree to the terms")
});

const avatars = [
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
];

const Login = () => {
    const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } = useLoginStore();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [profilePicture, setProfilePicture] = useState(null);
    const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useUserStore();
    const { theme } = useThemeStore();

    const {
        register: loginRegister,
        handleSubmit: handleLoginSubmit,
        formState: { errors: loginErrors }
    } = useForm({
        resolver: yupResolver(loginValidationSchema)
    });

    const {
        register: profileRegister,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        watch
    } = useForm({
        resolver: yupResolver(profileValidationSchema)
    });

    // Clear error when component unmounts or step changes
    useEffect(() => {
        setError("");
    }, [step]);

    // onLoginSubmit handler - Email only
    const onLoginSubmit = async (data) => {
        try {
            setLoading(true);
            setError("");
            
            const response = await sendOtp(data.email);
            if (response.status === "success") {
                toast.info("OTP sent to your email");
                setUserPhoneData({ email: data.email });
                setStep(2);
            }
        } catch (error) {
            console.error("Error sending OTP:", error);
            setError(error.message || "Failed to send OTP");
            toast.error(error.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    // onOtpSubmit handler
    const onOtpSubmit = async () => {
        try {
            setLoading(true);
            setError("");
            
            if (!userPhoneData?.email) {
                throw new Error("Email data is missing");
            }
            
            const otpString = otp.join("");
            
            if (otpString.length !== 6) {
                throw new Error("Please enter complete 6-digit OTP");
            }

            console.log("Verifying OTP for email:", userPhoneData.email);
            const response = await verifyOtp(userPhoneData.email, otpString);
            console.log("OTP verification response:", response);
            
            if (response.status === "success") {
                toast.success("OTP verified successfully");
                const token = response.data?.token;
                
                // Store token in localStorage
                if (token) {
                    localStorage.setItem("auth_token", token);
                    console.log("Token stored in localStorage");
                }
                
                const user = response.data?.user;
                console.log("User data after OTP verification:", user);
                
                if (user) {
                    // Update auth state
                    setUser(user);
                    console.log("User set in store, navigating to home");
                    
                    toast.success("Welcome to IntelliChat!");
                    
                    // Reset and navigate
                    resetLoginState();
                    navigate("/", { replace: true });
                } else {
                    console.error("No user data in response");
                    throw new Error("User data missing in response");
                }
            } else {
                throw new Error(response.message || "OTP verification failed");
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            setError(error.message || "Failed to verify OTP");
            toast.error(error.message || "Failed to verify OTP");
        } finally {
            setLoading(false);
        }
    };

    // handleFileChange
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size should be less than 5MB");
                return;
            }
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file");
                return;
            }
            
            setProfilePictureFile(file);
            setProfilePicture(URL.createObjectURL(file));
            setSelectedAvatar(null); // Clear selected avatar when custom image is chosen
        }
    };

    // onProfileSubmit handler
    const onProfileSubmit = async (data) => {
        try {
            setLoading(true);
            setError("");
            
            const formData = new FormData();
            formData.append("username", data.username);
            formData.append("agreed", data.agreed);
            
            if (profilePictureFile) {
                formData.append("media", profilePictureFile);
            } else if (selectedAvatar) {
                formData.append("profilePicture", selectedAvatar);
            } else {
                throw new Error("Please select a profile picture");
            }
            
            await updateUserProfile(formData);
            toast.success("Profile created successfully! Welcome to IntelliChat");
            navigate("/");
            resetLoginState();
        } catch (error) {
            console.error("Error updating profile:", error);
            setError(error.message || "Failed to update user profile");
            toast.error(error.message || "Failed to update user profile");
        } finally {
            setLoading(false);
        }
    };

    // OTP handleChange
    const handleOtpChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d+$/.test(value)) {
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    // Handle backspace in OTP
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) {
                prevInput.focus();
            }
        }
    };

    // Progress bar 
    const ProgressBar = () => (
        <div className={`w-full ${theme === 'dark' ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2.5 mb-6`}>
            <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${(step / 3) * 100}%` }}
            />
        </div>
    );

    // Handle back button
    const handleBack = () => {
        setStep(1);
        setUserPhoneData(null);
        setOtp(["", "", "", "", "", ""]);
        setError("");
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? "bg-gray-900" : "bg-gradient-to-br from-green-400 to-blue-500"} flex items-center justify-center p-4 overflow-hidden`}>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
                >
                    <FaWhatsapp className="w-16 h-16 text-white" />
                </motion.div>
                
                <h1 className={`text-3xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                    IntelliChat Login
                </h1>

                <ProgressBar />
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* Step 1: Email Input Only */}
                {step === 1 && (
                    <form className="space-y-4" onSubmit={handleLoginSubmit(onLoginSubmit)}>
                        <p className={`text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-4`}>
                            Enter your email to receive an OTP
                        </p>

                        <div>
                            <div className={`flex items-center border rounded-lg px-3 py-2 ${theme === 'dark' ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} ${loginErrors.email ? "border-red-500" : ""}`}>
                                <FaUser className={`mr-2 ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`} />
                                <input 
                                    type="email"
                                    placeholder="Enter your email"
                                    {...loginRegister("email")}
                                    className={`w-full bg-transparent focus:outline-none ${theme === 'dark' ? "text-white placeholder-gray-400" : "text-black placeholder-gray-500"}`}
                                />
                            </div>
                            {loginErrors.email && (
                                <p className="text-red-500 text-sm mt-1">{loginErrors.email.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition font-semibold ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {loading ? <Spinner /> : "Send OTP"}
                        </button>
                    </form>
                )}

                {/* Step 2: Verify OTP */}
                {step === 2 && (
                    <form onSubmit={(e) => { e.preventDefault(); onOtpSubmit(); }} className="space-y-4">
                        <p className={`text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-4`}>
                            Please enter the 6-digit OTP sent to {userPhoneData?.email}
                        </p>
                        
                        <div className="flex justify-between gap-2">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className={`w-12 h-12 text-center text-lg font-bold border ${theme === 'dark' ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                                />
                            ))}
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition font-semibold ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {loading ? <Spinner /> : "Verify OTP"}
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleBack}
                            className={`w-full ${theme === 'dark' ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-900 hover:bg-gray-300"} py-3 rounded-lg transition flex items-center justify-center font-semibold`}
                        >
                            <FaArrowLeft className="mr-2" />
                            Wrong email? Go back
                        </button>
                    </form>
                )}

                {/* Step 3: Update Profile */}
                {step === 3 && (
                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="flex flex-col items-center mb-4">
                            <div className="relative w-24 h-24 mb-4">
                                <img 
                                    src={profilePicture || selectedAvatar} 
                                    alt="profile"
                                    className="w-full h-full rounded-full object-cover border-4 border-green-500"
                                />
                                <label
                                    htmlFor="profile-picture"
                                    className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-2 cursor-pointer hover:bg-green-600 transition duration-300 shadow-lg"
                                >
                                    <FaPlus className="w-4 h-4" />
                                </label>
                                <input 
                                    type="file" 
                                    id="profile-picture"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-2 font-medium`}>
                                Choose an Avatar
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {avatars.map((avatar, index) => (
                                    <img
                                        key={index}
                                        src={avatar}
                                        alt={`Avatar ${index + 1}`}
                                        className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 border-2 ${selectedAvatar === avatar && !profilePicture ? "border-green-500 ring-2 ring-green-500" : "border-gray-300"}`}
                                        onClick={() => {
                                            setSelectedAvatar(avatar);
                                            setProfilePicture(null);
                                            setProfilePictureFile(null);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <div className="relative">
                            <FaUser className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`} />
                            <input
                                type="text"
                                {...profileRegister("username")}
                                placeholder="Enter username"
                                className={`w-full pl-10 pr-3 py-3 border ${theme === 'dark' ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${profileErrors.username ? "border-red-500" : ""}`}
                            />
                            {profileErrors.username && (
                                <p className="text-red-500 text-sm mt-1">{profileErrors.username.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <input 
                                    type="checkbox"
                                    id="terms"
                                    {...profileRegister('agreed')}
                                    className="mt-1 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                                />
                                <label htmlFor="terms" className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    I agree to the <button type="button" className="text-green-500 hover:underline font-medium">Terms & Conditions</button> and <button type="button" className="text-green-500 hover:underline font-medium">Privacy Policy</button>
                                </label>
                            </div>
                            {profileErrors.agreed && (
                                <p className="text-red-500 text-sm">{profileErrors.agreed.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!watch('agreed') || loading}
                            className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center ${(!watch('agreed') || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {loading ? <Spinner /> : "Create Profile"}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default Login;
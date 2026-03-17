import { useState, useEffect } from "react";
import { getMe, getToken, updateProfile, type UserResponse } from "../api/auth";

export default function SettingsSection() {
    const [user, setUser] = useState<UserResponse | null>(null);

    useEffect(() => {
        const token = getToken();
        if (token) getMe(token).then(setUser).catch(() => {});
    }, []);

    const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "";
    const displayUsername = user?.username ?? "";
    const displayEmail = user?.email ?? "";
    const avatarLetter = (displayName || displayUsername || displayEmail || "U").charAt(0).toUpperCase();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name ?? "");
            setLastName(user.last_name ?? "");
        }
    }, [user]);

    const isDirty =
        firstName !== (user?.first_name ?? "") ||
        lastName !== (user?.last_name ?? "");

    async function handleSave() {
        const token = getToken();
        if (!token) { setSaveStatus("error"); setSaveError("Not authenticated."); return; }
        setSaving(true); setSaveStatus("idle"); setSaveError("");
        try {
            const updated = await updateProfile(token, {
                first_name: firstName.trim() || undefined,
                last_name: lastName.trim() || undefined,
            });
            setUser(updated);
            setSaveStatus("success");
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (err) {
            setSaveStatus("error");
            setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-10 pb-16">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-medium text-slate-300">Account Preferences</span>
                </div>
                <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[1.1]">
                    Settings & <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-500">
                        Authentication
                    </span>
                </h2>
                <p className="text-gray-400 mt-4 text-lg max-w-xl">
                    Manage your account details, security preferences, and personalize your StudyBuddy experience.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Profile Card */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Account Profile
                    </h3>

                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg border-4 border-slate-900">
                            {avatarLetter}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {displayName || displayUsername || "Scholar"}
                            </p>
                            {displayUsername && (
                                <p className="text-indigo-400 font-medium">@{displayUsername}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                            <div className="mt-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-400 flex items-center justify-between">
                                <span>{displayEmail || "No email provided"}</span>
                                <span className="text-[10px] text-gray-600 uppercase tracking-widest ml-3">read-only</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</label>
                            <input
                                type="text" value={firstName}
                                onChange={e => { setFirstName(e.target.value); setSaveStatus("idle"); }}
                                placeholder="Your first name"
                                className="mt-1 w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</label>
                            <input
                                type="text" value={lastName}
                                onChange={e => { setLastName(e.target.value); setSaveStatus("idle"); }}
                                placeholder="Your last name"
                                className="mt-1 w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-colors"
                            />
                        </div>

                        {saveStatus === "success" && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Profile saved successfully.
                            </div>
                        )}
                        {saveStatus === "error" && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {saveError}
                            </div>
                        )}

                        <button onClick={handleSave} disabled={!isDirty || saving}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : "Save Changes"}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Security Card */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex-1">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Authentication & Security
                        </h3>
                        <div className="space-y-6">
                            <div className="pt-4 border-t border-white/5">
                                <button disabled className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Change Password
                                </button>
                                <p className="text-xs text-center text-gray-500 mt-3">
                                    Password changes are currently managed by the administrator.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Study Preferences placeholder */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-lg relative overflow-hidden flex-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10" />
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Study Preferences
                        </h3>
                        <p className="text-sm text-indigo-200/80 mb-6">
                            Future updates will allow you to customize your daily goals and preferred study hours here.
                        </p>
                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                            <div>
                                <p className="text-white font-medium">Daily Goal</p>
                                <p className="text-xs text-gray-400">Target study minutes per day</p>
                            </div>
                            <div className="text-xl font-bold tracking-tight text-white">
                                —<span className="text-sm text-indigo-400 ml-1">min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

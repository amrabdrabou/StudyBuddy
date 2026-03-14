import type { MainDashboard } from "../api/dashboard";

interface SettingsSectionProps {
    dashMain: MainDashboard | null;
}

export default function SettingsSection({ dashMain }: SettingsSectionProps) {
    const user = dashMain?.user;

    return (
        <div className="flex flex-col gap-10 pb-16">
            {/* Header */}
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

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Account Profile Card */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl
                                shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Account Profile
                    </h3>

                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg border-4 border-slate-900">
                            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.username?.charAt(0).toUpperCase() || "U")}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{user?.full_name || "Scholar Worker"}</p>
                            <p className="text-indigo-400 font-medium">@{user?.username || "scholar"}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                            <div className="mt-1 px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white">
                                {user?.email || "No email provided"}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                            <div className="mt-1 px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white">
                                {user?.full_name || "Not set"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical Stack for smaller cards */}
                <div className="flex flex-col gap-6">

                    {/* Authentication & Security Card */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex-1">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Authentication & Security
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Login Provider</label>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium capitalize">
                                        {user?.auth_provider || "local"} Account
                                    </div>
                                    <span className="text-sm text-gray-400">Securely verified</span>
                                </div>
                            </div>

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

                    {/* Study Preferences Card (Read Only placeholder) */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-lg relative overflow-hidden flex-1">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>

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
                                45<span className="text-sm text-indigo-400 ml-1">min</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}


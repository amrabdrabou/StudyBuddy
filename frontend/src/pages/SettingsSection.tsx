import { useState, useEffect } from "react";
import { getMe, getToken, updateProfile, type UserResponse } from "../api/auth";

// ── tiny helpers ──────────────────────────────────────────────────────────────

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-600">{hint}</p>}
        </div>
    );
}

const inputCls =
    "mt-1 w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white " +
    "placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-colors";

const readOnlyCls =
    "mt-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-400 " +
    "flex items-center justify-between";

function SaveBar({
    dirty,
    saving,
    status,
    error,
    onSave,
}: {
    dirty: boolean;
    saving: boolean;
    status: "idle" | "success" | "error";
    error: string;
    onSave: () => void;
}) {
    return (
        <div className="space-y-3 pt-2">
            {status === "success" && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Saved successfully.
                </div>
            )}
            {status === "error" && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}
            <button
                onClick={onSave}
                disabled={!dirty || saving}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {saving ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving…
                    </>
                ) : (
                    "Save Changes"
                )}
            </button>
        </div>
    );
}

// ── main component ────────────────────────────────────────────────────────────

export default function SettingsSection() {
    const [user, setUser] = useState<UserResponse | null>(null);

    // profile fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    // study preference fields
    const [timezone, setTimezone] = useState("");
    const [goalMinutes, setGoalMinutes] = useState<string>("");
    const [preferredTime, setPreferredTime] = useState("");

    // save state — shared across both sections (one PATCH call)
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const token = getToken();
        if (token) getMe(token).then(setUser).catch(() => {});
    }, []);

    useEffect(() => {
        if (!user) return;
        setFirstName(user.first_name ?? "");
        setLastName(user.last_name ?? "");
        setUsername(user.username ?? "");
        setAvatarUrl(user.profile_picture_url ?? "");
        setTimezone(user.timezone ?? "");
        setGoalMinutes(user.study_goal_minutes_per_day != null ? String(user.study_goal_minutes_per_day) : "");
        setPreferredTime(user.preferred_study_time ?? "");
    }, [user]);

    const profileDirty =
        firstName !== (user?.first_name ?? "") ||
        lastName !== (user?.last_name ?? "") ||
        username !== (user?.username ?? "") ||
        avatarUrl !== (user?.profile_picture_url ?? "");

    const prefsDirty =
        timezone !== (user?.timezone ?? "") ||
        goalMinutes !== (user?.study_goal_minutes_per_day != null ? String(user.study_goal_minutes_per_day) : "") ||
        preferredTime !== (user?.preferred_study_time ?? "");

    const isDirty = profileDirty || prefsDirty;

    function resetStatus() {
        setSaveStatus("idle");
        setSaveError("");
    }

    async function handleSave() {
        const token = getToken();
        if (!token) { setSaveStatus("error"); setSaveError("Not authenticated."); return; }
        setSaving(true); setSaveStatus("idle"); setSaveError("");
        try {
            const payload: Record<string, string | number | undefined> = {};
            if (firstName !== (user?.first_name ?? "")) payload.first_name = firstName.trim() || undefined;
            if (lastName !== (user?.last_name ?? "")) payload.last_name = lastName.trim() || undefined;
            if (username !== (user?.username ?? "")) payload.username = username.trim() || undefined;
            if (avatarUrl !== (user?.profile_picture_url ?? "")) payload.profile_picture_url = avatarUrl.trim() || undefined;
            if (timezone !== (user?.timezone ?? "")) payload.timezone = timezone.trim() || undefined;
            if (preferredTime !== (user?.preferred_study_time ?? "")) payload.preferred_study_time = preferredTime || undefined;
            const parsed = goalMinutes !== "" ? parseInt(goalMinutes, 10) : undefined;
            if (parsed !== (user?.study_goal_minutes_per_day ?? undefined)) payload.study_goal_minutes_per_day = parsed;

            const updated = await updateProfile(token, payload);
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

    // avatar display
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
    const avatarLetter = (displayName || user?.username || user?.email || "U").charAt(0).toUpperCase();
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

    return (
        <div className="flex flex-col gap-10 pb-16">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-medium text-slate-300">Account Preferences</span>
                </div>
                <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[1.1]">
                    Profile &amp; <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-500">
                        Settings
                    </span>
                </h2>
                <p className="text-gray-400 mt-4 text-lg max-w-xl">
                    Manage your identity, study preferences, and account security.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Profile Card ── */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                    </h3>

                    {/* Avatar */}
                    <div className="flex items-center gap-5 mb-8">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Avatar"
                                className="w-20 h-20 rounded-full object-cover border-4 border-slate-900 shadow-lg"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-slate-900">
                                {avatarLetter}
                            </div>
                        )}
                        <div>
                            <p className="text-xl font-bold text-white">{displayName || user?.username || "Scholar"}</p>
                            {user?.username && <p className="text-indigo-400 text-sm font-medium">@{user.username}</p>}
                            {memberSince && <p className="text-gray-600 text-xs mt-0.5">Member since {memberSince}</p>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Read-only */}
                        <Field label="Email Address">
                            <div className={readOnlyCls}>
                                <span>{user?.email || "—"}</span>
                                <span className="text-[10px] text-gray-600 uppercase tracking-widest ml-3">read-only</span>
                            </div>
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="First Name">
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => { setFirstName(e.target.value); resetStatus(); }}
                                    placeholder="First name"
                                    maxLength={100}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Last Name">
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => { setLastName(e.target.value); resetStatus(); }}
                                    placeholder="Last name"
                                    maxLength={100}
                                    className={inputCls}
                                />
                            </Field>
                        </div>

                        <Field label="Username" hint="2–40 characters, used for @mentions.">
                            <div className="relative mt-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 select-none">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => { setUsername(e.target.value); resetStatus(); }}
                                    placeholder="your_handle"
                                    maxLength={40}
                                    className={`${inputCls} pl-8`}
                                />
                            </div>
                        </Field>

                        <Field label="Profile Picture URL" hint="Paste a public image URL to use as your avatar.">
                            <input
                                type="url"
                                value={avatarUrl}
                                onChange={e => { setAvatarUrl(e.target.value); resetStatus(); }}
                                placeholder="https://example.com/photo.jpg"
                                maxLength={500}
                                className={inputCls}
                            />
                        </Field>

                        <SaveBar
                            dirty={isDirty}
                            saving={saving}
                            status={saveStatus}
                            error={saveError}
                            onSave={handleSave}
                        />
                    </div>
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-6">
                    {/* Study Preferences Card */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Study Preferences
                        </h3>

                        <div className="space-y-4">
                            <Field label="Daily Study Goal" hint="Target minutes per day (0 – 1440).">
                                <div className="relative mt-1">
                                    <input
                                        type="number"
                                        min={0}
                                        max={1440}
                                        value={goalMinutes}
                                        onChange={e => { setGoalMinutes(e.target.value); resetStatus(); }}
                                        placeholder="120"
                                        className={`${inputCls} pr-14`}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none">min</span>
                                </div>
                            </Field>

                            <Field label="Preferred Study Time">
                                <select
                                    value={preferredTime}
                                    onChange={e => { setPreferredTime(e.target.value); resetStatus(); }}
                                    className={`${inputCls} appearance-none cursor-pointer`}
                                >
                                    <option value="" className="bg-slate-900">No preference</option>
                                    <option value="morning" className="bg-slate-900">Morning</option>
                                    <option value="afternoon" className="bg-slate-900">Afternoon</option>
                                    <option value="evening" className="bg-slate-900">Evening</option>
                                    <option value="night" className="bg-slate-900">Night</option>
                                </select>
                            </Field>

                            <Field label="Timezone" hint="e.g. America/New_York, Europe/London, Asia/Dubai">
                                <input
                                    type="text"
                                    value={timezone}
                                    onChange={e => { setTimezone(e.target.value); resetStatus(); }}
                                    placeholder="UTC"
                                    maxLength={60}
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Account Info
                        </h3>

                        <div className="space-y-3">
                            {[
                                { label: "Status", value: user?.is_active ? "Active" : "Inactive", color: user?.is_active ? "text-emerald-400" : "text-red-400" },
                                { label: "Provider", value: user?.auth_provider ?? "—", color: "text-gray-300" },
                                { label: "Verified", value: user?.is_verified ? "Yes" : "No", color: user?.is_verified ? "text-emerald-400" : "text-yellow-400" },
                                { label: "Last login", value: user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : "—", color: "text-gray-400" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
                                    <span className={`text-sm font-medium ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5">
                            <button disabled className="w-full py-3 px-4 bg-white/5 text-white font-medium rounded-xl border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Change Password
                            </button>
                            <p className="text-xs text-center text-gray-600 mt-2">Coming soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

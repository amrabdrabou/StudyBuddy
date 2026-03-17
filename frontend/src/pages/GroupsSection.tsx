export default function GroupsSection({ currentUserId: _ }: { currentUserId: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-32 text-center">
      <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-400/15 flex items-center justify-center">
        <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div>
        <p className="text-white font-bold text-xl">Study Groups</p>
        <p className="text-gray-500 text-sm mt-1">Collaborative study groups are coming soon.</p>
      </div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-semibold">
        Coming Soon
      </span>
    </div>
  );
}

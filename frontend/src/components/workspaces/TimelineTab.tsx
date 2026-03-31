export default function TimelineTab(_: { workspaceId: string }) {
  const steps = [
    { icon: "DOC", label: "Upload documents", color: "text-cyan-400 bg-cyan-400/10" },
    { icon: "AI", label: "AI extracts & summarizes", color: "text-violet-400 bg-violet-400/10" },
    { icon: "MAP", label: "Build your roadmap (Micro Goals)", color: "text-blue-400 bg-blue-400/10" },
    { icon: "TIME", label: "Log study sessions", color: "text-emerald-400 bg-emerald-400/10" },
    { icon: "QUIZ", label: "Review with Flashcards & Quizzes", color: "text-amber-400 bg-amber-400/10" },
    { icon: "DONE", label: "Track progress on the Timeline", color: "text-pink-400 bg-pink-400/10" },
  ];

  return (
    <div className="flex flex-col items-center py-12 gap-8">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-semibold text-amber-400 tracking-wide">COMING SOON</span>
      </div>

      <div className="text-center max-w-md">
        <h3 className="text-xl font-bold text-white">Study Timeline</h3>
        <p className="text-sm text-gray-500 mt-2">
          A visual history of everything you do in this workspace - sessions, uploads,
          goals completed, and milestones reached - all on one scrollable timeline.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-0">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold ${step.color}`}>
                {step.icon}
              </div>
              {index < steps.length - 1 && <div className="w-px h-6 bg-white/5" />}
            </div>
            <p className="text-sm text-gray-400 mt-2">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

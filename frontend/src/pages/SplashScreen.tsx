const SplashScreen = () => (
    <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a14",
    }}>
        {/* Ambient glow behind the logo */}
        <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
        }}>
            {/* Outer spinning ring */}
            <div style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "#818cf8",
                borderRightColor: "#a78bfa",
                animation: "spin 1.2s linear infinite",
            }} />
            {/* Inner pulsing glow */}
            <div style={{
                position: "absolute",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
                animation: "pulse 1.8s ease-in-out infinite",
            }} />
            {/* Logo */}
            <img
                src="/assets/Logomark_final3.svg"
                alt="StudyBuddy"
                style={{ width: 56, height: 56, position: "relative", zIndex: 1 }}
            />
        </div>

        <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: "#fff",
            letterSpacing: "-0.5px",
            margin: 0,
        }}>
            StudyBuddy
        </h1>
        <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: "#6b7280",
            marginTop: 8,
        }}>
            Loading to your dashboard . . .
        </p>

        <style>{`
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.6; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.15); }
            }
        `}</style>
    </div>
);

export default SplashScreen;

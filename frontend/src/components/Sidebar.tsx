import React from "react";

const Sidebar = () => (
    <aside style={{
        width: 72,
        background: "#22223b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 24
    }}>
        <img
            src="/assets/Logomark_final3.svg"
            alt="StudyBuddy Logomark"
            style={{ width: 40, marginBottom: 32 }}
        />
        {/* ...rest of your sidebar nav */}
    </aside>
);

export default Sidebar;

// IMGUI Overlay functions for drawing on screen

class UI {
    // ui states
    static showTerritories = false;
    static showLeaderboard = false;

    static loadedLeaderboard = false;
    static loadedTerritories = false;

    static guilds;

    // all draw functions are gated
    static drawAll(mProj, mView, time) {
        ImGui_Impl.NewFrame(time);
        ImGui.NewFrame();
        UI.drawMainWindow(mProj, mView, time);
        UI.drawLeaderWindow();
        ImGui.EndFrame();
        ImGui.Render();
    }

    static drawMainWindow(mProj, mView, time) {
        ImGui.Begin("LockMap - The cooler map alternative");
        ImGui.Text(VERSIONSTRING);
        ImGui.Text(`Running at ${Math.round(ImGui.GetIO().Framerate)} fps`);
        // compute coordinates by reversing
        let hit = unproject(mView, mProj, lastX, lastY, window.innerWidth, window.innerHeight);
        // local x and y is in-game coords
        let localX = Math.round((mapRatio - hit[0] + camx) * 4091 / (2 * mapRatio) - 2392);
        let localY = Math.round((1 + hit[1] - camy) * 6485 / 2 - 6607);
        ImGui.Text(`x: ${localX}, y: ${localY}`);
        ImGui.Checkbox("Territory Leaderboard", (value = UI.showLeaderboard) => UI.showLeaderboard = value);
        ImGui.Checkbox("Show Territories", (value = UI.showTerritories) => UI.showTerritories = value);
        ImGui.End();
    }

    static drawLeaderWindow() {
        if (UI.showLeaderboard) {
            ImGui.Begin("Territory Leaderboard",
                (value = UI.showLeaderboard) => UI.showLeaderboard = value);
            UI.guilds.forEach((e) => ImGui.Text(`${e[2]} ${e[0]}: ${e[1]}`));
            if (ImGui.Button("Close"))
                UI.showLeaderboard = false;
            ImGui.End();
        }
    }

}
// IMGUI Overlay functions for drawing on screen
import {unproject} from './util.js';

const VERSIONSTRING = "Version 0.1.1"
class UI {
    // ui states
    static showTerritories = false;
    static showLeaderboard = false;

    static loadedLeaderboard = false;
    static loadedTerritories = false;

    static guilds;

    // for the popup
    static showPopup = false;
    static popupScreenX;
    static popupScreenY;
    static popupVec2;
    static popupSize = new ImGui.ImVec2(200, 150);

    // what should be in main.js
    static lastX = 0;
    static lastY = 0;
    static mapRatio;
    static camx = 0;
    static camy = 0;
    static zoom = 0;

    // all draw functions are gated
    static drawAll(mProj, mView, time) {
        ImGui_Impl.NewFrame(time);
        ImGui.NewFrame();
        UI.drawMainWindow(mProj, mView, time);
        UI.drawLeaderWindow();
        UI.drawPopupWindow();
        ImGui.EndFrame();
        ImGui.Render();
    }

    static drawMainWindow(mProj, mView, time) {
        ImGui.Begin("LockMap - The cooler map alternative");
        ImGui.Text(VERSIONSTRING);
        ImGui.Text(`Running at ${Math.round(ImGui.GetIO().Framerate)} fps`);
        // compute coordinates by reversing
        let hit = unproject(mView, mProj, UI.lastX, UI.lastY, window.innerWidth, window.innerHeight, UI.zoom);
        // local x and y is in-game coords
        let localX = Math.round((UI.mapRatio - hit[0] + UI.camx) * 4091 / (2 * UI.mapRatio) - 2392);
        let localY = Math.round((1 + hit[1] - UI.camy) * 6485 / 2 - 6607);
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

    static drawPopupWindow() {
        if (UI.showPopup) {
            ImGui.SetNextWindowPos(UI.popupVec2, ImGui.ImGuiCond_FirstUseEver);
            ImGui.SetNextWindowSize(UI.popupSize, ImGui.ImGuiCond_FirstUseEver);
            ImGui.Begin("This Place Is Super Cool");
            ImGui.Text("yes");
            ImGui.End();
        }
    }

}

export {UI};
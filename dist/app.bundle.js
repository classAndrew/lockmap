(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {enumerable: true, configurable: true, writable: true, value}) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // static/util.js
  function unproject(view, proj, mx, my, screenWidth, screenHeight, zoom) {
    let x = 2 * mx / screenWidth - 1;
    let y = 1 - 2 * my / screenHeight;
    let z = 1;
    let ray_clip = vec4.fromValues(x, y, -1, 1);
    let projinv = new Float32Array(16);
    mat4.invert(projinv, proj);
    let ray_eye = vec4.create();
    mat4.mul(ray_eye, projinv, ray_clip);
    ray_eye = vec4.fromValues(ray_eye[0], ray_eye[1], -1, 0);
    let viewinv = new Float32Array(16);
    mat4.invert(viewinv, view);
    let ray_wor = vec4.create();
    mat4.mul(ray_wor, viewinv, ray_eye);
    ray_wor = vec3.fromValues(ray_wor[0], ray_wor[1], ray_wor[2]);
    vec3.normalize(ray_wor, ray_wor);
    let n = vec3.fromValues(0, 0, 1);
    let d = -(1 + zoom);
    let O = vec3.fromValues(0, 0, 0);
    let t = -(dot3(O, n) + d) / dot3(ray_wor, n);
    vec3.scale(ray_wor, ray_wor, t);
    vec3.add(O, O, ray_wor);
    return O;
  }
  function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function getVerticesColor(mapResX, mapResY, offsetX, offsetY, startX, startY, endX, endY, color) {
    let mapRatio = mapResX / mapResY;
    let [startx, starty, endx, endy] = [
      (startX + offsetX) / mapResX,
      (mapResY - startY + offsetY) / mapResY,
      (endX + offsetX) / mapResX,
      (mapResY - endY + offsetY) / mapResY
    ];
    const terrVertices = [
      -mapRatio + startx * mapRatio * 2,
      -1 + starty * 2,
      1e-3,
      ...color,
      -mapRatio + endx * mapRatio * 2,
      -1 + starty * 2,
      1e-3,
      ...color,
      -mapRatio + startx * mapRatio * 2,
      -1 + endy * 2,
      1e-3,
      ...color,
      -mapRatio + endx * mapRatio * 2,
      -1 + endy * 2,
      1e-3,
      ...color,
      -mapRatio + startx * mapRatio * 2,
      -1 + endy * 2,
      1e-3,
      ...color,
      -mapRatio + endx * mapRatio * 2,
      -1 + starty * 2,
      1e-3,
      ...color
    ];
    return terrVertices;
  }
  function getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    [x0, y0, x1, y1] = [
      (x0 + offsetX) / mapResX,
      (mapResY - y0 + offsetY) / mapResY,
      (x1 + offsetX) / mapResX,
      (mapResY - y1 + offsetY) / mapResY
    ];
    let mapRatio = mapResX / mapResY;
    let u = [y1 - y0, -(x1 - x0) * mapRatio];
    vec2.normalize(u, u);
    vec2.scale(u, u, thickness);
    const lineVertices = [
      -mapRatio + x0 * mapRatio * 2 - u[0],
      -1 + y0 * 2 - u[1],
      12e-4,
      -mapRatio + x0 * mapRatio * 2 + u[0],
      -1 + y0 * 2 + u[1],
      12e-4,
      -mapRatio + x1 * mapRatio * 2 + u[0],
      -1 + y1 * 2 + u[1],
      12e-4,
      -mapRatio + x1 * mapRatio * 2 - u[0],
      -1 + y1 * 2 - u[1],
      12e-4,
      -mapRatio + x0 * mapRatio * 2 - u[0],
      -1 + y0 * 2 - u[1],
      12e-4,
      -mapRatio + x1 * mapRatio * 2 + u[0],
      -1 + y1 * 2 + u[1],
      12e-4
    ];
    return lineVertices;
  }
  function getBoxVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    const vertices = [].concat(getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y0, thickness), getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y0, x1, y1, thickness), getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y1, x0, y1, thickness), getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y1, x0, y0, thickness));
    return vertices;
  }
  function hexToRGB(hx, name) {
    let a = hx ? parseInt(hx.substr(1), 16) : name.hashCode();
    return [(a >> 16 & 255) / 255, (a >> 8 & 255) / 255, (a & 255) / 255];
  }
  String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0)
      return hash;
    for (i = 0; i < this.length; i++) {
      chr = this.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash;
  };
  var Info = class {
    static getLocation(x, y) {
    }
  };
  __publicField(Info, "territories");

  // static/fontrenderer.js
  var bitmapWidth = 128;
  var bitmapHeight = 64;
  var charWidth = 5 + 2;
  var charHeight = 7 + 2;
  var bitmapRatio = bitmapWidth / bitmapHeight;
  var txtCtx = document.createElement("canvas").getContext("2d");
  var textCache = {};
  var WorldFontRenderer = class {
    shader;
    gl;
    charBuffer;
    mapWidth;
    mapHeight;
    offsetX;
    offsetY;
    mView;
    mWorld;
    mProj;
    mViewLoc;
    mWorldLoc;
    mProjLoc;
    constructor(shader, gl2, mapWidth, mapHeight, offsetX, offsetY, mView, mProj, mWorld) {
      [this.shader, this.gl, this.mapWidth, this.mapHeight, this.offsetX, this.offsetY, this.mView, this.mProj, this.mWorld] = [shader, gl2, mapWidth, mapHeight, offsetX, offsetY, mView, mProj, mWorld];
      this.mProj = new Float32Array(16);
      mat4.ortho(this.mProj, -2, 2, -2, 2, 0, 2);
      this.mapRatio = mapWidth / mapHeight;
      gl2.useProgram(shader);
      this.mWorldLoc = gl2.getUniformLocation(shader, "world");
      this.mProjLoc = gl2.getUniformLocation(shader, "proj");
      this.mViewLoc = gl2.getUniformLocation(shader, "view");
      gl2.uniformMatrix4fv(this.mProjLoc, false, mProj);
      this.charBuffer = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, this.charBuffer);
      const vertices = [
        -1,
        -1,
        0,
        0,
        0,
        1,
        -1,
        0,
        1,
        0,
        -1,
        1,
        0,
        0,
        1,
        1,
        1,
        0,
        1,
        1,
        -1,
        1,
        0,
        0,
        1,
        1,
        -1,
        0,
        1,
        0
      ];
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array(vertices), gl2.STATIC_DRAW);
      gl2.vertexAttribPointer(0, 3, gl2.FLOAT, false, 5 * 4, 0);
      gl2.enableVertexAttribArray(0);
      gl2.vertexAttribPointer(1, 2, gl2.FLOAT, false, 5 * 4, 3 * 4);
      gl2.enableVertexAttribArray(1);
      let uniLoc = gl2.getUniformLocation(shader, "uSampler");
      gl2.uniform1i(uniLoc, 1);
    }
    renderText(text, x, y, size) {
      this.gl.useProgram(this.shader);
      let tex = textCache[text];
      if (!tex) {
        var canvtext = canvText(text, 140 * text.length / 10, 120 * text.length / 10);
        tex = this.gl.createTexture();
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvtext);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        textCache[text] = tex;
      }
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
      this.gl.uniformMatrix4fv(this.mViewLoc, false, this.mView);
      let temp = new Float32Array(this.mWorld);
      [x, y] = this.coordConv(x, y);
      mat4.translate(temp, temp, [x, y, 2e-3]);
      mat4.scale(temp, temp, [size, size, 1]);
      this.gl.uniformMatrix4fv(this.mWorldLoc, false, temp);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.charBuffer);
      this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 5 * 4, 0);
      this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 5 * 4, 3 * 4);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 5);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 5);
    }
    coordConv(x, y) {
      let t = [(x + this.offsetX) / this.mapWidth, (this.mapHeight - y + this.offsetY) / this.mapHeight];
      return [-this.mapRatio + t[0] * this.mapRatio * 2, -1 + t[1] * 2];
    }
  };
  function canvText(text, width, height) {
    txtCtx.canvas.width = width;
    txtCtx.canvas.height = height;
    txtCtx.font = "20px Sans-serif";
    txtCtx.textAlign = "center";
    txtCtx.textBaseline = "middle";
    txtCtx.fillStyle = "white";
    txtCtx.clearRect(0, 0, width, height);
    txtCtx.lineWidth = 2;
    txtCtx.strokeStyle = "#000000";
    txtCtx.strokeText(text, width / 2, height / 2);
    txtCtx.fillText(text, width / 2, height / 2);
    return txtCtx.canvas;
  }

  // static/overlay.ts
  var VERSIONSTRING = "Version 0.1.1";
  var _UI = class {
    static drawAll(mProj, mView, time) {
      ImGui_Impl.NewFrame(time);
      ImGui.NewFrame();
      if (!_UI.first) {
        ImGui.SetNextWindowSize(_UI.mainWindowSize, ImGui.ImGuiCond_FirstUseEver);
        _UI.first = false;
      }
      _UI.drawMainWindow(mProj, mView, time);
      _UI.drawLeaderWindow();
      _UI.drawPopupWindow();
      ImGui.EndFrame();
      ImGui.Render();
    }
    static drawMainWindow(mProj, mView, time) {
      ImGui.Begin("LockMap - The cooler map alternative");
      ImGui.Text(VERSIONSTRING);
      ImGui.Text(`Running at ${Math.round(ImGui.GetIO().Framerate)} fps`);
      let hit = unproject(mView, mProj, _UI.lastX, _UI.lastY, window.innerWidth, window.innerHeight, _UI.zoom);
      let localX = Math.round((_UI.mapRatio - hit[0] + _UI.camx) * 4091 / (2 * _UI.mapRatio) - 2392);
      let localY = Math.round((1 + hit[1] - _UI.camy) * 6485 / 2 - 6607);
      ImGui.Text(`x: ${localX}, y: ${localY}`);
      ImGui.Checkbox("Territory Leaderboard", (value = _UI.showLeaderboard) => _UI.showLeaderboard = value);
      ImGui.Checkbox("Show Territories", (value = _UI.showTerritories) => _UI.showTerritories = value);
      ImGui.End();
    }
    static drawLeaderWindow() {
      if (_UI.showLeaderboard) {
        ImGui.Begin("Territory Leaderboard", (value = _UI.showLeaderboard) => _UI.showLeaderboard = value);
        _UI.guilds.forEach((e) => ImGui.Text(`${e[2]} ${e[0]}: ${e[1]}`));
        if (ImGui.Button("Close"))
          _UI.showLeaderboard = false;
        ImGui.End();
      }
    }
    static drawPopupWindow() {
      if (_UI.showPopup) {
        ImGui.SetNextWindowPos(_UI.popupVec2, ImGui.ImGuiCond_FirstUseEver);
        ImGui.SetNextWindowSize(_UI.popupSize, ImGui.ImGuiCond_FirstUseEver);
        ImGui.Begin("This Place Is Super Cool");
        ImGui.Text("yes");
        ImGui.End();
      }
    }
  };
  var UI = _UI;
  UI.showTerritories = false;
  UI.showLeaderboard = false;
  UI.loadedLeaderboard = false;
  UI.loadedTerritories = false;
  UI.showPopup = false;
  UI.popupSize = new ImGui.ImVec2(200, 150);
  UI.lastX = 0;
  UI.lastY = 0;
  UI.mapRatio = 0;
  UI.mapWidth = 0;
  UI.mapHeight = 0;
  UI.camx = 0;
  UI.camy = 0;
  UI.zoom = 0;
  UI.first = false;
  UI.mainWindowSize = new ImGui.ImVec2(300, 150);

  // static/assets/routes.js
  var routes = {
    "Ragni": [
      "Ragni North Entrance",
      "Pigmen Ravines Entrance",
      "Ragni Main Entrance"
    ],
    "Pigmen Ravines Entrance": [
      "Pigmen Ravines",
      "South Pigmen Ravines",
      "Ragni"
    ],
    "Pigmen Ravines": [
      "Abandoned Farm",
      "Pigmen Ravines Entrance"
    ],
    "South Pigmen Ravines": [
      "Little Wood",
      "Pigmen Ravines Entrance"
    ],
    "Ragni North Entrance": [
      "Katoa Ranch",
      "Ragni North Suburbs",
      "Ragni"
    ],
    "City of Troms": [
      "Jungle Lake",
      "Temple of Legends",
      "South Pigmen Ravines"
    ],
    "Ragni Main Entrance": [
      "Ragni East Suburbs",
      "Emerald Trail",
      "Ragni"
    ],
    "Ragni East Suburbs": [
      "Maltic Plains",
      "Ragni Plains",
      "Ragni Main Entrance"
    ],
    "Abandoned Farm": [
      "Pigmen Ravines",
      "Time Valley"
    ],
    "Temple of Legends": [
      "Jungle Lake",
      "City of Troms"
    ],
    "Emerald Trail": [
      "Maltic Plains",
      "Nivla Woods Entrance",
      "Ragni Main Entrance"
    ],
    "Nivla Woods Entrance": [
      "Road to Time Valley",
      "Nivla Woods",
      "Plains",
      "Emerald Trail"
    ],
    "Ragni North Suburbs": [
      "Katoa Ranch",
      "Ragni North Entrance",
      "Ragni Plains"
    ],
    "Ragni Plains": [
      "Ragni East Suburbs",
      "Ragni North Suburbs",
      "Maltic",
      "Coastal Trail"
    ],
    "Little Wood": [
      "South Pigmen Ravines",
      "Time Valley"
    ],
    "Maltic Plains": [
      "Ragni East Suburbs",
      "Plains",
      "Emerald Trail",
      "Maltic",
      "South Farmers Valley"
    ],
    "Nivla Woods": [
      "Road to Time Valley",
      "South Nivla Woods",
      "Nivla Woods Entrance",
      "Nivla Woods Exit"
    ],
    "Maltic": [
      "Maltic Plains",
      "Maltic Coast",
      "Ragni Plains",
      "Coastal Trail",
      "South Farmers Valley"
    ],
    "Katoa Ranch": [
      "Ragni North Entrance",
      "Ragni North Suburbs"
    ],
    "Road to Time Valley": [
      "Nivla Woods",
      "South Nivla Woods",
      "Nivla Woods Entrance"
    ],
    "Time Valley": [
      "Abandoned Farm",
      "Little Wood",
      "Elkurn Fields"
    ],
    "Elkurn Fields": [
      "South Nivla Woods",
      "Road to Elkurn",
      "Time Valley",
      "Elkurn"
    ],
    "Jungle Lake": [
      "Temple of Legends",
      "City of Troms",
      "Jungle Mid"
    ],
    "Jungle Mid": [
      "Jungle Lake",
      "Jungle Upper",
      "Jungle Lower"
    ],
    "Sanctuary Bridge": [
      "Nesaak Plains Upper North West",
      "Time Valley"
    ],
    "South Farmers Valley": [
      "Maltic Plains",
      "Maltic Coast",
      "Plains",
      "Maltic",
      "North Farmers Valley"
    ],
    "South Nivla Woods": [
      "Road to Time Valley",
      "Nivla Woods",
      "Road to Elkurn",
      "Elkurn Fields",
      "Nivla Woods Exit"
    ],
    "Nesaak Plains Upper North West": [
      "Nesaak Plains Mid North West",
      "Nesaak Plains North East",
      "Nesaak Plains Lower North West",
      "Sanctuary Bridge",
      "Elkurn"
    ],
    "Coastal Trail": [
      "Maltic Coast",
      "Ragni Plains"
    ],
    "Elkurn": [
      "Road to Elkurn",
      "Corrupted Road",
      "Nesaak Plains Upper North West",
      "Elkurn Fields"
    ],
    "Nivla Woods Exit": [
      "Nivla Woods",
      "South Nivla Woods",
      "Nivla Woods Edge",
      "North Nivla Woods"
    ],
    "Road to Elkurn": [
      "South Nivla Woods",
      "Elkurn Fields",
      "Elkurn"
    ],
    "Nesaak Plains Lower North West": [
      "Nesaak Plains Mid North West",
      "Nesaak Village",
      "Nesaak Plains Upper North West",
      "Nesaak Plains South West"
    ],
    "Nesaak Plains South West": [
      "Icy Descent",
      "Nesaak Village",
      "Nesaak Bridge Transition",
      "Nesaak Plains Lower North West",
      "Nesaak Plains South East",
      "Twain Lake"
    ],
    "Jungle Lower": [
      "Great Bridge Jungle",
      "Jungle Mid",
      "Dernel Jungle Lower"
    ],
    "Jungle Upper": [
      "Jungle Mid"
    ],
    "Nivla Woods Edge": [
      "Road to Elkurn",
      "Nivla Woods Exit",
      "Detlas Far Suburbs",
      "North Nivla Woods"
    ],
    "Nesaak Village": [
      "Bob's Tomb",
      "Nesaak Plains North East",
      "Nesaak Plains Lower North West",
      "Nesaak Plains South East",
      "Nesaak Plains South West"
    ],
    "Corrupted Road": [
      "Nether Gate",
      "Nether Plains Upper",
      "Detlas Far Suburbs",
      "Elkurn"
    ],
    "Nesaak Plains Mid North West": [
      "Nesaak Plains Upper North West",
      "Nesaak Plains Lower North West"
    ],
    "Twain Lake": [
      "Nesaak Plains South West",
      "Twain Mansion"
    ],
    "North Farmers Valley": [
      "Maltic Plains",
      "Maltic Coast",
      "South Farmers Valley"
    ],
    "Icy Descent": [
      "Tower of Ascension",
      "Lusuco"
    ],
    "Plains": [
      "Maltic Plains",
      "Nivla Woods Entrance",
      "South Farmers Valley",
      "North Nivla Woods"
    ],
    "Bob's Tomb": [
      "Nesaak Village",
      "Nesaak Plains North East",
      "Nesaak Plains South East"
    ],
    "Nemract Plains West": [
      "Nemract Road",
      "Arachnid Route",
      "Nivla Woods Edge",
      "Nemract Quarry"
    ],
    "Tower of Ascension": [
      "Icy Descent"
    ],
    "Nemract Quarry": [
      "Nemract Road",
      "Plains Coast",
      "Nemract Plains West"
    ],
    "Nesaak Plains North East": [
      "Nesaak Village",
      "Bob's Tomb",
      "Nesaak Plains Upper North West",
      "Nesaak Plains Lower North West",
      "Nesaak Transition"
    ],
    "Dernel Jungle Lower": [
      "Dernel Jungle Mid",
      "Jungle Lower"
    ],
    "Detlas Far Suburbs": [
      "Detlas Suburbs",
      "Detlas Trail West Plains",
      "Corrupted Road",
      "Nivla Woods Edge",
      "Nether Plains Upper"
    ],
    "North Nivla Woods": [
      "Plains",
      "Nivla Woods Edge",
      "Nivla Woods Exit"
    ],
    "Lusuco": [
      "Icy Descent"
    ],
    "Great Bridge Jungle": [
      "Herb Cave",
      "Jungle Lower",
      "Great Bridge Nesaak"
    ],
    "Nether Gate": [
      "Corrupted Road",
      "Nether Plains Upper",
      "Nether Plains Lower",
      "Plains Lake"
    ],
    "Maltic Coast": [
      "Maltic",
      "North Farmers Valley",
      "Coastal Trail",
      "South Farmers Valley"
    ],
    "Plains Coast": [
      "North Farmers Valley",
      "Nemract Quarry",
      "Nemract Town"
    ],
    "Herb Cave": [
      "Great Bridge Jungle"
    ],
    "Nesaak Transition": [
      "Desolate Valley",
      "Nesaak Plains North East",
      "Elkurn",
      "Nether Plains Lower"
    ],
    "Twain Mansion": [
      "Twain Lake"
    ],
    "Nemract Road": [
      "Ancient Nemract",
      "Nemract Plains West",
      "Nemract Plains East",
      "Nemract Cathedral",
      "Nemract Town",
      "Nemract Quarry"
    ],
    "Nesaak Plains South East": [
      "Nesaak Village",
      "Bob's Tomb",
      "Nesaak Plains South West"
    ],
    "Nether Plains Lower": [
      "Nether Gate",
      "Desolate Valley",
      "Nesaak Transition",
      "Elkurn"
    ],
    "Arachnid Route": [
      "Plains",
      "Nemract Plains West",
      "North Nivla Woods"
    ],
    "Dernel Jungle Mid": [
      "Dernel Jungle Upper",
      "Dernel Jungle Lower"
    ],
    "Dernel Jungle Upper": [
      "Dernel Jungle Mid"
    ],
    "Nether Plains Upper": [
      "Nether Gate",
      "Detlas Close Suburbs",
      "Detlas Suburbs",
      "Corrupted Road",
      "Detlas Far Suburbs",
      "Plains Lake"
    ],
    "Detlas Trail West Plains": [
      "Ancient Nemract",
      "Detlas Suburbs",
      "Nemract Plains East",
      "Detlas Far Suburbs"
    ],
    "Desolate Valley": [
      "Nesaak Transition",
      "Nether Plains Lower",
      "Plains Lake"
    ],
    "Nemract Town": [
      "Nemract Road",
      "Plains Coast",
      "Nemract Cathedral",
      "Rooster Island"
    ],
    "Great Bridge Nesaak": [
      "Great Bridge Jungle",
      "Nesaak Bridge Transition"
    ],
    "Plains Lake": [
      "Nether Gate",
      "Desolate Valley",
      "Nether Plains Upper",
      "Mine Base Plains"
    ],
    "Nemract Plains East": [
      "Nemract Road",
      "Detlas Trail West Plains"
    ],
    "Nemract Cathedral": [
      "Ancient Nemract",
      "Nemract Road",
      "Cathedral Harbour",
      "Nemract Town"
    ],
    "Mine Base Plains": [
      "Ternaves Plains Lower",
      "Mining Base Upper",
      "Mining Base Lower",
      "The Silent Road",
      "Plains Lake"
    ],
    "The Silent Road": [
      "The Broken Road",
      "Mine Base Plains"
    ],
    "Rooster Island": [
      "The Bear Zoo",
      "Selchar",
      "Nemract Town",
      "Durum Isles Lower"
    ],
    "Ancient Nemract": [
      "Nemract Road",
      "Detlas Trail West Plains",
      "Cathedral Harbour",
      "Detlas Trail East Plains",
      "Nemract Cathedral"
    ],
    "Nesaak Bridge Transition": [
      "Nesaak Plains South West",
      "Great Bridge Nesaak"
    ],
    "Detlas Suburbs": [
      "Detlas Close Suburbs",
      "Detlas Trail East Plains",
      "Nether Plains Upper",
      "Detlas Far Suburbs"
    ],
    "Detlas Close Suburbs": [
      "Detlas Suburbs",
      "Detlas",
      "Detlas Trail East Plains",
      "Nether Plains Upper"
    ],
    "Ternaves Plains Lower": [
      "Abandoned Pass",
      "Mining Base Upper",
      "Ternaves Plains Upper",
      "Ternaves",
      "Mine Base Plains"
    ],
    "Mining Base Upper": [
      "Ternaves Plains Lower",
      "Abandoned Pass",
      "Mining Base Lower"
    ],
    "The Broken Road": [
      "Worm Tunnel",
      "The Silent Road"
    ],
    "Detlas Trail East Plains": [
      "Detlas Close Suburbs",
      "Ancient Nemract",
      "Detlas Suburbs",
      "Detlas",
      "Cathedral Harbour"
    ],
    "Abandoned Pass": [
      "Ternaves Plains Lower",
      "Mining Base Upper"
    ],
    "The Bear Zoo": [
      "Zhight Island",
      "Rooster Island"
    ],
    "Durum Isles Lower": [
      "Durum Isles Center",
      "Selchar",
      "Rooster Island"
    ],
    "Mining Base Lower": [
      "Mining Base Upper"
    ],
    "Selchar": [
      "Durum Isles Center",
      "Durum Isles Upper",
      "Durum Isles Lower",
      "Skiens Island",
      "Rooster Island"
    ],
    "Worm Tunnel": [
      "The Broken Road",
      "Grey Ruins"
    ],
    "Durum Isles Center": [
      "Durum Isles Upper",
      "Selchar",
      "Durum Isles East",
      "Durum Isles Lower"
    ],
    "Detlas": [
      "Detlas Close Suburbs",
      "Detlas Trail East Plains",
      "Detlas Savannah Transition"
    ],
    "Zhight Island": [
      "The Bear Zoo",
      "Pirate Town",
      "Legendary Island"
    ],
    "Pirate Town": [
      "Bloody Beach",
      "Lost Atoll",
      "Zhight Island"
    ],
    "Grey Ruins": [
      "Worm Tunnel",
      "Forgotten Town"
    ],
    "Forgotten Town": [
      "Forest of Eyes",
      "Grey Ruins"
    ],
    "Cathedral Harbour": [
      "Savannah West Upper",
      "Ancient Nemract",
      "Nemract Cathedral",
      "Durum Isles East",
      "Durum Isles Lower"
    ],
    "Bloody Beach": [
      "Pirate Town",
      "Corkus Outskirts",
      "Volcano Lower",
      "Corkus Countryside",
      "Avos Temple"
    ],
    "Durum Isles East": [
      "Durum Isles Center",
      "Mage Island"
    ],
    "Skiens Island": [
      "Maro Peaks",
      "Selchar",
      "Nodguj Nation",
      "Dead Island South West"
    ],
    "Corkus Outskirts": [
      "Bloody Beach",
      "Corkus Statue",
      "Corkus Countryside"
    ],
    "Dead Island South West": [
      "Dead Island South East",
      "Dead Island North West",
      "Dujgon Nation",
      "Skiens Island"
    ],
    "Durum Isles Upper": [
      "Durum Isles Center",
      "Mage Island",
      "Selchar",
      "Nodguj Nation"
    ],
    "Savannah West Upper": [
      "Savannah East Upper",
      "Cathedral Harbour",
      "Bremminglar",
      "Savannah West Lower"
    ],
    "Bremminglar": [
      "Savannah West Upper",
      "Lion Lair"
    ],
    "Nodguj Nation": [
      "Icy Island",
      "Mage Island",
      "Dujgon Nation",
      "Skiens Island",
      "Santa's Hideout"
    ],
    "Maro Peaks": [
      "Tree Island",
      "Skiens Island"
    ],
    "Legendary Island": [
      "Southern Outpost",
      "Zhight Island"
    ],
    "Savannah East Upper": [
      "Savannah West Upper",
      "Almuj City",
      "Savannah East Lower"
    ],
    "Volcano Upper": [
      "Pirate Town",
      "Lost Atoll",
      "Light Peninsula",
      "Volcano Lower",
      "Tree Island"
    ],
    "Lost Atoll": [
      "Pirate Town",
      "Volcano Upper",
      "Tree Island"
    ],
    "Avos Temple": [
      "Avos Workshop",
      "Bloody Beach"
    ],
    "Corkus Statue": [
      "Corkus Outskirts",
      "Corkus City Mine"
    ],
    "Corkus Countryside": [
      "Corkus Outskirts",
      "Corkus City",
      "Corkus Mountain",
      "Avos Temple"
    ],
    "Forest of Eyes": [
      "Forgotten Town",
      "Sinister Forest"
    ],
    "Sinister Forest": [
      "Lutho",
      "Forest of Eyes"
    ],
    "Dujgon Nation": [
      "Dead Island South East",
      "Icy Island",
      "Nodguj Nation",
      "Regular Island",
      "Dead Island South West"
    ],
    "Volcano Lower": [
      "Volcano Upper",
      "Bloody Beach",
      "Light Peninsula",
      "Llevigar Entrance"
    ],
    "Dead Island North West": [
      "Dead Island North East",
      "Dead Island South West"
    ],
    "Light Peninsula": [
      "Volcano Upper",
      "Volcano Lower",
      "Tree Island",
      "Hobbit River"
    ],
    "Southern Outpost": [
      "Legendary Island",
      "Lighthouse Plateau"
    ],
    "Lutho": [
      "Sinister Forest",
      "Paths of Sludge"
    ],
    "Lion Lair": [
      "Bremminglar"
    ],
    "Mage Island": [
      "Durum Isles Upper",
      "Half Moon Island",
      "Durum Isles East",
      "Santa's Hideout"
    ],
    "Dead Island North East": [
      "Dead Island South East",
      "Jofash Docks",
      "Dead Island North West"
    ],
    "Almuj City": [
      "Desert Mid-Lower",
      "Savannah East Upper",
      "Desert West Upper",
      "Desert West Lower",
      "Desert Mid-Upper"
    ],
    "Llevigar Entrance": [
      "Volcano Lower",
      "Llevigar"
    ],
    "Corkus Mountain": [
      "Corkus Forest North",
      "Corkus Docks",
      "Corkus Countryside"
    ],
    "Savannah West Lower": [
      "Savannah West Upper",
      "Savannah East Lower",
      "Ternaves Plains Upper"
    ],
    "Detlas Savannah Transition": [
      "Detlas",
      "Ternaves Plains Upper",
      "Mine Base Plains",
      "Savannah West Lower"
    ],
    "Desert West Upper": [
      "Almuj City",
      "Desert Upper"
    ],
    "Corkus City": [
      "Corkus Forest South",
      "Corkus City South",
      "Corkus Forest North",
      "Corkus Castle",
      "Corkus Countryside"
    ],
    "Savannah East Lower": [
      "Savannah East Upper",
      "Ternaves",
      "Savannah West Lower"
    ],
    "Hobbit River": [
      "Aldorei Valley West Entrance",
      "Light Peninsula",
      "Light Forest East Lower",
      "Light Forest West Lower"
    ],
    "Tree Island": [
      "Volcano Upper",
      "Lost Atoll",
      "Light Peninsula"
    ],
    "Desert West Lower": [
      "Desert Mid-Lower",
      "Desert Lower",
      "Almuj City"
    ],
    "Corkus Docks": [
      "Corkus Mountain"
    ],
    "Corkus City Mine": [
      "Road To Mine",
      "Corkus Statue",
      "Corkus Sea Cove"
    ],
    "Jofash Docks": [
      "Dead Island North East",
      "Jofash Tunnel",
      "Regular Island"
    ],
    "Light Forest East Lower": [
      "Light Forest West Mid",
      "Mantis Nest",
      "Hobbit River",
      "Light Forest East Mid"
    ],
    "Avos Workshop": [
      "Avos Temple"
    ],
    "Paths of Sludge": [
      "Lutho",
      "Toxic Drip"
    ],
    "Dead Island South East": [
      "Dujgon Nation",
      "Dead Island North East",
      "Regular Island",
      "Dead Island South West"
    ],
    "Aldorei Valley West Entrance": [
      "Aldorei Valley Lower",
      "Mantis Nest",
      "Hobbit River"
    ],
    "Half Moon Island": [
      "Mage Island"
    ],
    "Ternaves Plains Upper": [
      "Ternaves Plains Lower",
      "Ternaves",
      "Detlas Savannah Transition",
      "Savannah West Lower"
    ],
    "Jofash Tunnel": [
      "Jofash Docks",
      "Sky Island Ascent"
    ],
    "Toxic Drip": [
      "Paths of Sludge",
      "Toxic Caves",
      "Gateway to Nothing"
    ],
    "Lighthouse Plateau": [
      "Southern Outpost",
      "Phinas Farm",
      "Corkus Sea Port"
    ],
    "Light Forest West Lower": [
      "Light Forest West Mid",
      "Hobbit River",
      "Light Forest South Entrance"
    ],
    "Llevigar": [
      "Llevigar Entrance",
      "Quartz Mines South West",
      "Llevigar Gate East"
    ],
    "Corkus Forest North": [
      "Corkus Forest South",
      "Corkus City South",
      "Corkus City",
      "Corkus Mountain"
    ],
    "Corkus Sea Port": [
      "Ruined Houses",
      "Fallen Factory",
      "Lighthouse Plateau",
      "Corkus Sea Cove"
    ],
    "Light Forest East Mid": [
      "Light Forest West Upper",
      "Light Forest East Lower",
      "Light Forest Canyon"
    ],
    "Gateway to Nothing": [
      "Void Valley",
      "Toxic Drip",
      "Final Step"
    ],
    "Light Forest West Mid": [
      "Light Forest West Upper",
      "Light Forest East Lower",
      "Light Forest West Lower",
      "Light Forest Entrance"
    ],
    "Mantis Nest": [
      "Aldorei Valley West Entrance",
      "Aldorei Valley Lower",
      "Light Forest East Lower",
      "Light Forest South Exit",
      "Light Forest Canyon"
    ],
    "Phinas Farm": [
      "Lighthouse Plateau",
      "Royal Gate"
    ],
    "Light Forest Canyon": [
      "Light Forest North Exit",
      "Mantis Nest",
      "Light Forest East Mid"
    ],
    "Desert Mid-Lower": [
      "Desert Lower",
      "Almuj City",
      "Desert West Lower",
      "Desert Mid-Upper",
      "Desert East Lower"
    ],
    "Ruined Houses": [
      "Corkus Sea Port",
      "Fallen Factory",
      "Factory Entrance"
    ],
    "Sky Island Ascent": [
      "Central Islands",
      "Sky Falls",
      "Raider's Base Upper",
      "Jofash Tunnel"
    ],
    "Light Forest South Entrance": [
      "Heavenly Ingress",
      "Light Forest West Lower",
      "Light Forest Entrance"
    ],
    "Santa's Hideout": [
      "Icy Island",
      "Mage Island"
    ],
    "Corkus Castle": [
      "Corkus City"
    ],
    "Aldorei Valley Lower": [
      "Aldorei Valley West Entrance",
      "Aldorei Valley Mid"
    ],
    "Llevigar Gate East": [
      "Orc Road",
      "Llevigar",
      "Llevigar Gate West",
      "Llevigar Farm Plains East"
    ],
    "Ahmsord": [
      "Path to Ahmsord Upper",
      "Sky Island Ascent",
      "Path to Ahmsord Lower",
      "Temple Island"
    ],
    "Rymek West Upper": [
      "Desert Lower",
      "Rymek East Upper",
      "Rymek West Mid",
      "Desert West Lower"
    ],
    "Orc Road": [
      "Loamsprout Camp",
      "Llevigar Farm Plains East",
      "Orc Lake"
    ],
    "Royal Gate": [
      "Phinas Farm"
    ],
    "Final Step": [
      "Bizarre Passage",
      "Gateway to Nothing"
    ],
    "Aldorei Valley Mid": [
      "Aldorei Valley Lower",
      "Aldorei Valley Upper"
    ],
    "Corkus Sea Cove": [
      "Road To Mine",
      "Corkus City Mine",
      "Corkus Sea Port",
      "Fallen Factory"
    ],
    "Light Forest South Exit": [
      "Light Forest North Exit",
      "Mantis Nest"
    ],
    "Regular Island": [
      "Jofash Docks",
      "Icy Island",
      "Dujgon Nation"
    ],
    "Quartz Mines South West": [
      "Quartz Mines South East",
      "Llevigar",
      "Quartz Mines North West"
    ],
    "Rymek West Mid": [
      "Rymek West Upper",
      "Rymek West Lower",
      "Rymek East Mid"
    ],
    "Light Forest West Upper": [
      "Efilim South East Plains",
      "Light Forest West Mid",
      "Light Forest North Entrance",
      "Light Forest East Mid"
    ],
    "Light Forest Entrance": [
      "Light Forest West Mid",
      "Light Forest North Entrance",
      "Light Forest South Entrance",
      "Road To Light Forest"
    ],
    "Desert Mid-Upper": [
      "Desert Mid-Lower",
      "Almuj City",
      "Desert East Mid",
      "Desert Upper"
    ],
    "Raider's Base Upper": [
      "Sky Island Ascent",
      "Raider's Base Lower"
    ],
    "Toxic Caves": [
      "Toxic Drip"
    ],
    "Llevigar Gate West": [
      "Llevigar Farm Plains West",
      "Llevigar Gate East"
    ],
    "Ternaves": [
      "Ternaves Plains Lower",
      "Savannah East Lower",
      "Ternaves Plains Upper"
    ],
    "Light Forest North Exit": [
      "Cinfras Entrance",
      "Light Forest South Exit",
      "Light Forest Canyon"
    ],
    "Sky Falls": [
      "Frozen Fort",
      "Sky Island Ascent",
      "Wybel Island"
    ],
    "Icy Island": [
      "Dujgon Nation",
      "Nodguj Nation",
      "Regular Island",
      "Santa's Hideout"
    ],
    "Quartz Mines North West": [
      "Loamsprout Camp",
      "Llevigar Farm",
      "Quartz Mines South West",
      "Quartz Mines North East"
    ],
    "Bizarre Passage": [
      "The Gate",
      "Final Step"
    ],
    "Efilim South East Plains": [
      "Light Forest West Upper",
      "Light Forest East Upper",
      "Efilim South Plains",
      "Efilim East Plains"
    ],
    "Raider's Base Lower": [
      "Raider's Base Upper"
    ],
    "Orc Lake": [
      "Orc Road",
      "Llevigar Plains East Upper",
      "Llevigar Plains East Lower",
      "Sunspark Camp",
      "Sablestone Camp"
    ],
    "Corkus Forest South": [
      "Factory Entrance",
      "Corkus City South",
      "Corkus Forest North",
      "Corkus City"
    ],
    "Path to Ahmsord Lower": [
      "Path to Ahmsord Upper",
      "Ahmsord",
      "Sky Castle"
    ],
    "The Gate": [
      "Bizarre Passage"
    ],
    "Void Valley": [
      "Gateway to Nothing"
    ],
    "Path to Ahmsord Upper": [
      "Path to Ahmsord Lower",
      "Kandon Ridge"
    ],
    "Efilim East Plains": [
      "Efilim South East Plains",
      "Efilim Village"
    ],
    "Desert East Lower": [
      "Desert Mid-Lower",
      "Rymek East Upper",
      "Desert East Mid"
    ],
    "Road To Mine": [
      "Corkus City Mine",
      "Corkus City South",
      "Corkus Sea Cove"
    ],
    "Light Forest East Upper": [
      "Efilim South East Plains",
      "Path to Cinfras"
    ],
    "Heavenly Ingress": [
      "Field of Life",
      "Light Forest South Entrance"
    ],
    "Quartz Mines South East": [
      "Quartz Mines South West",
      "Quartz Mines North East"
    ],
    "Llevigar Farm Plains East": [
      "Orc Road",
      "Llevigar Plains East Lower",
      "Llevigar Farm Plains West",
      "Llevigar Gate East"
    ],
    "Light Forest North Entrance": [
      "Light Forest West Upper",
      "Efilim South Plains",
      "Light Forest Entrance"
    ],
    "Efilim South Plains": [
      "Efilim South East Plains",
      "Efilim Village",
      "Light Forest North Entrance"
    ],
    "Loamsprout Camp": [
      "Orc Road",
      "Llevigar Farm",
      "Quartz Mines North West",
      "Sablestone Camp"
    ],
    "Desert Upper": [
      "Desert West Upper",
      "Mummy's Tomb",
      "Desert Mid-Upper"
    ],
    "Aldorei Valley Upper": [
      "Aldorei Valley Mid",
      "Aldorei's Waterfall"
    ],
    "Rymek West Lower": [
      "Rymek West Mid",
      "Rymek East Lower"
    ],
    "Central Islands": [
      "Ahmsord",
      "Sky Island Ascent",
      "Wybel Island",
      "Temple Island",
      "Ahmsord Outskirts"
    ],
    "Rymek East Upper": [
      "Rymek West Upper",
      "Rymek East Mid",
      "Desert East Lower"
    ],
    "Efilim Village": [
      "Efilim South Plains",
      "Efilim East Plains",
      "Twisted Housing"
    ],
    "Desert Lower": [
      "Rymek West Upper",
      "Desert Mid-Lower",
      "Desert West Lower"
    ],
    "Fallen Factory": [
      "Ruined Houses",
      "Corkus Sea Port",
      "Factory Entrance",
      "Corkus City South"
    ],
    "Road To Light Forest": [
      "Fleris Trail",
      "Leadin Fortress",
      "Light Forest Entrance"
    ],
    "Frozen Fort": [
      "Sky Falls"
    ],
    "Path to Cinfras": [
      "Light Forest East Upper",
      "Cinfras Entrance"
    ],
    "Rymek East Lower": [
      "Rymek West Lower",
      "Rymek East Mid"
    ],
    "Ahmsord Outskirts": [
      "Angel Refuge",
      "Central Islands",
      "Swamp Island",
      "Wybel Island"
    ],
    "Mummy's Tomb": [
      "Desert Upper"
    ],
    "Quartz Mines North East": [
      "Quartz Mines South East",
      "Llevigar Farm",
      "Pre-Light Forest Transition",
      "Quartz Mines North West"
    ],
    "Rymek East Mid": [
      "Rymek East Upper",
      "Rymek West Mid",
      "Rymek East Lower"
    ],
    "Corkus City South": [
      "Road To Mine",
      "Corkus Forest South",
      "Fallen Factory",
      "Factory Entrance",
      "Corkus City"
    ],
    "Field of Life": [
      "Heavenly Ingress",
      "Primal Fen",
      "Azure Frontier",
      "Luminous Plateau"
    ],
    "Azure Frontier": [
      "Otherwordly Monolith",
      "Path to Light",
      "Nexus of Light",
      "Field of Life"
    ],
    "Twisted Housing": [
      "Lone Farmstead",
      "Efilim Village",
      "Gelibord",
      "Mansion of Insanity",
      "Gelibord Corrupted Farm"
    ],
    "Cinfras Entrance": [
      "Light Forest North Exit",
      "Cinfras",
      "Mesquis Tower",
      "Path to Cinfras"
    ],
    "Mesquis Tower": [
      "Kander Mines",
      "Abandoned Manor",
      "Cinfras Entrance",
      "Path to Cinfras"
    ],
    "Sablestone Camp": [
      "Loamsprout Camp",
      "Goblin Plains West",
      "Meteor Crater",
      "Orc Lake"
    ],
    "Aldorei's Waterfall": [
      "Aldorei Valley South Entrance",
      "Aldorei Valley Upper"
    ],
    "Desert East Mid": [
      "Desert East Upper",
      "Desert Mid-Upper",
      "Desert East Lower"
    ],
    "Llevigar Farm Plains West": [
      "Llevigar Plains West Lower",
      "Llevigar Gate West",
      "Llevigar Farm Plains East"
    ],
    "Kandon Ridge": [
      "Path to Ahmsord Upper",
      "Old Coal Mine",
      "Kandon Farm"
    ],
    "Sky Castle": [
      "Path to Ahmsord Lower"
    ],
    "Old Coal Mine": [
      "Kandon Ridge"
    ],
    "Swamp Island": [
      "Astraulus' Tower",
      "Temple Island",
      "Ahmsord Outskirts"
    ],
    "Lone Farmstead": [
      "Twisted Housing",
      "Gelibord",
      "Abandoned Manor"
    ],
    "Fleris Trail": [
      "Road To Light Forest"
    ],
    "Nexus of Light": [
      "Azure Frontier"
    ],
    "Luminous Plateau": [
      "Field of Life"
    ],
    "Angel Refuge": [
      "Molten Reach",
      "Ahmsord Outskirts"
    ],
    "Llevigar Plains West Lower": [
      "Llevigar Plains West Upper",
      "Llevigar Gate West",
      "Llevigar Plains East Lower",
      "Llevigar Farm Plains West"
    ],
    "Temple Island": [
      "Ahmsord",
      "Snail Island",
      "Central Islands",
      "Kandon Ridge",
      "Swamp Island"
    ],
    "Factory Entrance": [
      "Corkus Forest South",
      "Ruined Houses",
      "Fallen Factory",
      "Corkus City South"
    ],
    "Molten Reach": [
      "Angel Refuge",
      "Molten Heights Portal"
    ],
    "Gelibord Corrupted Farm": [
      "Twisted Housing",
      "Taproot Descent",
      "Gelibord",
      "Gelibord Castle"
    ],
    "Llevigar Plains East Lower": [
      "Llevigar Plains East Upper",
      "Llevigar Plains West Lower",
      "Llevigar Farm Plains East",
      "Orc Lake"
    ],
    "Wybel Island": [
      "Central Islands",
      "Sky Falls",
      "Ahmsord Outskirts"
    ],
    "Path to Light": [
      "Azure Frontier",
      "Otherwordly Monolith"
    ],
    "Aldorei Lowlands": [
      "Cinfras's Small Farm",
      "Aldorei's River",
      "Aldorei's Waterfall"
    ],
    "Llevigar Farm": [
      "Loamsprout Camp",
      "Goblin Plains East",
      "Goblin Plains West",
      "Pre-Light Forest Transition",
      "Quartz Mines North West",
      "Quartz Mines North East"
    ],
    "Primal Fen": [
      "Field of Life"
    ],
    "Meteor Crater": [
      "Iron Road",
      "Sunspark Camp",
      "Sablestone Camp"
    ],
    "Desert East Upper": [
      "Desert East Mid"
    ],
    "Abandoned Manor": [
      "Kander Mines",
      "Lone Farmstead",
      "Entrance to Kander",
      "Mesquis Tower"
    ],
    "Cinfras": [
      "Aldorei's River",
      "Cinfras Entrance",
      "Cinfras Outskirts",
      "Guild Hall"
    ],
    "Aldorei Valley South Entrance": [
      "Cinfras's Small Farm",
      "Aldorei's North Exit",
      "Aldorei's Waterfall"
    ],
    "Molten Heights Portal": [
      "Lava Lake Bridge",
      "Lava Lake",
      "Crater Descent"
    ],
    "Kandon Farm": [
      "Kandon Ridge"
    ],
    "Cinfras Outskirts": [
      "Fungal Grove",
      "Dark Forest Cinfras Transition",
      "Old Crossroads South",
      "Cinfras",
      "Dark Forest Village"
    ],
    "Snail Island": [
      "Temple Island"
    ],
    "Lava Lake": [
      "Active Volcano",
      "Molten Heights Portal",
      "Volcanic Slope"
    ],
    "Otherwordly Monolith": [
      "Azure Frontier",
      "Path to Light"
    ],
    "Llevigar Plains East Upper": [
      "Llevigar Plains West Upper",
      "Swamp East Lower",
      "Llevigar Plains East Lower",
      "Sunspark Camp",
      "Orc Lake"
    ],
    "Guild Hall": [
      "Cinfras"
    ],
    "Entrance to Kander": [
      "Viscera Pits West",
      "Gelibord",
      "Abandoned Manor",
      "Path to Talor"
    ],
    "Llevigar Plains West Upper": [
      "Llevigar Plains East Upper",
      "Swamp West Lower",
      "Llevigar Plains West Lower"
    ],
    "Gelibord": [
      "Lone Farmstead",
      "Twisted Housing",
      "Entrance to Kander",
      "Gelibord Corrupted Farm"
    ],
    "Aldorei's River": [
      "Aldorei Lowlands",
      "Cinfras"
    ],
    "Pre-Light Forest Transition": [
      "Goblin Plains East",
      "Leadin Fortress",
      "Llevigar Farm",
      "Quartz Mines North East"
    ],
    "Dragonling Nests": [
      "Snail Island",
      "Astraulus' Tower"
    ],
    "Aldorei's North Exit": [
      "Cinfras County Lower",
      "Path To The Arch",
      "Aldorei Valley South Entrance"
    ],
    "Kander Mines": [
      "Abandoned Manor",
      "Mesquis Tower",
      "Dark Forest Village",
      "Path to Talor"
    ],
    "Active Volcano": [
      "Lava Lake Bridge",
      "Volcanic Slope",
      "Lava Lake"
    ],
    "Cinfras's Small Farm": [
      "Cinfras County Mid-Lower",
      "Cinfras County Lower",
      "Aldorei Lowlands",
      "Aldorei Valley South Entrance"
    ],
    "Path To The Arch": [
      "Aldorei's North Exit",
      "Ghostly Path",
      "Aldorei's Arch"
    ],
    "Fungal Grove": [
      "Old Crossroads North",
      "Fallen Village",
      "Old Crossroads South",
      "Decayed Basin",
      "Cinfras Outskirts"
    ],
    "Decayed Basin": [
      "Fungal Grove",
      "Mushroom Hill",
      "Lexdale",
      "Heart of Decay"
    ],
    "Sunspark Camp": [
      "Llevigar Plains East Upper",
      "Swamp East Lower",
      "Swamp Mountain Base",
      "Meteor Crater",
      "Orc Lake"
    ],
    "Lava Lake Bridge": [
      "Active Volcano",
      "Molten Heights Portal",
      "Crater Descent"
    ],
    "Lexdale": [
      "Viscera Pits East",
      "Old Crossroads North",
      "Heart of Decay",
      "Decayed Basin"
    ],
    "Goblin Plains East": [
      "Forgotten Path",
      "Llevigar Farm",
      "Goblin Plains West",
      "Pre-Light Forest Transition"
    ],
    "Volcanic Slope": [
      "Active Volcano",
      "Lava Lake"
    ],
    "Dark Forest Cinfras Transition": [
      "Fallen Village",
      "Gylia Lake South West",
      "Cinfras Outskirts"
    ],
    "Forgotten Path": [
      "Goblin Plains East",
      "Swamp Dark Forest Transition Lower",
      "Iron Road"
    ],
    "Aldorei's Arch": [
      "Canyon Upper North West",
      "Path To The Arch"
    ],
    "Goblin Plains West": [
      "Goblin Plains East",
      "Llevigar Farm",
      "Iron Road",
      "Sablestone Camp"
    ],
    "Mushroom Hill": [
      "Jitak's Farm",
      "Fallen Village",
      "Heart of Decay",
      "Decayed Basin"
    ],
    "Iron Road": [
      "Forgotten Path",
      "Swamp Lower",
      "Goblin Plains West",
      "Meteor Crater"
    ],
    "Twisted Ridge": [
      "Viscera Pits West",
      "Entrance to Kander"
    ],
    "Ghostly Path": [
      "Path To The Arch",
      "Burning Farm"
    ],
    "Path to Talor": [
      "Kander Mines",
      "Viscera Pits East",
      "Old Crossroads North",
      "Old Crossroads South",
      "Entrance to Kander",
      "Dark Forest Village"
    ],
    "Canyon Upper North West": [
      "Canyon Waterfall North",
      "Aldorei's Arch"
    ],
    "Fallen Village": [
      "Gylia Lake North West",
      "Fungal Grove",
      "Mushroom Hill",
      "Dark Forest Cinfras Transition"
    ],
    "Leadin Fortress": [
      "Orc Battlegrounds",
      "Pre-Light Forest Transition",
      "Road To Light Forest"
    ],
    "Swamp Mountain Base": [
      "Swamp East Mid",
      "Swamp Plains Basin",
      "Swamp Lower",
      "Sunspark Camp"
    ],
    "Astraulus' Tower": [
      "Swamp Island",
      "Dragonling Nests"
    ],
    "Gylia Lake North West": [
      "Jitak's Farm",
      "Fallen Village",
      "Gylia Lake North East",
      "Gylia Lake South West"
    ],
    "Cinfras County Mid-Lower": [
      "Cinfras County Mid-Upper",
      "Cinfras's Small Farm",
      "Cinfras County Lower"
    ],
    "Old Crossroads South": [
      "Fungal Grove",
      "Old Crossroads North",
      "Cinfras Outskirts",
      "Dark Forest Village",
      "Path to Talor"
    ],
    "Old Crossroads North": [
      "Fungal Grove",
      "Old Crossroads South",
      "Lexdale",
      "Path to Talor"
    ],
    "Gylia Lake South West": [
      "Gylia Lake North West",
      "Dark Forest Cinfras Transition",
      "Gylia Lake South East"
    ],
    "Jitak's Farm": [
      "Gylia Lake North West",
      "Mushroom Hill",
      "Gert Camp"
    ],
    "Gert Camp": [
      "Jitak's Farm",
      "Gylia Lake North East"
    ],
    "Swamp East Lower": [
      "Swamp East Mid",
      "Llevigar Plains East Upper",
      "Swamp West Lower",
      "Sunspark Camp"
    ],
    "Viscera Pits West": [
      "Viscera Pits East",
      "Twisted Ridge",
      "Entrance to Kander",
      "Lexdales Prison"
    ],
    "Crater Descent": [
      "Molten Heights Portal",
      "Lava Lake Bridge",
      "Rodoroc"
    ],
    "Orc Battlegrounds": [
      "Leadin Fortress",
      "Fortress South"
    ],
    "Canyon Waterfall North": [
      "Canyon Upper North West"
    ],
    "Burning Farm": [
      "Burning Airship",
      "Ghostly Path"
    ],
    "Gylia Lake South East": [
      "Cinfras County Upper",
      "Gylia Lake North East",
      "Thanos",
      "Gylia Lake South West"
    ],
    "Heart of Decay": [
      "Mushroom Hill",
      "Lexdale",
      "Decayed Basin"
    ],
    "Lexdales Prison": [
      "Viscera Pits West",
      "Twisted Ridge"
    ],
    "Dark Forest Village": [
      "Kander Mines",
      "Old Crossroads South",
      "Cinfras Outskirts",
      "Path to Talor"
    ],
    "Swamp East Mid": [
      "Swamp East Lower",
      "Swamp Mountain Base",
      "Swamp West Mid",
      "Swamp East Mid-Upper"
    ],
    "Swamp Lower": [
      "Swamp Dark Forest Transition Lower",
      "Swamp Mountain Base",
      "Entrance to Olux",
      "Iron Road"
    ],
    "Cinfras County Mid-Upper": [
      "Cinfras County Upper",
      "Cinfras County Mid-Lower",
      "Cinfras Thanos Transition"
    ],
    "Canyon Lower South East": [
      "Canyon Survivor",
      "Canyon Path South East",
      "Canyon Upper North West",
      "Canyon Path South West"
    ],
    "Viscera Pits East": [
      "Viscera Pits West",
      "Lexdale",
      "Path to Talor"
    ],
    "Cinfras County Lower": [
      "Cinfras's Small Farm",
      "Cinfras County Mid-Lower",
      "Aldorei's North Exit"
    ],
    "Gylia Lake North East": [
      "Gylia Lake North West",
      "Gert Camp",
      "Military Base",
      "Gylia Lake South East"
    ],
    "Swamp West Lower": [
      "Llevigar Plains West Upper",
      "Swamp East Lower",
      "Swamp West Mid"
    ],
    "Swamp Plains Basin": [
      "Swamp East Upper",
      "Swamp Mountain Base",
      "Entrance to Olux",
      "Swamp East Mid-Upper"
    ],
    "Canyon Path South West": [
      "Canyon Lower South East",
      "Canyon Path North West"
    ],
    "Canyon Path North West": [
      "Canyon Entrance Waterfall",
      "Canyon Path South East"
    ],
    "Rodoroc": [
      "Crater Descent"
    ],
    "Cinfras Thanos Transition": [
      "Cinfras County Mid-Upper",
      "Burning Airship",
      "Path To Thanos"
    ],
    "Swamp East Mid-Upper": [
      "Swamp East Mid",
      "Swamp West Mid-Upper",
      "Swamp East Upper",
      "Swamp Plains Basin"
    ],
    "Swamp West Mid-Upper": [
      "Swamp West Upper",
      "Swamp West Mid",
      "Swamp East Mid-Upper"
    ],
    "Swamp West Mid": [
      "Swamp East Mid",
      "Swamp West Mid-Upper",
      "Swamp West Lower"
    ],
    "Cinfras County Upper": [
      "Cinfras County Mid-Upper",
      "Path To Thanos",
      "Gylia Lake South East"
    ],
    "Thanos": [
      "Path To Military Base",
      "Path To Ozoth's Spire Lower",
      "Path To Thanos",
      "Gylia Lake South East"
    ],
    "Path To Ozoth's Spire Lower": [
      "Military Base Lower",
      "Thanos"
    ],
    "Canyon Path North Mid": [
      "Canyon Entrance Waterfall",
      "Canyon Waterfall Mid North",
      "Bandit Camp Exit",
      "Canyon Path South West"
    ],
    "Burning Airship": [
      "Bandit Cave Upper",
      "Burning Farm",
      "Cinfras Thanos Transition"
    ],
    "Canyon Path South East": [
      "Canyon Lower South East",
      "Canyon Path North West"
    ],
    "Path To Military Base": [
      "Thanos",
      "Military Base"
    ],
    "Path To Thanos": [
      "Thanos",
      "Cinfras Thanos Transition"
    ],
    "Swamp Dark Forest Transition Lower": [
      "Forgotten Path",
      "Fortress North",
      "Swamp Lower",
      "Entrance to Olux",
      "Swamp Dark Forest Transition Mid",
      "Fortress South"
    ],
    "Canyon Survivor": [
      "Cliff Side of the Lost",
      "Canyon Lower South East"
    ],
    "Canyon Entrance Waterfall": [
      "Canyon Path North Mid",
      "Canyon Path North West"
    ],
    "Cliff Side of the Lost": [
      "Canyon Survivor",
      "Canyon Dropoff",
      "Mountain Edge",
      "Valley of the Lost",
      "Canyon Of The Lost"
    ],
    "Bandit Cave Upper": [
      "Burning Airship"
    ],
    "Bandit Camp Exit": [
      "Canyon Valley South",
      "Canyon Path North Mid"
    ],
    "Military Base Lower": [
      "Thanos Valley West",
      "Path To Ozoth's Spire Lower",
      "Military Base Upper"
    ],
    "Swamp East Upper": [
      "Swamp West Upper",
      "Swamp Plains Basin",
      "Swamp East Mid-Upper",
      "Swamp Mountain Transition Upper",
      "Swamp Mountain Transition Mid-Upper"
    ],
    "Entrance to Rodoroc": [
      "Thesead Suburbs",
      "Eltom",
      "Rodoroc"
    ],
    "Eltom": [
      "Entrance to Rodoroc",
      "Ranol's Farm"
    ],
    "Ranol's Farm": [
      "Cherry Blossom Forest",
      "Thesead Suburbs",
      "Eltom"
    ],
    "Canyon Waterfall Mid North": [
      "Canyon Fortress",
      "Canyon Mountain South",
      "Canyon Path North Mid"
    ],
    "Military Base": [
      "Path To Military Base",
      "Military Base Upper"
    ],
    "Fortress South": [
      "Fortress North",
      "Swamp Dark Forest Transition Lower",
      "Mansion of Insanity",
      "Orc Battlegrounds"
    ],
    "Path To Ozoth's Spire Upper": [
      "Bandit Cave Lower",
      "Path To Thanos",
      "Path To Ozoth's Spire Mid",
      "Cinfras Thanos Transition"
    ],
    "Thanos Valley West": [
      "Military Base Lower"
    ],
    "Canyon Dropoff": [
      "Cliff Side of the Lost",
      "Mountain Path"
    ],
    "Valley of the Lost": [
      "Canyon Fortress",
      "Temple of the Lost East",
      "Canyon Of The Lost"
    ],
    "Thesead Suburbs": [
      "Chained House",
      "Thesead",
      "Entrance to Rodoroc",
      "Ranol's Farm"
    ],
    "Bandit Cave Lower": [
      "Canyon Valley South",
      "Path To Ozoth's Spire Upper"
    ],
    "Thesead": [
      "Thesead Suburbs",
      "Entrance to Thesead South"
    ],
    "Military Base Upper": [
      "Military Base Lower",
      "Military Base"
    ],
    "Entrance to Olux": [
      "Swamp Plains Basin",
      "Swamp Dark Forest Transition Lower",
      "Swamp Lower",
      "Swamp Dark Forest Transition Mid",
      "Olux"
    ],
    "Mountain Edge": [
      "Cliff Side of the Lost"
    ],
    "Chained House": [
      "Cherry Blossom Forest",
      "Thesead Suburbs",
      "Hive South",
      "Entrance to Thesead South"
    ],
    "Mountain Path": [
      "Canyon Dropoff"
    ],
    "Swamp Dark Forest Transition Mid": [
      "Swamp Dark Forest Transition Upper",
      "Swamp Dark Forest Transition Lower",
      "Taproot Descent",
      "Entrance to Olux",
      "Olux"
    ],
    "Canyon Fortress": [
      "Canyon Waterfall Mid North",
      "Valley of the Lost"
    ],
    "Temple of the Lost East": [
      "Krolton's Cave",
      "Valley of the Lost"
    ],
    "Swamp Mountain Transition Mid-Upper": [
      "Swamp East Upper",
      "Swamp Mountain Transition Upper",
      "Swamp Mountain Transition Mid"
    ],
    "Fortress North": [
      "Taproot Descent",
      "Mansion of Insanity",
      "Fortress South"
    ],
    "Path To Ozoth's Spire Mid": [
      "Path To Ozoth's Spire Upper",
      "Canyon Walk Way"
    ],
    "Canyon Mountain South": [
      "Canyon Waterfall Mid North",
      "Krolton's Cave"
    ],
    "Hive South": [
      "Chained House",
      "Cherry Blossom Forest",
      "Thanos Exit Upper",
      "Hive",
      "Canyon High Path"
    ],
    "Cherry Blossom Forest": [
      "Chained House",
      "Hive South",
      "Ranol's Farm"
    ],
    "Canyon Of The Lost": [
      "Cliff Side of the Lost",
      "Cliffside Lake",
      "Kandon-Beda",
      "Valley of the Lost"
    ],
    "Swamp Mountain Transition Upper": [
      "Swamp East Upper",
      "Swamp Mountain Transition Mid-Upper",
      "Olux"
    ],
    "Olux": [
      "Swamp Dark Forest Transition Upper",
      "Entrance to Olux",
      "Swamp Dark Forest Transition Mid",
      "Swamp Mountain Transition Upper"
    ],
    "Canyon Valley South": [
      "Bandit Cave Lower",
      "Bandit Camp Exit",
      "Canyon Mountain East"
    ],
    "Kandon-Beda": [
      "Canyon Of The Lost"
    ],
    "Entrance to Thesead South": [
      "Chained House",
      "Thesead",
      "Entrance to Thesead North",
      "Cliffside Valley"
    ],
    "Swamp West Upper": [
      "Swamp West Mid-Upper",
      "Swamp East Upper",
      "Swamp Mountain Transition Mid-Upper",
      "Swamp Mountain Transition Mid"
    ],
    "Canyon Walk Way": [
      "Canyon Mountain East",
      "Bandits Toll",
      "Path To Ozoth's Spire Mid"
    ],
    "Mansion of Insanity": [
      "Fortress North",
      "Twisted Housing",
      "Fortress South"
    ],
    "Entrance to Thesead North": [
      "Entrance to Thesead South",
      "Cliffside Passage North"
    ],
    "Cliffside Valley": [
      "Entrance to Thesead North",
      "Bandits Toll",
      "Entrance to Thesead South",
      "Air Temple Lower"
    ],
    "Canyon High Path": [
      "Thanos Exit Upper",
      "Hive South",
      "Cliffside Waterfall"
    ],
    "Cliffside Passage North": [
      "Entrance to Thesead North",
      "Cliffside Passage"
    ],
    "Cliffside Lake": [
      "Cliffside Passage",
      "Canyon Of The Lost"
    ],
    "Air Temple Lower": [
      "Air Temple Upper",
      "Krolton's Cave",
      "Cliffside Valley"
    ],
    "Swamp Dark Forest Transition Upper": [
      "Taproot Descent",
      "Swamp Dark Forest Transition Mid",
      "Olux"
    ],
    "Bandits Toll": [
      "Thanos Exit Upper",
      "Wizard Tower North",
      "Canyon Walk Way",
      "Cliffside Valley"
    ],
    "Air Temple Upper": [
      "Air Temple Lower"
    ],
    "Swamp Mountain Transition Mid": [
      "Swamp West Upper",
      "Swamp Mountain Transition Lower",
      "Swamp Mountain Transition Mid-Upper"
    ],
    "Canyon Mountain East": [
      "Canyon Valley South",
      "Canyon Walk Way"
    ],
    "Krolton's Cave": [
      "Canyon Mountain South",
      "Temple of the Lost East",
      "Wizard Tower North",
      "Air Temple Lower"
    ],
    "Thanos Exit Upper": [
      "Thanos Exit",
      "Bandits Toll",
      "Hive",
      "Hive South",
      "Canyon High Path"
    ],
    "Cliffside Waterfall": [
      "Canyon High Path"
    ],
    "Cliffside Passage": [
      "Cliffside Lake",
      "Cliffside Passage North"
    ],
    "Taproot Descent": [
      "Swamp Dark Forest Transition Upper",
      "Fortress North",
      "Swamp Dark Forest Transition Mid",
      "Gelibord Corrupted Farm",
      "Gelibord Castle"
    ],
    "Hive": [
      "Thanos Exit Upper",
      "Hive South"
    ],
    "Thanos Exit": [
      "Thanos Exit Upper"
    ],
    "Swamp Mountain Transition Lower": [
      "Swamp Mountain Transition Mid"
    ],
    "Wizard Tower North": [
      "Bandits Toll",
      "Krolton's Cave"
    ],
    "Gelibord Castle": [
      "Taproot Descent",
      "Gelibord Corrupted Farm"
    ]
  };
  var visited = new Set();
  var terrEdges = [];
  var dfs = (node) => {
    if (visited.has(node))
      return;
    visited.add(node);
    for (let next of routes[node]) {
      terrEdges.push([node, next]);
      dfs(next);
    }
  };
  Object.keys(routes).forEach((e) => dfs(e));

  // static/main.ts
  var canvas = document.querySelector("#cv");
  var gl = canvas.getContext("webgl2");
  var firstMove = true;
  function main() {
    if (!gl) {
      alert("Get your browser to support webgl2 smile\n(Chrome and Firefox support this for sure)");
    }
    let realWindowHeight, realWindowWidth;
    let canvasResize = () => {
      if (!realWindowHeight) {
        realWindowHeight = window.innerHeight;
        realWindowWidth = window.innerWidth;
      }
      canvas.width = realWindowWidth;
      canvas.height = realWindowHeight;
    };
    canvasResize();
    window.onresize = canvasResize;
    var then = 0;
    setup().then(() => {
      let mouseDown = false;
      document.onmousedown = () => {
        if (ImGui.GetIO().WantCaptureMouse)
          return;
        then = Date.now();
        mouseDown = true;
      };
      document.onmouseup = (e) => {
        if (ImGui.GetIO().WantCaptureMouse)
          return;
        let dt = Date.now() - then;
        if (dt < 150) {
          UI.showPopup = true;
          UI.popupScreenX = e.x;
          UI.popupScreenY = e.y;
          UI.popupVec2 = new ImGui.ImVec2(e.x, e.y);
        }
        mouseDown = false;
      };
      document.onmousemove = (e) => {
        if (firstMove) {
          UI.lastX = e.x;
          UI.lastY = e.y;
          firstMove = false;
          return;
        }
        if (ImGui.GetIO().WantCaptureMouse)
          return;
        if (mouseDown) {
          UI.showPopup = false;
          UI.camx -= (e.x - UI.lastX) * 8e-4;
          UI.camy += (e.y - UI.lastY) * 8e-4;
          UI.lastX = e.x;
          UI.lastY = e.y;
        } else {
          firstMove = true;
        }
      };
      document.onwheel = (e) => {
        if (ImGui.GetIO().WantCaptureMouse || 1 + UI.zoom + e.deltaY * 5e-4 <= 0)
          return;
        UI.zoom += e.deltaY * 5e-4;
      };
    });
  }
  async function setup() {
    await ImGui.default();
    ImGui.CreateContext();
    ImGui_Impl.Init(canvas);
    ImGui.StyleColorsDark();
    const clear_color = new ImGui.ImVec4(0.05, 0.05, 0, 1);
    async function setupShaders(vertexResource, fragmentResource) {
      const fragmentSrc = await (await fetch(fragmentResource)).text();
      const vertexSrc = await (await fetch(vertexResource)).text();
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertexSrc);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(vs));
        console.log(`Shader compile error ${vertexResource}`);
        gl.deleteShader(vs);
        return null;
      }
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fragmentSrc);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(fs));
        console.log(`Shader compile error ${fragmentResource}`);
        gl.deleteShader(fs);
        return null;
      }
      const shaderProg2 = gl.createProgram();
      gl.attachShader(shaderProg2, vs);
      gl.attachShader(shaderProg2, fs);
      gl.linkProgram(shaderProg2);
      if (!gl.getProgramParameter(shaderProg2, gl.LINK_STATUS)) {
        console.log(gl.getProgramInfoLog(shaderProg2));
        console.log("error linking");
        return null;
      }
      return shaderProg2;
    }
    const shaderProg = await setupShaders("/vertex.vs", "/fragment.fs");
    const terrShader = await setupShaders("/terr_vertex.vs", "/terr_fragment.fs");
    const lineShader = await setupShaders("/line_vertex.vs", "/line_fragment.fs");
    const fontShader = await setupShaders("/font_vertex.vs", "/font_fragment.fs");
    async function loadTexture(url, meta2, gl2) {
      var image = new Image();
      let texture2 = gl2.createTexture();
      return new Promise((resolve, reject) => {
        image.onload = () => {
          gl2.bindTexture(gl2.TEXTURE_2D, texture2);
          gl2.pixelStorei(gl2.UNPACK_FLIP_Y_WEBGL, true);
          gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, gl2.RGBA, gl2.UNSIGNED_BYTE, image);
          gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
          gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
          gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.NEAREST);
          meta2.ratio = image.width / image.height;
          meta2.width = image.width;
          meta2.height = image.height;
          resolve(texture2);
        };
        image.src = url;
      });
    }
    var meta = {width: 0, height: 0, ratio: 0};
    const texture = await loadTexture("/dest.webp", meta, gl);
    UI.mapWidth = meta.width;
    UI.mapRatio = meta.ratio;
    UI.mapHeight = meta.height;
    let [offsetX, offsetY] = [2392, -6607];
    const vertices = [
      -UI.mapRatio,
      -1,
      0,
      0,
      0,
      UI.mapRatio,
      -1,
      0,
      1,
      0,
      -UI.mapRatio,
      1,
      0,
      0,
      1,
      UI.mapRatio,
      1,
      0,
      1,
      1,
      -UI.mapRatio,
      1,
      0,
      0,
      1,
      -UI.mapRatio,
      -1,
      0,
      0,
      1
    ];
    let terdat = await (await fetch("/v1/terrCache")).json();
    let territories = Object.values(terdat.territories);
    ;
    let terrVertices = territories.map((t) => {
      let {startX, startZ, endX, endZ} = t.location;
      let color = hexToRGB(t.guildColor, t.guild);
      return getVerticesColor(UI.mapWidth, UI.mapHeight, offsetX, offsetY, startX, startZ, endX, endZ, color);
    }).flat();
    let lineVertices = territories.map((t) => {
      let {startX, startZ, endX, endZ} = t.location;
      return getBoxVertices(UI.mapWidth, UI.mapHeight, offsetX, offsetY, startX, startZ, endX, endZ, 4e-4);
    }).flat();
    let routeLineVertices = terrEdges.map((e) => {
      let [a, b] = e;
      let locA = terdat.territories[a].location;
      let locB = terdat.territories[b].location;
      let [aX, aY] = [(locA.startX + locA.endX) / 2, (locA.startZ + locA.endZ) / 2];
      let [bX, bY] = [(locB.startX + locB.endX) / 2, (locB.startZ + locB.endZ) / 2];
      return getLineVertices(UI.mapWidth, UI.mapHeight, offsetX, offsetY, aX, aY, bX, bY, 8e-4);
    }).flat();
    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
    gl.enableVertexAttribArray(1);
    const terrbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, terrbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
    gl.enableVertexAttribArray(1);
    const linebuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, linebuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(0);
    const routebuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, routebuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(routeLineVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(0);
    var mWorldLoc = gl.getUniformLocation(shaderProg, "world");
    var mProjLoc = gl.getUniformLocation(shaderProg, "proj");
    var mViewLoc = gl.getUniformLocation(shaderProg, "view");
    var terrWorldLoc = gl.getUniformLocation(terrShader, "world");
    var terrProjLoc = gl.getUniformLocation(terrShader, "proj");
    var terrViewLoc = gl.getUniformLocation(terrShader, "view");
    var mWorld = new Float32Array(16);
    var mProj = new Float32Array(16);
    var mView = new Float32Array(16);
    mat4.identity(mWorld);
    mat4.perspective(mProj, 3.1415926 / 4, canvas.width / canvas.height, 1e-3, 10);
    gl.useProgram(shaderProg);
    gl.uniformMatrix4fv(mProjLoc, false, mProj);
    gl.useProgram(terrShader);
    gl.uniformMatrix4fv(terrProjLoc, false, mProj);
    gl.useProgram(lineShader);
    var lineWorldLoc = gl.getUniformLocation(lineShader, "world");
    var lineProjLoc = gl.getUniformLocation(lineShader, "proj");
    var lineViewLoc = gl.getUniformLocation(lineShader, "view");
    gl.uniformMatrix4fv(lineProjLoc, false, mProj);
    const wFontRenderer = new WorldFontRenderer(fontShader, gl, UI.mapWidth, UI.mapHeight, offsetX, offsetY, mView, mProj, mWorld);
    gl.useProgram(shaderProg);
    var uSamplerLoc = gl.getUniformLocation(shaderProg, "uSampler");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSamplerLoc, 0);
    const uri = "https://api.wynncraft.com/public_api.php?action=statsLeaderboard&type=guild&timeframe=alltime";
    const prefMap = {};
    let namedTerrCoords;
    fetch(uri).then((data) => {
      return data.json();
    }).then((data) => {
      data = data.data;
      UI.guilds = data.map((e) => [e.prefix, e.name, e.territories]).sort((a, b) => a[2] < b[2]);
      for (var g of data) {
        prefMap[g.name] = g.prefix;
      }
      UI.showLeaderboard = true;
      namedTerrCoords = territories.map((t) => {
        return [prefMap[t.guild], t.location.startX + (t.location.endX - t.location.startX) / 2, t.location.startZ + (t.location.endZ - t.location.startZ) / 2];
      });
      UI.showTerritories = true;
    });
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    function _loop(time) {
      gl.useProgram(shaderProg);
      mat4.lookAt(mView, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
      mat4.fromTranslation(mWorld, vec4.fromValues(-UI.camx, -UI.camy, -(1 + UI.zoom), 0));
      gl.uniformMatrix4fv(mWorldLoc, false, mWorld);
      gl.uniformMatrix4fv(mViewLoc, false, mView);
      UI.drawAll(mProj, mView, time);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(clear_color.x, clear_color.y, clear_color.z, clear_color.w);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (UI.showTerritories) {
        gl.useProgram(terrShader);
        gl.uniformMatrix4fv(terrViewLoc, false, mView);
        gl.uniformMatrix4fv(terrWorldLoc, false, mWorld);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrbuf);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 6 * 4, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
        for (let i = 0; i < terrVertices.length / 6; i += 6) {
          gl.drawArrays(gl.TRIANGLE_STRIP, i, 6);
        }
        gl.useProgram(lineShader);
        gl.uniformMatrix4fv(lineViewLoc, false, mView);
        gl.uniformMatrix4fv(lineWorldLoc, false, mWorld);
        gl.bindBuffer(gl.ARRAY_BUFFER, linebuf);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
        for (let i = 0; i < lineVertices.length / 3; i += 3) {
          gl.drawArrays(gl.TRIANGLE_STRIP, i, 3);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, routebuf);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
        for (let i = 0; i < routeLineVertices.length / 3; i += 3) {
          gl.drawArrays(gl.TRIANGLE_STRIP, i, 3);
        }
        if (1 + UI.zoom < 0.9) {
          for (let i = 0; i < namedTerrCoords.length; i++) {
            if (!namedTerrCoords[i][0])
              continue;
            wFontRenderer.renderText(namedTerrCoords[i][0], namedTerrCoords[i][1], namedTerrCoords[i][2], (1 + UI.zoom) / 45);
          }
        }
      }
      ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
      window.requestAnimationFrame(_loop);
    }
    window.requestAnimationFrame(_loop);
  }
  main();
})();

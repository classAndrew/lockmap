import { unproject, dot3, getVertices, getVerticesColor, getLineVertices, getBoxVertices, coordConv, hexToRGB, Info } from './util.js';
import { WorldFontRenderer } from './fontrenderer.js';
import { UI } from './overlay.js';
import { terrEdges } from './assets/routes.js';

const canvas = document.querySelector("#cv");
var gl = canvas.getContext("webgl2");
// all program states
let firstMove = true;

! function main() {
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
    }
    canvasResize();
    window.onresize = canvasResize;
    var then = 0;
    setup().then(() => {
        let mouseDown = false;

        // for some reason event.buttons is broken
        document.onmousedown = () => {
            if (ImGui.GetIO().WantCaptureMouse) return;
            then = Date.now();
            mouseDown = true;
        }
        document.onmouseup = e => {
            if (ImGui.GetIO().WantCaptureMouse) return;
            let dt = Date.now() - then;
            if (dt < 150) {
                UI.showPopup = true;
                UI.popupScreenX = e.x;
                UI.popupScreenY = e.y;
                UI.popupVec2 = new ImGui.ImVec2(e.x, e.y);
            }
            mouseDown = false;
        }
        document.onmousemove = (e) => {
            if (firstMove) {
                UI.lastX = e.x;
                UI.lastY = e.y;
                firstMove = false;
                return;
            }
            if (ImGui.GetIO().WantCaptureMouse) return;
            if (mouseDown) {
                UI.showPopup = false;
                UI.camx -= (e.x - UI.lastX) * 0.0008;
                UI.camy += (e.y - UI.lastY) * 0.0008;
                UI.lastX = e.x;
                UI.lastY = e.y;
            } else {
                firstMove = true;
            }
        }
        document.onwheel = (e) => {
            if (ImGui.GetIO().WantCaptureMouse || 1 + UI.zoom + e.deltaY * 0.0005 <= 0) return;
            UI.zoom += e.deltaY * 0.0005;
        }

    });
}();

async function setup() {
    await ImGui.default();
    ImGui.CreateContext();
    ImGui_Impl.Init(canvas);
    ImGui.StyleColorsDark();
    const clear_color = new ImGui.ImVec4(0.05, 0.05, 0.0, 1.00);

    async function setupShaders(vertexResource, fragmentResource) {
        const fragmentSrc = await (await fetch(fragmentResource)).text()
        const vertexSrc = await (await fetch(vertexResource)).text()

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSrc);
        gl.compileShader(vs);

        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(vs));
            console.log(`Shader compile error ${vertexResource}`);
            gl.deleteShader(vs);
            return;
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSrc);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(fs));
            console.log(`Shader compile error ${fragmentResource}`);
            gl.deleteShader(fs);
            return;
        }

        const shaderProg = gl.createProgram();
        gl.attachShader(shaderProg, vs);
        gl.attachShader(shaderProg, fs);
        gl.linkProgram(shaderProg);
        if (!gl.getProgramParameter(shaderProg, gl.LINK_STATUS)) {
            console.log(gl.getProgramInfoLog(shaderProg));
            return console.log("error linking");
        }
        return shaderProg;
    }

    const shaderProg = await setupShaders("/vertex.vs", "/fragment.fs");
    const terrShader = await setupShaders("/terr_vertex.vs", "/terr_fragment.fs");
    const lineShader = await setupShaders("/line_vertex.vs", "/line_fragment.fs");
    const fontShader = await setupShaders("/font_vertex.vs", "/font_fragment.fs");

    // it onload isn't asynchronous
    async function loadTexture(url, meta, gl) {
        var image = new Image();
        let texture = gl.createTexture();
        return new Promise((resolve, reject) => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                meta.ratio = image.width / image.height;
                meta.width = image.width;
                meta.height = image.height;
                resolve(texture);
            }
            image.src = url;
        })
    }
    var meta = {};
    // gl.activeTexture(gl.TEXTURE0);
    const texture = await loadTexture("/dest.webp", meta, gl);
    UI.mapWidth = meta.width;
    UI.mapRatio = meta.ratio;
    UI.mapHeight = meta.height;
    let [offsetX, offsetY] = [2392, -6607];

    const vertices = [-UI.mapRatio, -1, 0, 0, 0,
    UI.mapRatio, -1, 0, 1, 0, -UI.mapRatio, 1, 0, 0, 1,

    UI.mapRatio, 1, 0, 1, 1, -UI.mapRatio, 1, 0, 0, 1, -UI.mapRatio, -1, 0, 0, 1
    ];

    // code for generating vertices of ALL territories

    let terdat = await (await fetch("https://api.wynncraft.com/public_api.php?action=territoryList")).json();
    let territories = Object.values(terdat.territories);

    let terrVertices = territories.map(t => {
        let { startX, startY, endX, endY } = t.location;
        let color = hexToRGB("", t.guild);
        return getVerticesColor(UI.mapWidth, UI.mapHeight, offsetX, offsetY, startX, startY, endX, endY, color);
    }).flat();

    // generate vertices for territory box outlines
    let lineVertices = territories.map(t => {
        let { startX, startY, endX, endY } = t.location;
        return getBoxVertices(UI.mapWidth, UI.mapHeight, offsetX, offsetY, startX, startY, endX, endY, 0.0004);
    }).flat();

    // generating the vertices for the trade route lines
    let routeLineVertices = terrEdges.map(e => {
        let [a, b] = e;
        let locA = terdat.territories[a].location;
        let locB = terdat.territories[b].location;
        let [aX, aY] = [(locA.startX + locA.endX) / 2, (locA.startY + locA.endY) / 2];
        let [bX, bY] = [(locB.startX + locB.endX) / 2, (locB.startY + locB.endY) / 2];
        return getLineVertices(UI.mapWidth, UI.mapHeight, offsetX, offsetY, aX, aY, bX, bY, 0.0008);
    }).flat();

    // gl buffer create and init code
    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
    // layout = 0
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
    // layout = 1
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

    // routes
    const routebuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, routebuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(routeLineVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(0);

    // build matrices

    var mWorldLoc = gl.getUniformLocation(shaderProg, "world");
    var mProjLoc = gl.getUniformLocation(shaderProg, "proj");
    var mViewLoc = gl.getUniformLocation(shaderProg, "view");

    // these are for the terr overlay. they have to get transformed in the same way
    var terrWorldLoc = gl.getUniformLocation(terrShader, "world");
    var terrProjLoc = gl.getUniformLocation(terrShader, "proj");
    var terrViewLoc = gl.getUniformLocation(terrShader, "view");

    var mWorld = new Float32Array(16);
    var mProj = new Float32Array(16);
    var mView = new Float32Array(16);

    mat4.identity(mWorld);
    // camera pos, looking at, up
    // 3.394
    mat4.perspective(mProj, 3.1415926 / 4, canvas.width / canvas.height, 0.001, 10.0);
    gl.useProgram(shaderProg);
    gl.uniformMatrix4fv(mProjLoc, false, mProj);

    gl.useProgram(terrShader);
    gl.uniformMatrix4fv(terrProjLoc, false, mProj);

    // set the uniforms for the line shader
    gl.useProgram(lineShader);
    var lineWorldLoc = gl.getUniformLocation(lineShader, "world");
    var lineProjLoc = gl.getUniformLocation(lineShader, "proj");
    var lineViewLoc = gl.getUniformLocation(lineShader, "view");

    gl.uniformMatrix4fv(lineProjLoc, false, mProj);

    // world font renderer

    const wFontRenderer = new WorldFontRenderer(fontShader, gl, UI.mapWidth, UI.mapHeight, offsetX, offsetY, mView, mProj, mWorld);

    // load and bind textures
    // have to switch progam before sending uniform
    gl.useProgram(shaderProg);

    var uSamplerLoc = gl.getUniformLocation(shaderProg, "uSampler");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSamplerLoc, 0);

    const uri = "https://api.wynncraft.com/public_api.php?action=statsLeaderboard&type=guild&timeframe=alltime"
    const prefMap = {};
    let namedTerrCoords;
    fetch(uri).then(data => {
        return data.json();
    }).then(data => {
        data = data.data;
        UI.guilds = data.map(e => [e.prefix, e.name, e.territories]).sort((a, b) => a[2] < b[2]);
        for (var g of data) {
            prefMap[g.name] = g.prefix;
        }
        UI.showLeaderboard = true;
        // get territory coordinates along with the controlling guild
        namedTerrCoords = territories.map(t => {
            return [prefMap[t.guild], t.location.startX + (t.location.endX - t.location.startX) / 2, t.location.startY + (t.location.endY - t.location.startY) / 2];
        });
        UI.showTerritories = true;
    });


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    function _loop(time) {
        // use main program (the one for drawing the map)
        // switch textures have to do this every time
        gl.useProgram(shaderProg);
        mat4.lookAt(mView, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
        mat4.fromTranslation(mWorld, vec4.fromValues(-UI.camx, -UI.camy, -(1 + UI.zoom), 0));
        gl.uniformMatrix4fv(mWorldLoc, false, mWorld);
        gl.uniformMatrix4fv(mViewLoc, false, mView);

        UI.drawAll(mProj, mView, time);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(clear_color.x, clear_color.y, clear_color.z, clear_color.w);
        // do I need to clear depth buffer sometimes?
        gl.clear(gl.COLOR_BUFFER_BIT);
        // have to do this in the render loop. Font texture will be done in renderText call
        gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
        // textures MUST be done like this. Must be binded and activated
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // I have to do this everytime I switch buffers
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
        // transparency
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // gl.drawArrays(gl.TRIANGLE_STRIP, 3, 3);
        if (UI.showTerritories) {
            // switch to drawing territory overlay
            gl.useProgram(terrShader);
            gl.uniformMatrix4fv(terrViewLoc, false, mView);
            gl.uniformMatrix4fv(terrWorldLoc, false, mWorld);
            // I have to do this everytime I switch buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, terrbuf);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 6 * 4, 0);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
            // this is the 'proper' way to do it without EBO
            // there's 6 values per vertex. divide by 6 to get num of vertices, 
            // i+=6 to jump to the next vertex, and drawArrays(..., 6) because there's
            // 6 indices between each vertex
            for (let i = 0; i < terrVertices.length / 6; i += 6) {
                gl.drawArrays(gl.TRIANGLE_STRIP, i, 6);
            }

            // switch to drawing the bounding boxes
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

            // wFontRenderer.renderText("morph besst build text plox work", 1, 0);
            if (1 + UI.zoom < 0.9) {
                for (let i = 0; i < namedTerrCoords.length; i++) {
                    if (!namedTerrCoords[i][0]) continue;
                    wFontRenderer.renderText(namedTerrCoords[i][0], namedTerrCoords[i][1], namedTerrCoords[i][2], (1 + UI.zoom) / 45);
                }
            }
        }

        ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

        window.requestAnimationFrame(_loop);
    }
    window.requestAnimationFrame(_loop);
}

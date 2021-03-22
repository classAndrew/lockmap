const canvas = document.querySelector("#cv");
const VERSIONSTRING = "Version 0.1.1"
var gl = canvas.getContext("webgl2");
// all program states
let firstMove = true;
var camx = 0;
var camy = 0;
var zoom = 0;
var lastX = 0;
var lastY = 0;
var mapRatio;
var mapHeight;
var mapWidth;

! function main() {

    if (!gl) {
        alert("Get your browser to support webgl2 smile");
    }

    function canvasResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    // extremely hacky workaround. All of this works on Firefox but chrome doesn't want to work
    setTimeout(canvasResize, 100);
    setup().then(() => {
        let mouseDown = false;

        // for some reason event.buttons is broken
        document.onmousedown = () => mouseDown = true;
        document.onmouseup = () => mouseDown = false;
        document.onmousemove = (e) => {
            if (firstMove) {
                lastX = e.x;
                lastY = e.y;
                firstMove = false;
                return;
            }
            if (mouseDown && !ImGui.GetIO().WantCaptureMouse) {
                camx -= (e.x - lastX) * 0.0008;
                camy += (e.y - lastY) * 0.0008;
                lastX = e.x;
                lastY = e.y;
            } else {
                firstMove = true;
            }
        }
        document.onwheel = (e) => {
            if (ImGui.GetIO().WantCaptureMouse || 1 + zoom + e.deltaY * 0.0005 <= 0) return;
            zoom += e.deltaY * 0.0005;
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
    async function loadTexture(url, meta) {
        var image = new Image();
        let texture = gl.createTexture();
        return new Promise((resolve, reject) => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
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
    const texture = await loadTexture("/dest.png", meta);
    mapWidth = meta.width;
    mapRatio = meta.ratio;
    mapHeight = meta.height;

    let [offsetX, offsetY] = [2392, -6607];

    const vertices = [-mapRatio, -1, 0, 0, 0,
        mapRatio, -1, 0, 1, 0, -mapRatio, 1, 0, 0, 1,

        mapRatio, 1, 0, 1, 1, -mapRatio, 1, 0, 0, 1, -mapRatio, -1, 0, 0, 1
    ];

    // code for generating vertices of ALL territories
    
    let terdat = await (await fetch("https://api.wynncraft.com/public_api.php?action=territoryList")).json();
    let territories = Object.values(terdat.territories);
    let terrVertices = territories.map(t => {
        let {startX, startY, endX, endY} = t.location;
        return getVertices(mapWidth, mapHeight, offsetX, offsetY, startX, startY, endX, endY);
    }).flat();

    // generate vertices for territory box outlines
    let lineVertices = territories.map(t => {
        let {startX, startY, endX, endY} = t.location;
        return getBoxVertices(mapWidth, mapHeight, offsetX, offsetY, startX, startY, endX, endY, 0.0004);
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
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
    gl.enableVertexAttribArray(0);

    const linebuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, linebuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
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
    mat4.perspective(mProj, 3.1415926 / 4, canvas.width / canvas.height, 0.001, 100.0);
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

    const wFontRenderer = new WorldFontRenderer(fontShader, gl, mapWidth, mapHeight, offsetX, offsetY, mView, mProj, mWorld);
    
    // load and bind textures
    // have to switch progam before sending uniform
    gl.useProgram(shaderProg);

    var uSamplerLoc = gl.getUniformLocation(shaderProg, "uSampler");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSamplerLoc, 0);

    const uri = "https://api.wynncraft.com/public_api.php?action=statsLeaderboard&type=guild&timeframe=alltime"
    const res = await (await fetch(uri)).json()
    const guilds = res.data.map(e => [e.prefix, e.name, e.territories]).sort((a, b) => a[2] < b[2]);
    var show_terr_leaderboard = true;
    gl.enable(gl.DEPTH_TEST);  
    gl.enable(gl.BLEND);
    function _loop(time) {
        // gl.clear(gl.GL_COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);  
        // use main program (the one for drawing the map)
        // switch textures have to do this every time
        gl.useProgram(shaderProg);
        mat4.lookAt(mView, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
        mat4.fromTranslation(mWorld, vec4.fromValues(-camx, -camy, -(1 + zoom), 0));
        gl.uniformMatrix4fv(mWorldLoc, false, mWorld);
        gl.uniformMatrix4fv(mViewLoc, false, mView);
        ImGui_Impl.NewFrame(time);
        ImGui.NewFrame();
        if (show_terr_leaderboard) {
            ImGui.Begin("Territory Leaderboard",
                (value = show_terr_leaderboard) => show_terr_leaderboard = value);
            guilds.forEach((e) => ImGui.Text(`${e[2]} ${e[0]}: ${e[1]}`));
            if (ImGui.Button("Close"))
                show_terr_leaderboard = false;
            ImGui.End();
        }
        ImGui.Begin("LockMap - The cooler map alternative");
        ImGui.Text(VERSIONSTRING);
        ImGui.Text(`Running at ${Math.round(ImGui.GetIO().Framerate)} fps`);

        // compute coordinates by reversing
        let hit = unproject(mView, mProj, lastX, lastY, window.innerWidth, window.innerHeight);
        // local x and y is in-game coords
        let localX = Math.round((mapRatio - hit[0] + camx) * 4091 / (2 * mapRatio) - 2392);
        let localY = Math.round((1 + hit[1] - camy) * 6485 / 2 - 6607);
        ImGui.Text(`x: ${localX}, y: ${localY}`);
        ImGui.Checkbox("Territory Leaderboard", (value = show_terr_leaderboard) => show_terr_leaderboard = value)
        ImGui.End();
        ImGui.EndFrame();
        ImGui.Render();

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
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3*4);
        // transparency
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // gl.drawArrays(gl.TRIANGLE_STRIP, 3, 3);

        // switch to drawing territory overlay
        gl.useProgram(terrShader);
        gl.uniformMatrix4fv(terrViewLoc, false, mView);
        gl.uniformMatrix4fv(terrWorldLoc, false, mWorld);
        // I have to do this everytime I switch buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, terrbuf);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
        
        // this is the 'proper' way to do it without EBO
        for (let i = 0; i < terrVertices.length/3; i+=3) {
            gl.drawArrays(gl.TRIANGLE_STRIP, i, 3);
        }
        
        // switch to drawing the bounding boxes
        gl.useProgram(lineShader);
        gl.uniformMatrix4fv(lineViewLoc, false, mView);
        gl.uniformMatrix4fv(lineWorldLoc, false, mWorld);
        gl.bindBuffer(gl.ARRAY_BUFFER, linebuf);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
        for (let i = 0; i < lineVertices.length/3; i+=3) {
            gl.drawArrays(gl.TRIANGLE_STRIP, i, 3);
        }
        
        // wFontRenderer.renderText("morph besst build text plox work", 1, 0);
        wFontRenderer.renderText("ANO", -857, -1577, (1+zoom)/45);
        ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

        window.requestAnimationFrame(_loop);
    }
    window.requestAnimationFrame(_loop);
}

function unproject(view, proj, mx, my, screenWidth, screenHeight) {
    let x = 2.0 * mx / screenWidth - 1.0;
    let y = 1.0 - (2.0 * my) / screenHeight;
    let z = 1.0;
    // let ray_nds = vec3.fromValues(x, y, z);
    let ray_clip = vec4.fromValues(x, y, -1.0, 1.0);
    let projinv = new Float32Array(16);
    mat4.invert(projinv, proj);
    let ray_eye = vec4.create();
    mat4.mul(ray_eye, projinv, ray_clip);
    ray_eye = vec4.fromValues(ray_eye[0], ray_eye[1], -1.0, 0.0);
    // view inverse should be the same anyways since it's identity
    let viewinv = new Float32Array(16);
    mat4.invert(viewinv, view);
    let ray_wor = vec4.create();
    mat4.mul(ray_wor, viewinv, ray_eye);
    ray_wor = vec3.fromValues(ray_wor[0], ray_wor[1], ray_wor[2]);
    vec3.normalize(ray_wor, ray_wor);
    // plane normal. it's just <0, 0, 1>
    let n = vec3.fromValues(0, 0, 1);
    // distance from camera
    let d = -(1 + zoom);
    // origin of the ray. again, no view so it's just 0,0,0
    let O = vec3.fromValues(0, 0, 0);
    // compute t
    let t = -(dot3(O, n) + d) / dot3(ray_wor, n);
    vec3.scale(ray_wor, ray_wor, t);
    vec3.add(O, O, ray_wor);
    return O;
}

function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getVertices(mapResX, mapResY, offsetX, offsetY, startX, startY, endX, endY) {
    let [startx, starty, endx, endy] = [(startX+offsetX)/mapResX, (mapResY-startY+offsetY)/mapResY,
         (endX+offsetX)/mapResX, (mapResY-endY+offsetY)/mapResY];
    const terrVertices = [
        -mapRatio+startx*mapRatio*2, -1+starty*2, 0.001, 
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,

        -mapRatio+endx*mapRatio*2, -1+endy*2, 0.001,
        -mapRatio+startx*mapRatio*2, -1+endy*2, 0.001,
        -mapRatio+endx*mapRatio*2, -1+starty*2, 0.001
    ];
    return terrVertices;
}

// in-game coordinates (aka annoying offset time). 
function getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    [x0, y0, x1, y1] = [(x0+offsetX)/mapResX, (mapResY-y0+offsetY)/mapResY,
        (x1+offsetX)/mapResX, (mapResY-y1+offsetY)/mapResY];
    // compute perpendicular vectors (unit vec)
    let u = [(y1-y0), -(x1-x0)*mapRatio];
    vec2.normalize(u, u);
    vec2.scale(u, u, thickness);

    const lineVertices = [
        -mapRatio+(x0)*mapRatio*2-u[0], -1+(y0)*2-u[1], 0.0012, 
        -mapRatio+(x0)*mapRatio*2+u[0], -1+(y0)*2+u[1], 0.0012,
        -mapRatio+(x1)*mapRatio*2+u[0], -1+(y1)*2+u[1], 0.0012,

        -mapRatio+(x1)*mapRatio*2-u[0], -1+(y1)*2-u[1], 0.0012,
        -mapRatio+(x0)*mapRatio*2-u[0], -1+(y0)*2-u[1], 0.0012,
        -mapRatio+(x1)*mapRatio*2+u[0], -1+(y1)*2+u[1], 0.0012
    ];
    return lineVertices;
}

// in-game coordinates to opengl [-1, 1] coordinates
function coordConv(mapResX, mapResY, offsetX, offsetY, x, y) {
    return [(x+offsetX)/mapResX, (mapResY-y+offsetY)/mapResY]
}

// gets the bounding box vertices from points
function getBoxVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y1, thickness) {
    const vertices = [].concat(
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y0, x1, y0, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y0, x1, y1, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x1, y1, x0, y1, thickness),
        getLineVertices(mapResX, mapResY, offsetX, offsetY, x0, y1, x0, y0, thickness),
    );
    return vertices;
}
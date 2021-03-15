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

! function main() {

    if (!gl) {
        alert("Get your browser to support webgl2 :)");
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

    async function setupShaders() {
        const fragmentSrc = await (await fetch("/fragment.fs")).text()
        const vertexSrc = await (await fetch("/vertex.vs")).text()

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSrc);
        gl.compileShader(vs);

        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(vs));
            console.log("Shader compile error (Vertex)");
            gl.deleteShader(vs);
            return;
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSrc);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(fs));
            console.log("Shader compile error (Fragment)");
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

    const shaderProg = await setupShaders();
    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    // const vertices = [-1, -1, 0, 0, 0, 1, -1, 0, 1, 0, -1, 1, 0, 0, 1, 1, 1, 0, 1, 1];
    /*
        [-1, -1, 0, 0, 0,
         1, -1, 0, 1, 0,
         -1, 1, 0, 0, 1,

         1, 1, 0, 1, 1,
         -1, 1, 0, 0, 1,
         -1, -1, 0, 0, 1
        ]
    */
    var map_ratio;
    var map_width, map_height;
    var image = new Image();
    // it onload isn't asynchronous
    async function loadTexture(image) {
        let texture = gl.createTexture();
        return new Promise((resolve, reject) => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                map_ratio = image.width / image.height;
                map_width = image.width;
                map_height = image.height;
                resolve(texture);
            }
            image.src = "/dest.png";
        })
    }

    const texture = await loadTexture(image);

    const vertices = [-map_ratio, -1, 0, 0, 0,
        map_ratio, -1, 0, 1, 0, -map_ratio, 1, 0, 0, 1,

        map_ratio, 1, 0, 1, 1, -map_ratio, 1, 0, 0, 1, -map_ratio, -1, 0, 0, 1
    ];
    // const vertices = [-1, -1, 0, 1, -1, 0, -1, 1, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
    // layout = 0
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
    // layout = 1
    gl.enableVertexAttribArray(1);

    gl.useProgram(shaderProg);

    // load and bind textures

    var uSamplerLoc = gl.getUniformLocation(shaderProg, "uSampler");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSamplerLoc, 0);

    // build matrices

    var mWorldLoc = gl.getUniformLocation(shaderProg, "world");
    var mProjLoc = gl.getUniformLocation(shaderProg, "proj");
    var mViewLoc = gl.getUniformLocation(shaderProg, "view");

    var mWorld = new Float32Array(16);
    var mProj = new Float32Array(16);
    var mView = new Float32Array(16);

    mat4.identity(mWorld);
    // camera pos, looking at, up
    // 3.394
    mat4.perspective(mProj, 3.1415926 / 4, canvas.width / canvas.height, 0.01, 100.0);

    gl.uniformMatrix4fv(mWorldLoc, false, mWorld);
    gl.uniformMatrix4fv(mProjLoc, false, mProj);

    const uri = "https://api.wynncraft.com/public_api.php?action=statsLeaderboard&type=guild&timeframe=alltime"
    const res = await (await fetch(uri)).json()
    const guilds = res.data.map(e => [e.prefix, e.name, e.territories]).sort((a, b) => a[2] < b[2]);
    var show_terr_leaderboard = true;
    var done = false;

    function _loop(time) {
        // change so that the camera shouldn't be moving but the world is
        mat4.lookAt(mView, [camx, camy, 1 + zoom], [camx, camy, 0], [0, 1, 0]);

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
        // compute the coodinates
        // let localX = Math.floor((map_ratio + camx) * 4091 / 2 / map_ratio - 2392);
        // let localY = Math.floor((1 - camy + (window.innerHeight / 2 - lastY) / innerHeight) * (1 + zoom) * 6485 / 2 - 6607);
        let hit = unproject(mView, mProj, lastX, lastY, window.innerWidth, window.innerHeight);
        let localX = (map_ratio - hit[0]) * 4091 / (2 * map_ratio) - 2392;
        let localY = (1 + hit[1]) * 6485 / 2 - 6607;
        ImGui.Text(`x: ${localX}, y: ${localY}`);
        ImGui.Checkbox("Territory Leaderboard", (value = show_terr_leaderboard) => show_terr_leaderboard = value)
        ImGui.End();
        ImGui.EndFrame();
        ImGui.Render();

        gl.uniformMatrix4fv(mViewLoc, false, mView);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(clear_color.x, clear_color.y, clear_color.z, clear_color.w);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
        // transparency
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        // gl.useProgram(shaderProg);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
    // distance from camera
    let d = -(1 + zoom);
    // origin of the ray. again, no view so it's just 0,0,0
    let O = vec3.fromValues(0, 0, 0);
    // plane normal. it's just <0, 0, 1>
    let n = vec3.fromValues(0, 0, 1);
    // compute t
    let t = -(dot3(O, n) + d) / dot3(ray_wor, n);
    vec3.scale(ray_wor, ray_wor, t);
    vec3.add(O, O, ray_wor);
    return O;
}

function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
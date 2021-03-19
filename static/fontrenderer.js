const bitmapWidth = 128;
const bitmapHeight = 64;
// chars aren't packed tightly for some reason >.>
const charWidth = 7+2;
const charHeight = 5+2;
const bitmapRatio = bitmapWidth/bitmapHeight;

class WorldFontRenderer {
    shader;
    gl;
    charBuffer;
    fontmap;
    map_width;
    map_height;
    offsetX;
    offsetY;

    // vertices for a single character (will get subbuffered to change the character)
    // charVertices = [-1.0, -1.0, 0.0, 0.0, 0.0,
    //                 1.0, -1.0, 0.0, 0.0, 0.0,
    //                 -1.0, 1.0, 0.0, 0.0, 0.0,

    //                 1.0, 1.0, 0.0, 0.0, 0.0,
    //                 -1.0, 1.0, 0.0, 0.0, 0.0,
    //                 1.0, -1.0, 0.0, 0.0, 0.0];
    
    // fontmap is font bitmap and will be a texture that is already loaded
    constructor(shader, gl, map_width, map_height, offsetX, offsetY, fontmap) {
        Object.assign(this, [shader, gl, map_width, map_height, offsetX, offsetY, fontmap]);
        // initialize the char buffer. one buffer per char
        this.charBuffer = Array(90);
        for (let i = 0; i < 90; i++) {
            this.charBuffer[i] = this.gl.createBuffer();
            this.gl.bindBuffer(this.charBuffer[i]);
            let c = text.charCodeAt(i)-33;
            // TODO: optimize precompute
            let row = (bitmapHeight-Math.floor(c/bitmapWidth/charWidth)*charHeight)/bitmapHeight;
            let col = c % (bitmapWidth/charWidth)* charWidth/bitmapWidth;
            let charVertices = [
                -1.0*bitmapRatio, -1.0, 0.0, (row)*bitmapRatio, 1-col,
                1.0*bitmapRatio, -1.0, 0.0, (row+charWidth/bitmapWidth)*bitmapRatio, 1-col,
                -1.0*bitmapRatio, 1.0, 0.0, (row)*bitmapRatio, 1-col+charHeight/bitmapHeight,

                1.0*bitmapRatio, 1.0, 0.0, (row+charWidth/bitmapWidth)*bitmapRatio, 1-col+charHeight/bitmapHeight,
                -1.0*bitmapRatio, 1.0, 0.0, (row)*bitmapRatio, 1-col+charHeight/bitmapHeight,
                1.0*bitmapRatio, -1.0, 0.0, (row+charWidth/bitmapWidth)*bitmapRatio, 1-col
            ];
            this.gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(charVertices), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5*4, 3*4);
            gl.enableVertexAttribArray(0);
        }
    }
    
    // take in-game coordinates and render directly using vertices (no model matrix involved)
    // not a hud text renderer. Renders text into the world
    renderText(text, x, y, size) {
        // length = num letters * 3 * 2
        this.gl.useProgram(this.shader);
        for (let i = 0; i < text.length; i++) {
            let c = text.charCodeAt(i)-33;
            this.gl.bindBuffer(this.charBuffer[c]);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5*4, 0);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5*4, 3*4);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3); 
            gl.drawArrays(gl.TRIANGLE_STRIP, 3, 3);
        }
        // can use textvertices as an instance var instead of new instantiatio

    }

}
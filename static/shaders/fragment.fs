#version 300 es
precision mediump float;

in vec4 vPos;
in vec2 TexCoord;
out vec4 FragColor;
uniform sampler2D uSampler;
void main() {
    FragColor = texture(uSampler, TexCoord);
}
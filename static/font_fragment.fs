#version 300 es
precision mediump float;

in vec2 TexCoord;
in vec4 vPos;

uniform sampler2D uSampler;

out vec4 FragColor;

void main() {
    FragColor = texture(uSampler, TexCoord);
}


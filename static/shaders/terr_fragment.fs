#version 300 es
precision mediump float;

in vec4 vPos;
in vec3 vColor;

out vec4 FragColor;
void main() {
    FragColor = vec4(vColor, 0.3);
}
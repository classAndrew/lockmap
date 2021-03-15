#version 300 es

layout (location = 0) in vec3 aVertexPosition;
uniform mat4 proj;
uniform mat4 view;
uniform mat4 world;
out vec4 vPos;
void main() {
    gl_Position = proj*view*world*vec4(aVertexPosition, 1.0);
    vPos = gl_Position; 
}
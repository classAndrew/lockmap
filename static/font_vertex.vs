#version 300 es
layout (location = 0) in vec3 aVertexPosition;
layout (location = 1) in vec2 aTexCoord;

out vec2 texPos;
out vec4 vPos;

uniform mat4 world;
uniform mat4 view;
uniform mat4 proj;

void main() {
    gl_Position = proj*view*world*vec4(aVertexPosition, 1.0);
    vPos = gl_Position;
    texPos = aTexCoord;
}

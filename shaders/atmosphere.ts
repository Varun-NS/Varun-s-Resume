/**
 * Inner-surface gradient for the room the visitor stands in.
 * A horizon band keeps the space from reading as a flat void and gives the
 * cards something to float against. Colors arrive as uniforms so the same
 * shell serves both the midnight room and the daylight gallery.
 */

export const atmosphereVertex = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uBand;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);

    // Horizon band: strongest at the equator, falling off toward the poles.
    float horizon = pow(1.0 - abs(dir.y), 3.0);

    vec3 color = mix(uDeep, uBand, horizon * 0.85);

    gl_FragColor = vec4(color, 1.0);
  }
`;

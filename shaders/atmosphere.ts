/**
 * Inner-surface gradient for the room the visitor stands in.
 * A near-black horizon band keeps the space from reading as a flat void
 * and gives the cards something to float against.
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
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);

    // Horizon band: brightest at the equator, falling off toward the poles.
    float horizon = pow(1.0 - abs(dir.y), 3.0);

    vec3 deep = vec3(0.00, 0.00, 0.00); // True black
    vec3 band = vec3(0.012, 0.014, 0.020); // Very subtle dark blue/gray horizon
    vec3 color = mix(deep, band, horizon * 0.85);

    gl_FragColor = vec4(color, 1.0);
  }
`;

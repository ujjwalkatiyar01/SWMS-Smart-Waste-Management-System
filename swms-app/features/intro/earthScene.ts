import * as THREE from "three";

export type EarthScene = { render: (seconds: number) => void; dispose: () => void };

export async function createEarthScene(canvas: HTMLCanvasElement): Promise<EarthScene | undefined> {
  if (!canvas.getContext("webgl2", { alpha: true, antialias: true })) return;
  const textures: THREE.Texture[] = [];
  const loader = new THREE.TextureLoader();
  let expired = false;
  let timeout = 0;
  const load = (path: string) => new Promise<THREE.Texture>((resolve, reject) => {
    const texture = loader.load(path, (loaded) => {
      if (expired) loaded.dispose();
      resolve(loaded);
    }, undefined, reject);
    textures.push(texture);
  });
  let maps: THREE.Texture[];
  try {
    maps = await Promise.race([
      Promise.all([load("/brand/intro/earth-day.jpg"), load("/brand/intro/earth-clouds.png")]),
      new Promise<never>((_, reject) => { timeout = window.setTimeout(() => reject(new Error("Texture deadline")), 1100); }),
    ]);
  } catch {
    expired = true;
    textures.forEach((texture) => texture.dispose());
    return;
  } finally {
    clearTimeout(timeout);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
  camera.position.z = 5.8;
  maps[0].colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.SphereGeometry(1, 64, 40);
  const earthMaterial = new THREE.MeshPhongMaterial({ map: maps[0], shininess: 25, specular: new THREE.Color(0x24476b) });
  const globe = new THREE.Mesh(geometry, earthMaterial);
  scene.add(globe);
  const cloudMaterial = new THREE.MeshPhongMaterial({ map: maps[1], transparent: true, opacity: .55, depthWrite: false });
  const clouds = new THREE.Mesh(geometry, cloudMaterial);
  clouds.scale.setScalar(1.012);
  scene.add(clouds);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition;
      void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vPosition;
      void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.0);
      vec3 light=mix(vec3(0.0,0.40,1.0),vec3(1.0,0.58,0.12),smoothstep(-0.7,0.8,vPosition.x));
      gl_FragColor=vec4(light,rim*0.7);}`,
  });
  const atmosphere = new THREE.Mesh(geometry, atmosphereMaterial);
  atmosphere.scale.setScalar(1.055);
  scene.add(atmosphere);
  scene.add(new THREE.AmbientLight(0xb1c7df, .95));
  const blue = new THREE.DirectionalLight(0x65cfff, 2.4);
  blue.position.set(-3, 2, 3);
  const gold = new THREE.DirectionalLight(0xffc576, 2.1);
  gold.position.set(3, .4, 1);
  scene.add(blue, gold);

  let width = 0;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    expired = true;
    geometry.dispose();
    earthMaterial.dispose(); cloudMaterial.dispose(); atmosphereMaterial.dispose();
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };
  // Compile with the browser's parallel shader extension before the first frame where available.
  try { await renderer.compileAsync(scene, camera); }
  catch { dispose(); return; }
  return {
    render(seconds) {
      if (disposed) return;
      const nextWidth = Math.round(canvas.clientWidth);
      if (nextWidth !== width) {
        width = nextWidth;
        renderer.setSize(width, width, false);
      }
      // Constant angular velocity about Y: no wobble or frame-dependent increments.
      globe.rotation.y = 2.1 + seconds * .36;
      clouds.rotation.y = 2.1 + seconds * .39;
      canvas.dataset.rotation = String(globe.rotation.y);
      renderer.render(scene, camera);
    },
    dispose,
  };
}

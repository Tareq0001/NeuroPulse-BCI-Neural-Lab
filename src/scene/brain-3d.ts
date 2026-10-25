import * as THREE from 'three';
import { CHANNELS_10_20 } from '../models/eeg-generator';
import { ChannelInfo } from '../types';

export class Brain3DScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private brainGroup: THREE.Group;
  private electrodeMeshes: { mesh: THREE.Mesh; ring: THREE.Mesh; ch: ChannelInfo }[] = [];
  private hemisphereLeft!: THREE.Mesh;
  private hemisphereRight!: THREE.Mesh;
  private skullMesh!: THREE.Mesh;
  private brodmannGroup: THREE.Group = new THREE.Group();

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private rotationMomentum = { x: 0.002, y: 0.004 };
  public wireframe = false;
  public showSkull = true;
  public showBrodmann = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 2.5, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.brainGroup = new THREE.Group();
    this.scene.add(this.brainGroup);

    this.initLights();
    this.initBrainModel();
    this.initElectrodes();
    this.initSkull();
    this.initBrodmannAreas();
    this.initInteractions();

    window.addEventListener('resize', this.onResize);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.8);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 1.4);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x10b981, 1.2, 10);
    pointLight.position.set(0, 0, 3);
    this.scene.add(pointLight);
  }

  private createHemisphereGeometry(isLeft: boolean): THREE.BufferGeometry {
    // Generate organic brain hemisphere with gyri and sulci surface displacement
    const geom = new THREE.SphereGeometry(1.0, 48, 48);
    geom.scale(0.85, 0.75, 1.15); // Ellipsoidal brain shape

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Separate hemispheres along sagittal fissure
      if (isLeft) {
        x = x < 0 ? x * 0.95 - 0.04 : x * 0.4 - 0.04;
      } else {
        x = x > 0 ? x * 0.95 + 0.04 : x * 0.4 + 0.04;
      }

      // Procedural gyri & sulci undulation (high-frequency organic folds)
      const gyrus =
        Math.sin(x * 12.0) * Math.cos(y * 12.0) * 0.04 +
        Math.sin(z * 10.0 + y * 6.0) * 0.035 +
        Math.cos(x * 18.0 + z * 14.0) * 0.02;

      // Temporal lobe bulge and frontal tapering
      if (y < -0.1 && Math.abs(x) > 0.4 && z > -0.2 && z < 0.4) {
        y -= 0.08;
      }

      pos.setXYZ(i, x + gyrus * (x / 1.0), y + gyrus * 0.8, z + gyrus * (z / 1.2));
    }

    geom.computeVertexNormals();
    return geom;
  }

  private initBrainModel(): void {
    const brainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      emissive: 0x0f172a,
      roughness: 0.35,
      metalness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      wireframe: false
    });

    const leftGeom = this.createHemisphereGeometry(true);
    this.hemisphereLeft = new THREE.Mesh(leftGeom, brainMaterial.clone());
    this.brainGroup.add(this.hemisphereLeft);

    const rightGeom = this.createHemisphereGeometry(false);
    this.hemisphereRight = new THREE.Mesh(rightGeom, brainMaterial.clone());
    this.brainGroup.add(this.hemisphereRight);
  }

  private initSkull(): void {
    const skullGeom = new THREE.SphereGeometry(1.22, 32, 32);
    skullGeom.scale(0.88, 0.82, 1.18);
    const skullMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.08,
      roughness: 0.1,
      metalness: 0.1,
      wireframe: true
    });
    this.skullMesh = new THREE.Mesh(skullGeom, skullMat);
    this.brainGroup.add(this.skullMesh);
  }

  private initElectrodes(): void {
    const electrodeGeom = new THREE.SphereGeometry(0.05, 16, 16);
    const ringGeom = new THREE.RingGeometry(0.065, 0.08, 16);

    for (const ch of CHANNELS_10_20) {
      // 3D position normalized onto outer skull surface
      const pos = new THREE.Vector3(ch.pos3D[0], ch.pos3D[1], ch.pos3D[2]).normalize().multiplyScalar(1.23);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(ch.impedance < 5 ? 0x10b981 : (ch.impedance < 10 ? 0xf59e0b : 0xef4444)),
        emissive: new THREE.Color(ch.color),
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.2
      });

      const mesh = new THREE.Mesh(electrodeGeom, mat);
      mesh.position.copy(pos);

      // Pulse ring facing outwards
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(ch.color),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(pos.clone().multiplyScalar(1.02));
      ring.lookAt(pos.clone().multiplyScalar(2));

      this.brainGroup.add(mesh);
      this.brainGroup.add(ring);

      this.electrodeMeshes.push({ mesh, ring, ch });
    }
  }

  private initBrodmannAreas(): void {
    // Interactive anatomical cortex highlights (M1 Motor Strip, V1 Visual, PFC Prefrontal, S1 Somatosensory)
    const createBrodmannMarker = (name: string, pos: THREE.Vector3, color: number) => {
      const geom = new THREE.BoxGeometry(0.2, 0.08, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.4 });
      const m = new THREE.Mesh(geom, mat);
      m.position.copy(pos);
      return m;
    };

    // M1 Primary Motor Cortex (Brodmann Area 4) near C3/C4
    this.brodmannGroup.add(createBrodmannMarker('M1_Left', new THREE.Vector3(-0.65, 0.55, 0.0), 0x8b5cf6));
    this.brodmannGroup.add(createBrodmannMarker('M1_Right', new THREE.Vector3(0.65, 0.55, 0.0), 0x8b5cf6));

    // V1 Primary Visual Cortex (Brodmann Area 17) near O1/O2
    this.brodmannGroup.add(createBrodmannMarker('V1_Occipital', new THREE.Vector3(0.0, 0.2, -1.05), 0xec4899));

    // Prefrontal Cortex (Brodmann Area 9/10) near Fp1/Fp2/F3/F4
    this.brodmannGroup.add(createBrodmannMarker('PFC', new THREE.Vector3(0.0, 0.4, 0.95), 0x06b6d4));

    this.brainGroup.add(this.brodmannGroup);
  }

  private initInteractions(): void {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    el.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.brainGroup.rotation.y += deltaX * 0.008;
      this.brainGroup.rotation.x += deltaY * 0.008;

      this.rotationMomentum = { x: deltaY * 0.001, y: deltaX * 0.001 };
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z = Math.max(2.2, Math.min(8.0, this.camera.position.z + e.deltaY * 0.003));
    }, { passive: false });
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public toggleWireframe(val?: boolean): boolean {
    this.wireframe = val !== undefined ? val : !this.wireframe;
    (this.hemisphereLeft.material as THREE.MeshPhysicalMaterial).wireframe = this.wireframe;
    (this.hemisphereRight.material as THREE.MeshPhysicalMaterial).wireframe = this.wireframe;
    return this.wireframe;
  }

  public toggleSkull(val?: boolean): boolean {
    this.showSkull = val !== undefined ? val : !this.showSkull;
    this.skullMesh.visible = this.showSkull;
    return this.showSkull;
  }

  public toggleBrodmann(val?: boolean): boolean {
    this.showBrodmann = val !== undefined ? val : !this.showBrodmann;
    this.brodmannGroup.visible = this.showBrodmann;
    return this.showBrodmann;
  }

  /**
   * Updates 3D cortical activations from real-time 16-channel EEG voltages
   */
  public update(voltages: number[], timeSec: number, scenario: string): void {
    // Gentle auto-rotation when user is not dragging
    if (!this.isDragging) {
      this.brainGroup.rotation.y += this.rotationMomentum.y * 0.4 + 0.0015;
      this.brainGroup.rotation.x += this.rotationMomentum.x * 0.4;
      this.rotationMomentum.x *= 0.96;
      this.rotationMomentum.y *= 0.96;
    }

    // Dynamic glowing pulses on electrode rings
    for (let i = 0; i < this.electrodeMeshes.length; i++) {
      const item = this.electrodeMeshes[i];
      const volt = Math.abs(voltages[i] || 0);

      // Scale ring pulsation with instantaneous voltage
      const scale = 1.0 + Math.min(2.0, volt * 0.04) + Math.sin(timeSec * 6 + i) * 0.15;
      item.ring.scale.set(scale, scale, 1);

      // Flash impedance color if bad contact
      const mat = item.mesh.material as THREE.MeshStandardMaterial;
      if (item.ch.impedance > 10) {
        mat.emissive.setHex(0xef4444); // Red warning
      } else if (item.ch.impedance > 5) {
        mat.emissive.setHex(0xf59e0b); // Amber
      } else {
        mat.emissive.setStyle(item.ch.color); // Green / Theme color
      }
    }

    // Localized Cortical Dipole Heatmap:
    // Left hemisphere emissive glow driven by Left motor C3 (index 4) and Occipital O1 (index 8)
    // Right hemisphere emissive glow driven by Right motor C4 (index 5) and Occipital O2 (index 9)
    const matL = this.hemisphereLeft.material as THREE.MeshPhysicalMaterial;
    const matR = this.hemisphereRight.material as THREE.MeshPhysicalMaterial;

    if (scenario === 'epilepsy_seizure') {
      // Generalized violent epileptic paroxysm (Fiery Red synchronized flash)
      const seizurePulse = (Math.sin(timeSec * 2 * Math.PI * 3.0) + 1) * 0.5; // 3 Hz
      const redVal = 0.4 + seizurePulse * 0.6;
      matL.emissive.setRGB(redVal, 0.05, 0.05);
      matR.emissive.setRGB(redVal, 0.05, 0.05);
    } else if (scenario === 'berger_alpha') {
      // Golden occipital visual cortex resonance
      const alphaGlow = (Math.sin(timeSec * 2 * Math.PI * 10.0) + 1) * 0.35;
      matL.emissive.setRGB(0.1 + alphaGlow, 0.08 + alphaGlow * 0.8, 0.02);
      matR.emissive.setRGB(0.1 + alphaGlow, 0.08 + alphaGlow * 0.8, 0.02);
    } else if (scenario === 'motor_imagery') {
      // Contralateral motor cortex activation
      const c3 = Math.abs(voltages[4] || 0) * 0.02;
      const c4 = Math.abs(voltages[5] || 0) * 0.02;
      matL.emissive.setRGB(0.05 + c3 * 0.5, 0.05, 0.2 + c3 * 0.8); // Violet / Blue
      matR.emissive.setRGB(0.05 + c4 * 0.5, 0.05, 0.2 + c4 * 0.8);
    } else {
      // Ambient cyber blue
      matL.emissive.setRGB(0.04, 0.08, 0.15);
      matR.emissive.setRGB(0.04, 0.08, 0.15);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}

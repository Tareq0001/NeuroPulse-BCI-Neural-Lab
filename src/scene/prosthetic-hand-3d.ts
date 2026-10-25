import * as THREE from 'three';
import { MotorImageryClass } from '../types';

interface FingerJoints {
  proximal: THREE.Group;
  distal: THREE.Group;
}

export class ProstheticHand3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private handGroup: THREE.Group;

  // Finger kinematic hierarchies
  private thumb!: FingerJoints;
  private indexFinger!: FingerJoints;
  private middleFinger!: FingerJoints;
  private ringFinger!: FingerJoints;
  private pinkyFinger!: FingerJoints;

  private currentFlexion = {
    thumb: 0.1,
    index: 0.1,
    middle: 0.1,
    ring: 0.1,
    pinky: 0.1
  };

  private targetFlexion = {
    thumb: 0.1,
    index: 0.1,
    middle: 0.1,
    ring: 0.1,
    pinky: 0.1
  };

  private servoLights: THREE.PointLight[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0.5, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    this.initLights();
    this.buildProstheticHand();

    window.addEventListener('resize', this.onResize);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    dirLight.position.set(4, 5, 5);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
    backLight.position.set(-4, -2, -3);
    this.scene.add(backLight);
  }

  private buildFinger(
    baseX: number,
    baseY: number,
    lengthProximal: number,
    lengthDistal: number,
    thickness: number
  ): FingerJoints {
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
      clearcoat: 0.5
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });

    // Proximal joint
    const proximalGroup = new THREE.Group();
    proximalGroup.position.set(baseX, baseY, 0);

    const knuckleGeom = new THREE.CylinderGeometry(thickness * 1.1, thickness * 1.1, thickness * 1.8, 16);
    knuckleGeom.rotateZ(Math.PI / 2);
    const knuckleMesh = new THREE.Mesh(knuckleGeom, jointMat);
    proximalGroup.add(knuckleMesh);

    const phalanx1Geom = new THREE.BoxGeometry(thickness * 1.6, lengthProximal, thickness * 1.4);
    const phalanx1Mesh = new THREE.Mesh(phalanx1Geom, titaniumMat);
    phalanx1Mesh.position.set(0, lengthProximal / 2, 0);
    proximalGroup.add(phalanx1Mesh);

    // Distal joint
    const distalGroup = new THREE.Group();
    distalGroup.position.set(0, lengthProximal, 0);

    const distalKnuckleGeom = new THREE.CylinderGeometry(thickness, thickness, thickness * 1.6, 16);
    distalKnuckleGeom.rotateZ(Math.PI / 2);
    const distalKnuckleMesh = new THREE.Mesh(distalKnuckleGeom, jointMat);
    distalGroup.add(distalKnuckleMesh);

    const phalanx2Geom = new THREE.BoxGeometry(thickness * 1.4, lengthDistal, thickness * 1.2);
    const phalanx2Mesh = new THREE.Mesh(phalanx2Geom, titaniumMat);
    phalanx2Mesh.position.set(0, lengthDistal / 2, 0);
    distalGroup.add(phalanx2Mesh);

    proximalGroup.add(distalGroup);
    this.handGroup.add(proximalGroup);

    return { proximal: proximalGroup, distal: distalGroup };
  }

  private buildProstheticHand(): void {
    const palmMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 0.8
    });

    // Wrist / Forearm adapter
    const wristGeom = new THREE.CylinderGeometry(0.35, 0.45, 0.5, 24);
    const wrist = new THREE.Mesh(wristGeom, palmMat);
    wrist.position.set(0, -1.0, 0);
    this.handGroup.add(wrist);

    // Glowing wrist ring
    const ringGeom = new THREE.TorusGeometry(0.4, 0.03, 16, 32);
    ringGeom.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const wristRing = new THREE.Mesh(ringGeom, ringMat);
    wristRing.position.set(0, -0.85, 0);
    this.handGroup.add(wristRing);

    // Main Palm
    const palmGeom = new THREE.BoxGeometry(1.0, 0.9, 0.28);
    const palm = new THREE.Mesh(palmGeom, palmMat);
    palm.position.set(0, -0.3, 0);
    this.handGroup.add(palm);

    // Palm neural chip light
    const chipLight = new THREE.PointLight(0x06b6d4, 1.5, 3);
    chipLight.position.set(0, -0.3, 0.2);
    this.handGroup.add(chipLight);
    this.servoLights.push(chipLight);

    // 5 Fingers
    // Thumb: positioned at side with slight angle
    this.thumb = this.buildFinger(-0.55, -0.35, 0.45, 0.35, 0.12);
    this.thumb.proximal.rotation.z = 0.5;

    // Index
    this.indexFinger = this.buildFinger(-0.35, 0.15, 0.55, 0.45, 0.1);
    // Middle
    this.middleFinger = this.buildFinger(-0.11, 0.18, 0.62, 0.5, 0.105);
    // Ring
    this.ringFinger = this.buildFinger(0.13, 0.15, 0.55, 0.44, 0.1);
    // Pinky
    this.pinkyFinger = this.buildFinger(0.36, 0.08, 0.42, 0.35, 0.09);

    // Rotate hand slightly forward for isometric view
    this.handGroup.rotation.x = 0.2;
    this.handGroup.rotation.y = -0.3;
  }

  public setIntent(intent: MotorImageryClass, confidence: number = 0.85): void {
    if (intent === 'left_hand') {
      // Power grasp / fist flexion
      const angle = 1.25 * confidence;
      this.targetFlexion = {
        thumb: angle * 0.9,
        index: angle,
        middle: angle * 1.05,
        ring: angle * 1.02,
        pinky: angle * 0.95
      };
      for (const light of this.servoLights) light.color.setHex(0x8b5cf6); // Electric violet
    } else if (intent === 'right_hand') {
      // Pointing gesture: index extended, others curled
      const curl = 1.3 * confidence;
      this.targetFlexion = {
        thumb: curl * 0.8,
        index: 0.05, // extended point
        middle: curl,
        ring: curl,
        pinky: curl
      };
      for (const light of this.servoLights) light.color.setHex(0x06b6d4); // Neon cyan
    } else {
      // Rest: relaxed slight curl
      this.targetFlexion = {
        thumb: 0.15,
        index: 0.12,
        middle: 0.14,
        ring: 0.15,
        pinky: 0.16
      };
      for (const light of this.servoLights) light.color.setHex(0x10b981); // Emerald pulse
    }
  }

  private applyFlexion(finger: FingerJoints, angle: number): void {
    // Proximal curls around X axis
    finger.proximal.rotation.x = angle;
    // Distal curls an extra 60% of proximal angle
    finger.distal.rotation.x = angle * 0.7;
  }

  public update(): void {
    // Smooth kinematic lerp towards target
    const lerpSpeed = 0.12;
    this.currentFlexion.thumb += (this.targetFlexion.thumb - this.currentFlexion.thumb) * lerpSpeed;
    this.currentFlexion.index += (this.targetFlexion.index - this.currentFlexion.index) * lerpSpeed;
    this.currentFlexion.middle += (this.targetFlexion.middle - this.currentFlexion.middle) * lerpSpeed;
    this.currentFlexion.ring += (this.targetFlexion.ring - this.currentFlexion.ring) * lerpSpeed;
    this.currentFlexion.pinky += (this.targetFlexion.pinky - this.currentFlexion.pinky) * lerpSpeed;

    this.applyFlexion(this.thumb, this.currentFlexion.thumb);
    this.applyFlexion(this.indexFinger, this.currentFlexion.index);
    this.applyFlexion(this.middleFinger, this.currentFlexion.middle);
    this.applyFlexion(this.ringFinger, this.currentFlexion.ring);
    this.applyFlexion(this.pinkyFinger, this.currentFlexion.pinky);

    // Subtle breathing floating rotation
    this.handGroup.rotation.y = -0.3 + Math.sin(Date.now() * 0.001) * 0.04;

    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}

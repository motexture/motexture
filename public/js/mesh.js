import * as FOUR from './four.full.module.js'
import * as THREE from './three.module.js';

import icositetrachoron from './icositetrachoron.js';
import config from './config.js'

let camera;
let scene;
let renderer;
let hyperRenderer;
let hyperMesh;
let mouse = new THREE.Vector2();

function init() {
  const canvasContainer = document.getElementById('canvas-container');
  
  hyperMesh = new FOUR.HyperMesh(icositetrachoron, config)
  hyperRenderer = new FOUR.HyperRenderer(1.5, 5)

  camera = new THREE.PerspectiveCamera(
    20,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    1,
    1000
  )
  camera.position.set(0, 0, 10)
  camera.updateProjectionMatrix();
  camera.add(new THREE.PointLight(0xffffff, 1))

  scene = new THREE.Scene()
  scene.add(camera)
  scene.add(new THREE.AmbientLight(0x222222))
  scene.add(hyperMesh)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.setClearColor(0x000000, 0);

  canvasContainer.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize)
}

function onWindowResize() {
  const canvasContainer = document.getElementById('canvas-container');

  camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

function animate() {
  requestAnimationFrame(animate)

  render()
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function render() {
  hyperRenderer.rotate({ xy: 0, xz: 0, xw: 5, yz: 0, yw: 10, zw: 10 });
  
  hyperMesh.rotation.x += (mouse.y * -0.05);
  hyperMesh.rotation.y += (mouse.x * -0.05);

  hyperMesh.update(hyperRenderer);
  renderer.render(scene, camera);
}

document.addEventListener('mousemove', onMouseMove, false);

init()
animate()
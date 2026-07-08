import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls, transformControls;
let raycaster, mouse;
const objects = [];
let selectedObject = null;
let selectedBone = null;
let skeletonMode = false;

// Proxy configuration: Using a simple CORS proxy
const PROXY_URL = 'https://corsproxy.io/?';
const TRIPOSR_API_URL = 'https://stabilityai-triposr.hf.space/--replicas/j6v6l/run/predict';

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('change', () => renderer.render(scene, camera));
    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });
    scene.add(transformControls);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(20, 20, 0x404040, 0x2d2d2d);
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onMouseDown);
    
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    if (event.target.closest('#ui')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        
        // In skeleton mode, we prioritize bone picking if we hit a skinned mesh
        if (skeletonMode) {
             while(obj.parent && obj.parent !== scene && obj.parent.type !== 'Scene') {
                obj = obj.parent;
            }
            selectObject(obj);
        } else {
            while(obj.parent && obj.parent !== scene && obj.parent.type !== 'Scene') {
                obj = obj.parent;
            }
            selectObject(obj);
        }
    } else if (!transformControls.dragging) {
        selectObject(null);
    }
}

function selectObject(obj) {
    selectedObject = obj;
    selectedBone = null;
    const traitsPanel = document.getElementById('traits-panel');
    const morphContainer = document.getElementById('morph-targets-container');
    const skeletonPanel = document.getElementById('skeleton-panel');
    const skeletonContainer = document.getElementById('skeleton-container');
    
    if (obj) {
        transformControls.attach(obj);
        
        // Morph Targets
        const morphTargets = [];
        obj.traverse((child) => {
            if (child.isMesh && child.morphTargetInfluences) {
                const names = child.morphTargetDictionary ? Object.keys(child.morphTargetDictionary) : [];
                names.forEach((name) => {
                    morphTargets.push({ mesh: child, name: name });
                });
            }
        });

        if (morphTargets.length > 0 && !skeletonMode) {
            traitsPanel.style.display = 'block';
            morphContainer.innerHTML = '';
            const uniqueTargets = [...new Set(morphTargets.map(t => t.name))];
            uniqueTargets.forEach(targetName => {
                const row = document.createElement('div');
                row.className = 'trait-row';
                const firstMesh = morphTargets.find(t => t.name === targetName).mesh;
                const idx = firstMesh.morphTargetDictionary[targetName];
                row.innerHTML = `<div class="trait-header"><span>${targetName}</span><span id="val-${targetName}">${firstMesh.morphTargetInfluences[idx].toFixed(2)}</span></div>
                                 <input type="range" min="0" max="1" step="0.01" value="${firstMesh.morphTargetInfluences[idx]}">`;
                const slider = row.querySelector('input');
                slider.oninput = (e) => {
                    const val = parseFloat(e.target.value);
                    row.querySelector(`#val-${targetName}`).innerText = val.toFixed(2);
                    morphTargets.filter(t => t.name === targetName).forEach(t => {
                        t.mesh.morphTargetInfluences[t.mesh.morphTargetDictionary[targetName]] = val;
                    });
                };
                morphContainer.appendChild(row);
            });
        } else {
            traitsPanel.style.display = 'none';
        }

        // Skeleton Mode Handling
        if (skeletonMode) {
            const bones = [];
            obj.traverse((child) => {
                if (child.isBone) bones.push(child);
            });

            if (bones.length > 0) {
                skeletonPanel.style.display = 'block';
                skeletonContainer.innerHTML = '';
                bones.forEach(bone => {
                    const item = document.createElement('div');
                    item.className = 'bone-item';
                    item.innerText = bone.name || `Bone ${bones.indexOf(bone)}`;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.bone-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        selectBone(bone);
                    };
                    skeletonContainer.appendChild(item);
                });
            } else {
                skeletonPanel.style.display = 'none';
            }
        } else {
            skeletonPanel.style.display = 'none';
        }
    } else {
        transformControls.detach();
        traitsPanel.style.display = 'none';
        skeletonPanel.style.display = 'none';
    }
}

function selectBone(bone) {
    selectedBone = bone;
    transformControls.attach(bone);
}

window.toggleSkeletonMode = function() {
    skeletonMode = !skeletonMode;
    const btn = document.getElementById('btn-skeleton-mode');
    if (skeletonMode) {
        btn.innerText = "Skeleton Mode: ON";
        btn.classList.add('toggle-active');
        btn.classList.remove('secondary');
    } else {
        btn.innerText = "Skeleton Mode: OFF";
        btn.classList.remove('toggle-active');
        btn.classList.add('secondary');
        if (selectedBone) transformControls.attach(selectedObject);
        selectedBone = null;
    }
    // Refresh panels
    if (selectedObject) selectObject(selectedObject);
};

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.addBox = function() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    scene.add(mesh);
    objects.push(mesh);
    selectObject(mesh);
};

window.addSphere = function() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    scene.add(mesh);
    objects.push(mesh);
    selectObject(mesh);
};

window.setTransformMode = function(mode) {
    transformControls.setMode(mode);
    document.querySelectorAll('[id^="btn-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
};

window.deleteSelected = function() {
    if (selectedObject) {
        const index = objects.indexOf(selectedObject);
        if (index > -1) objects.splice(index, 1);
        scene.remove(selectedObject);
        transformControls.detach();
        selectedObject = null;
    }
};

window.exportModel = function() {
    const exportGroup = new THREE.Group();
    objects.forEach(obj => exportGroup.add(obj.clone()));
    const exporter = new OBJExporter();
    const result = exporter.parse(exportGroup);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.obj';
    link.click();
};

window.handleImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = function(e) {
        if (extension === 'obj') {
            const loader = new OBJLoader();
            processImportedObject(loader.parse(e.target.result));
        } else if (extension === 'stl') {
            const loader = new STLLoader();
            const geometry = loader.parse(e.target.result);
            processImportedObject(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x3b82f6 })));
        } else if (extension === 'gltf' || extension === 'glb') {
            const loader = new GLTFLoader();
            loader.parse(e.target.result, '', (gltf) => processImportedObject(gltf.scene));
        }
    };
    if (extension === 'glb' || extension === 'stl') reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    event.target.value = '';
};

window.handleTripoImage = async function(event) {
    const file = event.target.files[0];
    const status = document.getElementById('tripoStatus');
    const btn = document.getElementById('tripoBtn');
    if (!file) return;
    status.innerText = "Processing with TripoSR...";
    btn.disabled = true;
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            const response = await fetch(TRIPOSR_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: [base64Image] })
            });
            const result = await response.json();
            if (result.data && result.data[0]) {
                status.innerText = "Success! Loading model...";
                loadTripoModel(result.data[0].name);
                btn.disabled = false;
            } else {
                throw new Error("Invalid response from TripoSR");
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        console.error(err);
        status.innerText = "Error: " + err.message;
        btn.disabled = false;
    }
};

async function loadTripoModel(url) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
        processImportedObject(gltf.scene);
    });
}

window.handleImageImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = () => create3DFromImage(img);
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

function create3DFromImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 128;
    const height = Math.round((img.height / img.width) * width);
    canvas.width = width; canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const geometry = new THREE.PlaneGeometry(width / 10, height / 10, width - 1, height - 1);
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < imageData.length / 4; i++) {
        pos[i * 3 + 2] = ((0.299 * imageData[i*4] + 0.587 * imageData[i*4+1] + 0.114 * imageData[i*4+2]) / 255) * 2;
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x3b82f6, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    processImportedObject(mesh);
}

function processImportedObject(object) {
    object.traverse((child) => { if (child.isMesh && !child.material) child.material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); });
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const scale = size.length() > 0 ? 2 / Math.max(size.x, size.y, size.z) : 1;
    object.scale.set(scale, scale, scale);
    object.position.sub(center.multiplyScalar(scale));
    object.position.y += (size.y * scale) / 2;
    scene.add(object);
    objects.push(object);
    selectObject(object);
}

init();
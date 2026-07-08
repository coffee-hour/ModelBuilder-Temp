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
        while(obj.parent && obj.parent !== scene && obj.parent.type !== 'Scene') {
            obj = obj.parent;
        }
        selectObject(obj);
    } else if (!transformControls.dragging) {
        selectObject(null);
    }
}

function selectObject(obj) {
    selectedObject = obj;
    const traitsPanel = document.getElementById('traits-panel');
    const morphContainer = document.getElementById('morph-targets-container');
    
    if (obj) {
        transformControls.attach(obj);
        
        // Check for morph targets in children
        const morphTargets = [];
        obj.traverse((child) => {
            if (child.isMesh && child.morphTargetInfluences) {
                const names = child.morphTargetDictionary ? Object.keys(child.morphTargetDictionary) : [];
                names.forEach((name, index) => {
                    morphTargets.push({
                        mesh: child,
                        name: name,
                        index: index
                    });
                });
            }
        });

        if (morphTargets.length > 0) {
            traitsPanel.style.display = 'block';
            morphContainer.innerHTML = '';
            
            // Deduplicate morph target names for UI (many meshes might share same targets)
            const uniqueTargets = [...new Set(morphTargets.map(t => t.name))];
            
            uniqueTargets.forEach(targetName => {
                const row = document.createElement('div');
                row.className = 'trait-row';
                
                const header = document.createElement('div');
                header.className = 'trait-header';
                header.innerHTML = `<span>${targetName}</span><span id="val-${targetName}">0.00</span>`;
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = '0';
                slider.max = '1';
                slider.step = '0.01';
                
                // Set initial value from first mesh that has this target
                const firstMesh = morphTargets.find(t => t.name === targetName).mesh;
                const targetIndex = firstMesh.morphTargetDictionary[targetName];
                slider.value = firstMesh.morphTargetInfluences[targetIndex];
                header.querySelector(`#val-${targetName}`).innerText = Number(slider.value).toFixed(2);

                slider.oninput = (e) => {
                    const val = parseFloat(e.target.value);
                    header.querySelector(`#val-${targetName}`).innerText = val.toFixed(2);
                    
                    // Update all meshes in the model that have this target
                    morphTargets.filter(t => t.name === targetName).forEach(t => {
                        const idx = t.mesh.morphTargetDictionary[targetName];
                        t.mesh.morphTargetInfluences[idx] = val;
                    });
                };
                
                row.appendChild(header);
                row.appendChild(slider);
                morphContainer.appendChild(row);
            });
        } else {
            traitsPanel.style.display = 'none';
        }
    } else {
        transformControls.detach();
        traitsPanel.style.display = 'none';
    }
}

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
        document.getElementById('traits-panel').style.display = 'none';
    }
};

window.exportModel = function() {
    // Note: OBJExporter doesn't natively bake morph targets.
    // We must pass the "current" mesh state.
    const exportGroup = new THREE.Group();
    objects.forEach(obj => {
        const clone = obj.clone();
        // Traverse and apply morphing to positions for export if possible
        // Actually OBJExporter in Three.js will use current vertex positions if we use the right options
        exportGroup.add(clone);
    });
    
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
        const contents = e.target.result;
        
        if (extension === 'obj') {
            const loader = new OBJLoader();
            processImportedObject(loader.parse(contents));
        } 
        else if (extension === 'stl') {
            const loader = new STLLoader();
            const geometry = loader.parse(contents);
            const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
            const mesh = new THREE.Mesh(geometry, material);
            processImportedObject(mesh);
        }
        else if (extension === 'gltf' || extension === 'glb') {
            const loader = new GLTFLoader();
            loader.parse(contents, '', (gltf) => {
                processImportedObject(gltf.scene);
            }, (err) => console.error(err));
        }
    };

    if (extension === 'glb' || extension === 'stl') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
    
    event.target.value = '';
};

window.handleImageImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            create3DFromImage(img);
        };
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
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const geometry = new THREE.PlaneGeometry(width / 10, height / 10, width - 1, height - 1);
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < imageData.length / 4; i++) {
        const r = imageData[i * 4];
        const g = imageData[i * 4 + 1];
        const b = imageData[i * 4 + 2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        positions[i * 3 + 2] = luminance * 2;
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    processImportedObject(mesh);
}

function processImportedObject(object) {
    // Only apply standard material if no materials exist (keep GLTF materials for morph targets)
    object.traverse((child) => {
        if (child.isMesh && !child.material) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
        }
    });

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
        const scale = 2 / maxDim;
        object.scale.set(scale, scale, scale);
    }

    object.position.x -= center.x * object.scale.x;
    object.position.y -= (center.y - size.y / 2) * object.scale.y;
    object.position.z -= center.z * object.scale.z;

    scene.add(object);
    objects.push(object);
    selectObject(object);
}

init();
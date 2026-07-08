import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

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
    if (obj) {
        transformControls.attach(obj);
    } else {
        transformControls.detach();
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

window.importModel = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const loader = new OBJLoader();
        try {
            const object = loader.parse(e.target.result);
            console.log("OBJ Parsed. Raw object:", object);

            // Ensure meshes are visible
            object.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
                }
            });

            // Compute bounding box for normalization
            const box = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            console.log("Model Bounding Box Size:", size);
            console.log("Model Bounding Box Center:", center);

            // Normalize size and position
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const scale = 2 / maxDim;
                object.scale.set(scale, scale, scale);
                console.log("Auto-scaling model by factor:", scale);
            }

            // Center the model
            object.position.x -= center.x * object.scale.x;
            object.position.y -= (center.y - size.y / 2) * object.scale.y; // Sit on grid
            object.position.z -= center.z * object.scale.z;

            scene.add(object);
            objects.push(object);
            selectObject(object);
            
            console.log("Model successfully added to scene.");
        } catch (err) {
            console.error("Error parsing OBJ:", err);
            alert("Failed to parse OBJ file. Check console for details.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

init();
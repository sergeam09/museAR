import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let scene, camera, renderer;
let currentModel = null;
let reticle = null;
let hitTestSource = null;
let hitTestSourceRequested = false;

// Configuración inicial
const loader = new GLTFLoader();
let modelUrl = 'https://threejs.org/examples/models/gltf/Horse.glb'; // Modelo demo

// Elementos DOM
const startARBtn = document.getElementById('start-ar');
const modelUpload = document.getElementById('model-upload');
const modelUrlInput = document.getElementById('model-url');
const placeBtn = document.getElementById('place-object');
const resetBtn = document.getElementById('reset-position');
const statusMsg = document.getElementById('status-message');

// Inicializar AR
async function initAR() {
    statusMsg.textContent = 'Inicializando AR...';
    
    scene = new THREE.Scene();
    scene.background = null; // Transparente para la cámara
    
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('ar-viewer').appendChild(renderer.domElement);
    
    // Añadir luz ambiental y direccional
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 1);
    scene.add(directionalLight);
    
    // Reticle para mostrar dónde se colocará el objeto
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    reticle = new THREE.Mesh(geometry, material);
    reticle.rotation.x = -Math.PI / 2;
    scene.add(reticle);
    
    // Botón de AR
    document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    }));
    
    renderer.setAnimationLoop(render);
    
    // Configurar hit testing
    const session = renderer.xr.getSession();
    if (session) {
        session.addEventListener('end', onSessionEnd);
        
        // Solicitar hit test source
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                hitTestSource = source;
            });
        });
        
        session.addEventListener('select', onSelect);
    }
    
    statusMsg.textContent = 'AR listo - Toca la pantalla para colocar objetos';
}

function onSelect() {
    if (currentModel && reticle.visible) {
        // Posicionar el modelo en la ubicación del reticle
        currentModel.position.copy(reticle.position);
        currentModel.visible = true;
        statusMsg.textContent = '¡Objeto colocado! Comparte el QR para verlo en AR';
        
        // Guardar posición para compartir
        savePositionToShare(reticle.position);
    }
}

function savePositionToShare(position) {
    const shareData = {
        modelUrl: modelUrl,
        position: { x: position.x, y: position.y, z: position.z }
    };
    localStorage.setItem('ar_share_data', JSON.stringify(shareData));
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            reticle.visible = true;
            reticle.position.copy(pose.transform.position);
        } else {
            reticle.visible = false;
        }
    }
    
    renderer.render(scene, camera);
}

function onSessionEnd(event) {
    hitTestSource = null;
    hitTestSourceRequested = false;
}

// Cargar modelo
async function loadModel(url) {
    statusMsg.textContent = 'Cargando modelo...';
    
    if (currentModel) {
        scene.remove(currentModel);
    }
    
    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            currentModel = gltf.scene;
            currentModel.visible = false;
            currentModel.scale.set(0.2, 0.2, 0.2);
            scene.add(currentModel);
            statusMsg.textContent = 'Modelo cargado - Colócalo en el espacio';
            resolve(currentModel);
        }, undefined, (error) => {
            console.error('Error cargando modelo:', error);
            statusMsg.textContent = 'Error cargando modelo';
            reject(error);
        });
    });
}

// Cargar modelo subido
modelUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        modelUrl = url;
        loadModel(url);
    }
});

// Cargar modelo desde URL
modelUrlInput.addEventListener('change', () => {
    const url = modelUrlInput.value;
    if (url) {
        modelUrl = url;
        loadModel(url);
    }
});

// Resetear posición
resetBtn.addEventListener('click', () => {
    if (currentModel) {
        currentModel.visible = false;
        statusMsg.textContent = 'Posición reseteada - Coloca de nuevo el objeto';
    }
});

// Iniciar AR
startARBtn.addEventListener('click', () => {
    initAR();
    // Cargar modelo demo por defecto
    loadModel(modelUrl);
});

// Función para compartir
window.generateShareLink = function() {
    const data = {
        model: modelUrl,
        timestamp: Date.now()
    };
    const encodedData = btoa(JSON.stringify(data));
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
    return shareUrl;
};

// Cargar datos compartidos al inicio
const urlParams = new URLSearchParams(window.location.search);
const shareParam = urlParams.get('share');
if (shareParam) {
    try {
        const data = JSON.parse(atob(shareParam));
        if (data.model) {
            modelUrl = data.model;
            setTimeout(() => {
                initAR();
                loadModel(modelUrl);
            }, 1000);
        }
    } catch(e) {
        console.error('Error cargando datos compartidos');
    }
}
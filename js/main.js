import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

import * as THREE from 'three';
import {MapControls} from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { tp } from './i18n.js';

const canvasEl = document.querySelector('#canvas');
const scoreResult = document.querySelector('#score-result');
const rollBtn = document.querySelector('#roll-btn');
const diceCountButtons = [...document.querySelectorAll('[data-dice-count]')];

const MIN_DICE = 1;
const MAX_DICE = 5;
const DICE_COUNT_KEY = 'maybe_dice_count_v1';

let renderer, scene, camera, orbit, diceMesh, physicsWorld;

const params = {
    numberOfDice: readDiceCount(),
    segments: 40,
    edgeRadius: .07,
    notchRadius: .12,
    notchDepth: .1,
};

const diceArray = [];
let activeRollId = 0;
let rolling = false;

initPhysics();
initScene();

window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclick', (event) => {
    if (event.target.closest?.('.ui-controls, .product-brand')) return;
    throwDice();
});
rollBtn.addEventListener('click', throwDice);
diceCountButtons.forEach((button) => {
    button.addEventListener('click', () => setDiceCount(button.dataset.diceCount));
});

function initScene() {

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .1, 300)
    camera.position.set(0, .5, 4).multiplyScalar(7);

    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, .5);
    topLight.position.set(10, 15, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 5;
    topLight.shadow.camera.far = 400;
    scene.add(topLight);

    orbit = new MapControls(camera, canvasEl);
    orbit.enableDamping = true;
    orbit.enablePan = false;
    orbit.enableRotate = false;

    createFloor();
    createBounds();
    diceMesh = createDiceMesh();
    rebuildDice(params.numberOfDice);
    syncDiceCountControls();

    throwDice();

    render();
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -50, 0),
    })
    physicsWorld.defaultContactMaterial.restitution = .3;
    physicsWorld.defaultContactMaterial.friction = .24;
}


function createFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.ShadowMaterial({
            opacity: .1
        })
    )
    floor.receiveShadow = true;
    floor.position.y = -7;
    floor.quaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * .5);
    scene.add(floor);

    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.copy(floor.quaternion);
    physicsWorld.addBody(floorBody);
}

function createBounds() {
    const walls = [
        // A compact play area keeps all five dice visible in the narrow Codex
        // in-app browser while still leaving enough room for real collisions.
        {position: [-5.6, 0, 0], axis: [0, 1, 0], angle: Math.PI * .5},
        {position: [5.6, 0, 0], axis: [0, 1, 0], angle: -Math.PI * .5},
        {position: [0, 0, -4.8], axis: [0, 1, 0], angle: 0},
        {position: [0, 0, 4.8], axis: [0, 1, 0], angle: Math.PI},
    ];

    walls.forEach(({position, axis, angle}) => {
        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        body.position.set(...position);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), angle);
        physicsWorld.addBody(body);
    });
}

function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0,
        metalness: 1,
        side: THREE.DoubleSide
    })

    const diceMesh = new THREE.Group();
    const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
    const outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
    outerMesh.castShadow = true;
    diceMesh.add(innerMesh, outerMesh);

    return diceMesh;
}

function createDice() {
    const mesh = diceMesh.clone();
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(.5, .5, .5)),
        sleepSpeedLimit: .12,
        sleepTimeLimit: .18
    });
    physicsWorld.addBody(body);

    return {mesh, body, index: 0, rollId: 0, result: null};
}

function rebuildDice(count) {
    while (diceArray.length > count) {
        const die = diceArray.pop();
        physicsWorld.removeBody(die.body);
        scene.remove(die.mesh);
    }

    while (diceArray.length < count) {
        const die = createDice();
        diceArray.push(die);
        addDiceEvents(die);
    }

    diceArray.forEach((die, index) => { die.index = index; });
}

function createBoxGeometry() {

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;


    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const notchWave = (v) => {
            v = (1 / params.notchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return params.notchDepth * (Math.cos(v) + 1.);
        }
        const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

        const offset = .23;

        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }


    boxGeometry.deleteAttribute('normal');
    boxGeometry.deleteAttribute('uv');
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function createInnerGeometry() {
    const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
    const offset = .48;
    return BufferGeometryUtils.mergeBufferGeometries([
        baseGeometry.clone().translate(0, 0, offset),
        baseGeometry.clone().translate(0, 0, -offset),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -offset, 0),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, offset, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(-offset, 0, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(offset, 0, 0),
    ], false);
}

function addDiceEvents(dice) {
    dice.body.addEventListener('sleep', (e) => {

        dice.body.allowSleep = false;

        const euler = new CANNON.Vec3();
        e.target.quaternion.toEuler(euler);

        const eps = .1;
        let isZero = (angle) => Math.abs(angle) < eps;
        let isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
        let isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
        let isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);


        if (isZero(euler.z)) {
            if (isZero(euler.x)) {
                recordRollResult(dice, 1);
            } else if (isHalfPi(euler.x)) {
                recordRollResult(dice, 4);
            } else if (isMinusHalfPi(euler.x)) {
                recordRollResult(dice, 3);
            } else if (isPiOrMinusPi(euler.x)) {
                recordRollResult(dice, 6);
            } else {
                nudgeFromEdge(dice);
            }
        } else if (isHalfPi(euler.z)) {
            recordRollResult(dice, 2);
        } else if (isMinusHalfPi(euler.z)) {
            recordRollResult(dice, 5);
        } else {
            nudgeFromEdge(dice);
        }
    });
}

function nudgeFromEdge(dice) {
    dice.body.allowSleep = true;
    dice.body.wakeUp();
    dice.body.applyImpulse(
        new CANNON.Vec3(0, .18, 0),
        new CANNON.Vec3(.13, 0, .11)
    );
}

function recordRollResult(dice, score) {
    if (!rolling || dice.rollId !== activeRollId || dice.result !== null) return;
    dice.result = score;

    if (!diceArray.every((item) => item.rollId === activeRollId && item.result !== null)) return;

    rolling = false;
    const faces = diceArray.map((item) => item.result);
    scoreResult.textContent = faces.join('+');
    scoreResult.setAttribute('aria-label', tp('dice.resultAria', faces.length, { faces: faces.join(', ') }));
    setCountControlsDisabled(false);
    canvasEl.removeAttribute('aria-busy');
    window.dispatchEvent(new CustomEvent('maybe:dice-roll-complete', {
        detail: {faces, diceCount: faces.length, rollId: activeRollId},
    }));
}

function render() {
    physicsWorld.fixedStep();

    for (const dice of diceArray) {
        dice.mesh.position.copy(dice.body.position)
        dice.mesh.quaternion.copy(dice.body.quaternion)
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function normalizeDiceCount(value) {
    const count = Number(value);
    if (!Number.isInteger(count)) return params?.numberOfDice || 2;
    return Math.max(MIN_DICE, Math.min(MAX_DICE, count));
}

function readDiceCount() {
    try {
        const saved = Number(localStorage.getItem(DICE_COUNT_KEY));
        if (Number.isInteger(saved) && saved >= MIN_DICE && saved <= MAX_DICE) return saved;
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return 2;
}

function persistDiceCount(count) {
    try { localStorage.setItem(DICE_COUNT_KEY, String(count)); } catch { /* no-op */ }
}

function syncDiceCountControls() {
    document.documentElement.dataset.activeDiceCount = String(params.numberOfDice);
    diceCountButtons.forEach((button) => {
        const selected = Number(button.dataset.diceCount) === params.numberOfDice;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
}

function setCountControlsDisabled(disabled) {
    diceCountButtons.forEach((button) => { button.disabled = disabled; });
}

function setDiceCount(value, {roll = true} = {}) {
    const nextCount = normalizeDiceCount(value);
    if (rolling && nextCount !== params.numberOfDice) {
        throw new Error('Wait for the current dice roll to finish before changing the dice count.');
    }

    const changed = nextCount !== params.numberOfDice;
    params.numberOfDice = nextCount;
    persistDiceCount(nextCount);
    syncDiceCountControls();

    if (changed) {
        rebuildDice(nextCount);
        window.dispatchEvent(new CustomEvent('maybe:dice-count-change', {
            detail: {diceCount: nextCount},
        }));
        if (roll) throwDice();
    }

    return {diceCount: nextCount, changed};
}

function getLaunchSlots(count) {
    const layouts = {
        1: [[0, 0]],
        2: [[0, -.8], [1.45, .8]],
        3: [[0, -1.4], [1.45, 0], [2.9, 1.4]],
        4: [[0, -1.05], [0, 1.05], [1.5, -.75], [1.5, .75]],
        5: [[0, -1.5], [0, 0], [0, 1.5], [1.5, -.75], [1.5, .75]],
    };
    return layouts[count];
}

function throwDice() {
    activeRollId += 1;
    rolling = true;
    scoreResult.textContent = '';
    scoreResult.removeAttribute('aria-label');
    setCountControlsDisabled(true);
    canvasEl.setAttribute('aria-busy', 'true');

    const launchSlots = getLaunchSlots(diceArray.length);

    diceArray.forEach((d, dIdx) => {

        d.body.velocity.setZero();
        d.body.angularVelocity.setZero();
        d.body.force.setZero();
        d.body.torque.setZero();

        d.rollId = activeRollId;
        d.result = null;

        const [height, depth] = launchSlots[dIdx];
        d.body.position.set(4.65 + (dIdx % 2) * .12, height, depth);
        d.mesh.position.copy(d.body.position);

        d.mesh.rotation.set(2 * Math.PI * Math.random(), 0, 2 * Math.PI * Math.random())
        d.body.quaternion.copy(d.mesh.quaternion);

        const force = 4.2 + 2.8 * Math.random();
        d.body.applyImpulse(
            new CANNON.Vec3(-force, force * (.92 + .16 * Math.random()), -depth * .08 + (Math.random() - .5) * .35),
            new CANNON.Vec3(0, 0, .2)
        );

        d.body.allowSleep = true;
        d.body.wakeUp();
    });
}

window.MaybeDice = Object.freeze({
    minDice: MIN_DICE,
    maxDice: MAX_DICE,
    getDiceCount: () => params.numberOfDice,
    setDiceCount,
    roll: throwDice,
});
document.documentElement.dataset.diceEngine = 'ready';
window.dispatchEvent(new CustomEvent('maybe:dice-engine-ready', {
    detail: {diceCount: params.numberOfDice},
}));


// ======================================
// NAIJA RUN - 3D LAGOS ENDLESS RUNNER
// ======================================

const THREE_URL =
    "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

let THREE;
let scene, camera, renderer, player;

let obstacles = [];
let coins = [];

let lane = 0;
let score = 0;
let coinCount = 0;
let speed = 17;

let jumpVelocity = 0;
let isJumping = false;
let isSliding = false;
let slideTimer = 0;

let spawnTimer = 0;
let running = false;
let gameEnded = false;
let animationId;
let lastTime = 0;

const lanes = [-2.5, 0, 2.5];
const playerZ = 2;

// ======================================
// LOAD THREE.JS
// ======================================

const threeReady = import(THREE_URL)
    .then(module => {
        THREE = module;
        console.log("NAIJA RUN engine loaded!");
        return module;
    })
    .catch(error => {
        console.error("Three.js failed to load:", error);
        throw error;
    });

// ======================================
// CREATE HUMAN CHARACTER
// ======================================

function createHuman(name, isPlayer = false) {

    const group = new THREE.Group();

    const shirtColor = name === "Aki" ? 0x00a86b : 0xe6a23c;

    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor });
    const skin = new THREE.MeshStandardMaterial({ color: 0x995c38 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x202b45 });
    const shoes = new THREE.MeshStandardMaterial({ color: 0x171717 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x17100b });
    const eyes = new THREE.MeshStandardMaterial({ color: 0xffffff });

    function sphere(parent, x, y, z, sx, sy, sz, material) {

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 12),
            material
        );

        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.castShadow = true;
        parent.add(mesh);

        return mesh;
    }

    function limb(parent, x, y, z, length, radius, material) {

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius * 0.8,
                radius,
                length,
                12
            ),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        parent.add(mesh);

        return mesh;
    }

    // BODY

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.38, 0.85, 16),
        shirt
    );

    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    limb(group, 0, 1.86, 0, 0.2, 0.12, skin);

    // HEAD

    sphere(group, 0, 2.18, 0, 0.31, 0.37, 0.3, skin);
    sphere(group, 0, 2.43, 0, 0.31, 0.13, 0.3, hair);

    sphere(group, -0.31, 2.18, 0, 0.07, 0.1, 0.07, skin);
    sphere(group, 0.31, 2.18, 0, 0.07, 0.1, 0.07, skin);

    sphere(group, -0.11, 2.22, 0.27, 0.045, 0.045, 0.025, eyes);
    sphere(group, 0.11, 2.22, 0.27, 0.045, 0.045, 0.025, eyes);

    // LEGS

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();

    leftLeg.position.set(-0.17, 0.95, 0);
    rightLeg.position.set(0.17, 0.95, 0);

    limb(leftLeg, 0, -0.25, 0, 0.55, 0.13, trousers);
    limb(rightLeg, 0, -0.25, 0, 0.55, 0.13, trousers);

    sphere(leftLeg, 0, -0.55, 0.08, 0.15, 0.09, 0.25, shoes);
    sphere(rightLeg, 0, -0.55, 0.08, 0.15, 0.09, 0.25, shoes);

    group.add(leftLeg);
    group.add(rightLeg);

    // ARMS

    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();

    leftArm.position.set(-0.4, 1.65, 0);
    rightArm.position.set(0.4, 1.65, 0);

    limb(leftArm, 0, -0.28, 0, 0.55, 0.11, skin);
    limb(rightArm, 0, -0.28, 0, 0.55, 0.11, skin);

    sphere(leftArm, 0, -0.57, 0, 0.11, 0.13, 0.11, skin);
    sphere(rightArm, 0, -0.57, 0, 0.11, 0.13, 0.11, skin);

    group.add(leftArm);
    group.add(rightArm);

    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.isPlayer = isPlayer;

    if (name === "Pawpaw") {
        group.scale.set(1.12, 1.12, 1.12);
    } else {
        group.scale.set(0.9, 0.9, 0.9);
    }

    group.userData.baseScaleY = group.scale.y;

    return group;
}

// ======================================
// CREATE LAGOS ENVIRONMENT
// ======================================

function createEnvironment() {

    scene.background = new THREE.Color(0x87ceeb);

    // BACKGROUND IMAGE

    const loader = new THREE.TextureLoader();

    loader.load(
        "./naija-bg.png",
        texture => {
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.background = texture;
            console.log("Lagos background loaded!");
        },
        undefined,
        error => {
            console.error("Background image not found:", error);
        }
    );

    // SUN

    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(3, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );

    sun.position.set(-12, 18, -45);
    scene.add(sun);

    // ROAD

    const road = new THREE.Mesh(
        new THREE.BoxGeometry(9, 0.3, 120),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );

    road.position.set(0, -0.2, -35);
    scene.add(road);

    // SIDEWALKS

    [-5.3, 5.3].forEach(x => {

        const sidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.4, 120),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );

        sidewalk.position.set(x, -0.05, -35);
        scene.add(sidewalk);
    });

    // ROAD MARKINGS

    [-1.25, 1.25].forEach(x => {

        for (let i = 0; i < 12; i++) {

            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.02, 4),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );

            line.position.set(x, -0.03, -i * 10);
            scene.add(line);
        }
    });

    // LAGOS BUILDINGS

    for (let i = 0; i < 22; i++) {

        [-8, 8].forEach(side => {

            const height = 5 + Math.random() * 13;

            const building = new THREE.Mesh(
                new THREE.BoxGeometry(4, height, 6),
                new THREE.MeshStandardMaterial({
                    color: [
                        0xe0a15a,
                        0xd8d0b8,
                        0xc47c52,
                        0x9babb0
                    ][Math.floor(Math.random() * 4)]
                })
            );

            building.position.set(side, height / 2, -i * 9 - 8);

            scene.add(building);
        });
    }

    // LIGHTING

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const sunlight = new THREE.DirectionalLight(0xffffff, 2);
    sunlight.position.set(-5, 15, 10);
    scene.add(sunlight);
}

// ======================================
// CREATE DANFO BUS
// ======================================

function createDanfo() {

    const bus = new THREE.Group();

    const yellow = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    const black = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x77bce0 });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 2.1, 3.3),
        yellow
    );

    body.position.y = 1.15;
    bus.add(body);

    const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.65, 0.08),
        glass
    );

    frontWindow.position.set(0, 1.8, 1.68);
    bus.add(frontWindow);

    [-1, 1].forEach(x => {
        [-1, 1].forEach(z => {

            const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16),
                black
            );

            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.4, z);
            bus.add(wheel);
        });
    });

    bus.userData.type = "danfo";

    return bus;
}

// ======================================
// CREATE PEDESTRIAN
// ======================================

function createPedestrian() {

    const person = createHuman("Pawpaw");

    person.scale.set(0.75, 0.75, 0.75);
    person.userData.type = "person";

    return person;
}

// ======================================
// SPAWN OBSTACLES
// ======================================

function spawnObstacle() {

    const obstacle = Math.random() > 0.45
        ? createDanfo()
        : createPedestrian();

    const randomLane = Math.floor(Math.random() * 3);

    obstacle.position.set(lanes[randomLane], 0, -45);

    scene.add(obstacle);
    obstacles.push(obstacle);
}

// ======================================
// SPAWN COINS
// ======================================

function spawnCoin() {

    const coin = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.1, 12, 24),
        new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2
        })
    );

    coin.position.set(
        lanes[Math.floor(Math.random() * 3)],
        1.5,
        -45
    );

    scene.add(coin);
    coins.push(coin);
}

// ======================================
// START GAME
// ======================================

async function startGame() {

    // WAIT FOR THREE.JS

    await threeReady;

    const canvas = document.getElementById("canvas");

    if (!canvas) {
        throw new Error("Canvas element was not found in game.html");
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // CREATE SCENE

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        65,
        canvas.clientWidth / Math.max(canvas.clientHeight, 1),
        0.1,
        200
    );

    camera.position.set(0, 5, 9);
    camera.lookAt(0, 1, -5);

    // CREATE RENDERER ONLY ONCE

    if (!renderer) {

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 2)
        );
    }

    renderer.setSize(
        canvas.clientWidth || window.innerWidth,
        canvas.clientHeight || window.innerHeight
    );

    renderer.shadowMap.enabled = true;

    // RESET GAME

    obstacles = [];
    coins = [];

    lane = 0;
    score = 0;
    coinCount = 0;
    speed = 17;

    jumpVelocity = 0;
    isJumping = false;
    isSliding = false;
    slideTimer = 0;
    spawnTimer = 0;

    lastTime = 0;
    gameEnded = false;
    running = true;

    // BUILD WORLD

    createEnvironment();

    const characterName = window.selectedCharacter || "Aki";

    player = createHuman(characterName, true);
    player.position.set(0, 0, playerZ);

    scene.add(player);

    document.getElementById("gameOver").style.display = "none";

    updateHUD();

    // DRAW FIRST FRAME

    renderer.render(scene, camera);

    animate();
}

// ======================================
// GAME ANIMATION
// ======================================

function animate(time = 0) {

    if (!running || gameEnded) return;

    animationId = requestAnimationFrame(animate);

    const delta = lastTime
        ? Math.min((time - lastTime) / 1000, 0.05)
        : 0;

    lastTime = time;

    score += delta * 10;
    speed += delta * 0.12;

    // RUNNING ANIMATION

    const swing = Math.sin(time * 0.015) * 0.65;

    player.userData.leftLeg.rotation.x = swing;
    player.userData.rightLeg.rotation.x = -swing;

    player.userData.leftArm.rotation.x = -swing;
    player.userData.rightArm.rotation.x = swing;

    // JUMP

    if (isJumping) {

        jumpVelocity -= 24 * delta;
        player.position.y += jumpVelocity * delta;

        if (player.position.y <= 0) {

            player.position.y = 0;
            jumpVelocity = 0;
            isJumping = false;
        }
    }

    // SLIDE

    if (isSliding) {

        slideTimer -= delta;

        if (slideTimer <= 0) {

            isSliding = false;
            player.scale.y = player.userData.baseScaleY;
        }
    }

    // LANE MOVEMENT

    player.position.x +=
        (lanes[lane] - player.position.x) * Math.min(delta * 12, 1);

    // SPAWN OBJECTS

    spawnTimer -= delta;

    if (spawnTimer <= 0) {

        spawnObstacle();

        if (Math.random() > 0.4) {
            spawnCoin();
        }

        spawnTimer = Math.max(0.65, 1.5 - speed * 0.025);
    }

    // MOVE OBSTACLES

    for (let i = obstacles.length - 1; i >= 0; i--) {

        const obstacle = obstacles[i];

        obstacle.position.z += speed * delta;

        const closeToPlayer =
            Math.abs(obstacle.position.z - playerZ) < 1.4 &&
            Math.abs(obstacle.position.x - player.position.x) < 1.15;

        if (closeToPlayer) {

            if (isJumping || isSliding) {
                // Allow the player to avoid the obstacle.
            } else {
                endGame();
                return;
            }
        }

        if (obstacle.position.z > 12) {

            scene.remove(obstacle);
            obstacles.splice(i, 1);
        }
    }

    // MOVE COINS

    for (let i = coins.length - 1; i >= 0; i--) {

        const coin = coins[i];

        coin.position.z += speed * delta;
        coin.rotation.y += delta * 5;

        if (
            Math.abs(coin.position.z - playerZ) < 1 &&
            Math.abs(coin.position.x - player.position.x) < 1
        ) {

            coinCount++;

            scene.remove(coin);
            coins.splice(i, 1);

            continue;
        }

        if (coin.position.z > 12) {

            scene.remove(coin);
            coins.splice(i, 1);
        }
    }

    updateHUD();

    renderer.render(scene, camera);
}

// ======================================
// CONTROLS
// ======================================

function moveLeft() {

    if (running && lane > -1) {
        lane--;
    }
}

function moveRight() {

    if (running && lane < 1) {
        lane++;
    }
}

function jump() {

    if (!running || isJumping || isSliding) return;

    isJumping = true;
    jumpVelocity = 11;
}

function slide() {

    if (!running || isJumping || isSliding) return;

    isSliding = true;
    slideTimer = 0.8;

    player.scale.y = player.userData.baseScaleY * 0.55;
}

// KEYBOARD

document.addEventListener("keydown", function(event) {

    if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
    ) {
        moveLeft();
    }

    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {
        moveRight();
    }

    if (
        event.key === "ArrowUp" ||
        event.key === " "
    ) {
        event.preventDefault();
        jump();
    }

    if (
        event.key === "ArrowDown" ||
        event.key.toLowerCase() === "s"
    ) {
        slide();
    }
});

// ======================================
// SCORE
// ======================================

function updateHUD() {

    const scoreElement = document.getElementById("score");
    const coinElement = document.getElementById("coins");

    if (scoreElement) {
        scoreElement.textContent = "SCORE: " + Math.floor(score);
    }

    if (coinElement) {
        coinElement.textContent = "🪙 " + coinCount;
    }
}

// ======================================
// GAME OVER
// ======================================

function endGame() {

    running = false;
    gameEnded = true;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    document.getElementById("gameOver").style.display = "flex";

    document.getElementById("finalScore").textContent =
        "Score: " + Math.floor(score) +
        " | Coins: " + coinCount;
}

// ======================================
// RESIZE
// ======================================

window.addEventListener("resize", function() {

    if (!renderer || !camera) return;

    const canvas = document.getElementById("canvas");

    if (!canvas) return;

    camera.aspect =
        canvas.clientWidth / Math.max(canvas.clientHeight, 1);

    camera.updateProjectionMatrix();

    renderer.setSize(
        canvas.clientWidth || window.innerWidth,
        canvas.clientHeight || window.innerHeight
    );
});

// ======================================
// STOP GAME
// ======================================

function stopGame() {

    running = false;
    gameEnded = true;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ======================================
// CONNECT TO GAME.HTML
// ======================================

window.startGame = startGame;
window.stopGame = stopGame;

window.moveLeft = moveLeft;
window.moveRight = moveRight;
window.jump = jump;
window.slide = slide;

console.log("NAIJA RUN game.js connected!");

!(function() {
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    var havePointerLock = checkForPointerLock();
    var controls, controlsEnabled;

    var scene, camera, renderer, cube;
    var gridSize = 1000,
        unitSize = 50;
    var pos;
    var raf;
    var snake = null;
    var renderCounter = 0;
    var tag = null;

    var level = 1;

    var gameScoreBoard = document.getElementById('gamescore');
    var pauseScreen = document.getElementById('pause');
    var leveloptions = document.getElementById('leveloptions');

    leveloptions.addEventListener('change', onLevelChange, false);

    function showPauseScreen() {
        pauseScreen.className = 'paused';
    }

    function hidePauseScreen() {
        pauseScreen.className = 'paused hidden';
    }

    var obstacles = []; // Array of obstacles

    var keys = {
        38: 'backward', // up key
        40: 'forward', // down key
        39: 'right', // -> key
        37: 'left', // <- key
        87: 'up', // W key
        83: 'down', // S key
        32: 'pause' // spacebar
    }

    var keyActions = {
    
        'backward': {
            enabled: true,
            action: function() {
                snake.back();
                keyActions.forward.enabled = false;
                keyActions.left.enabled = true;
                keyActions.right.enabled = true;
                keyActions.pause.enabled = true;
                hidePauseScreen();
            }
        },
        
        'forward': {
            enabled: true,
            action: function() {
                snake.forward();
                keyActions.backward.enabled = false;
                keyActions.left.enabled = true;
                keyActions.right.enabled = true;
                keyActions.pause.enabled = true;
                hidePauseScreen();
            }
        },
        
        'right': {
            enabled: true,
            action: function() {
                snake.right();
                keyActions.left.enabled = false;
                keyActions.forward.enabled = true;
                keyActions.backward.enabled = true;
                keyActions.pause.enabled = true;
                hidePauseScreen();
            }
        },
        
        'left': {
            enabled: true,
            action: function() {
                snake.left();
                keyActions.right.enabled = false;
                keyActions.backward.enabled = true;
                keyActions.forward.enabled = true;
                keyActions.pause.enabled = true;
                hidePauseScreen();
            }
        },
        
        'up': {
            enabled: true,
            action: function() {
                snake.up();
            }
        },
        
        'down': {
            enabled: true,
            action: function() {
                snake.down();
            }
        },
        
        'pause': {
            enabled: false,
            action: function() {
                snake.clear();
                keyActions.pause.enabled = false;
                showPauseScreen();
            }
        }
        
    };

    // Game Levels
    var levels = {
        1: {
            renderCount: 15
        },
        2: {
            renderCount: 10
        },
        3: {
            renderCount: 5
        },
        4: {
            renderCount: 3
        }
    }

    var interval = 10000;

    function init() {

        window.addEventListener('resize', onWindowResize, false);
        THREEx.FullScreen.bindKey({
            charCode: 'f'.charCodeAt(0)
        });

        initPointerLock();

        // --- Scene ---
        scene = new THREE.Scene();

        // --- Grid ---
        var gridGeometry = new THREE.Geometry();
        
        for (var i = -gridSize; i <= gridSize; i += unitSize) {
            gridGeometry.vertices.push(new THREE.Vector3(-gridSize, 0, i));
            gridGeometry.vertices.push(new THREE.Vector3(gridSize, 0, i));
            gridGeometry.vertices.push(new THREE.Vector3(i, 0, -gridSize));
            gridGeometry.vertices.push(new THREE.Vector3(i, 0, gridSize));
        }
        
        var gridMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            opacity: 0.2,
            transparent: true
        });
        
        var line = new THREE.Line(gridGeometry, gridMaterial, THREE.LinePieces);
        
        scene.add(line);

        // --- Snake ---
        snake = new Snake(scene, unitSize, 0xff0000);
        snake.render();
        
        snake.onTagCollision = function() {
            scene.remove(tag);
            tag = addTagToScene(randomAxis(), unitSize / 2, randomAxis());
            setScore();
        };
        
        snake.onSelfCollision = function() {
            snake.reset();
        };

        tag = addTagToScene(randomAxis(), unitSize / 2, randomAxis());

        // --- Camera ---
        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 10000);
        //camera.position.set(500, 800, 1300);
        //camera.position.z = 500;
        //camera.lookAt(new THREE.Vector3());

        controls = new THREE.PointerLockControls(camera);

        // place camera object at the snake head
        snake.snake[0].add( controls.getObject() );

        // --- Renderer ---
        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setSize(window.innerWidth - 10, window.innerHeight - 10);
        renderer.setClearColor(0xf0f0f0);

        document.body.appendChild(renderer.domElement);

        //var ambientLight = new THREE.AmbientLight( 0xcccccc );
        //scene.add(ambientLight);

        // --- Directional Lighting ---
        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(500, 800, 1300).normalize();
        scene.add(directionalLight);
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }


    function randomAxis() {
        var point = randomPoint();
        return point > gridSize ? (gridSize - point) - 25 : point - 25;
    }

    function triggerRenders() {
        if (renderCounter === levels[level].renderCount) {
            snake.render();
            render();
            renderCounter = 0;
        }
        renderCounter++;
        raf = window.requestAnimationFrame(triggerRenders);
    }

    function addTagToScene(x, y, z) {
        var geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        scene.add(sphere);
        snake.setCurrentTagPosition({
            x: x,
            y: y,
            z: z
        });
        return sphere;
    }

    function onLevelChange(e) {
        setLevel(e.target.value);
    }

    function setLevel(value) {
        level = value;
    }

    function setScore() {
        gameScoreBoard.innerHTML = Number(gameScoreBoard.innerText) + 1;
    }

    function clearScore() {
        gameScoreBoard.innerHTML = '0';
    }

    function randomPoint() {
        // Generate random points between 0 and the gridSize
        // in steps for unitSize i.e 0, 50, 350, 700, 40 etc
        var pos = Math.floor(Math.random() * gridSize * 2);
        return pos - (pos % unitSize);
    }

    function onKeyPressUp(e) {
        var keyAction = keyActions[keys[e.keyCode]];
        if (keyAction && keyAction.enabled) {
            keyAction.action();
            if (raf) {
                window.cancelAnimationFrame(raf);
            }
            raf = window.requestAnimationFrame(triggerRenders);
        }
    }

    function render() {

        //console.log ( snake.position );
        //camera.position.set( snake.position.x, snake.position.y, snake.position.z );
        //camera.lookAt( snake.tagPosition.x, snake.tagPosition.y, snake.tagPosition.z );

        renderer.render(scene, camera);
    }

    function checkForPointerLock() {

        return 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    }

    function initPointerLock() {

        var element = document.body;

        if (havePointerLock) {

            var pointerlockchange = function(event) {

                if (document.pointerLockElement === element ||
                    document.mozPointerLockElement === element ||
                    document.webkitPointerLockElement === element) {

                    controlsEnabled = true;
                    controls.enabled = true;

                } else {

                    controls.enabled = false;

                }

            };

            var pointerlockerror = function(event) {

                element.innerHTML = 'PointerLock Error';

            };

            document.addEventListener('pointerlockchange', pointerlockchange, false);
            document.addEventListener('mozpointerlockchange', pointerlockchange, false);
            document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

            document.addEventListener('pointerlockerror', pointerlockerror, false);
            document.addEventListener('mozpointerlockerror', pointerlockerror, false);
            document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

            var requestPointerLock = function(event) {

                element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
                element.requestPointerLock();

            };

            element.addEventListener('click', requestPointerLock, false);

        } else {

            element.innerHTML = 'Bad browser; No pointer lock';

        }

    }


    init();

    render();

    document.addEventListener('keyup', onKeyPressUp, false);
})();

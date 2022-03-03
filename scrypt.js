const DRAGDISTANCE = 500;
const DURATION = 1.5;

class ThreeSlider {
  constructor() {
    this.canvas = document.querySelector('canvas');
    this.setup();
  }
  
  setup() {
    this.setupThree();
    this.setupSlider();
    this.setupHammer();
    this.loadTextures();
    this.resize();
    this.setupEventListeners();
  }
  
  setupThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas
    });

    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }
  
  setupSlider() {
    this.slider = {
      currentIndex: 0,
      nextIndex: 0
    };
  }
  
  setupHammer() {
    this.hammer = new Hammer(this.canvas);
  }
  
  loadTextures() {
    const loader = new THREE.TextureLoader();
    let promises = [];
    let urls = [
      'https://images.unsplash.com/photo-1501441858156-e505fb04bfbc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1266&q=80',
      'https://images.unsplash.com/photo-1482424917728-d82d29662023?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1331&q=80',
      'https://images.unsplash.com/photo-1504626877899-b3670586ac9f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=934&q=80',
      'https://images.unsplash.com/photo-1542745177-dbb39b41df3d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1301&q=80',
      'https://images.unsplash.com/photo-1515469446389-74ef48ae90b2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=934&q=80',
      'https://images.unsplash.com/photo-1562614397-aaa5f4d2ed04?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=934&q=80',
      'https://images.unsplash.com/photo-1548971806-96e91d70b144?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=934&q=80',
      'https://images.unsplash.com/photo-1583487136420-f2089d1bfc78?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1565551045797-c0b918d88202?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=934&q=80'
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const promise = new Promise(resolve => {
        loader.load(url, resolve);
      });
      
      promises.push(promise);
    }

    Promise.all(promises).then(textures => {
      this.textures = textures;
      this.setupPlane();
    });
  }
  
  setupPlane() {
    const vertex = document.querySelector('.vertex').textContent;
    const fragment = document.querySelector('.fragment').textContent;

    this.currentTexture = this.textures[this.slider.currentIndex];
    this.nextTexture = this.textures[this.slider.nextIndex];

    this.uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
      u_direction: { value: 1.0 },
      u_transition: { value: 0.0 },
      u_texture: { type: 't', value: this.currentTexture },
      u_next_texture: { type: 't', value: this.nextTexture },
      u_displacement_map: { type: 't', value: this.displacementMap }
    }
    
    this.displacementMap = new THREE.Uniform(null);
    let displacementMapUrl = 'https://images.unsplash.com/photo-1579818277109-ad8de2e7cf80?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1480&q=80';
    let loader = new THREE.TextureLoader().load(displacementMapUrl, (result) => {
      console.log(result)
      this.uniforms.u_displacement_map.value = result;
    });

    const geometry = new THREE.PlaneGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
    });
    this.plane = new THREE.Mesh(geometry, material);
    this.plane.position.z = -10;
    this.plane.scale.set(10, 14, 10);
    this.scene.add(this.plane);
  }
  
  resetProgress() {
    TweenLite.to(this.uniforms.u_transition, .3, { value: 0, ease: Power3.easeOut, onComplete: () => {
      this.isTweening = false;
    } });
  }

  slide() {
    const duration = DURATION * (1 - Math.abs(this.dragProgress));
    TweenLite.to(this.uniforms.u_transition, duration, { value: 1, ease: Power3.easeOut, onComplete: () => {
      this.slider.currentIndex = this.slider.nextIndex;
      this.uniforms.u_texture.value = this.textures[this.slider.currentIndex];
      this.uniforms.u_transition.value = 0;
      this.isTweening = false;
    }});
  }
  
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera.aspect = this.width/this.height;
    this.camera.updateProjectionMatrix();
  }
  
  setupEventListeners() {
    window.addEventListener('resize', this.resize.bind(this));
    this.hammer.on('pan', this.dragHandler.bind(this));
    this.hammer.on('panend', this.dragendHandler.bind(this));
    this.tick();
  }
  
  dragHandler(e) {
    if (this.isTweening) return;
    
    this.dragProgress = - e.deltaX / DRAGDISTANCE;

    if (this.dragProgress >= 1 || this.dragProgress <= -1) return;

    this.uniforms.u_direction.value = Math.sign(this.dragProgress);
    this.uniforms.u_transition.value = Math.abs(this.dragProgress);
    this.slider.nextIndex = this.mod(this.slider.currentIndex + Math.sign(this.dragProgress), this.textures.length);
    this.uniforms.u_next_texture.value = this.textures[this.slider.nextIndex];
  }
  
  dragendHandler() {
    this.isTweening = true;

    if (this.dragProgress > 0.2 || this.dragProgress < -0.2) {
      this.slide();
    } else {
      this.resetProgress();
    }
  }
  
  tick() {
    window.requestAnimationFrame(this.tick.bind(this));
    
    this.renderer.render(this.scene, this.camera);
  }
  
  mod(n, m) {
    return ((n % m) + m) % m;
  }
}

new ThreeSlider();
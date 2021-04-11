class Sketch {
  constructor(canvas, ctx, fps = 60) {
    this._canvas = canvas;
    this._ctx = ctx;
    this._fps = fps;

    // init variables
    this._frameCount = 0;
    this._frameRate = 0;
    this._fpsBuffer = new Array(0);
    this._width = this._canvas.width;
    this._height = this._canvas.height;

    // start sketch
    this._setFps();
    this._run();
  }

  _setFps() {
    // keep track of time to handle fps
    this.then = performance.now();
    // time between frames
    this._fps_interval = 1 / this._fps;
  }

  _run() {
    // bootstrap the sketch
    this.setup();
    // anti alias
    this._ctx.imageSmoothingQuality = "high";
    this._timeDraw();
  }

  _timeDraw() {
    // request another frame
    window.requestAnimationFrame(this._timeDraw.bind(this));
    const diff = performance.now() - this.then;
    if (diff < this._fps_interval) {
      // not enough time has passed, so we request next frame and give up on this render
      return;
    }
    // updated last frame rendered time
    this.then = performance.now();
    // compute frame rate
    // update frame count
    this._frameCount++;
    // update fpsBuffer
    this._fpsBuffer.unshift(1000 / diff);
    this._fpsBuffer = this._fpsBuffer.splice(0, 60);
    // calculate average fps
    this._frameRate = this._fpsBuffer.reduce((a, b) => a + b, 0) / this._fpsBuffer.length;
    // now draw
    this._ctx.save();
    this.draw();
    this._ctx.restore();
  }

  _calculate_press_coords(e) {
    // calculate size ratio
    const boundingBox = this._canvas.getBoundingClientRect();
    const ratio = Math.min(boundingBox.width, boundingBox.height) / this._canvas.getAttribute("width");
    // calculate real mouse/touch position
    if (!e.touches) {
      // we're dealing with a mouse
      const mx = (e.pageX - boundingBox.left) / ratio;
      const my = (e.pageY - boundingBox.top) / ratio;
      return { x: mx, y: my };
    } else {
      // we're dealing with a touchscreen
      const tx = (e.touches[0].pageX - boundingBox.left) / ratio;
      const ty = (e.touches[0].pageY - boundingBox.top) / ratio;
      return { x: tx, y: ty };
    }

  }

  click(e) {
    //const coords = this._calculate_press_coords(e);
    //this.addGravity(coords.x, coords.y);
  }

  mousedown(e) {
    this._mouse_pressed = true;
    const coords = this._calculate_press_coords(e);
    this.addGravity(coords.x, coords.y);
  }

  mouseup(e) {
    this._mouse_pressed = false;
    this.removeGravity();
  }

  mousemove(e) {
    if (this._mouse_pressed) {
      const coords = this._calculate_press_coords(e);
      this.addGravity(coords.x, coords.y);
    }
  }

  touchdown(e) {
    this._mouse_pressed = true;
    const coords = this._calculate_press_coords(e);
    this.addGravity(coords.x, coords.y);
  }

  touchup(e) {
    this._mouse_pressed = false;
    this.removeGravity();
  }

  touchmove(e) {
    if (this._mouse_pressed) {
      const coords = this._calculate_press_coords(e);
      this.addGravity(coords.x, coords.y);
    }
  }

  keydown(e) {
    //console.log({ code: e.code });
  }

  saveAsImage(title) {
    let container;
    container = document.createElement("a");
    container.download = title + ".png";
    container.href = this.canvas.toDataURL("image/png");
    document.body.appendChild(container);

    container.click();
    document.body.removeChild(container);
  }

  addGravity(x, y) {
    this._boids.forEach(b => b.gravity = new Vector(x, y));
  }

  removeGravity() {
    this._boids.forEach(b => b.gravity = undefined);
  }

  background(color) {
    // reset background
    // reset canvas
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.restore();
    // set background
    this._ctx.fillStyle = color;
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  }

  setup() {
    this._is_mobile = is_mobile();
    this._scale_factor = this._is_mobile ? 0.5 : 1;

    this._show_stats = false;
    this._seed = parseInt(Date.now() / 1000);
    this._font_size = 24 * 900 / this._canvas.height * this._scale_factor;

    const starting_boids = this._is_mobile ? 100 : 200;
    const starting_obstacles = this._is_mobile ? 10 : 20;

    this._boids = [];
    for (let i = 0; i < starting_boids; i++) {
      this._boids.push(new Boid(this._width, this._height, this._scale_factor));
    }

    this._obstacles = [];
    for (let i = 0; i < starting_obstacles; i++) {
      this._obstacles.push(new Obstacle(this._width, this._height, this._scale_factor));
    }
  }

  draw() {
    // ran continuosly
    this.background("white");
    // draw obstacles
    this._obstacles.forEach(b => {
      b.show(this._ctx);
    });
    // draw and animate boids
    this._boids.forEach(b => {
      b.move(this._boids, this._obstacles, this._frameCount, this._seed);
      b.show(this._ctx);
    });

    // show stats
    if (this._show_stats) {
      this._ctx.save();
      this._ctx.textBaseline = "top";
      this._ctx.font = `${this._font_size}px Roboto`;
      this._ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      this._ctx.textAlign = "left";
      this._ctx.fillText(`FPS: ${parseInt(this._frameRate)}`, this._font_size, this._font_size);
      this._ctx.fillText(`boids: ${parseInt(this._boids.length)}`, this._font_size, this._font_size * 2);

      this._ctx.restore();
    }
  }

  addBoid(number = 1) {
    for (let i = 0; i < number; i++) {
      this._boids.push(new Boid(this._width, this._height, this._scale_factor));
    }
  }

  removeBoid(number = 1) {
    for (let i = 0; i < number && this._boids.length > 0; i++) {
      this._boids.shift();
    }
  }

  toggleTrail() {
    this._boids.forEach(b => b.show_trail = !b.show_trail);
    return this._boids[0].show_trail;
  }

  toggleDynamic() {
    this._boids.forEach(b => b.dynamic = !b.dynamic);
    return this._boids[0].dynamic;
  }

  toggleStats() {
    this._show_stats = !this._show_stats;
  }

  boidsFactors() {
    return this._boids[0].factors;
  }

  setFactors(f) {
    this._boids.forEach(b => b.factors = f);
  }

  get show_stats() {
    return this._show_stats;
  }

  set show_stats(s) {
    this._show_stats = s;
  }

  get show_trails() {
    return this._boids[0].show_trail;
  }

  get dynamic() {
    return this._boids[0].dynamic;
  }
}


document.addEventListener("DOMContentLoaded", () => {
  console.clear();
  // detect if the user is using a mobile in order to determine
  // a more useful canvas size
  const canvas_size = is_mobile() ? 500 : 1000;

  // page loaded
  let canvas, ctx, s;
  canvas = document.querySelector("#sketch");
  // inject canvas in page
  if (canvas.getContext) {
    canvas.setAttribute("width", canvas_size);
    canvas.setAttribute("height", canvas_size);

    ctx = canvas.getContext("2d", { alpha: false });
    s = new Sketch(canvas, ctx);
  }

  canvas.addEventListener("click", e => s.click(e));
  canvas.addEventListener("mousedown", e => s.mousedown(e));
  canvas.addEventListener("mouseup", e => s.mouseup(e));
  canvas.addEventListener("mousemove", e => s.mousemove(e));
  canvas.addEventListener("touchstart", e => s.touchdown(e));
  canvas.addEventListener("touchend", e => s.touchup(e));
  canvas.addEventListener("touchmove", e => s.touchmove(e));
  document.addEventListener("keydown", e => s.keydown(e));

  // input ranges
  const ranges = [...document.querySelectorAll(".form input[type=range]")];
  // input checkboxes
  const trail_checkbox = document.querySelector("#showtrail");
  const dynamic_checkbox = document.querySelector("#dynamic");
  const stats_checkbox = document.querySelector("#stats");
  // input buttons
  const add_button = document.querySelector("#addboid");
  const remove_button = document.querySelector("#removeboid");
  const reset_button = document.querySelector("#reset");

  // update ranges, labels and checkboxes
  setInterval(() => {

    ranges.forEach(r => r.disabled = s.dynamic);

    for (const [key, value] of Object.entries(s.boidsFactors())) {

      let label;
      label = document.querySelector(`label[for=${key}] .value`);
      if (label) {
        label.innerHTML = value;
      }

      let range;
      range = ranges.filter(r => r.id == key);
      if (range) {
        range[0].value = value;
      }
    }

    trail_checkbox.checked = s.show_trails;
    dynamic_checkbox.checked = s.dynamic;
    stats_checkbox.checked = s.show_stats;
  }, 50);

  // handle ranges
  ranges.forEach(range => {
    range.addEventListener("input", () => {
      let factors = {};
      ranges.forEach(r => {
        factors[r.id] = parseFloat(r.value);
      });
      s.setFactors(factors);
    });
  });

  // handle checkboxes
  trail_checkbox.addEventListener("input", () => s.toggleTrail());
  dynamic_checkbox.addEventListener("input", () => s.toggleDynamic());
  stats_checkbox.addEventListener("input", () => s.toggleStats());

  // handle buttons
  add_button.addEventListener("click", () => s.addBoid());
  remove_button.addEventListener("click", () => s.removeBoid());
  reset_button.addEventListener("click", () => s.setup());
});


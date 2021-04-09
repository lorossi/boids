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
    let diff;
    diff = performance.now() - this.then;
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

  click(e) {

  }

  mousedown(e) {
    let boundingBox;
    boundingBox = this._canvas.getBoundingClientRect();
    let ratio;
    ratio = Math.min(boundingBox.width, boundingBox.height) / this._canvas.getAttribute("width");

    let mx, my;
    mx = (e.pageX - boundingBox.left) / ratio;
    my = (e.pageY - boundingBox.top) / ratio;

    this._boids.forEach(b => {
      b.gravity = new Vector(mx, my);
    });
  }

  mouseup(e) {
    this._boids.forEach(b => {
      b.gravity = null;
    });
  }

  mousedragged(e) {
  }

  touchdown(e) {
    let boundingBox;
    boundingBox = this._canvas.getBoundingClientRect();
    let ratio;
    ratio = Math.min(boundingBox.width, boundingBox.height) / this._canvas.getAttribute("width");

    let tx, ty;
    tx = (e.touches[0].pageX - boundingBox.left) / ratio;
    ty = (e.touches[0].pageY - boundingBox.top) / ratio;

    this._boids.forEach(b => {
      b.gravity = new Vector(tx, ty);
    });
  }

  touchup(e) {
    this._boids.forEach(b => {
      b.gravity = null;
    });
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
    this._show_stats = false;
    this._seed = parseInt(Date.now() / 1000);
    this._boids = [];
    for (let i = 0; i < 150; i++) {
      this._boids.push(new Boid(this._width, this._height));
    }
  }

  draw() {
    // ran continuosly
    this.background("rgb(240, 240, 240");
    // draw and animate boids
    this._boids.forEach(b => {
      b.move(this._boids, this._frameCount, this._seed);
      b.show(this._ctx);
    });
    // show fps
    if (this._show_stats) {
      let size;
      size = 48;
      this._ctx.save();
      this._ctx.textBaseline = "top";
      this._ctx.font = `${size}px Roboto`;
      this._ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      this._ctx.textAlign = "left";
      this._ctx.fillText(`FPS: ${parseInt(this._frameRate)}`, size, size);
      this._ctx.fillText(`boids: ${parseInt(this._boids.length)}`, size, size * 2);

      this._ctx.restore();
    }
  }

  addBoid(number = 1) {
    for (let i = 0; i < number; i++) {
      this._boids.push(new Boid(this._width, this._height));
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
  // page loaded
  let canvas, ctx, s;
  canvas = document.querySelector("#sketch");
  // inject canvas in page
  if (canvas.getContext) {
    ctx = canvas.getContext("2d", { alpha: false });
    s = new Sketch(canvas, ctx);
  }

  canvas.addEventListener("click", e => s.click(e));
  canvas.addEventListener("mousedown", e => s.mousedown(e));
  canvas.addEventListener("mouseup", e => s.mouseup(e));
  canvas.addEventListener("touchstart", e => s.touchdown(e));
  canvas.addEventListener("touchend", e => s.touchup(e));
  document.addEventListener("keydown", e => s.keydown(e));

  let ranges;
  ranges = [...document.querySelectorAll(".form input[type=range]")];

  let trail_checkbox, dynamic_checkbox, stats_checkbox;
  trail_checkbox = document.querySelector("#showtrail");
  dynamic_checkbox = document.querySelector("#dynamic");
  stats_checkbox = document.querySelector("#stats");

  let add_button, remove_button, reset_button;
  add_button = document.querySelector("#addboid");
  remove_button = document.querySelector("#removeboid");
  reset_button = document.querySelector("#reset");

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
        range.value = value;
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
  stats_checkbox.addEventListener("input", () => s.show_stats = !s.show_stats);

  // handle buttons
  add_button.addEventListener("click", () => s.addBoid());
  remove_button.addEventListener("click", () => s.removeBoid());
  reset_button.addEventListener("click", () => s.setup());
});


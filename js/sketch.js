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
    this._mouse_pressed = false;
    this._draw_mode = false;
    this._erase_mode = false;

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

    if (!this._draw_mode && !this._erase_mode) {
      this.addGravity(coords.x, coords.y);
    } else {
      this._last_coords = coords;
    }
  }

  mouseup(e) {
    this._mouse_pressed = false;
    this.removeGravity();
  }

  mousemove(e) {
    if (this._mouse_pressed) {
      const coords = this._calculate_press_coords(e);
      if (this._draw_mode) {
        if (dist(coords.x, coords.y, this._last_coords.x, this._last_coords.y) > this._mouse_press_increments) {
          this._last_coords = coords;
          const new_obs = this.addObstacle(coords.x, coords.y);
          // draw new obstacle
          new_obs.show(this._ctx);
        }
      } else if (this._erase_mode) {
        this.removeObstacle(coords.x, coords.y);
        this._obstacles.forEach(b => b.show(this._ctx));
      }
      else {
        this.addGravity(coords.x, coords.y);
      }
    }
  }

  touchdown(e) {
    this.mousedown(e);
  }

  touchup(e) {
    this.mouseup(e);
  }

  touchmove(e) {
    this.mousemove(e);
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
    this._is_mobile = is_mobile();
    this._scale_factor = this._is_mobile ? 0.5 : 1;
    this._mouse_press_increments = 5 * this._scale_factor;

    this._show_stats = false;
    this._seed = parseInt(Date.now() / 1000);
    this._font_size = 24 * 900 / this._canvas.height * this._scale_factor;

    const starting_boids = this._is_mobile ? 75 : 150;

    this._boids = [];
    for (let i = 0; i < starting_boids; i++) {
      this._boids.push(new Boid(this._width, this._height, this._scale_factor));
    }

    this._obstacles = [];
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

  addGravity(x, y) {
    this._boids.forEach(b => b.gravity = new Vector(x, y));
  }

  removeGravity() {
    this._boids.forEach(b => b.gravity = undefined);
  }

  addObstacle(x, y) {
    const new_obs = new Obstacle(x, y, this._scale_factor, this._mouse_press_increments * 3);
    this._obstacles.push(new_obs);
    return new_obs;
  }

  removeObstacle(x, y) {
    this._obstacles = this._obstacles.filter(o => dist(o.pos.x, o.pos.y, x, y) > o.radius * 2);
  }

  removeAllObstacles() {
    this._obstacles = [];
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

  toggleDrawMode() {
    this._draw_mode = !this._draw_mode;
    return this._draw_mode;
  }

  toggleEraseMode() {
    this._erase_mode = !this._erase_mode;
    return this._erase_mode;
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

  get draw_mode() {
    return this._draw_mode;
  }

  get erase_mode() {
    return this._erase_mode;
  }
}


document.addEventListener("DOMContentLoaded", () => {
  console.clear();
  // detect if the user is using a mobile in order to determine
  // a more useful canvas size
  const canvas_size = is_mobile() ? 450 : 900;

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

  // mouse event listeners
  canvas.addEventListener("click", e => s.click(e));
  canvas.addEventListener("mousedown", e => s.mousedown(e));
  canvas.addEventListener("mouseup", e => s.mouseup(e));
  canvas.addEventListener("mousemove", e => s.mousemove(e));
  // touchscreen event listensers
  canvas.addEventListener("touchstart", e => s.touchdown(e));
  canvas.addEventListener("touchend", e => s.touchup(e));
  canvas.addEventListener("touchmove", e => s.touchmove(e));
  // keyboard event listeners
  document.addEventListener("keydown", e => s.keydown(e));

  // input ranges
  const ranges = [...document.querySelectorAll(".form input[type=range]")];
  // input checkboxes
  const trail_checkbox = document.querySelector("#showtrail");
  const dynamic_checkbox = document.querySelector("#dynamic");
  const stats_checkbox = document.querySelector("#stats");
  // input buttons
  const add_boid_button = document.querySelector("#addboid");
  const remove_boid_button = document.querySelector("#removeboid");
  const reset_button = document.querySelector("#reset");
  const draw_button = document.querySelector("#drawmode");
  const erase_button = document.querySelector("#erasemode");
  const erase_all_button = document.querySelector("#eraseall");

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
  add_boid_button.addEventListener("click", () => s.addBoid());
  remove_boid_button.addEventListener("click", () => s.removeBoid());
  reset_button.addEventListener("click", () => s.setup());
  draw_button.addEventListener("click", () => {
    if (s.erase_mode) {
      s.toggleEraseMode();
      erase_button.value = erase_button.getAttribute("default");
    }

    s.toggleDrawMode();

    if (s.draw_mode) {
      draw_button.setAttribute("default", draw_button.value);
      draw_button.value = "Done";
    } else {
      draw_button.value = draw_button.getAttribute("default");
    }
  });

  erase_button.addEventListener("click", () => {
    if (s.draw_mode) {
      s.toggleDrawMode();
      s.draw_mode = false;
      draw_button.value = draw_button.getAttribute("default");
    }

    s.toggleEraseMode();

    if (s.erase_mode) {
      erase_button.setAttribute("default", erase_button.value);
      erase_button.value = "Done";
    } else {
      erase_button.value = erase_button.getAttribute("default");
    }
  });

  erase_all_button.addEventListener("click", () => s.removeAllObstacles());
});


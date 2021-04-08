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
    console.log("DOWN");
    let mx, my;
    mx = e.offsetX;
    my = e.offsetY;

    this._boids.forEach(b => {
      b.gravity = new Vector(mx, my);
    });
  }

  mouseup(e) {
    console.log("UP");
    this._boids.forEach(b => {
      b.gravity = null;
    });
  }

  mousedragged(e) {
    console.log(e);
  }

  keydown(e) {
    console.log({ code: e.code });

    if (e.code == "KeyF") {
      this._show_fps = !this._show_fps;
    } else if (e.code == "ArrowUp") {
      this._boids.push(new Boid(this._width, this._height));
    } else if (e.code == "ArrowDown") {
      this._boids.pop();
    }
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
    this._show_fps = false;
    this._seed = parseInt(Date.now() / 1000);
    this._boids = [];
    for (let i = 0; i < 150; i++) {
      this._boids.push(new Boid(this._width, this._height));
    }
  }

  draw() {
    // ran continuosly
    this.background("white");
    // draw and animate boids
    this._boids.forEach(b => {
      b.move(this._boids, this._frameCount, this._seed);
      b.show(this._ctx);
    });
    // show fps
    if (this._show_fps) {
      this._ctx.save();
      this._ctx.textBaseline = "top";
      this._ctx.font = "20px calibri";
      this._ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      this._ctx.textAlign = "left";
      this._ctx.fillText(`FPS: ${parseInt(this._frameRate)}`, 20, 20);
      this._ctx.fillText(`boids: ${parseInt(this._boids.length)}`, 20, 40);

      this._ctx.restore();
    }
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
  document.addEventListener("keydown", e => s.keydown(e));
});
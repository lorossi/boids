class Obstacle {
  constructor(width, height, scale_factor, base_radius = 10) {
    this._width = width;
    this._height = height;
    this._scale_factor = scale_factor;

    // shape is circular
    this._border = this._width * 0.1;
    this._radius = base_radius * this._scale_factor;
    this._pos = new Vector(random(this._border, this._width - this._border), random(this._border, this._height - this._border));

    // DEBUG
    /*
    this._radius = 400;
    this._pos = new Vector(0, this._height / 2);
    */
  }

  show(ctx) {
    // rounding for better canvas performances
    const px = parseInt(this._pos.x);
    const py = parseInt(this._pos.y);

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, this._radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  get radius() {
    return this._radius;
  }

  get pos() {
    return this._pos.copy();
  }
}
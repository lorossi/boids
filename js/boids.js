class Boid {
  constructor(width, height) {
    this._width = width;
    this._height = height;
    this._border = 0.1 * this._width;
    this._hue = random(0, 30);

    this._pos = new Vector(random(this._border, this._width - this._border), random(this._border, this._height - this._border));
    this._vel = Vector.random2D();
    this._acc = Vector.random2D();
    this._force = new Vector();
    this._gravity_center = null;

    // parameters
    this._max_vel = 3;
    this._max_acc = 20;
    this._max_force = 20;
    this._trail_length = 40;
    this._view_range = 50;

    // rendering
    this._triangle_side = parseInt(random_interval(10, 2));
    this._triangle_height = parseInt(this._triangle_side * 1.5);
    this._trail = [];
  }

  attract(x, y) {
    let steer;
    steer = new Vector();
    let center;
    center = new Vector(x, y);
    steer = center.sub(this._pos).setMag(10);

    this._pos.add(steer);
  }

  move(boids, frames, seed) {
    // some time variance
    // rule 1
    this._separation_factor = 0.3 * (1 + 0.25 * Math.sin(frames / (60 * 10) + seed));
    // rule 2
    this._alignment_factor = 0.7 * (1 + 0.25 * Math.sin(frames / (60 * 10) + Math.PI * seed));
    // rule 3
    this._cohesion_factor = 1 * (1 + 0.25 * Math.sin(frames / (60 * 10) + 3 * Math.PI * seed));
    // gravity
    this._gravity_factor = 1 * (1 + 0.5 * Math.sin(frames / (60 * 10) + 5 * Math.PI * seed));

    // all close boids excluding this one
    let others;
    others = boids.filter(b => b.pos.sub(this._pos.copy()).mag() < this._view_range && b != this);

    // rule 1 - separate from other boids
    let a1;
    a1 = this._separation(others);

    // rule 2 - align to other boids
    let a2;
    a2 = this._alignment(others);

    // rule 3 - cohesion (go to mass center)
    let a3;
    a3 = this._cohesion(others);

    // now add gravity
    let a4;
    a4 = this._gravity();

    // movement
    this._force = new Vector().add(a1).add(a2).add(a3).add(a4);
    this._force.limit(this._max_force);
    this._acc.add(this._force);
    this._acc.limit(this._max_acc);
    this._vel.add(this._acc);
    this._vel.limit(this._max_vel);
    this._pos.add(this._vel);

    // wrapping
    let wrapped = false;
    if (this._pos.x < 0) {
      this._pos.x += this._width;
      wrapped = true;
    }
    else if (this._pos.x > this._width) {
      this._pos.x -= this._width;
      wrapped = true;
    }

    if (this._pos.y < 0) {
      this._pos.y += this._height;
      wrapped = true;
    }
    else if (this._pos.y > this._height) {
      this._pos.y -= this._height;
      wrapped = true;
    }

    if (wrapped) {
      this._trail.push(
        {
          x: false,
          y: false,
        }
      );
    }

    // trail generation
    // rounding for better canvas performances
    this._trail.push(
      {
        x: parseInt(this._pos.x),
        y: parseInt(this._pos.y),
      }
    );
    if (this._trail.length > this._trail_length) this._trail.shift();
  }

  // separation rule
  _separation(boids) {
    // skip separation if _gravity_center is defined
    if (this._gravity_center) {
      return new Vector(0, 0);
    }

    let steer;
    steer = new Vector();

    boids.forEach(b => {
      let dist;
      dist = this._pos.copy().sub(b.pos);
      // square root because the range is less than 1
      dist.mult(this._separation_factor / ((dist.mag() / this._view_range) ** (1 / 2)));
      steer.add(dist);
    });

    return steer;
  }

  // alignment rule
  _alignment(boids) {
    let steer;
    steer = new Vector();

    if (boids.length > 0) {
      boids.forEach(b => {
        steer.add(b.acc);
      });
      steer.divide_scalar(boids.length);
      steer.mult(this._alignment_factor);
    }

    return steer;
  }

  // cohesion rule
  _cohesion(boids) {
    let steer;
    steer = new Vector();

    if (boids.length > 0) {
      let center;
      center = new Vector();
      boids.forEach(b => {
        center.add(b.pos);
      });
      center.divide_scalar(boids.length);

      steer = center.sub(this._pos);
      steer.mult(this._cohesion_factor);
    }

    return steer;
  }

  // apply gravity
  _gravity() {
    // but only if the vector is defined
    if (this._gravity_center) {
      let steer;
      steer = this._gravity_center.copy().sub(this._pos);
      steer.mult(this._gravity_factor / (steer.mag() / this._view_range) ** (1 / 2));
      return steer;
    }

    return new Vector(0, 0);
  }

  show(ctx) {
    // boid position
    // rounding for better canvas performances
    let px, py;
    px = parseInt(this._pos.x);
    py = parseInt(this._pos.y);

    // draw trail
    ctx.save();
    ctx.strokeStyle = `hsla(${this._hue}, 100%, 50%, 0.1)`;
    ctx.strokeWidth = 2;
    ctx.moveTo(px, py);
    ctx.beginPath();
    this._trail.forEach(t => {
      if (!t.x || !t.y) {
        ctx.stroke();
        ctx.beginPath();
      } else {
        ctx.lineTo(t.x, t.y);
      }
    });
    ctx.stroke();
    ctx.restore();

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this._vel.heading2D() + Math.PI / 2);
    ctx.fillStyle = `hsla(${this._hue}, 100%, 50%, 0.6)`;
    ctx.strokeStyle = `hsla(${this._hue}, 100%, 50%, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(-this._triangle_side / 2, 0);
    ctx.lineTo(0, -this._triangle_height);
    ctx.lineTo(this._triangle_side / 2, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // getters
  get pos() {
    return this._pos.copy();
  }

  get vel() {
    return this._vel.copy();
  }

  get acc() {
    return this._acc.copy();
  }

  get gravity() {
    return this._gravity_center.copy();
  }

  set gravity(g) {
    if (g === null) {
      this._gravity_center = null;
    } else {
      this._gravity_center = g.copy();
    }
  }
}
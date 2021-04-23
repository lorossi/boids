class Boid {
  constructor(width, height, scale_factor = 1) {
    // constructor parameters
    this._width = width;
    this._height = height;
    this._scale_factor = scale_factor;

    // variables
    this._hue = 0;
    this._dHue = random(0, 40);
    this._gravity_center = null;
    this._show_trail = true;
    this._dynamic_factors = false;
    // parameters
    this._max_vel = 2 * this._scale_factor;
    this._max_acc = 20 * this._scale_factor;
    this._max_force = 2 * this._scale_factor;
    this._trail_length = 100 * this._scale_factor;
    this._view_range = 50 * this._scale_factor;
    this._angle_increments = Math.PI / 25;
    this._view_range_increments = this._view_range / 10;
    // vectors
    this._pos = new Vector(random(this._view_range, this._width - this._view_range), random(this._view_range, this._height - this._view_range));
    this._vel = new Vector.random2D();
    this._acc = new Vector.random2D();
    this._force = new Vector();

    // rule 1
    this._base_separation = 0.5 * this._scale_factor;
    this._separation_factor = 0;
    // rule 2
    this._base_alignment = 0.9 * this._scale_factor;
    this._alignment_factor = 0;
    // rule 3
    this._base_cohesion = 1.5 * this._scale_factor;
    this._cohesion_factor = 0;
    // gravity
    this._base_gravity = 0.3 * this._scale_factor;
    this._gravity_factor = 0;
    // border / obstacle avoidance
    this._avoidance_factor = 7 * this._scale_factor;

    // rendering
    this._triangle_side = parseInt(random_interval(8, 2)) * this._scale_factor;
    this._triangle_height = parseInt(this._triangle_side * 1.5);
    this._trail = [];
  }

  move(boids, obstacles, frames, seed) {
    // some time variance
    if (this._dynamic_factors) {
      this._separation_factor = this._base_separation * (1 + 0.25 * Math.sin(frames / (60 * 10) + seed));
      this._alignment_factor = this._base_alignment * (1 + 0.25 * Math.sin(frames / (60 * 10) + Math.PI * seed));
      this._cohesion_factor = this._base_cohesion * (1 + 0.25 * Math.sin(frames / (60 * 10) + 3 * Math.PI * seed));
      this._hue = 360 * (1 + Math.sin(frames / (60 * 30) + 5 * Math.PI * seed)) / 2;
    } else {
      this._separation_factor = this._base_separation;
      this._alignment_factor = this._base_alignment;
      this._cohesion_factor = this._base_cohesion;
      this._gravity_factor = this._base_gravity;
    }

    // all close boids excluding this one
    const others = boids.filter(b => b.pos.sub(this._pos.copy()).mag() < this._view_range && b != this);
    // all close obstacles
    const close_obstacles = obstacles.filter(o => o.pos.sub(this._pos.copy()).mag() < this._view_range + o.radius);

    // compute all the forces
    // rule 1 - separate from other boids
    const f1 = this._separation(others, close_obstacles);
    // rule 2 - align to other boids
    const f2 = this._alignment(others);
    // rule 3 - cohesion (go to mass center)
    const f3 = this._cohesion(others);
    // gravity (generated by touch)
    const f4 = this._gravity();

    // compute all the accelerations
    // check (avoid) obstacles and borders
    const a1 = this._avoid_obstacles(close_obstacles);

    // movement
    this._force = new Vector().add(f1).add(f2).add(f3).add(f4);
    this._force.limit(this._max_force);
    this._acc.add(this._force).add(a1);
    this._acc.limit(this._max_acc);
    this._vel.add(this._acc);
    this._vel.limit(this._max_vel);
    this._pos.add(this._vel);

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
  _separation(boids, close_obstacles) {
    // skip separation if _gravity_center is defined or close obstacles are nearby
    if (this._gravity_center || close_obstacles.length > 0) {
      return new Vector(0, 0);
    }

    let steer = new Vector();
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
    if (boids.length > 0) {
      let center;
      center = new Vector();
      boids.forEach(b => {
        center.add(b.pos);
      });
      center.divide_scalar(boids.length);

      return center.sub(this._pos).mult(this._cohesion_factor);
    }

    return new Vector(0, 0);
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

  // avoid borders and obstacles
  _avoid_obstacles(obstacles) {
    if (this._can_see_border(this._pos) || obstacles.length > 0) {
      // the boid can see the border or an obstacle, so get its current heading
      const heading = this._vel.heading2D();
      for (let j = 0; j < Math.PI; j += this._angle_increments) {
        // check angle from 0 to PI 
        for (let k = 0; k < 2; k++) {
          let found = false;
          // both on left and right, relative to heading
          const dir = k == 0 ? 1 : -1;
          const phi = j * dir + heading;
          // check each view range with fixed increments, from 0 to its maximum value
          for (let i = this._view_range_increments; i <= this._view_range && obstacles.length > 0; i += this._view_range_increments) {
            // create new vector, same heading as current boid, as long as the view range
            // and add the current poisition -> farthest it can see.
            const dpos = new Vector.fromAngle2D(phi).setMag(i).add(this._pos);
            const visible_obstacles = obstacles.filter(o => this._can_see_obstacle(dpos, o));
            if (visible_obstacles.length > 0) {
              // an obstacle has been found
              // set the flag to true and break the loop (no need to keep
              // searching)
              found = true;
              break;
            }
          }

          if (!found) {
            // check if the border is not to be seen, then return the steering vector
            const dpos = new Vector.fromAngle2D(phi).setMag(this._view_range).add(this._pos);

            if (!this._can_see_border(dpos)) {
              return new Vector.fromAngle2D(phi).setMag(this._avoidance_factor);
            }
          }
        }
      }
    }

    return new Vector(0, 0);
  }

  _can_see_border(vector) {
    return vector.x < this._view_range || vector.x > this._width - this._view_range || vector.y < this._view_range || vector.y > this._height - this._view_range;
  }

  _can_see_obstacle(vector, obstacle) {
    return dist(vector.x, vector.y, obstacle.pos.x, obstacle.pos.y) < obstacle.radius * 2;
  }

  show(ctx) {
    // boid position
    // rounding for better canvas performances
    const px = parseInt(this._pos.x);
    const py = parseInt(this._pos.y);
    const hue = (this._hue + this._dHue) % 360;

    // draw trail
    if (this._show_trail) {
      ctx.save();
      ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.2)`;
      ctx.strokeWidth = 2 * this._scale_factor;
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
    }

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this._vel.heading2D());
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this._triangle_side / 2);
    ctx.lineTo(this._triangle_height, 0);
    ctx.lineTo(0, this._triangle_side / 2);
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
    if (g) {
      this._gravity_center = g.copy();
    } else {
      this._gravity_center = null;
    }
  }

  get show_trail() {
    return this._show_trail;
  }

  set show_trail(s) {
    this._show_trail = s;
  }

  get factors() {
    return {
      separation: (this._separation_factor / this._scale_factor).toFixed(2),
      alignment: (this._alignment_factor / this._scale_factor).toFixed(2),
      cohesion: (this._cohesion_factor / this._scale_factor).toFixed(2),
      viewrange: (this._view_range / this._scale_factor).toFixed(0),
      hue: this._hue.toFixed(0),
    };
  }

  set factors(f) {
    this._base_separation = f.separation * this._scale_factor;
    this._base_alignment = f.alignment * this._scale_factor;
    this._base_cohesion = f.cohesion * this._scale_factor;
    this._view_range = f.viewrange * this._scale_factor;
    this._hue = f.hue;
  }

  get dynamic() {
    return this._dynamic_factors;
  }

  set dynamic(d) {
    this._dynamic_factors = d;
  }
}
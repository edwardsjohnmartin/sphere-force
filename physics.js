// Computes the magnetic field at position r.
// m points south to north
// dipole is sphere
// n spheres of diameter d. For each sphere, specify m orientation.
// Torque on dipole will twist m.
function B(m, r) {
  var mag = length(r);
  if (mag == 0) {
    return 0;
  }
  const c = 1 / 6;
  const mr = mult(r, vec3c(3 * dot(m, r) / Math.pow(mag, 5)));
  const mm = mult(m, vec3c(1.0 / Math.pow(mag, 3)));
  return mult(subtract(mr, mm), vec3c(c));
}

function BSum(dipoles, origin) {
  var sum = 0;
  for (var i = 0; i < dipoles.length; ++i) {
    var v = B(dipoles[i].m, subtract(origin, dipoles[i].p));
    if (v != 0) {
      if (sum == 0) {
        sum = v;
      } else {
        sum = add(sum, v);
      }
    }
  }
  return sum;
}

// Force of dipole m_i on dipole m_j.
// Equation 8 of the paper.
// applyFriction also applies to eddy breaks
function F(di, dj, applyFriction) {
  const Rij = subtract(dj.p, di.p);
  const Rij_mag = length(Rij);
  const mi = di.m;
  const mj = dj.m;

  const c = 1 / (2 * Math.pow(Rij_mag, 5));
  const n1 = mult(vec3c(dot(mi, Rij)), mj);
  const n2 = mult(vec3c(dot(mj, Rij)), mi);
  const n3 = mult(vec3c(dot(mi, mj)), Rij);
  const n4 = mult(vec3c(5 * dot(mi, Rij) * dot(mj, Rij) / Math.pow(Rij_mag, 2)),
                  Rij);
  var f = mult(vec3c(c), add(n1, add(n2, subtract(n3, n4))));
  const f_orig = f.slice(0);
  if (applyFriction) {
    // Friction
    if (length(dj.v) > 0) {
      // friction
      var mu = mult(normalize(mult(dj.v, -1)), fFriction);
      // debugValues.mu = mu;
      f = add(f, mu);
      // debugValues.mu = length(mu).toFixed(4);
      // eddy breaks
      var B_mag = length(B(di.m, subtract(dj.p, di.p)));
      var v_mag = length(dj.v);
      var eddy_mag = fEddy * B_mag * B_mag * v_mag;
      var eddy = mult(-eddy_mag, normalized(dj.v));
      f = add(f, eddy);
      debugValues.B_mag = B_mag.toFixed(4);
      debugValues.v_mag = v_mag.toFixed(4);
      // debugValues.B_mag = B_mag;
      // debugValues.v_mag = v_mag;
      // debugValues.f_eddy_mag = eddy_mag.toFixed(4);
      // debugValues.f_eddy_mag = eddy_mag;
      // debugValues.f_eddy_mag = (100 * eddy_mag / length(f_orig)).toFixed(4) + "% of F";
      debugValues.f_eddy_mag = eddy_mag.toFixed(4) + " (" + (100 * eddy_mag / length(f_orig)).toFixed(4) + "% of |F|)";
    }

    // Only update values if we're applying friction
    debugValues.F = f.map(function(n) { return n.toFixed(2) });
    debugValues.F_mag = length(f_orig).toFixed(4);
    debugValues.F_mag_net = length(f).toFixed(4);
  }
  return f;
}

// Torque of dipole m_i on dipole m_j.
// Equation 10 of the paper.
// applyFriction applies to both friction and eddy breaks
function T(di, dj, applyFriction) {
  const Rij = subtract(dj.p, di.p);
  const Rij_mag = length(Rij);
  const mi = di.m;
  const mj = dj.m;

  const c = 1;
  const cn1 = dot(mi, Rij) / (2 * Math.pow(Rij_mag, 5));
  const n1 = mult(cross(mj, Rij), cn1);
  const n2 = mult(cross(mj, mi), 1/(6 * Math.pow(Rij_mag, 3)));
  var t = mult(vec3c(c), subtract(n1, n2));
  const t_orig = t;
  if (applyFriction) {
    if (Math.abs(dj.av) > 0) {
      // Friction
      var mu = vec3(0, 0, (dj.av > 0 ? -tFriction : tFriction));
      t = add(t, mu);
      // eddy breaks
      var B_mag = length(B(di.m, subtract(dj.p, di.p)));
      var v_mag = Math.abs(dj.av);
      var eddy_mag = tEddy * B_mag * B_mag * v_mag;
      var eddy = vec3(0, 0, (dj.av > 0) ? -eddy_mag : eddy_mag);
      t = add(t, eddy);
      // debugValues.t_eddy_mag = eddy_mag;
      // debugValues.t_eddy = (100 * eddy_mag / length(t_orig)).toFixed(4) + "% of T";
      debugValues.t_eddy_mag = eddy_mag.toFixed(4) + " (" + (100 * eddy_mag / length(t_orig)).toFixed(4) + "% of T)";
    }
    // debugValues.torque_final = length(t).toFixed(4);

    // Only update values if we're applying friction
    debugValues.T = t_orig[2].toFixed(4);
    debugValues.T_net = t[2].toFixed(4);
  }

  return t;
}


"use strict";

var canvas;
var canvasWidth, canvasHeight;
// Frustum width and height
var fw, fh;
var gl;

var axis;
var floor;
var arrow;
var segment;
var sphereMesh;
var circle;
var forceArrow;
var torqueArrow;
var square;
var dipoles = new Array();

var lineProgram;
var circleProgram;
var flatProgram;
var sphereProgram;
var textureProgram;

var texture;

// A = angle
// X = x-axis
// Y = y-axis
// Z = z-axis
var view = "A";
var aspect = 1.0;

var mvMatrix, pMatrix, nMatrix;

// Interaction
var mouseDown = false;
var mouseDownPos;
var mousePos;
var button = 0;
var rotVec = vec3(1, 0, 0);
var rotAngle = 0;
var rotMatrix = mat4(1.0);
var zoom = 1;
var downZoom = 1;
const LEFT_BUTTON = 0;
const RIGHT_BUTTON = 2;

// What to render
var showB = false;

// Stack stuff
var matrixStack = new Array();
function pushMatrix() {
  matrixStack.push(mat4(mvMatrix));
}
function popMatrix() {
  mvMatrix = matrixStack.pop();
}

function renderAxis() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, axis.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, axis.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, axis.numPoints);
};

function renderFloor() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, floor.numPoints);
};

function renderArrow() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, arrow.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, arrow.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, arrow.numPoints);
};

function renderSegment() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, segment.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, segment.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, segment.numPoints);
};

function renderSphere() {
  gl.useProgram(sphereProgram.program);

  gl.enableVertexAttribArray(sphereProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.vertexBuffer);
  gl.vertexAttribPointer(sphereProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(sphereProgram.normalLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.normalBuffer);
  gl.vertexAttribPointer(sphereProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(sphereProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.colorBuffer);
  gl.vertexAttribPointer(sphereProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(sphereProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(sphereProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(sphereProgram.nMatrixLoc, false, flatten(nMatrix));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.indexBuffer);
  gl.drawElements(gl.TRIANGLES, sphereMesh.numIndices, gl.UNSIGNED_SHORT, 0);
};

function renderCircle() {
  gl.useProgram(circleProgram.program);

  gl.enableVertexAttribArray(circleProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, circle.vertexBuffer);
  gl.vertexAttribPointer(circleProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(circleProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(circleProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(circleProgram.nMatrixLoc, false, flatten(nMatrix));

  gl.uniform4fv(circleProgram.colorLoc, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, circle.numCirclePoints);

  gl.uniform4fv(circleProgram.colorLoc, flatten(vec4(0.2, 0.2, 0.2, 1.0)));
  gl.drawArrays(gl.TRIANGLE_FAN,
                circle.numCirclePoints, 4);
  gl.drawArrays(gl.TRIANGLES, circle.numCirclePoints + 4, 3);
};

function renderForceArrow(p, f) {
  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(flatProgram.nMatrixLoc, false, flatten(nMatrix));

  gl.uniform4fv(flatProgram.colorLoc, flatten(vec4(1.0, 0.0, 0.0, 1.0)));

  const magScale = 5000000;
  // const mag = Math.log(magScale * length(f));
  const mag = 100 * Math.pow(length(f), 1/4);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // global scale
  const gs = 0.08;
  mvMatrix = mult(mvMatrix, scalem(gs, gs, 1));
  // rotation
  mvMatrix = mult(mvMatrix, rotateZ(degrees(Math.atan2(f[1], f[0]))));
  // translate outside of circle
  mvMatrix = mult(mvMatrix, translate(1, 0, 0));

  pushMatrix();
  // (1 - aw) * f = (mag - aw)
  // f = (mag - aw)/(1 - aw)
  const s = (mag - forceArrow.arrowWidth) / (1.0 - forceArrow.arrowWidth);
  mvMatrix = mult(mvMatrix, scalem(s, 1, 1));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  popMatrix();

  pushMatrix();
  mvMatrix = mult(mvMatrix, translate(mag-forceArrow.arrowWidth, 0, 0));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLES, 4, 3);
  popMatrix();

  popMatrix();
};

function renderTorqueArrow(p, t) {
  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, torqueArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(flatProgram.nMatrixLoc, false, flatten(nMatrix));

  // gl.uniform4fv(flatProgram.colorLoc, flatten(vec4(0.0, 0.0, 1.0, 1.0)));
  gl.uniform4fv(flatProgram.colorLoc, flatten(vec4(0.3, 0.3, 1.0, 1.0)));
  // gl.uniform4fv(flatProgram.colorLoc, flatten(vec4(0.0, 0.7, 0.0, 1.0)));

  const magScale = 20;
  const mag = magScale * Math.pow(length(t), 1/3);

  const deg = Math.min(358, 360 * mag);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // global scale
  const gs = 0.08;
  mvMatrix = mult(mvMatrix, scalem(gs, gs, 1));
  // // rotation
  // mvMatrix = mult(mvMatrix, rotateZ(degrees(Math.atan2(f[1], f[0]))));
  // // translate outside of circle
  // mvMatrix = mult(mvMatrix, translate(1, 0, 0));

  if (t[2] < 0) {
    mvMatrix = mult(mvMatrix, scalem(1, -1, 1));
  }

  // pushMatrix();
  // (1 - aw) * f = (mag - aw)
  // f = (mag - aw)/(1 - aw)
  // const s = (mag - forceArrow.arrowWidth) / (1.0 - forceArrow.arrowWidth);
  // mvMatrix = mult(mvMatrix, scalem(s, 1, 1));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1 + Math.floor(deg) * 2);
  // popMatrix();

  gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);
  mvMatrix = mult(mvMatrix, rotateZ(deg));
  mvMatrix = mult(mvMatrix, translate(torqueArrow.r, 0, 0));
  mvMatrix = mult(mvMatrix, rotateZ(90));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLES, 4, 3);

  popMatrix();
};

function renderTexture() {
  gl.useProgram(textureProgram.program);

  gl.enableVertexAttribArray(textureProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.vBuffer);
  gl.vertexAttribPointer(textureProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(textureProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.cBuffer);
  gl.vertexAttribPointer(textureProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(textureProgram.texCoordLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.tBuffer);
  gl.vertexAttribPointer(textureProgram.texCoordLoc, 2, gl.FLOAT, false, 0, 0);




  // gl.enableVertexAttribArray(sphereProgram.vertexLoc);
  // gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.vertexBuffer);
  // gl.vertexAttribPointer(sphereProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  // gl.enableVertexAttribArray(sphereProgram.normalLoc);
  // gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.normalBuffer);
  // gl.vertexAttribPointer(sphereProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

  // gl.enableVertexAttribArray(sphereProgram.colorLoc);
  // gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.colorBuffer);
  // gl.vertexAttribPointer(sphereProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  // nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(textureProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(textureProgram.pMatrixLoc, false, flatten(pMatrix));

  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square.indexBuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, square.numVertices);
  // gl.drawElements(gl.TRIANGLES, sphereMesh.numIndices, gl.UNSIGNED_SHORT, 0);
};

// Permeability of free space in a vacuum
const MU0 = 4 * Math.PI * Math.pow(10, -7);

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
  const c = MU0 / (4 * Math.PI);
  const mr = mult(r, vec3c(3 * dot(m, r) / Math.pow(mag, 5)));
  const mm = mult(m, vec3c(1.0 / Math.pow(mag, 3)));
  return mult(subtract(mr, mm), vec3c(c));
}

function BSum(r) {
  var sum = 0;
  for (var i = 0; i < dipoles.length; ++i) {
    var v = B(dipoles[i].m, subtract(r, dipoles[i]));
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
function F(i, j) {
  const Rij = subtract(dipoles[j], dipoles[i]);
  const Rij_mag = length(Rij);
  const mi = dipoles[i].m;
  const mj = dipoles[j].m;

  // Use this constant if using dimensions
  const c = 3 * MU0 / (4 * Math.PI * Math.pow(Rij_mag, 5));

  // Use this constant if using dimensionless coordinates
  // const c = 1 / (2 * Math.pow(Rij_mag, 5));

  const n1 = mult(vec3c(dot(mi, Rij)), mj);
  const n2 = mult(vec3c(dot(mj, Rij)), mi);
  const n3 = mult(vec3c(dot(mi, mj)), Rij);
  const n4 = mult(vec3c(5 * dot(mi, Rij) * dot(mj, Rij) / Math.pow(Rij_mag, 2)),
                  Rij);
  return mult(vec3c(c), add(n1, add(n2, subtract(n3, n4))));
}

// Torque of dipole m_i on dipole m_j.
// Equation 10 of the paper.
function T(i, j) {
  const Rij = subtract(dipoles[j], dipoles[i]);
  const Rij_mag = length(Rij);
  const mi = dipoles[i].m;
  const mj = dipoles[j].m;

  // Use this constant if using dimensions
  const c = MU0 / (4 * Math.PI);

  // Use this constant if using dimensionless coordinates
  // const c = 1 / 6;

  const cn1 = 3 * dot(mi, Rij) / Math.pow(Rij_mag, 5);
  const n1 = mult(vec3c(cn1), cross(mj, Rij));
  const n2 = mult(cross(mj, mi), vec3c(1/Math.pow(Rij_mag, 3)));
  return mult(vec3c(c), subtract(n1, n2));
}

function updatePositions() {
  var f = F(0, 1);
  var t = T(0, 1);

  var m = dipoles[1].m;
  
  dipoles[1] = add(dipoles[1], mult(vec3c(10000), f));
  dipoles[1].m = m;
}

function tick() {
  // requestAnimFrame(tick);
  render();
  updatePositions();
}

// Scale factor for the dipole texture
const df = 0.16;
// Scale factor for the dipole field texture
const dff = 2.13;

function renderTextures() {
  pushMatrix();
  // mvMatrix = mult(mvMatrix, scalem(dff, dff, 1));
  // mvMatrix = mult(mvMatrix, scalem(df, df, 1));
  // renderTexture();
  popMatrix();

  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i]));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(df, df, 1));
    renderTexture();
    popMatrix();
  }
}

function renderCircles() {
  pushMatrix();
  const s = 0.08;
  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i]));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, s));
    renderCircle();
    popMatrix();
  }
  popMatrix();
}

function renderSpheres() {
  pushMatrix();
  const s = 0.08;
  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i]));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, s));
    renderSphere();
    popMatrix();
  }
  popMatrix();
}

function renderMagneticField(origin) {
  // Render magnetic field
  pushMatrix();
  const sf = 0.05;
  const inc = 0.08;
  const ystart = -1.0;// + (inc*100 % origin[1]*100)/100;
  const xstart = -1.0;
  const yend = 1.0;
  const xend = 1.0;
  for (var y = ystart; y < yend; y += inc) {
    for (var x = xstart; x < xend; x += inc) {
      var p = vec3(x, y, 0);
      // var v = B(dipoles[0].m, p);
      // var v = BSum(p);
      var v = B(dipoles[0].m, subtract(p, dipoles[0]));
      if (v != 0) {
        pushMatrix();
        mvMatrix = mult(mvMatrix, translate(p));
        var vnorm = normalize(v);
        var phi = Math.acos(dot(vec3(1, 0, 0), vnorm));
        if (phi != 0) {
          var axis = cross(vec3(1, 0, 0), vnorm);
          mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
        }
        mvMatrix = mult(mvMatrix, scalem(sf, sf, sf));
        renderArrow();
        popMatrix();
      }
    }
  }
  popMatrix();
}

// var theta = radians(45);
var theta = radians(0);
function render() {
  resize(canvas);
  aspect = canvas.width/canvas.height;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fovy = 40.0;
  const near = 0.01;
  const far = 100;
  const radius = 5;
  const at = vec3(0.0, 0.0, 0.0);
  var up = vec3(0.0, 1.0, 0.0);
  var eye = vec3(0, 0, 1);

  // pMatrix = perspective(fovy, aspect, near, far);
  const tw = 2.3;
  // var fh = tw;
  // var fw = fh * aspect;
  fh = tw;
  fw = fh * aspect;
  if (aspect < 1) {
    fw = tw;
    fh = fw / aspect;
  }
  pMatrix = ortho(0-fw/2, fw/2, 0-fh/2, fh/2, 0, 2);

  mvMatrix = lookAt(eye, at , up);  
  if (rotAngle != 0) {
    mvMatrix = mult(mvMatrix, rotate(rotAngle*180.0/Math.PI, rotVec));
  }
  mvMatrix = mult(mvMatrix, rotMatrix);

  // gl.enable(gl.BLEND);
  // // gl.blendFunc(gl.ONE, gl.ZERO);
  // // gl.blendFunc(gl.ZERO, gl.ONE);
  // // gl.blendFunc(gl.SRC_ALPHA, gl.DEST_ALPHA);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // renderFloor();

  pushMatrix();
  mvMatrix = mult(mvMatrix, scalem(dff, dff, 1));
  renderTexture();
  popMatrix();

  gl.disable(gl.DEPTH_TEST);

  // renderTextures();
  // renderSpheres();
  renderCircles();
  if (showB) {
    renderMagneticField(dipoles[1]);
  }

  var f = F(0, 1);
  var t = T(0, 1);
  // console.log(t);
  // console.log(length(t));
  renderForceArrow(dipoles[1], f);
  renderTorqueArrow(dipoles[1], t);
}

function keyDown(e) {
  switch (e.keyCode) {
  case 37:
    // left arrow
    break;
  case 38:
    // up arrow
    break;
  case 39:
    // right arrow
    break;
  case 40:
    // down arrow
    break;
  case "N".charCodeAt(0):
    tick();
    break;
  case "P".charCodeAt(0):
    tick();
    break;
  case "M".charCodeAt(0):
    showB = !showB;
    render();
    break;
  case "X".charCodeAt(0):
    view = "X";
    break;
  case "Y".charCodeAt(0):
    view = "Y";
    break;
  case "Z".charCodeAt(0):
    view = "Z";
    break;
  case "A".charCodeAt(0):
    view = "A";
    break;
  default:
    console.log("Unrecognized key press: " + e.keyCode);
    break;
  }

  requestAnimFrame(render);
}

//------------------------------------------------------------
// Mouse handlers
//------------------------------------------------------------
function onMouseClick(e) {
  var p = win2obj(vec2(e.clientX, e.clientY));
  if (length(subtract(p, mouseDownPos)) < 0.01) {
    // addPoint(p);
    movePoint(p, 1);
  }
}

var zooming;
function onMouseDown(e) {
  mouseDown = true;
  mouseDownPos = win2obj(vec2(e.clientX, e.clientY));
  button = e.button;
  // if (button == RIGHT_BUTTON) {
  zooming = false;
  if (e.shiftKey) {
    zooming = true;
    downZoom = zoom;
  }
}

function onMouseUp() {
  if (mouseDown) {
    mouseDown = false;
    // if (button == LEFT_BUTTON) {
    if (!zooming) {
      rotMatrix = mult(rotate(rotAngle*180.0/Math.PI, rotVec), rotMatrix);
      rotAngle = 0;
    }
  }
}

function onMouseMove(e) {
  mousePos = win2obj(vec2(e.clientX, e.clientY));

  if (mouseDown && mouseDownPos != mousePos) {
    if (e.shiftKey) {
      var p = vec3(mousePos[0], mousePos[1], 0.0);
      dipoles[1].m = normalize(subtract(p, dipoles[1]));
    } else {
      movePoint(mousePos, 1);
    }

    // arcball
    // if (!zooming) {
    //   const down_v = mapMouse(mouseDownPos);
    //   const v = mapMouse(mousePos);
    //   rotVec = normalize(cross(down_v, v));
    //   rotAngle = Math.acos(dot(down_v, v) / length(v));
    // } else {
    //   const factor = 2;
    //   zoom = downZoom * Math.pow(factor, mousePos[1] - mouseDownPos[1]);
    // }
    render();
  }
}

function mapMouse(p) {
  var x = p[0];
  var y = p[1];
  if (x*x + y*y > 1) {
    const len = Math.sqrt(x*x + y*y);
    x = x/len;
    y = y/len;
  }
  const z = Math.sqrt(Math.max(0.0, 1 - x*x - y*y));
  return vec3(x, y, z);
}

function win2obj(p) {
  var x = fw * p[0] / canvasWidth;
  var y = fh * (canvasHeight-p[1]) / canvasHeight;
  x = x - fw/2;
  y = y - fh/2;
  // var x = 2 * p[0] / canvasWidth - 1;
  // var y = 2 * (canvasHeight-p[1]) / canvasHeight - 1;
  // x = Math.max(Math.min(x, 1.0), -1.0);
  // y = Math.max(Math.min(y, 1.0), -1.0);
  return vec2(x, y);
}

function movePoint(p, i) {
  var m = dipoles[i].m;
  dipoles[i] = vec3(p[0], p[1], 0);
  dipoles[i].m = m;
  render();
}

function addPoint(p) {
  dipoles.push(vec3(p[0], p[1], 0));
  dipoles[dipoles.length-1].m = normalize(vec3(1, 0, 0));
  render();
}

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function configureTexture(image) {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
                gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                   gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.uniform1i(gl.getUniformLocation(textureProgram.program, "texture"), 0);
}

window.onload = function init() {
  document.onkeydown = keyDown;
  document.onclick = onMouseClick;
  document.onmousedown = onMouseDown;
  document.onmouseup = onMouseUp;
  document.onmousemove = onMouseMove;
  
  canvas = document.getElementById("gl-canvas");

  canvasWidth = canvas.width;
  canvasHeight = canvas.height;

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); }

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //  Load shaders and initialize attribute buffers
  lineProgram = new LineProgram();
  circleProgram = new CircleProgram();
  flatProgram = new FlatProgram();
  sphereProgram = new SphereProgram();
  textureProgram = new TextureProgram();

  var image = document.getElementById("dipoleFieldImage");
  // var image = document.getElementById("dipoleImage");
  configureTexture(image);

  axis = new Axis();
  floor = new Floor();
  arrow = new Arrow();
  segment = new Segment();
  sphereMesh = new SphereMesh(1, 200, 200);
  square = new Square();
  circle = new Circle();
  forceArrow = new ForceArrow();
  torqueArrow = new TorqueArrow();

  dipoles.push(vec3(0, 0, 0));
  dipoles[0].m = vec3(1, 0, 0);;

  dipoles.push(vec3(0.75, 0.75, 0));
  dipoles[1].m = normalize(vec3(0, 1, 0));

  // dipoles.push(vec3(-0.75, 0.25, 0));
  // dipoles[2].m = normalize(vec3(1, 1, 0));

  render();
}

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
var square;
var positions = new Array();

var lineProgram;
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
  for (var i = 0; i < positions.length; ++i) {
    var v = B(positions[i].m, subtract(r, positions[i]));
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

function updatePositions() {
  // console.log(B(positions[0].m, vec3(0.1, 0, 0)));
  // console.log(B(positions[0].m, vec3(0.5, 0, 0)));
  // console.log(B(positions[0].m, vec3(1, 0, 0)));
  // console.log(B(positions[0].m, vec3(2, 0, 0)));
  // for (var i = 0; i < positions.length; ++i) {
  //   console.log(B(positions[i].m, vec3(2, 0, 0)));
  // }
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

  for (var i = 0; i < positions.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(positions[i]));
    var phi = Math.acos(dot(vec3(1, 0, 0), positions[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), positions[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(df, df, 1));
    renderTexture();
    popMatrix();
  }
}

function renderSpheres() {
  pushMatrix();
  const s = 0.08;
  for (var i = 0; i < positions.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(positions[i]));
    var phi = Math.acos(dot(vec3(1, 0, 0), positions[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), positions[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, s));
    renderSphere();
    popMatrix();
  }
  popMatrix();
}

function renderMagneticField() {
  // Render magnetic field
  pushMatrix();
  const sf = 0.05;
  const inc = 0.08;
  for (var y = -1.0; y < 1.0; y += inc) {
    for (var x = -1.0; x < 1.0; x += inc) {
      var p = vec3(x, y, 0);
      // var v = B(positions[0].m, p);
      var v = BSum(p);
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

  gl.enable(gl.BLEND);
  // gl.blendFunc(gl.ONE, gl.ZERO);
  // gl.blendFunc(gl.ZERO, gl.ONE);
  // gl.blendFunc(gl.SRC_ALPHA, gl.DEST_ALPHA);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // gl.disable(gl.DEPTH_TEST);

  // renderFloor();

  pushMatrix();
  mvMatrix = mult(mvMatrix, scalem(dff, dff, 1));
  renderTexture();
  popMatrix();

  // renderTextures();
  renderSpheres();
  renderMagneticField();
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
    addPoint(p);
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
  //-----------------
  // Disable arcball
  //-----------------
  return;

  mousePos = win2obj(vec2(e.clientX, e.clientY));

  if (mouseDown && mouseDownPos != mousePos) {
    // if (button == LEFT_BUTTON) {
    if (!zooming) {
      const down_v = mapMouse(mouseDownPos);
      const v = mapMouse(mousePos);
      rotVec = normalize(cross(down_v, v));
      rotAngle = Math.acos(dot(down_v, v) / length(v));
    } else {
      const factor = 2;
      zoom = downZoom * Math.pow(factor, mousePos[1] - mouseDownPos[1]);
    }
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

function addPoint(p) {
  positions.push(vec3(p[0], p[1], 0));
  positions[positions.length-1].m = normalize(vec3(1, 0, 0));
  tick();
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

  positions.push(vec3(0, 0, 0));
  positions[0].m = vec3(1, 0, 0);;

  positions.push(vec3(0.75, 0.75, 0));
  positions[1].m = normalize(vec3(0, 1, 0));

  // positions.push(vec3(0.5, 0.5, 0));
  // positions[1].m = normalize(vec3(0, 1, 0));

  // positions.push(vec3(-0.75, 0.25, 0));
  // positions[2].m = normalize(vec3(1, 1, 0));

  tick();
}

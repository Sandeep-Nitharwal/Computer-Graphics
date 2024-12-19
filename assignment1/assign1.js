////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var color;
var animation;
var degree0 = 0;
var degree1 = 0;
var degree2 = 0;
var degree3 = 0;
var flag=0;
var degree4 = 1;
var degree5 = 0;
var flag1=0;
var degree6 = 0;
var flag2=0;
var matrixStack = [];
var flag3=0;

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleVertexPositionBuffer;
var circleVertexIndexBuffer;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;


const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 2.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initCircleBuffer() {
  const numSegments = 100;
  const circleVertices = [];
  const circleIndices = [];
  
  // Center of the circle
  circleVertices.push(0.0, 0.0); // Center point (x, y)

  // Generate circle points
  for (let i = 0; i <= numSegments; i++) {
    const angle = (i / numSegments) * Math.PI * 2; // Angle for each segment
    const x = Math.cos(angle) * 0.5; // Radius is 0.5
    const y = Math.sin(angle) * 0.5;
    circleVertices.push(x, y);
  }

  // Create indices for triangles (center point is at index 0)
  for (let i = 1; i <= numSegments; i++) {
    circleIndices.push(0, i, i + 1);
  }

  const circleVerticesBuffer = new Float32Array(circleVertices);
  const circleIndicesBuffer = new Uint16Array(circleIndices);

  // Create vertex buffer
  circleVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, circleVerticesBuffer, gl.STATIC_DRAW);
  circleVertexPositionBuffer.itemSize = 2;
  circleVertexPositionBuffer.numItems = numSegments+1;

  // Create index buffer
  circleVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndicesBuffer, gl.STATIC_DRAW);

  circleVertexIndexBuffer.itemsize = 1;
  circleVertexIndexBuffer.numItems = 3*numSegments;
}

function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // Bind the vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
  gl.vertexAttribPointer(aPositionLocation, circleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLocation);

  // Bind the index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleVertexIndexBuffer);

  // Set color
  gl.uniform4fv(uColorLoc, color);

  // Draw the circle using triangles
  if(flag3==0){
    gl.drawElements(gl.TRIANGLES, circleVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if(flag3==1){
    gl.drawElements(gl.POINTS, circleVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, circleVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if(flag3==0){
    gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if(flag3==1){
    gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if(flag3==0){
    gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if(flag3==1){
    gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else{
    gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

function draw_house(mMatrix){
    // base
    mMatrix = mat4.scale(mMatrix, [1, 0.5, 1.0]);
    color = [0.9, 0.9, 0.9, 1];
    drawSquare(color, mMatrix);

    // door
    mMatrix = mat4.translate(mMatrix, [0.0, -0.2, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.6, 1.0]);
    color = [1,0.7,0,1]
    drawSquare(color, mMatrix);

    // left window
    mMatrix = mat4.translate(mMatrix, [-2, 0.5, 0.0]);
    mMatrix = mat4.scale(mMatrix, [1, 0.5, 1.0]);
    color = [1,0.7,0,1]
    drawSquare(color, mMatrix);

    // right window
    mMatrix = mat4.translate(mMatrix, [4, 0.0, 0.0]);
    color = [1,0.7,0,1]
    drawSquare(color, mMatrix);

    // roof square
    mMatrix = mat4.translate(mMatrix, [-2.0, 2.83, 0.0]);
    mMatrix = mat4.scale(mMatrix, [5, 3, 1.0]);
    color = [1,0.3,0,1]
    drawSquare(color, mMatrix);

    // left roof triangle
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.75, 1, 1.0]);
    color = [1,0.3,0,1]
    drawTriangle(color, mMatrix);

    // right roof triangle
    mMatrix = mat4.translate(mMatrix, [1.34, 0, 0.0]);
    color = [1,0.3,0,1]
    drawTriangle(color, mMatrix);

}

function draw_river(mMatrix){
    // river
    mMatrix = mat4.scale(mMatrix, [1.5, 0.3, 1.0]);
    color = [0.0, 0.0, 1, 0.8];
    drawSquare(color, mMatrix);

    // stripes from left to right
    mMatrix = mat4.scale(mMatrix, [0.2, 0.012, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-1.7, -5, 0.0]);
    color = [1, 1, 1, 1];
    drawSquare(color, mMatrix);

    mMatrix = mat4.translate(mMatrix, [1.7, 25, 0.0]);
    color = [1, 1, 1, 1];
    drawSquare(color, mMatrix);

    mMatrix = mat4.translate(mMatrix, [1.8, -50, 0.0]);
    color = [1, 1, 1, 1];
    drawSquare(color, mMatrix);

}

function draw_boat(flagcolor,mMatrix){

    degree0 = 64
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    //support rod
    mMatrix = mat4.scale(mMatrix, [0.8, 0.01, 0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.39, 35, 0.0]);
    color = [0, 0, 0, 1];
    drawSquare(color, mMatrix);

    //body
    mMatrix = mat4.translate(mMatrix, [-0.39, -35, 0.0]);
    mMatrix = mat4.scale(mMatrix, [1/0.8, 1/0.01, 0, 1.0]);
    degree0 = -64
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.5/3, 1.0]);
    color = [0.7, 0.7, 0.7, 1];
    drawSquare(color, mMatrix);

    // left triangle
    degree0 = 180
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.6, 1, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.846, 0.0, 0.0]);
    drawTriangle(color, mMatrix);

    // right triangle
    mMatrix = mat4.translate(mMatrix, [-1.69, 0.0, 0.0]);
    drawTriangle(color, mMatrix);

    // center rod
    mMatrix = mat4.translate(mMatrix, [0.846, 0.0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 4.5, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0, 0.61, 0.0]);
    color = [0, 0, 0, 1];
    drawSquare(color, mMatrix);

    //flag
    degree0 = 270
    mMatrix = mat4.scale(mMatrix, [20, 2.5/4, 0, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-0.2, 0.52, 0.0]);
    color = [1, 0, 0, 1];
    drawTriangle(flagcolor, mMatrix);

}

function draw_tree(mMatrix){

  //base
  degree0 = 90
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.1, 0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-1, 0, 0.0]);
  color = [0.41, 0.25, 0.2, 1];
  drawSquare(color, mMatrix);

  //t1
  mMatrix = mat4.scale(mMatrix, [2, 10, 1.0]);
  degree0 = -90
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  color = [0, 0.5, 0.2, 1];
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 0.9, 0.0]);
  drawTriangle(color, mMatrix);

  //t2
  color = [0.2, 0.75, 0.2, 1];
  mMatrix = mat4.scale(mMatrix, [1.2, 1, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 0.15, 0.0]);
  drawTriangle(color, mMatrix);

  //t3
  color = [0.2, 0.9, 0.2, 1];
  mMatrix = mat4.scale(mMatrix, [1.2, 1, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 0.15, 0.0]);
  drawTriangle(color, mMatrix);
}

function draw_star(color,mMatrix){

  //center square
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
  drawSquare(color, mMatrix);

  //top
  mMatrix = mat4.scale(mMatrix, [1, 4, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 0.62, 0.0]);
  drawTriangle(color, mMatrix);

  //bottom
  degree0 = 180
  mMatrix = mat4.translate(mMatrix, [0, -1.24, 0.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  drawTriangle(color, mMatrix);

  //left
  degree0 = 180
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0,0.62, 0.0]);
  mMatrix = mat4.scale(mMatrix, [4, 1/4, 1.0]);
  degree0 = 90
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 0.62, 0.0]);
  drawTriangle(color, mMatrix);

  //right
  degree0 = 180
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0,1.24, 0.0]);
  drawTriangle(color, mMatrix);
}

function draw_mountains(mMatrix){

  mMatrix = mat4.scale(mMatrix, [1.5, 0.4, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.5,0.05, 0.0]);
  color = [0.36, 0.25, 0.2, 1];
  drawTriangle(color, mMatrix);
  mMatrix = mat4.scale(mMatrix, [1/1.5, 1, 1.0]);
  
  degree0 = 8
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.scale(mMatrix, [2, 1.5, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.035,-0.175, 0.0]);
  color = [0.60, 0.45, 0.40, 1];
  drawTriangle(color, mMatrix);
  mMatrix = mat4.scale(mMatrix, [1.5/2, 1, 1.0]);


  degree0 = -8
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [1.02,0.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1, 0.6, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.08,0, 0.0]);
  color = [0.60, 0.45, 0.40, 1];
  drawTriangle(color, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.08,0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 1, 1.0]);


  mMatrix = mat4.translate(mMatrix, [-1,-0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [4.2, 3, 1.0]);
  color = [0.36, 0.25, 0.2, 1];
  drawTriangle(color, mMatrix);

  degree0 = 8
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.07,0.0, 0.0]);
  color = [0.60, 0.45, 0.40, 1];
  drawTriangle(color, mMatrix);

}


function draw_windmill(degree, mMatrix) {
  // Draw the windmill base
  color = [0.2, 0.25, 0.2, 1];
  mMatrix = mat4.translate(mMatrix, [0, -2.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.3, 5, 1.0]);
  drawSquare(color, mMatrix);

  // Draw the blades
  color = [0.6, 0.6, 0.1, 1];

  mMatrix = mat4.scale(mMatrix, [1/0.3, 1/5, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, 2.5, 0.0]);
  // Top Blade
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, -1.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 2.5, 1.0]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Bottom Blade
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree + 180), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, -1.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 2.5, 1.0]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Left Blade
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree + 90), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, -1.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 2.5, 1.0]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Right Blade
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree + 270), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, -1.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 2.5, 1.0]);
  drawTriangle(color, mMatrix);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Draw the circle at the center of the windmill
  color = [0, 0, 0, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 1.0]);
  drawCircle(color, mMatrix);
  mMatrix = popMatrix(matrixStack, mMatrix);
}



function draw_car(mMatrix){
  color = [0,0,0,1];
  mMatrix = mat4.scale(mMatrix, [0.2,0.2, 0.0]);
  mMatrix = mat4.translate(mMatrix,[-1.5,-2,0]);
  drawCircle(color,mMatrix);

  mMatrix = mat4.translate(mMatrix,[3,0,0]);
  drawCircle(color,mMatrix);

  color = [0.7, 0.7, 0.7, 1.0];
  mMatrix = mat4.scale(mMatrix, [0.8,0.8, 0.0]);
  drawCircle(color,mMatrix);

  mMatrix = mat4.translate(mMatrix,[-15/4,0,0]);
  drawCircle(color,mMatrix);

  
  mMatrix = mat4.translate(mMatrix,[15/4,0,0]);
  mMatrix = mat4.scale(mMatrix, [1.25,1.25, 0.0]);
  mMatrix = mat4.translate(mMatrix,[-1.5,1.5,0]);
  mMatrix = mat4.scale(mMatrix, [1/0.2,1/0.2, 0.0]);
  
  color = [0,0,1,0.75]
  mMatrix = mat4.scale(mMatrix, [0.85,0.5, 0.0]);
  drawCircle(color,mMatrix);

  mMatrix = mat4.scale(mMatrix, [1/0.85,2, 0.0]);

  mMatrix = mat4.scale(mMatrix, [0.5, 0.3, 1.0]);
  color = [0.8,0.8,0.8,1]
  drawSquare(color, mMatrix);

  mMatrix = mat4.scale(mMatrix, [2, 10/3, 1.0]);
  
  // roof square
  mMatrix = mat4.scale(mMatrix, [1, 0.25, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0, -0.55, 0.0]);
  color = [0,0,1,1]
  drawSquare(color, mMatrix);
  
  // left roof triangle
  mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 1, 1.0]);
  color = [0,0,1,1]
  drawTriangle(color, mMatrix);
  
  // right roof triangle
  mMatrix = mat4.translate(mMatrix, [5, 0, 0.0]);
  color = [0,0,1,1]
  drawTriangle(color, mMatrix);
  
}

function draw_sun(mMatrix){
  color = [1,1,1,1];
  degree0 = 45
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);

  mMatrix = mat4.scale(mMatrix, [0.008, 0.52, 1.0]);
  drawSquare(color,mMatrix)

  mMatrix = mat4.scale(mMatrix, [0.52/0.008, 0.008/0.52, 1.0]);
  drawSquare(color,mMatrix)

  mMatrix = mat4.scale(mMatrix, [0.4/0.52, 1/0.02, 1.0]);
  degree0 = -45
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
  drawCircle(color,mMatrix);

  mMatrix = mat4.scale(mMatrix, [0.02, 1.3, 1.0]);
  drawSquare(color,mMatrix)

  mMatrix = mat4.scale(mMatrix, [0.52/0.008, 0.008/0.52, 1.0]);
  drawSquare(color,mMatrix)
}

function draw_cloud(mMatrix){
  color = [0.7,0.7,0.7,1]
  mMatrix = mat4.scale(mMatrix, [0.4, 0.25, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-1, 0.0, 0.0]);
  drawCircle(color,mMatrix);

  mMatrix = mat4.translate(mMatrix, [1, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.6, -0.15, 0.0]);
  color = [0.95,0.95,0.95,1]
  drawCircle(color,mMatrix);

  mMatrix = mat4.translate(mMatrix, [0.6, 0.15, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.075, -0.2, 0.0]);
  color = [0.7,0.7,0.7,1]
  drawCircle(color,mMatrix);

}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);


    if (animation) {
      window.cancelAnimationFrame(animation);
    }
  
    var animate = function () {
      gl.clearColor(1, 1, 1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // initialize the model matrix to identity matrix
      mat4.identity(mMatrix);

      
      
      
      pushMatrix(matrixStack, mMatrix);
      color = [0,0,0,1]
      mMatrix = mat4.scale(mMatrix, [2, 1, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0, 0.5, 0.0]);
      drawSquare(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      
      pushMatrix(matrixStack, mMatrix);
      draw_mountains(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      pushMatrix(matrixStack, mMatrix);
      
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-0.7, 0.7, 0.0]);
      draw_cloud(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      degree2 += 0.5
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-1.4, 1.6, 0.0]);
      mMatrix = mat4.rotate(mMatrix, degToRad(degree2), [0.0, 0.0, 1.0]);
      draw_sun(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //stars
      if(degree4>=1.5){
        flag=1;
      }
      else if(degree4<=1){
        flag=0;
      }
      if(flag==0){
        degree4+=0.02;
      }
      else{
        degree4-=0.02;
      }
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.translate(mMatrix, [0.2, 0.75, 0.0]);
      mMatrix = mat4.scale(mMatrix, [degree4*0.05, degree4*0.05, 1.0]);
      color = [1, 1, 1, 1];
      draw_star(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.translate(mMatrix, [0.45, 0.9, 0.0]);
      mMatrix = mat4.scale(mMatrix, [degree4*0.03, degree4*0.03, 1.0]);
      color = [1, 1, 1, 1];
      draw_star(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.translate(mMatrix, [-0.4, 0.7, 0.0]);
      mMatrix = mat4.scale(mMatrix, [degree4*0.04, degree4*0.04, 1.0]);
      color = [1, 1, 1, 1];
      draw_star(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.translate(mMatrix, [-0.3, 0.6, 0.0]);
      mMatrix = mat4.scale(mMatrix, [degree4*0.04, degree4*0.04, 1.0]);
      color = [1, 1, 1, 1];
      draw_star(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.translate(mMatrix, [-0.35, 0.5, 0.0]);
      mMatrix = mat4.scale(mMatrix, [degree4*0.025, degree4*0.025, 1.0]);
      color = [1, 1, 1, 1];
      draw_star(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      //star ends


      //tree start
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.5, 0.45, 1.0]);
      mMatrix = mat4.translate(mMatrix, [1.55, 0.72, 0.0]);
      draw_tree(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.6, 0.5, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.8, 0.75, 0.0]);
      draw_tree(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.5, 0.75, 0.0]);
      draw_tree(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      //tree ends

      
      pushMatrix(matrixStack, mMatrix);
      color = [0,1,0,0.6]
      mMatrix = mat4.scale(mMatrix, [2, 1, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0, -0.5, 0.0]);
      drawSquare(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      color = [0.5,0.7,0.2,1]
      mMatrix = mat4.scale(mMatrix, [2, 1.3, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.15, -0.5, 0.0]);
      degree0 = 40
      mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
      drawTriangle(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      
      
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [4/3, 0.8, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0, -0.2, 0.0]);
      draw_river(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //boats
      if(degree5>=4.5){
        flag1=1;
      }
      else if(degree5<=-2.5){
        flag1=0;
      }
      if(flag1==0){
        degree5+=0.01;
      }
      else{
        degree5-=0.01;
      }
      if(degree6>=2.2){
        flag2=1;
      }
      else if(degree6<=-1.0){
        flag2=0;
      }
      if(flag2==0){
        degree6+=0.006;
      }
      else{
        degree6-=0.006;
      }
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-1+degree5, -0.4, 0.0]);
      color = [2/3,2/15,1,1]
      draw_boat(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-0.5+ degree6, -0.4, 0.0]);
      color = [1,0,0,1]
      draw_boat(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      //boats ends

      //windmill
      degree3-=1;
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
      mMatrix = mat4.translate(mMatrix, [6.5, -0.25, 0.0]);
      // mMatrix = mat4.rotate(mMatrix, degToRad(degree2), [0.0, 0.0, 1.0]);
      draw_windmill(degree3,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.07, 0.07, 1.0]);
      mMatrix = mat4.translate(mMatrix, [6, -0.25, 0.0]);
      draw_windmill(degree3,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);
      // end windmill
      
      //bush house left
      pushMatrix(matrixStack, mMatrix);
      color = [0.3,0.7,0.2,0.9]
      mMatrix = mat4.scale(mMatrix, [0.12, 0.08, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-8, -7.5, 0.0]);
      drawCircle(color,mMatrix);

      color = [0.3,0.7,0.2,1]
      mMatrix = mat4.scale(mMatrix, [1.1, 1.2, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.5, 0, 0.0]);
      drawCircle(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //bush house right
      pushMatrix(matrixStack, mMatrix);
      color = [0.3,0.7,0.2,0.9]
      mMatrix = mat4.scale(mMatrix, [0.2, 0.12, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-1.6, -4.8, 0.0]);
      drawCircle(color,mMatrix);

      color = [0.1,0.5,0.2,1]
      mMatrix = mat4.scale(mMatrix, [0.6, 0.8, 1.0]);
      mMatrix = mat4.translate(mMatrix, [1.5, 0, 0.0]);
      drawCircle(color,mMatrix);

      mMatrix = mat4.translate(mMatrix, [-1.5, 0, 0.0]);
      mMatrix = mat4.scale(mMatrix, [1/0.6, 1/0.8, 1.0]);
      color = [0.3,0.7,0.2,1]
      mMatrix = mat4.scale(mMatrix, [1.1, 1.2, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.3, 0.1, 0.0]);
      drawCircle(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //bush left
      pushMatrix(matrixStack, mMatrix);
      color = [0.3,0.7,0.2,0.9]
      mMatrix = mat4.scale(mMatrix, [0.2, 0.15, 1.0]);
      mMatrix = mat4.translate(mMatrix, [4.4, -3.4, 0.0]);
      drawCircle(color,mMatrix);

      color = [0.3,0.6,0.2,1]
      mMatrix = mat4.scale(mMatrix, [1.3, 1.3, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.5, 0, 0.0]);
      drawCircle(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //bush bottom
      pushMatrix(matrixStack, mMatrix);
      color = [0.3,0.7,0.2,0.9]
      mMatrix = mat4.scale(mMatrix, [0.35, 0.2, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-0.8, -5.2, 0.0]);
      drawCircle(color,mMatrix);

      color = [0.1,0.5,0.2,1]
      mMatrix = mat4.scale(mMatrix, [0.6, 0.8, 1.0]);
      mMatrix = mat4.translate(mMatrix, [1.5, 0, 0.0]);
      drawCircle(color,mMatrix);

      mMatrix = mat4.translate(mMatrix, [-1.5, 0, 0.0]);
      mMatrix = mat4.scale(mMatrix, [1/0.6, 1/0.8, 1.0]);
      color = [0.3,0.7,0.2,1]
      mMatrix = mat4.scale(mMatrix, [1.1, 1.2, 1.0]);
      mMatrix = mat4.translate(mMatrix, [0.3, 0.1, 0.0]);
      drawCircle(color,mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //house
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.5, 0.45, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-1.2, -1.2, 0.0]);
      draw_house(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      //car
      pushMatrix(matrixStack, mMatrix);
      mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 1.0]);
      mMatrix = mat4.translate(mMatrix, [-1.3, -1.75, 0.0]);
      draw_car(mMatrix);
      mMatrix = popMatrix(matrixStack, mMatrix);

      animation = window.requestAnimationFrame(animate);
    }

    animate();


    
    
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("assign1");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();

  drawScene();
}

function change(val){
  flag3 = val;
}
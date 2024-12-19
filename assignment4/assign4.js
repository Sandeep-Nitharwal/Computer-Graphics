var gl;
var canvas;

var zAngle = 0.0;
var yAngle = 0.0;

var prevMouseX = 0;
var prevMouseY = 0;

var pass = 2;
var do_animate = true;

var pass1_shader;
var pass1_aPositionLocation;
var pass1_uMMatrixLocation;
var pass1_uPMatrixLocation;
var pass1_uVMatrixLocation;
var pass1_uDiffuseTermLocation;

var shaderProgram;
var aNormalLocation;
var aPositionLocation;
var uColorLocation;
var uShadowLocation;

var uVMatrixLocation;
var uMMatrixLocation;
var uPMatrixLocation;
var uLVMatrixLocation;

var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;

var FBO;
var depthTexture;

var cubeBuf;
var indexBuf;
var cubeNormalBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var light_vMatrix = mat4.create(); 
var light_mMatrix = mat4.create(); 
var light_pMatrix = mat4.create(); 

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var lVMatrix = mat4.create();

var depthTextureSize = 1024;
var eyePos = [0, 0.3, 0.3];
var defaultEyePos = [0, 0.3, 0.3];

var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var light = [0.3, 0.4, 0];
var degree = 0.0;

// Inpur JSON model file to load
var input_JSON = "teapot.json";

const vertexShaderCode_1 = `#version 300 es

in vec3 aPosition;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

void main() 
{
	gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
}`;

// Fragment shader code
const fragShaderCode_1 = `#version 300 es

precision highp float;
uniform vec4 diffuseTerm;
out vec4 fragColor;
	
void main() {
	fragColor = diffuseTerm;
}`;

const vertexShaderCode_2 = `#version 300 es

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uLVMatrix;
uniform vec3 uLightDirection;

out mat4 vMatrix;
out vec3 Normal;
out vec4 shadowTextureCoord;
out vec3 L,R,V;

void main() 
{
	gl_PointSize = 1.0;
	gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);

	const mat4 textureTransformMat = mat4(0.5, 0.0, 0.0, 0.0,0.0, 0.5, 0.0, 0.0,0.0, 0.0, 0.5, 0.0,0.5, 0.5, 0.5, 1.0);
	mat4 lightProjectionMat = textureTransformMat * uPMatrix * uLVMatrix * uMMatrix;
	shadowTextureCoord = lightProjectionMat * vec4(aPosition, 1.0);
	
	vMatrix=uVMatrix;
	mat3 normalTransformMatrix = mat3(uVMatrix * uMMatrix);
	Normal = vec3(normalize(normalTransformMatrix * aNormal));
	
	vec3 temp = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
	L = normalize(vec3(vMatrix * vec4(uLightDirection, 1.0))  - temp);
	R = normalize(-reflect(L, Normal));
	V = normalize(-temp);
}`;

const fragShaderCode_2 = `#version 300 es

precision highp float;

uniform sampler2D uShadowMap;
uniform vec4 objColor;

in vec3 L,R,V;
in vec3 Normal;
in mat4 vMatrix;
in vec4 shadowTextureCoord;

out vec4 fragColor;
	
void main() {

	float diffuse = max(dot(Normal, L), 0.0);
	float specular = 1.0*pow(max(dot(V, R), 0.0),10.0);
	float ambient = 0.1;

	vec3 projectedTexcoord = (shadowTextureCoord.xyz) / (shadowTextureCoord.w);
	float closestDepth = texture(uShadowMap, projectedTexcoord.xy).r;
	float currentDepth = projectedTexcoord.z;
	float bias = 0.01;

	float shadowFactor = currentDepth - bias > closestDepth ? 0.3 : 1.0;

	vec4 phongColor = vec4(vec3((diffuse) * objColor ), 1.0) + vec4(vec3(specular), 1.0);
	fragColor = vec4(shadowFactor * vec3(phongColor), 1) + vec4(vec3(ambient), 1.0);
}`;

function vertexShaderSetup(vertexShaderCode) {
	var shader = gl.createShader(gl.VERTEX_SHADER);
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
	var shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, fragShaderCode);
	gl.compileShader(shader);

	// Error check whether the shader is compiled correctly
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {

  var shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	console.log(gl.getShaderInfoLog(vertexShader));
	console.log(gl.getShaderInfoLog(fragmentShader));
  }

  return shaderProgram;
}

function initDepthFBO(){
	depthTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D,depthTexture);
	gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT32F,depthTextureSize,depthTextureSize,0,gl.DEPTH_COMPONENT,gl.FLOAT,null);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	FBO = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);
	FBO.width = depthTextureSize;
	FBO.height = depthTextureSize;
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture,0)

	var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if (FBOstatus != gl.FRAMEBUFFER_COMPLETE)
		console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use FBO");
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

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
}

function initObject() {

  // XMLHttpRequest objects are used to interact with servers
  // It can be used to retrieve any type of data, not just XML.
  var request = new XMLHttpRequest();
  request.open("GET", input_JSON);
  // MIME: Multipurpose Internet Mail Extensions
  // It lets users exchange different kinds of data files
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
	//request.readyState == 4 means operation is done
	if (request.readyState == 4) {
	  processObject(JSON.parse(request.responseText));
	}
  };
  request.send();
}

function processObject(objData) 
{
	objVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.bufferData(
	gl.ARRAY_BUFFER,
	new Float32Array(objData.vertexPositions),
	gl.STATIC_DRAW
	);
	objVertexPositionBuffer.itemSize = 3;
	objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

	objVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(objData.vertexNormals),
        gl.STATIC_DRAW
    );
    objVertexNormalBuffer.itemSize = 3;
    objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;

	objVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
	gl.bufferData(
	gl.ELEMENT_ARRAY_BUFFER,
	new Uint32Array(objData.indices),
	gl.STATIC_DRAW
	);
	objVertexIndexBuffer.itemSize = 1;
	objVertexIndexBuffer.numItems = objData.indices.length;
	drawScene();
}

function drawObject(color) 
{
	if (pass == 1){
		gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
		gl.vertexAttribPointer(pass1_aPositionLocation, objVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

		gl.uniformMatrix4fv(pass1_uMMatrixLocation, false, light_mMatrix);
		gl.uniformMatrix4fv(pass1_uVMatrixLocation, false, light_vMatrix);
		gl.uniformMatrix4fv(pass1_uPMatrixLocation, false, light_pMatrix);
		gl.uniform4fv(pass1_uDiffuseTermLocation, color);

		gl.drawElements(gl.TRIANGLES, objVertexIndexBuffer.numItems, gl.UNSIGNED_INT, 0);
		return ;
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.vertexAttribPointer(aPositionLocation, objVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
	gl.vertexAttribPointer(
		aNormalLocation,
		objVertexNormalBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
    );
	

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

	gl.uniform4fv(uColorLocation, color);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	gl.uniformMatrix4fv(uLVMatrixLocation, false, lVMatrix);
	gl.uniform3fv(uLightLocation, light);

	gl.drawElements(
		gl.TRIANGLES,
		objVertexIndexBuffer.numItems,
		gl.UNSIGNED_INT,
		0
	);
}

function initSphere(nslices, nstacks, radius) {
    for (var i = 0; i <= nslices; i++) {
      var angle = (i * Math.PI) / nslices;
      var comp1 = Math.sin(angle);
      var comp2 = Math.cos(angle);
  
      for (var j = 0; j <= nstacks; j++) {
        var phi = (j * 2 * Math.PI) / nstacks;
        var comp3 = Math.sin(phi);
        var comp4 = Math.cos(phi);
  
        var xcood = comp4 * comp1;
        var ycoord = comp2;
        var zcoord = comp3 * comp1;
  
        spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
        spNormals.push(xcood, ycoord, zcoord);
      }
    }
  
    // now compute the indices here
    for (var i = 0; i < nslices; i++) {
      for (var j = 0; j < nstacks; j++) {
        var id1 = i * (nstacks + 1) + j;
        var id2 = id1 + nstacks + 1;
  
        spIndicies.push(id1, id2, id1 + 1);
        spIndicies.push(id2, id2 + 1, id1 + 1);
      }
    }
  }
  
function initSphereBuffer() {
    var nslices = 100;
    var nstacks = 100;
    var radius = 0.5;
  
    initSphere(nslices, nstacks, radius);
  
    // buffer for vertices
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = spVerts.length / 3;
  
    // buffer for indices
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(spIndicies),
      gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = spIndicies.length;
  
    // buffer for normals
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = spNormals.length / 3;

}

function drawSphere(color) {

	if (pass == 1)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
		gl.vertexAttribPointer(pass1_aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

		gl.uniformMatrix4fv(pass1_uMMatrixLocation, false, light_mMatrix);
		gl.uniformMatrix4fv(pass1_uVMatrixLocation, false, light_vMatrix);
		gl.uniformMatrix4fv(pass1_uPMatrixLocation, false, light_pMatrix);
		gl.uniform4fv(pass1_uDiffuseTermLocation, color);

		gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);

		return;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.vertexAttribPointer(aPositionLocation,spBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.vertexAttribPointer(aNormalLocation,spNormalBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform4fv(uColorLocation, color);
	gl.uniform3fv(uLightLocation, light);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uLVMatrixLocation, false, lVMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

	gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

// Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
	// Front face
	-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
	// Back face
	-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
	// Top face
	-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
	// Bottom face
	-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
	// Right face
	0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
	// Left face
	-0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  cubeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  cubeBuf.itemSize = 3;
  cubeBuf.numItems = vertices.length / 3;

  var normals = [
	// Front face
	0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
	// Back face
	0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
	// Top face
	0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
	// Bottom face
	0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
	// Right face
	1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
	// Left face
	-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;

  var indices = [
	0,
	1,
	2,
	0,
	2,
	3, // Front face
	4,
	5,
	6,
	4,
	6,
	7, // Back face
	8,
	9,
	10,
	8,
	10,
	11, // Top face
	12,
	13,
	14,
	12,
	14,
	15, // Bottom face
	16,
	17,
	18,
	16,
	18,
	19, // Right face
	20,
	21,
	22,
	20,
	22,
	23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
	gl.ELEMENT_ARRAY_BUFFER,
	new Uint16Array(indices),
	gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color) {

	if (pass == 1){
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
		gl.vertexAttribPointer(pass1_aPositionLocation, cubeBuf.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

		gl.uniformMatrix4fv(pass1_uMMatrixLocation, false, light_mMatrix);
		gl.uniformMatrix4fv(pass1_uVMatrixLocation, false, light_vMatrix);
		gl.uniformMatrix4fv(pass1_uPMatrixLocation, false, light_pMatrix);
		gl.uniform4fv(pass1_uDiffuseTermLocation, color);

		gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
		return;
	}

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
	gl.vertexAttribPointer(aPositionLocation,cubeBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
	gl.vertexAttribPointer(aNormalLocation,cubeNormalBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	gl.uniform4fv(uColorLocation, color);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	gl.uniformMatrix4fv(uLVMatrixLocation, false, lVMatrix);
	gl.uniform3fv(uLightLocation, light);
	
	gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);

}


function updateCamera() {
	const cosTheta = Math.cos(degToRad(degree));
    const sinTheta = Math.sin(degToRad(degree));
    eyePos[0] = defaultEyePos[0] * cosTheta - defaultEyePos[2] * sinTheta;
    eyePos[2] = defaultEyePos[0] * sinTheta + defaultEyePos[2] * cosTheta;
    mat4.lookAt(eyePos, COI, viewUp, vMatrix);
}

function draw_figure(mMatrix)
{

	mMatrix = mat4.scale(mMatrix, [0.3, 0.01, 0.4]);
	drawCube([0.3, 0.3, 0.3, 1.0]);
	mMatrix = mat4.scale(mMatrix, [1/0.3, 1/0.01, 1/0.4]);

	mMatrix = mat4.translate(mMatrix, [0.03, 0.03, 0.09]);
	mMatrix = mat4.scale(mMatrix, [0.06 , 0.06, 0.06]);
	drawSphere([0.0, 0.4, 0.6, 1.0]);
	mMatrix = mat4.scale(mMatrix, [1/0.06, 1/0.06, 1/0.06]);
	mMatrix = mat4.translate(mMatrix, [-0.03, -0.03, -0.09]);

	mMatrix = mat4.translate(mMatrix, [0, 0.05, -0.05]);
	mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0, 1, 0]);
	mMatrix = mat4.scale(mMatrix, [0.006, 0.006, 0.006]);
	drawObject([0.2, 0.8, 0.5, 1.0]);
	mMatrix = mat4.scale(mMatrix, [1/0.006, 1/0.006, 1/0.006]);
	mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
	mMatrix = mat4.translate(mMatrix, [0, -0.05, 0.05]);

	mMatrix = mat4.identity(mMatrix);
}

const position_controller = () => {

	var temp = document.getElementById('light_pos')
	temp.addEventListener('input', () => {
		light[2] = temp.value;
		var x = do_animate;
		do_animate = false;
		drawScene();
		do_animate = x;
	});
}


//The main drawing routine
function drawScene() 
{
	animate = function()
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);
		gl.viewport(0, 0, depthTextureSize, depthTextureSize);
		gl.clearColor(0, 0, 0, 1.0);
		gl.clear( gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(pass1_shader);
		
		light_mMatrix = mat4.identity(light_mMatrix);
		light_pMatrix = mat4.identity(light_pMatrix);
		mat4.perspective(50, 1.0, 0.1, 1000, light_pMatrix);
		
		light_vMatrix = mat4.identity(light_vMatrix);
		light_vMatrix = mat4.lookAt(light, COI, viewUp, light_vMatrix);
		
		lVMatrix = light_vMatrix;
		
		pass = 1;
		gl.enableVertexAttribArray(pass1_aPositionLocation);
		draw_figure(light_mMatrix);
		gl.disableVertexAttribArray(pass1_aPositionLocation);
		pass = 2;
		
		mMatrix = mat4.identity(mMatrix);
		pMatrix = mat4.identity(pMatrix);
		mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);
		
		vMatrix = mat4.identity(vMatrix);
		vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
        
		if (do_animate)
		{
			updateCamera();
			degree += 0.2;
		}
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clearColor(0, 0, 0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(shaderProgram);
		gl.enableVertexAttribArray(aPositionLocation);
		gl.enableVertexAttribArray(aNormalLocation);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, depthTexture);
		gl.uniform1i(uShadowLocation, 0);
		
		draw_figure(mMatrix);
		
		gl.disableVertexAttribArray(aPositionLocation);
		gl.disableVertexAttribArray(aNormalLocation);
		
		if (do_animate)
			animationRequestId = requestAnimationFrame(animate);
	}
	animate();

}


// This is the entry point from the html
function webGLStart() 
{
	canvas = document.getElementById("assign4");

	initGL(canvas);
	gl.enable(gl.DEPTH_TEST);
	

	initDepthFBO();
	initSphereBuffer();
	initCubeBuffer();
	initObject();
	pass1_shader = initShaders(vertexShaderCode_1, fragShaderCode_1);
	pass1_aPositionLocation = gl.getAttribLocation(pass1_shader, "aPosition");
	pass1_uMMatrixLocation = gl.getUniformLocation(pass1_shader, "uMMatrix");
	pass1_uVMatrixLocation = gl.getUniformLocation(pass1_shader, "uVMatrix");
	pass1_uPMatrixLocation = gl.getUniformLocation(pass1_shader, "uPMatrix");
	pass1_uDiffuseTermLocation = gl.getUniformLocation(pass1_shader, "diffuseTerm");

	shaderProgram = initShaders(vertexShaderCode_2, fragShaderCode_2);
	aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	
	uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
	uLightLocation = gl.getUniformLocation(shaderProgram, "uLightDirection");
	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
	uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
	uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
	uLVMatrixLocation = gl.getUniformLocation(shaderProgram, "uLVMatrix");
	uShadowLocation = gl.getUniformLocation(shaderProgram, "uShadowMap");

	const checkbox = document.getElementById('checkBox');
	function updateCheckboxStatus() {
		if (checkbox.checked) do_animate = true; 
		else do_animate = false;
		drawScene();
	}
	checkbox.addEventListener('change', updateCheckboxStatus);
	position_controller();

}

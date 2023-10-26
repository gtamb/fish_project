
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.

// for the body of the fish
var coneRotation = [0,0,0];

var fishPos = [-2, -0.7, 0];
var finRot = [0,0,0];

// rotation of all the strands
var seaweedRot = [0,0,0];
// rotation of the segments of the strands of seaweed
var seaSRot = [0,0,0,0,0,0,0,0,0];

// rotations for the limbs
var leftLegRot = [0,0,0];
var lowLeftRot = [0,0,0];
var rightLegRot = [0,0,0];
var lowRightRot = [0,0,0];

var torsoPos = [3.5, 0, 0];

var mouthPos = [0,0,0];
var bubblePos = [0,0,0];

var bubbleSpeed = [0,0,0,0]; // each element is a different speed for different bubbles


// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);


    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
		
		controller = new CameraController(canvas);
		controller.onchange = function(xRot,yRot) {
			RX = xRot;
			RY = yRot;
			window.requestAnimFrame(render); };
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}


function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	

	// sea floor + rocks
	background();
	
	// fish 
	fish(timestamp);

	// seaweed
	seaweed(timestamp);

	//human
	human(timestamp);

	// bubbles
	bubble();
	
		

	
    if( animFlag )
        window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}
/*
Creates the seafloor and the rocks for the scene. No elements move.

*/
function background(){
	// seafloor cube
	gPush();

		gTranslate(0, -5, 0);
		gPush();
		{
			setColor(vec4(0.0, 0.0, 0.0, 1.0));	
			gScale(6, 1, 6);
			drawCube();
		}
		gPop();
	gPop();
	
	// rock 1
	gPush();
	
		gTranslate(0, -3.4, 0);
		gPush();
		{
			setColor(vec4(0.5, 0.5, 0.5, 1.0));
			gScale(0.6, 0.6, 0.6);
			drawSphere();
		}
		gPop();
	gPop();

	// rock 2
	gPush();
	
		gTranslate(-0.9, -3.7, 0);
		gPush();
		{
			setColor(vec4(0.5, 0.5, 0.5, 1.0));
			gScale(0.3, 0.3, 0.3);
			drawSphere();
		}
		gPop();
	gPop();


}
/*
Creates the fish with body, head, eyes and tail that swims around the the rocks and moves up and down. The tail moves side to side.
Input: takes timestamp to move fish and rotate tail based on time
*/
function fish(timestamp){
	gPush();
	gTranslate(fishPos[0], fishPos[1], fishPos[2]);

	gPush();
	{
		
		setColor(vec4(1.0, 0.0, 0.0, 1.0));
		// sets the rotation of the fish to go around in a circle
		coneRotation[1] = coneRotation[1] + -60*dt;

		// moves fish up and down based on cos
		fishPos[1] = -0.7 + 0.3*Math.cos(7*timestamp/4000);
		
		gTranslate(2, fishPos[1], 0);
		gRotate(coneRotation[1], 0, 1, 0);
		
		gTranslate(-2, fishPos[1], 0);
	
		gScale(0.5, 0.5, 2);
		drawCone();

	}
		//fish head
		gPush();
		
		{
			
			gTranslate(0,0,-0.6);
			setColor(vec4(0.5, 0.5, 0.5, 1.0));

			gRotate(180, 0, 1, 0);
			gScale(1, 1, 0.2);
			drawCone();
		}

		//left eye
			gPush();

			{
				gTranslate(0.4,0.4, -0.1);
				setColor(vec4(1.0, 1.0, 1.0, 1.0));

				gScale(0.3, 0.3, 0.3);
				drawSphere();

			}
			//pupil
				gPush();
				{
					gTranslate(0,0,0.8);
					setColor(vec4(0.0, 0.0, 0.0, 1.0));
					gScale(0.5, 0.5, 0.5);
					drawSphere();

				}
				gPop();// pupil
			gPop();// left eye

		//right eye
		
			gPush();
			{
				gTranslate(-0.4,0.4, -0.1);
				setColor(vec4(1.0, 1.0, 1.0, 1.0));

				gScale(0.3, 0.3, 0.3);
				drawSphere();
			}
			// pupil
				gPush();
				{
					gTranslate(0,0,0.8);
					setColor(vec4(0.0, 0.0, 0.0, 1.0));
					gScale(0.5, 0.5, 0.5);
					drawSphere();

				}
				gPop();//pupil
			gPop();// right eye
		gPop(); // fish head
		// tail
		gPush();
		{

			// rotates tail around y to move tail  
			setColor(vec4(1.0, 0.0, 0.0, 1.0));
			// rescale to original cone size 
			gScale(2, 2, 0.5);
			finRot[0] = 15*Math.cos(8*timestamp/1000);
			gRotate(finRot[0], 0,1,0);

			// bottom fin
			gPush();
			{
				gTranslate(0, -0.25, 1.2);
				gRotate(50, 1, 0, 0);

				gScale(0.2, 0.2, 0.7);
			
				drawCone();
			
			}
			gPop(); //first tail fin 

			gPush(); // top tail fin
			{
				gTranslate(0, 0.25, 1.2);

			//	gScale(2, 2, 0.5);
				gRotate(-50, 1, 0, 0);
				gScale(0.2, 0.2, 0.7);
				drawCone();
			
			}
			gPop(); //second tail fin
		}
		gPop(); // tail
		
		
	gPop();//main fish body

	gPop(); // fish

}

/*
Creates 3 strands of seawweed that move side to side and form a wave pattern
Input: takes timestamp to rotate seaweed based on time

*/
function seaweed(timestamp){

	seaweedRot[2] = 8*Math.sin(-3*timestamp/3000);


	//sets the rotation of each part of the strand of seaweed to update the phase
	seaSRot[0] = 10*Math.cos(7*timestamp/3000);
	seaSRot[1] = 10*Math.cos(7*timestamp/3000+45);
	seaSRot[2] = 10*Math.cos(7*timestamp/3000+90);
	seaSRot[3] = 10*Math.cos(7*timestamp/3000+135);
	seaSRot[4] = 10*Math.cos(7*timestamp/3000+180);
	seaSRot[5] = 10*Math.cos(7*timestamp/3000+225);
	seaSRot[6] = 10*Math.cos(7*timestamp/3000+270);
	seaSRot[7] = 10*Math.cos(7*timestamp/3000+315);
	seaSRot[8] = 10*Math.cos(7*timestamp/3000+360);
	
	gPush(); // middle strand
	{


		baseSeaweed(0, -2.5);
		
		gRotate(seaweedRot[2], 0, 0, 1);
		seaweedStrand(timestamp);

		gPop(); // baseseaweed pop

	}
	gPop(); // middle strand

	gPush(); // left strand
	{
		
		baseSeaweed(-0.5, -3);

			
		gRotate(seaweedRot[2], 0, 0, 1);
		seaweedStrand(timestamp);
	
		gPop(); // baseseaweed pop
			
	}
	gPop(); //left strand
	gPush(); // right strand
	{
		
		baseSeaweed(0.5, -2.8);
	
		
		gRotate(seaweedRot[2], 0, 0, 1);
		seaweedStrand(timestamp);
		
		gPop(); // baseseaweed pop
	}
	gPop(); //right strand

}
/*
Creates the base rooted part of a strand of seaweed that is on top of the rock
Input: xPos: the x position, yPos: the y position, based on where they resude on the rock 
*/
function baseSeaweed(xPos, yPos){
	gPush();
	{
		gTranslate(xPos, yPos, 0);
		setColor(vec4(0.0, 0.5, 0.0, 1.0));
		gScale(0.12, 0.3, 0.12);
		drawSphere();
	}

}
/*
 Creates one strand of seaweed and made up of 9 parts location is based on x and y coordinates from the base seaweed part already on stack
 Input: takes timestamp to rotate seaweed based on time
 */
function seaweedStrand(timestamp){

	for (let i = 0; i < 9; i++){
		gPush();

		gTranslate(0, 2, 0);
	
		gRotate(seaSRot[i], 0, 0, 1);

		drawSphere();
		
	}
	for (let i = 0; i < 9; i++){
		gPop();
	}
}

/*
Creates the human being that move in x and y directions with their swimming legs
 Input: takes timestamp to move the human and their limbs around based on time

*/
function human(timestamp){


	gPush();
	{

		// each leg moves by either cos or sin so limbs move in opposite directions
		rightLegRot[0] = 10*Math.cos(7*timestamp/4000);
		leftLegRot[0] = 10*Math.sin(7*timestamp/4000);
		lowRightRot[0] = 5*Math.cos(7*timestamp/4000);
		lowLeftRot[0] = 5*Math.sin(7*timestamp/4000);

		// changes the x and y coordinates of the torso and the rest of the being
		torsoPos[1] = 1 + 0.5*Math.cos(2*timestamp/3000);
		torsoPos[0] = 4 + 0.5*Math.cos(-2*timestamp/3000);

		// saves the mouth position for bubble function
		mouthPos[0] = torsoPos[0];
		mouthPos[1] = torsoPos[1] + 1.2;

		// moves the torso 
		gTranslate(torsoPos[0], torsoPos[1], torsoPos[2]);
		setColor(vec4(0.5, 0.0, 1.0, 1.0));
		
		// sets the being on an angle
		gRotate(-30, 0, 1, 0);
		gScale(0.6, 0.9, 0.3);
		drawCube();

		gPush(); // upper left leg
		{
			gTranslate(0.6, -1.5, -1);
			gScale(1.2, 1.1, 3);
	
			gRotate(20, 1, 0, 0);
			gRotate(leftLegRot[0], 1, 0, 0);

			gScale(0.15, 0.6, 0.1);
			drawCube();

			
			gPush(); // lower left leg
			{

				gScale(6, 1.3, 10);
				gTranslate(0, -1.3, -0.19);
				gRotate(20, 1, 0, 0);
				gRotate(lowLeftRot[0], 1, 0, 0)

				gScale(0.15, 0.6, 0.1);

				drawCube();

				gPush();// left foot
				{
					gScale(6, 1.3, 10);
					gTranslate(-0.1, -1, 0);

					gScale(0.3, 0.2, 0.4);
					drawCube();

				} 
				gPop();//left foot


			}
			gPop();// lower left leg
		}
		gPop(); //upper left leg

		gPush(); // upper right leg
		{
			gTranslate(-0.6, -1.5, -1);
			gScale(1.2, 1.1, 3);
	
			gRotate(20, 1, 0, 0);
			gRotate(rightLegRot[0], 1, 0, 0); 

			gScale(0.15, 0.6, 0.1);
			drawCube();

			
			gPush(); // lower right  leg
			{
				
				gScale(6, 1.3, 10);
				gTranslate(0, -1.3, -0.19);
				gRotate(20, 1, 0, 0);
				gRotate(lowRightRot[0], 1, 0, 0);

				gScale(0.15, 0.6, 0.1);

				drawCube();
				gPush();// right foot
				{
					gScale(6, 1.3, 10);
					gTranslate(-0.1, -1, 0);

					gScale(0.3, 0.2, 0.4);
					drawCube();

				}
				gPop(); // right foot

			}
			gPop();//  lower right leg
		}
		gPop(); // upper right  leg
		
		gPush(); // head
		{
			gScale(1.4, 1.1, 3.3);
			gTranslate(0, 1.3, 0);
			gScale(0.4, 0.4, 0.4);
			drawSphere();

		}
		gPop(); //head
			
		
	}
	gPop();
}
/*
Creates the bubbles the human breathes. Bubbles are produced based on whether the slowest bubble is out of range and x coordinate 
follows the position of the mouth of the human

*/
function bubble(){

	gPush();
	{
		setColor(vec4(1.0, 1.0, 1.0, 1.0));	
		gTranslate(0, mouthPos[1], 1);

		// sets up the movement of each bubble, each a bit slower than the last
		bubbleSpeed[0] = bubbleSpeed[0]+ 2*dt;
		bubbleSpeed[1] = bubbleSpeed[1]+ 1.8*dt;
		bubbleSpeed[2] = bubbleSpeed[2]+ 1.6*dt;
		bubbleSpeed[3] = bubbleSpeed[3]+ 1.4*dt;

		bubblePos[0] = mouthPos[0];

		// if slowest bubble is out of range reset all bubbles
		if(bubbleSpeed[3]> 4){
			bubbleSpeed[0] =  2*dt;
			bubbleSpeed[1] =  1.8*dt;
			bubbleSpeed[2] =  1.6*dt;
			bubbleSpeed[3] =  1.4*dt;
		}

		// draws each of the 4 bubbles 
		for(i = 0; i < 4; i++){
			gPush();
			{
			
				gTranslate(bubblePos[0], bubbleSpeed[i], bubblePos[2]);
			
				gScale(0.1, 0.1, 0.1);
				drawSphere();
			}
			gPop();
		}

	}
	gPop();
	
}

	
# The `userinput` system

The userinput system is a module that manages mappings from device state changes to app state changes. 


<a id="org61e0000"></a>

## Overview

The userinput system happens to be an `aframe` `system`; its `tick` is called once a frame within the `aframe` `scene`'s `tick`. When the userinput system `tick`s, it is responsible for creating a map called the frame. The keys of the frame are called "paths". The values stored in the frame can be any type, but are usually one of: bool, number, vec2, vec3, vec4, pose. On each tick, connected `device`s write "raw" input values to known "device paths" within the frame. Configuration units called `bindings` are then applied to transform "raw" input values to app-specific "actions". The userinput system exposes the state of a given `action` in the current frame via `readFrameValueAtPath`. The `bindings` that are applied to transform input to "actions" must be `available`, `active`, and `prioritized`.

1.  A `binding` is made `available` when the userinput system detects a change to the user's device configuration that matches certain criteria. A touchscreen user only has `availableBindings` related to touchscreen input. A mouse-and-keyboard only has `availableBindings` related to mouse-and-keyboard input. An oculus/vive user has `bindings` related to mouse, keyboard, and oculus/vive controllers.

2.  A `binding` is `active` if it is `available` and it belongs to an `action set` that is `active` this frame. The application is responsible for activating and deactivating `action sets` when appropriate. For example, when the user's avatar grabs a pen in its right hand, an action set called "holdingPenInRightHand" is activated. Though it depends on the way bindings have been configured, this will likely activate bindings responsible for writing to the following "actions": "rightHandStartDrawing", "rightHandStopDrawing", "rightHandPenNextColor", "rightHandPenPrevColor", "rightHandScalePenTip", "rightHandDrop".

3.  A `binding` is `prioritized` if, among all of the currently `available` and `active` bindings, it is defined with the highest "priority" value for the given "root". Within the oculus and vive bindings, for example, the binding that says "stop drawing from the pen in the right hand when the grip is released" in the "holdingPenInRightHand" action set is defined with a higher priority than (and with the same root as) the binding that says "drop a grabbable from the avatar's right hand when the grip is released" in the "holdingGrabbableInRightHand" action set. Thus, you do not drop the pen in your right hand when the grip is released, and we define a third binding for how to perform this action when the thing in your right hand happens to be a pen.


<a id="orgdec11a4"></a>

## Terms and Conventions


<a id="org8e224db"></a>

### path

A path is used as a key when writing or querying the state a user input frame. 
Paths happen to be a string for now.
We conceptually separate "action" paths, which are
used by app code to read user input from a frame,
from "device" paths, which specify where device state
is recorded. 

    paths.actions.rightHandGrab = "/actions/rightHandGrab";
    paths.actions.rightHandDrop = "/actions/rightHandDrop";
    paths.actions.rightHandStartDrawing = "/actions/rightHandStartDrawing";
    paths.actions.rightHandStopDrawing = "/actions/rightHandStopDrawing";

    paths.device.mouse.coords = "/device/mouse/coords";
    paths.device.mouse.movementXY = "/device/mouse/movementXY";
    paths.device.mouse.buttonLeft = "/device/mouse/buttonLeft";
    paths.device.mouse.buttonRight = "/device/mouse/buttonRight";
    paths.device.keyboard = {
      key: key => {
        return `/device/keyboard/${key.toLowerCase()}`;
      }
    };


<a id="org86708c5"></a>

### action

A path used by app code when reading a user input frame.

    const userinput = AFRAME.scenes[0].systems.userinput;
    const grab = userinput.readFrameValueAtPath(paths.actions.rightHandGrab);
    if (grab) {
      this.startInteraction();
    }

The value in the frame can be of any type, but we have tried to keep it to simple types like bool, number, vec2, vec3, vec4, and pose.

    const userinput = AFRAME.scenes[0].systems.userinput;
    const acceleration = userinput.readFrameValueAtPath(paths.actions.characterAcceleration);
    this.updateVelocity( this.velocity, acceleration || zero );
    this.move( this.velocity );


<a id="org07976a9"></a>

### frame

A key-value store created each time the userinput system ticks. The userinput system writes a new frame by processing input from devices and transforming them by the set of `available`, `active`, and `prioritized` bindings.


<a id="org573e4b2"></a>

### device

A device is almost always mapped one-to-one with a device as we think about it in the real world. In the case of mouse, touchscreen, and keyboard input, the browser emits events that are captured into a queue to be processed in order once each frame. An exception to handling device input through the userinput system is the case of interacting with browser API's that require a user-gesture, like the pointer lock API. In this case, the browser prevents us from engaging pointer lock except in a short-running event listener to a user-gesture.
Most devices can write their input state to the frame without depending on any other app state. An exception is the touchscreen device, which decides (at the time of contact with the screen), whether a raycast sent out from the in-game camera through the projected touch point lands on an interactable object or not, and what should be done in the case that it does. 


<a id="orgbdedd37"></a>

### binding

A binding is an association of the form:

    {
      src: { xform_key_a : path,
             xform_key_b : path },
      dest: { xform_key_1 : path,
              xform_key_2 : path },
      xform: some_pure_function,
      root: key_to_resolve_binding_conflicts,
      priority: numerical_priority_of_this_binding // higher priority overrides lower priority bindings
    },

that specifying an `xform` (transformation) function that takes the values in the frame at the paths provided by `src` to the values in the frame at the paths in `dest`. These ought to be treated as user-customizable, although we are likely the only ones to do this customization for some time. Bindings are organized into sets, and written with active specific device combinations in mind.


<a id="orga8be141"></a>

### set

Sets are app state that correspond to sets of capabilities we expect to activate and deactivate all at once on behalf of the user. 


<a id="org1c70358"></a>

### xform

A function that takes `src` paths to read from the frame as input, and the `dest` paths to write as output. These should be pure functions but they happen to write to the frame so as to avoid creating more garbage each frame. (We have not yet done a performance pass, so making smarter choices about memory allocation and avoiding garbage has been postponed.)


<a id="orgdddaa03"></a>

### priority and root

When bindings can be written such that multiple actions could be triggered by the device input, we express our desire to apply one over another via the `binding`s' `root`s and `priority`s. When active bindings share the same root, the userinput system only applies active bindings with highest priority values. This mechanism allows us to craft context-sensitive interaction mechanics on devices with limited input, like the oculus go remote.

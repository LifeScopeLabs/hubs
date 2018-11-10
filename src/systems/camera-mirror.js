import { paths } from "./userinput/paths";

AFRAME.registerSystem("camera-mirror", {
  tick() {
    const userinput = this.el.systems.userinput;

    if (userinput.get(paths.actions.camera.exitMirror) && this.mirrorEl) {
      this.unmirrorCameraAtEl(this.mirrorEl);
    }
  },

  // Adds a camera under el, and starts mirroring
  mirrorCameraAtEl(el) {
    // TODO probably should explicitly check for immersive mode here.
    if (AFRAME.utils.device.isMobile()) return;
    if (this.mirrorEl && this.mirrorEl !== el) this.unmirrorCameraAtEl(this.mirrorEl);

    this.mirrorEl = el;
    this.mirrorCamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 30000);
    this.mirrorCamera.rotation.set(0, Math.PI, 0);
    el.setObject3D("mirror-camera", this.mirrorCamera);

    const tempHeadScale = new THREE.Vector3();
    const tempHudScale = new THREE.Vector3();

    const renderer = this.el.renderer;

    if (!this.directRenderFunc) {
      this.directRenderFunc = renderer.render;
    }

    const headEl = document.getElementById("player-head");
    const hudEl = document.getElementById("player-hud");
    const playerHead = headEl && headEl.object3D;
    const playerHud = hudEl && hudEl.object3D;
    document.body.classList.add("mirrored-camera");

    this.el.sceneEl.renderer.render = (scene, camera, renderTarget) => {
      const wasVREnabled = renderer.vr.enabled;

      if (wasVREnabled) {
        this.directRenderFunc.call(renderer, scene, camera, renderTarget);
      }

      if (playerHead) {
        tempHeadScale.copy(playerHead.scale);
        playerHead.scale.set(1, 1, 1);
      }

      if (playerHud) {
        tempHudScale.copy(playerHud.scale);
        playerHud.scale.set(0.001, 0.001, 0.001);
      }
      renderer.vr.enabled = false;
      const tmpOnAfterRender = this.el.object3D.onAfterRender;
      delete this.el.object3D.onAfterRender;
      this.directRenderFunc.call(renderer, scene, this.mirrorCamera);
      this.el.object3D.onAfterRender = tmpOnAfterRender;
      renderer.vr.enabled = wasVREnabled;
      if (playerHead) {
        playerHead.scale.copy(tempHeadScale);
      }
      if (playerHud) {
        playerHud.scale.copy(tempHudScale);
      }
    };
  },

  unmirrorCameraAtEl(el) {
    if (this.mirrorEl !== el) return;

    if (this.directRenderFunc) {
      this.el.renderer.render = this.directRenderFunc;
    }

    el.removeObject3D("mirror-camera");
    document.body.classList.remove("mirrored-camera");

    this.mirrorEl = null;
    this.mirrorCamera = null;
  },

  getDirectRenderFunction() {
    if (this.directRenderFunc) {
      return this.directRenderFunc;
    }

    return this.el.renderer.render;
  }
});
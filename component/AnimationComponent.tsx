import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AnimationComponentProps {
  size?: number;
}

const AnimationComponent: React.FC<AnimationComponentProps> = ({ size = 500 }) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let areawidth = window.innerWidth;
    let areaheight = window.innerHeight;
    const canvassize = size;
    const length = 30;
    const radius = 5.6;
    const rotatevalue = 0.035;
    let acceleration = 0;
    let animatestep = 0;
    let toend = false;
    const pi2 = Math.PI * 2;
    const group = new THREE.Group();
    let mesh, ringcover, ring;
    let camera, scene, renderer;

    camera = new THREE.PerspectiveCamera(65, 1, 1, 10000);
    camera.position.z = 150;
    scene = new THREE.Scene();
    scene.add(group);

    mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
        Array.from({ length: 200 }, (_, i) => {
          const t = i / 199;
          const x = length * Math.sin(pi2 * t);
          const y = radius * Math.cos(pi2 * 3 * t);
          const z = radius * Math.sin(pi2 * 2 * t);
          return new THREE.Vector3(x, y, z);
        })
      ), 200, 1.1, 2, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    group.add(mesh);

    ringcover = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 15, 1),
      new THREE.MeshBasicMaterial({ color: 0xd1684e, opacity: 0, transparent: true })
    );
    ringcover.position.x = length + 1;
    ringcover.rotation.y = Math.PI / 2;
    group.add(ringcover);

    ring = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 5.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: true })
    );
    ring.position.x = length + 1.1;
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    // fake shadow
    for (let i = 0; i < 10; i++) {
      const plain = new THREE.Mesh(
        new THREE.PlaneGeometry(length * 2 + 1, radius * 3, 1),
        new THREE.MeshBasicMaterial({ color: 0xd1684e, transparent: true, opacity: 0.13 })
      );
      plain.position.z = -2.5 + i * 0.5;
      group.add(plain);
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvassize, canvassize);
    renderer.setClearColor('#d1684e');
    if (wrapRef.current) {
      wrapRef.current.appendChild(renderer.domElement);
    }

    const start = () => {
      toend = true;
    };

    const back = () => {
      toend = false;
    };

    const render = () => {
      let progress;
      animatestep = Math.max(0, Math.min(240, toend ? animatestep + 1 : animatestep - 4));
      acceleration = easing(animatestep, 0, 1, 240);
      if (acceleration > 0.35) {
        progress = (acceleration - 0.35) / 0.65;
        group.rotation.y = -Math.PI / 2 * progress;
        group.position.z = 50 * progress;
        progress = Math.max(0, (acceleration - 0.97) / 0.03);
        mesh.material.opacity = 1 - progress;
        ringcover.material.opacity = ring.material.opacity = progress;
        ring.scale.x = ring.scale.y = 0.9 + 0.1 * progress;
      }
      renderer.render(scene, camera);
    };

    const animate = () => {
      mesh.rotation.x += rotatevalue + acceleration;
      render();
      requestAnimationFrame(animate);
    };

    const easing = (t: number, b: number, c: number, d: number): number => {
      if ((t /= d / 2) < 1) return c / 2 * t * t + b;
      return c / 2 * ((t -= 2) * t * t + 2) + b;
    };

    document.body.addEventListener('mousedown', start);
    document.body.addEventListener('touchstart', start);
    document.body.addEventListener('mouseup', back);
    document.body.addEventListener('touchend', back);

    animate();

    return () => {
      document.body.removeEventListener('mousedown', start);
      document.body.removeEventListener('touchstart', start);
      document.body.removeEventListener('mouseup', back);
      document.body.removeEventListener('touchend', back);
      if (wrapRef.current) {
        wrapRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      overflow: 'hidden',
      background: '#d1684e',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)'
    }}>
      <div ref={wrapRef} style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${size}px`,
        height: `${size}px`,
        margin: `-${size / 2}px 0 0 -${size / 2}px`
      }}></div>
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        fontSize: '12px',
        color: '#ccc',
        lineHeight: '2em',
        textAlign: 'center'
      }}>
      </div>
    </div>
  );
};

export default AnimationComponent;
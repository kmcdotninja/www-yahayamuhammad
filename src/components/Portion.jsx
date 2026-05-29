import { useEffect, useRef, useState } from 'react'
import './Portion.css'

const MODEL_URL = '/models/bust.stl'

// Module-level cache so the model + processed geometry is reused across
// renders (e.g. swapping between Hero and HeroCentered on resize, or
// remounting after a route transition). Three.js is loaded behind a
// dynamic import so it never touches the initial bundle.
let threePromise = null
const loadThree = () => {
  if (!threePromise) {
    threePromise = Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/loaders/STLLoader.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    ]).then(
      ([
        THREE,
        { OrbitControls },
        { STLLoader },
        { RoomEnvironment },
        { mergeVertices },
      ]) => ({
        THREE: THREE.default || THREE,
        OrbitControls,
        STLLoader,
        RoomEnvironment,
        mergeVertices,
      }),
    )
  }
  return threePromise
}

let geometryCache = null
const loadGeometry = (THREE, STLLoader, mergeVertices) => {
  if (geometryCache) return geometryCache
  geometryCache = new Promise((resolve, reject) => {
    new STLLoader().load(
      MODEL_URL,
      (rawGeometry) => {
        const merged = mergeVertices(rawGeometry, 1e-5)
        merged.computeVertexNormals()
        merged.center()
        merged.computeBoundingSphere()
        resolve(merged)
      },
      undefined,
      reject,
    )
  })
  return geometryCache
}

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Portion() {
  const containerRef = useRef(null)
  const cursorRef = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [ready, setReady] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  const onPointerMove = (e) => {
    const container = containerRef.current
    const cursor = cursorRef.current
    if (!container || !cursor) return
    const rect = container.getBoundingClientRect()
    cursor.style.transform = `translate3d(${e.clientX - rect.left}px, ${e.clientY - rect.top}px, 0) translate(-50%, -50%)`
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let cleanup = () => {}

    loadThree().then(
      async ({ THREE, OrbitControls, STLLoader, RoomEnvironment, mergeVertices }) => {
        if (disposed || !containerRef.current) return

        const width = container.clientWidth
        const height = container.clientHeight
        const touch = isTouchDevice()
        const reduced = prefersReducedMotion()
        setIsTouch(touch)

        // ---- Scene + camera + renderer ----
        const scene = new THREE.Scene()
        scene.background = null

        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
        camera.position.set(0, 0, 5)

        // GPU tier: phones and low-power devices ditch antialias and clamp
        // the pixel ratio to 1.5. The hit to edge crispness is invisible
        // at the model's actual on-screen size and saves a meaningful
        // chunk of GPU/CPU per frame.
        const lowPower =
          touch ||
          (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)

        const renderer = new THREE.WebGLRenderer({
          antialias: !lowPower,
          alpha: true,
          premultipliedAlpha: false,
          powerPreference: 'high-performance',
        })
        const dprCap = lowPower ? 1.5 : 2
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap))
        renderer.setSize(width, height)
        renderer.setClearColor(0x000000, 0)
        renderer.setClearAlpha(0)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.1
        container.appendChild(renderer.domElement)

        if (touch) {
          renderer.domElement.style.pointerEvents = 'none'
        }

        // ---- HDR environment (PMREM from RoomEnvironment) ----
        const pmrem = new THREE.PMREMGenerator(renderer)
        pmrem.compileEquirectangularShader()
        const envScene = new RoomEnvironment(renderer)
        const envTexture = pmrem.fromScene(envScene, 0.04).texture
        scene.environment = envTexture

        // ---- Subtle direct lighting for definition ----
        scene.add(new THREE.AmbientLight(0xffffff, 0.25))
        const key = new THREE.DirectionalLight(0xfff4e3, 1.1)
        key.position.set(5, 7, 5)
        scene.add(key)
        const rim = new THREE.DirectionalLight(0xb8d4ff, 0.55)
        rim.position.set(-4, -2, -5)
        scene.add(rim)

        // ---- Controls ----
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.06
        controls.enablePan = false
        controls.enableZoom = false
        controls.autoRotate = !reduced
        controls.autoRotateSpeed = 0.7
        controls.minPolarAngle = Math.PI / 3
        controls.maxPolarAngle = (2 * Math.PI) / 3

        // ---- Load STL (cached at module scope) ----
        let mesh = null
        try {
          const baseGeo = await loadGeometry(THREE, STLLoader, mergeVertices)
          if (disposed) return
          // Clone so each mount owns its geometry buffer and we can dispose
          // cleanly without invalidating the cached source.
          const merged = baseGeo.clone()
          merged.computeBoundingSphere()
          const radius = merged.boundingSphere?.radius || 1
          const s = 1.4 / radius

          const material = new THREE.MeshPhysicalMaterial({
            color: 0xdcdcdc,
            roughness: 0.22,
            metalness: 1.0,
            clearcoat: 0.2,
            clearcoatRoughness: 0.22,
            envMapIntensity: 1.4,
          })

          mesh = new THREE.Mesh(merged, material)
          mesh.scale.setScalar(s)
          scene.add(mesh)

          renderer.render(scene, camera)
          requestAnimationFrame(() => {
            if (disposed) return
            setReady(true)
            window.dispatchEvent(new Event('app:portion-ready'))
          })
        } catch (err) {
          console.error('STL load failed', err)
          window.dispatchEvent(new Event('app:portion-ready'))
        }

        // ---- Visibility + resize observers ----
        // Pause the RAF loop when the canvas leaves the viewport (saves the
        // entire render+controls cost while scrolled below the hero) and
        // when the tab is hidden.
        let visible = true
        let inView = true
        let rafId = 0
        let needsRender = true

        const tick = () => {
          rafId = requestAnimationFrame(tick)
          if (!visible || !inView) return
          // controls.update() returns true when damping/autoRotate caused
          // a change. With autoRotate on, this is essentially always true
          // — but rendering only when something actually moved is still a
          // worthwhile guard for the reduced-motion path.
          const moved = controls.update()
          if (moved || needsRender) {
            renderer.render(scene, camera)
            needsRender = false
          }
        }
        tick()

        const io = new IntersectionObserver(
          (entries) => {
            inView = entries[0].isIntersecting
            if (inView) needsRender = true
          },
          { rootMargin: '100px' },
        )
        io.observe(container)

        const onVis = () => {
          visible = !document.hidden
          if (visible) needsRender = true
        }
        document.addEventListener('visibilitychange', onVis)

        const onResize = () => {
          if (!containerRef.current) return
          const w = container.clientWidth
          const h = container.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          needsRender = true
        }
        const ro = new ResizeObserver(onResize)
        ro.observe(container)

        cleanup = () => {
          cancelAnimationFrame(rafId)
          io.disconnect()
          ro.disconnect()
          document.removeEventListener('visibilitychange', onVis)
          controls.dispose()
          if (mesh) {
            mesh.geometry.dispose()
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose())
            } else {
              mesh.material.dispose()
            }
          }
          envTexture.dispose()
          pmrem.dispose()
          renderer.dispose()
          if (renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement)
          }
        }
      },
    )

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`portion${hovering ? ' portion--hovering' : ''}${ready ? ' portion--ready' : ''}`}
      aria-label={isTouch ? '3D model' : '3D model — drag to rotate'}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        setHovering(true)
        onPointerMove(e)
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHovering(false)}
    >
      <span ref={cursorRef} className="portion__cursor" aria-hidden="true">
        Drag me
      </span>
    </div>
  )
}

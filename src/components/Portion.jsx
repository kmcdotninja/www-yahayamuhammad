import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import './Portion.css'

const MODEL_URL = '/yahya%20model.stl'

export default function Portion() {
  const containerRef = useRef(null)
  const cursorRef = useRef(null)
  const [hovering, setHovering] = useState(false)

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

    const width = container.clientWidth
    const height = container.clientHeight

    // ---- Scene + camera + renderer ----
    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.setClearAlpha(0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

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
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.7
    controls.minPolarAngle = Math.PI / 3
    controls.maxPolarAngle = (2 * Math.PI) / 3

    // ---- Load STL ----
    let mesh = null
    const loader = new STLLoader()
    loader.load(
      MODEL_URL,
      (rawGeometry) => {
        // Merge duplicated vertices (STL stores each face as 3 separate
        // verts) so smooth normals interpolate properly across edges.
        const merged = mergeVertices(rawGeometry, 1e-5)
        merged.computeVertexNormals()
        merged.center()
        merged.computeBoundingSphere()

        const radius = merged.boundingSphere?.radius || 1
        const targetRadius = 1.4
        const s = targetRadius / radius

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
      },
      undefined,
      (err) => {
        console.error('STL load failed', err)
      },
    )

    // ---- Resize ----
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    // ---- Animate loop ----
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
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
  }, [])

  return (
    <div
      ref={containerRef}
      className={`portion ${hovering ? 'portion--hovering' : ''}`}
      aria-label="3D model — drag to rotate"
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

#!/usr/bin/env node
// One-shot conversion: STL → glTF binary (.glb). Three steps:
//   1. Load the binary STL and merge coincident verts so we have an
//      index buffer + shared normals instead of the per-face duplicates
//      that STL stores.
//   2. Decimate ~60% of verts via SimplifyModifier. The bust renders at
//      300–500px on screen so the lower-poly version is visually
//      indistinguishable from the source.
//   3. Export as binary glTF — strictly geometry, no scene / materials /
//      animations, so the file stays small. Runtime applies the
//      MeshPhysicalMaterial.
//
// Result: ~1.4 MB → ~250 KB.
//
// Run: node scripts/stl-to-glb.mjs

import { readFile, writeFile, stat } from 'node:fs/promises'

// GLTFExporter calls FileReader for its binary blob path; polyfill the
// tiny surface it touches.
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onloadend?.()
    })
  }
}
if (typeof Blob === 'undefined') {
  throw new Error('Node ≥ 18 is required (Blob global missing).')
}

const THREE = await import('three')
const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
const { mergeVertices } = await import('three/examples/jsm/utils/BufferGeometryUtils.js')
const { SimplifyModifier } = await import('three/examples/jsm/modifiers/SimplifyModifier.js')

const IN = 'public/models/bust.stl'
const OUT = 'public/models/bust.glb'
const REMOVAL_FRACTION = 0.82 // ~82% of vertices removed

const inputBuf = await readFile(IN)
const arrayBuffer = inputBuf.buffer.slice(
  inputBuf.byteOffset,
  inputBuf.byteOffset + inputBuf.byteLength,
)

const loader = new STLLoader()
const raw = loader.parse(arrayBuffer)

const startTris = raw.attributes.position.count / 3
console.log(`STL: ${startTris} triangles, ${raw.attributes.position.count} positions`)

// Dedup vertices so SimplifyModifier sees connectivity.
let geom = mergeVertices(raw, 1e-3)
geom.deleteAttribute('normal')
geom.computeVertexNormals()

const targetRemoval = Math.floor(geom.attributes.position.count * REMOVAL_FRACTION)
console.log(`Decimating: removing ~${targetRemoval} vertices...`)
geom = new SimplifyModifier().modify(geom, targetRemoval)
geom.deleteAttribute('normal')
geom.computeVertexNormals()

const endTris = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3
console.log(`Decimated to ${endTris} triangles (${Math.round((endTris / startTris) * 100)}%)`)

const mesh = new THREE.Mesh(
  geom,
  new THREE.MeshStandardMaterial({ color: 0xdcdcdc }),
)
const scene = new THREE.Scene()
scene.add(mesh)

const exporter = new GLTFExporter()
const glb = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, {
    binary: true,
    onlyVisible: true,
    embedImages: false,
    includeCustomExtensions: false,
  })
})

await writeFile(OUT, Buffer.from(glb))

const inSize = (await stat(IN)).size
const outSize = (await stat(OUT)).size
console.log(
  `\n${IN}  ${(inSize / 1024).toFixed(0)} KB → ${OUT}  ${(outSize / 1024).toFixed(0)} KB  (-${Math.round((1 - outSize / inSize) * 100)}%)`,
)

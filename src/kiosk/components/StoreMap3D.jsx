import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { useLanguage } from '../../i18n/LanguageContext'

// Blok yerleşimi (reyondaki gerçek dizilişe göre buradan ayarlanır)
const BACK = ['F', 'G', 'H', 'I'] // arka duvar, soldan sağa
const LEFT = ['A', 'B', 'C', 'D', 'E'] // sol duvar, önden arkaya
const RIGHT = ['J', 'K', 'L', 'M', 'N', 'O'] // sağ duvar, arkadan öne
const FRONT = ['P', 'R'] // ön-sağ: O'dan sonra P, ucunda I'ya bakan R
const SHELVES = 7

function normalizeBlock(block) {
  return String(block || '').toUpperCase().replace(/[^A-Z]/g, '').charAt(0)
}
function normalizeShelf(shelf) {
  const n = parseInt(shelf, 10)
  return Number.isFinite(n) ? Math.max(1, Math.min(SHELVES, n)) : 1
}

export default function StoreMap3D({ block, shelf, productName, onClose }) {
  const { lang } = useLanguage()
  const mountRef = useRef(null)
  const targetBlock = normalizeBlock(block)
  const targetShelf = normalizeShelf(shelf)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return undefined

    const W = el.clientWidth || 800
    const H = el.clientHeight || 600

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x160d0e)
    scene.fog = new THREE.Fog(0x160d0e, 24, 50)

    const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(W, H)
    el.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const dir = new THREE.DirectionalLight(0xfff0e0, 0.6)
    dir.position.set(6, 16, 12)
    scene.add(dir)
    const pl1 = new THREE.PointLight(0xffb066, 0.6, 44)
    pl1.position.set(0, 7, 4)
    scene.add(pl1)
    const pl2 = new THREE.PointLight(0xffd9a0, 0.4, 44)
    pl2.position.set(0, 6, -6)
    scene.add(pl2)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 22),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, -1)
    scene.add(floor)

    const woodBack = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 1 })
    const boards = {}
    const dummy = new THREE.Object3D()
    const bottlePos = []
    const bottleCol = []
    const wineCols = [0x16331c, 0x123026, 0x3a1f10, 0x2a0d14, 0x4a2a12, 0x301428]

    function letterSprite(ch, x, y, z) {
      const c = document.createElement('canvas')
      c.width = 128
      c.height = 128
      const g = c.getContext('2d')
      g.fillStyle = '#f0d8a8'
      g.font = 'bold 92px sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(ch, 64, 68)
      const tx = new THREE.CanvasTexture(c)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true }))
      sp.position.set(x, y, z)
      sp.scale.set(1.4, 1.4, 1.4)
      scene.add(sp)
    }
    const shelfY = (s) => 6.2 - (s - 1) * 0.85

    function addBlock(L, side, cx, cz) {
      let bx
      let bz
      let bw
      let bd
      let nrm
      if (side === 'back') {
        bx = cx
        bz = -7
        bw = 3.8
        bd = 0.16
        nrm = new THREE.Vector3(0, 0, 1)
      } else if (side === 'left') {
        bx = -8
        bz = cz
        bw = 0.16
        bd = 2.4
        nrm = new THREE.Vector3(1, 0, 0)
      } else if (side === 'front') {
        bx = cx
        bz = cz
        bw = 3.8
        bd = 0.16
        nrm = new THREE.Vector3(0, 0, -1)
      } else {
        bx = 8
        bz = cz
        bw = 0.16
        bd = 2.2
        nrm = new THREE.Vector3(-1, 0, 0)
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(bw, 7, bd), woodBack)
      back.position.set(bx, 3.6, bz)
      scene.add(back)

      for (let s = 1; s <= SHELVES; s++) {
        const y = shelfY(s)
        let board
        if (side === 'back') {
          board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x6b4324, roughness: 0.8 }))
          board.position.set(cx, y, -7 + 0.3)
        } else if (side === 'left') {
          board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 2.1), new THREE.MeshStandardMaterial({ color: 0x6b4324, roughness: 0.8 }))
          board.position.set(-8 + 0.3, y, cz)
        } else if (side === 'front') {
          board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x6b4324, roughness: 0.8 }))
          board.position.set(cx, y, cz - 0.3)
        } else {
          board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 1.9), new THREE.MeshStandardMaterial({ color: 0x6b4324, roughness: 0.8 }))
          board.position.set(8 - 0.3, y, cz)
        }
        scene.add(board)
        boards[`${L}-${s}`] = { mesh: board, pos: board.position.clone(), nrm: nrm.clone() }

        for (let i = 0; i < 5; i += 1) {
          let px
          let pz
          if (side === 'back') {
            px = cx - 1.4 + i * 0.7
            pz = -7 + 0.45
          } else if (side === 'left') {
            px = -8 + 0.45
            pz = cz - 0.9 + i * 0.45
          } else if (side === 'front') {
            px = cx - 1.4 + i * 0.7
            pz = cz - 0.45
          } else {
            px = 8 - 0.45
            pz = cz - 0.8 + i * 0.4
          }
          bottlePos.push([px, y + 0.05, pz])
          bottleCol.push(wineCols[(i + s) % wineCols.length])
        }
      }

      let lx = bx
      let lz = bz
      if (side === 'back') lz = -7 + 0.6
      if (side === 'left') lx = -8 + 0.6
      if (side === 'right') lx = 8 - 0.6
      if (side === 'front') lz = cz - 0.6
      letterSprite(L, lx, 7.4, lz)
    }

    BACK.forEach((L, i) => addBlock(L, 'back', -6 + i * 4, 0))
    LEFT.forEach((L, i) => addBlock(L, 'left', 0, 5 - i * 2.5))
    RIGHT.forEach((L, i) => addBlock(L, 'right', 0, -5 + i * 2))
    FRONT.forEach((L, i) => addBlock(L, 'front', 6 - i * 3, 7))

    const bprofile = [
      [0.001, 0],
      [0.12, 0],
      [0.12, 0.30],
      [0.118, 0.33],
      [0.10, 0.38],
      [0.06, 0.44],
      [0.042, 0.48],
      [0.04, 0.57],
      [0.052, 0.585],
      [0.046, 0.60],
      [0.001, 0.60],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const bgeo = new THREE.LatheGeometry(bprofile, 10)
    const imesh = new THREE.InstancedMesh(bgeo, new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 }), bottlePos.length)
    const col = new THREE.Color()
    bottlePos.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2])
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      imesh.setMatrixAt(i, dummy.matrix)
      col.setHex(bottleCol[i])
      imesh.setColorAt(i, col)
    })
    scene.add(imesh)

    const entry = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0xefa020, emissive: 0x7a4a00, emissiveIntensity: 0.5 }),
    )
    entry.position.set(0, 0.5, 8)
    entry.rotation.x = Math.PI
    scene.add(entry)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.09, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xefc56a, emissive: 0xefa020, emissiveIntensity: 1 }),
    )
    ring.visible = false
    scene.add(ring)

    const look = new THREE.Vector3(0, 3, -1)
    cam.position.set(0, 11, 17)
    cam.lookAt(look)
    let fromP = cam.position.clone()
    let toP = cam.position.clone()
    let fromL = look.clone()
    let toL = look.clone()
    let tt = 1
    const dur = 2.6

    function flyTo(L, s) {
      const b = boards[`${L}-${s}`]
      if (!b) return
      b.mesh.material.emissive.setHex(0x6a4500)
      const { pos, nrm } = b
      ring.visible = true
      ring.position.set(pos.x + nrm.x * 0.45, pos.y + 0.35, pos.z + nrm.z * 0.55)
      if (Math.abs(nrm.z) > 0.5) ring.rotation.set(0, 0, 0)
      else ring.rotation.set(0, Math.PI / 2, 0)
      fromP = cam.position.clone()
      fromL = look.clone()
      toP.set(pos.x + nrm.x * 6.5, pos.y + 1.4, pos.z + nrm.z * 6.5)
      toL.set(pos.x, pos.y, pos.z)
      tt = 0
    }

    // Açılışta hedefe uç (kısa bir genel görünüm gecikmesiyle)
    const startTimer = setTimeout(() => flyTo(targetBlock, targetShelf), 550)

    let raf
    let last = performance.now()
    function loop(now) {
      const dt = (now - last) / 1000
      last = now
      if (tt < 1) {
        tt = Math.min(1, tt + dt / dur)
        const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2
        cam.position.lerpVectors(fromP, toP, e)
        look.lerpVectors(fromL, toL, e)
        cam.lookAt(look)
      }
      if (ring.visible) {
        const k = 1 + Math.sin(now / 220) * 0.12
        ring.scale.set(k, k, k)
        ring.material.emissiveIntensity = 0.7 + Math.sin(now / 220) * 0.3
      }
      entry.position.y = 0.5 + Math.sin(now / 400) * 0.08
      renderer.render(scene, cam)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    function onResize() {
      const w = el.clientWidth || 800
      const h = el.clientHeight || 600
      renderer.setSize(w, h)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(startTimer)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
        if (obj.material && obj.material.map) obj.material.map.dispose()
      })
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement)
      }
    }
  }, [targetBlock, targetShelf])

  const shelfLabel =
    lang === 'en'
      ? `Block ${targetBlock}, Shelf ${targetShelf}`
      : `${targetBlock} Blok · ${targetShelf}. Raf`

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-ink-950/95 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-charcoal-700/60">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-500/90">
            {lang === 'en' ? 'In-store location' : 'Reyondaki yeri'}
          </p>
          <p className="truncate font-serif text-lg text-cream-100">{productName}</p>
          <p className="mt-0.5 text-base font-semibold text-emerald-400">{shelfLabel}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          className="shrink-0 rounded-full border border-charcoal-600 px-5 py-2.5 text-cream-100 transition hover:border-gold-500 hover:text-gold-400"
        >
          {lang === 'en' ? 'Close' : 'Kapat'}
        </button>
      </div>
      <div ref={mountRef} className="relative flex-1" />
      <p className="px-6 py-3 text-center text-xs text-cream-200/50">
        {lang === 'en'
          ? 'Follow the highlighted shelf — the gold ring marks your wine.'
          : 'Altın halkayla işaretli raf, aradığınız şarabın yeridir.'}
      </p>
    </div>,
    document.body,
  )
}

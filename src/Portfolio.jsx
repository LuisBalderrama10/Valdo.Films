import { useState, useEffect } from "react";
import "./Portfolio.css";
import valdoban2 from './assets/valdobanner2.jpg';
import sanchezr  from './assets/sanchezrosa.jpg';

// ─── CONFIGURACIÓN DRIVE ─────────────────────────────────────────────────────
const API_KEY     = "AIzaSyBM56Vbg5B2ChHKFlF55ddoVxP4QljBjZk";
const ROOT_FOLDER = "1k7b5nkfN1b4o8E_FE9CbTvU-_2k582Oh";
const DRIVE_URL   = "https://www.googleapis.com/drive/v3/files";

const FOLDER_A_CAT = {
  // Nivel 1
  "TEATRO":                   "teatro",
  "EXPOSICION - CONFERENCIA": "Conferencias",
  "DEPORTE":                  "Deporte",
  "SESIONES FOTOGRAFICAS":    "Sesiones",
  "EVENTOS":                  "Eventos",
  // Subcarpetas SESIONES
  "BELLEZA Y MODELO":         "belleza-moda",
  "SAVE THE DATE":            "save-t-date",
  "URBANO":                   "urbano",
  "BAUTIZOS":                  "Bautizos",
  "GRADUACIONES":             "graduaciones",
  // Subcarpetas EVENTOS
  "CULTURALES":               "culturales",
  "HIP HOP":                  "hip-hop",
  "MUSICA ELECTRONICA":       "Electronica",
  "MUSICALES":                "Musicales",
  // Sub-subcarpetas SAVE THE DATE
  "JAVI & ABRIL":             "save-t-date",
  "CRYS & ARMANDO":           "save-t-date",
  "ANGY & EDGAR":             "save-t-date",
  // Sub-subcarpetas BELLEZA Y MODELO
  "YIZEL":                    "belleza-moda",
  "CARO":                     "belleza-moda",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function listarContenido(folderId, soloFotos = false) {
  const tipo = soloFotos
    ? `mimeType contains 'image/'`
    : `mimeType = 'application/vnd.google-apps.folder'`;

  const url = `${DRIVE_URL}?q='${folderId}' in parents and ${tipo} and trashed=false&key=${API_KEY}&fields=files(id,name,mimeType)&pageSize=200`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Error en Drive API: " + res.status);
  }

  const data = await res.json();
  return data.files || [];
}


// Recorre cualquier nivel de profundidad automáticamente
async function recorrerCarpeta(folderId, folderName, catIdHeredado) {
  const nombreUpper = folderName.trim().toUpperCase();
  const catId = FOLDER_A_CAT[nombreUpper] ?? catIdHeredado;
  if (!catId) return [];

  const [subcarpetas, imagenes] = await Promise.all([
    listarContenido(folderId, false),
    listarContenido(folderId, true),
  ]);

  const fotos = [];

  if (subcarpetas.length > 0) {
    const promesas  = subcarpetas.map(sub => recorrerCarpeta(sub.id, sub.name, catId));
    const resultados = await Promise.all(promesas);
    fotos.push(...resultados.flat());
  }

  if (imagenes.length > 0) {
    imagenes.forEach((img, i) => {
      if (!img.id) return; // validación real

      fotos.push({
        id: `${catId}-${folderId}-${i}`,
        categoria: catId,
        src: `https://drive.google.com/thumbnail?id=${img.id}&sz=w600`,
        srcFull: `https://drive.google.com/thumbnail?id=${img.id}&sz=w1600`,
        titulo: img.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        alt: img.name,
      });
    });
  }
  return fotos;
}

async function fetchTodasLasFotos() {
  try {
    console.log("1. Iniciando fetch...");
    const carpetasRaiz = await listarContenido(ROOT_FOLDER, false);
    console.log("2. Carpetas raíz:", carpetasRaiz);

    const promesas   = carpetasRaiz.map(c => recorrerCarpeta(c.id, c.name.trim(), null));
    const resultados = await Promise.all(promesas);
    const todas      = resultados.flat();

    console.log("3. Total fotos:", todas.length);
    console.log("Ejemplo foto:", todas[0]); // ← agrega esto antes de return todas
    return todas;
  } catch(err) {
    console.error("ERROR:", err);
    throw err;
}
}

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
const categorias = [
  { id: "all",          label: "Todo",                 sub: [] },
  { id: "teatro",       label: "Teatro",               sub: [] },
  {
    id: "Sesiones",
    label: "Sesiones Fotográficas",
    sub: [
      { id: "belleza-moda",  label: "Belleza y Moda" },
      { id: "save-t-date",   label: "Save the Date"  },
      { id: "urbano",        label: "Urbano"          },
      { id: "Bautizos",      label: "Bautizos"        },
      { id: "graduaciones",  label: "Graduaciones"    },
    ],
  },
  { id: "Conferencias", label: "Conferencias", sub: [] },
  {
    id: "Eventos",
    label: "Eventos",
    sub: [
      { id: "culturales",  label: "Culturales"  },
      { id: "hip-hop",     label: "Hip-Hop"      },
      { id: "Electronica", label: "Electrónica"  },
      { id: "Musicales",   label: "Musicales"    },
    ],
  },
  { id: "Deporte", label: "Deporte", sub: [] },
];

// ─── SERVICIOS ───────────────────────────────────────────────────────────────
const servicios = [
  { nombre: "Fotografia",                desc: "Capturamos la intensidad y emoción de cada obra escénica con discreción y precisión artística." },
  { nombre: "Video", desc: "Video con estilo cinematográfico, abarcando cualquier tipo de evento social o empresarial." },
  { nombre: "Edicion",          desc: "Edicion profesional de videos para eventos y proyectos. Videos para cualquier tipo de formato" },
];

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [fotos,    setFotos]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [activa,   setActiva]   = useState("all");
  const [subActiva,setSubActiva]= useState(null);
  const [modal,    setModal]    = useState(null);

  useEffect(() => {
    fetchTodasLasFotos()
      .then(data => { setFotos(data); setCargando(false); })
      .catch(err  => { setError("No se pudieron cargar las fotos."); setCargando(false); console.error(err); });
  }, []);

  function seleccionarCategoria(cat) {
    setActiva(cat.id);
    setSubActiva(null);
  }

  const catActual = categorias.find(c => c.id === activa);

  const filtradas = fotos.filter(f => {
    if (activa === "all") return true;
    if (subActiva)        return f.categoria === subActiva;
    if (catActual?.sub?.length > 0) return catActual.sub.some(s => s.id === f.categoria);
    return f.categoria === activa;
  });

  return (
    <>
      {/* ── NAV ── */}
      <nav className="nav">
        <a href="#" className="nav-logo">VALDO.FILMS</a>
        <ul className="nav-links">
          <li><a href="#sobre">Nosotros</a></li>
          <li><a href="#portafolio">Portafolio</a></li>
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#contacto" className="nav-cta">Contacto</a></li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <img className="hero-img" src={valdoban2} alt="Valdo Films portada" />
        <div className="hero-tint" />
        <span className="hero-location">Ciudad Obregón · Sonora · MX</span>
        <div className="hero-content">
          <p className="hero-tag">Fotografía & Video</p>
          <h1 className="hero-title">
            VALDO<br /><span className="accent">.FILMS</span>
          </h1>
          <p className="hero-desc">
            Lo peor que le puede pasar a tu evento es que las fotos no estén a la altura.
          </p>
          <button
            className="hero-scroll-btn"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
          >
            Ver trabajo ↓
          </button>
        </div>
      </section>

      {/* ── SOBRE ── */}
      <section className="sobre" id="sobre">
        <div className="sobre-img-wrap">
          <img className="sobre-img" src={sanchezr} alt="Equipo Valdo Films" />
        </div>
        <div className="sobre-texto">
          <p className="label">Sobre Nosotros</p>
          <h2 className="sobre-titulo">
            Cada momento<br />merece ser <em>eterno</em>
          </h2>
          <p className="sobre-desc">
            En Valdo.Films creo fotos y videos con estilo cinematográfico.
            No solo capturo momentos, cuento historias con intención.
            Al contratarme obtienes calidad, compromiso y contenido pensado
            para destacar y guardar recuerdos auténticos.
          </p>
          <div className="stats">
            <div>
              <div className="stat-num">8<span>+</span></div>
              <div className="stat-label">Años</div>
            </div>
            <div>
              <div className="stat-num">100<span>+</span></div>
              <div className="stat-label">Proyectos</div>
            </div>
            <div>
              <div className="stat-num">3</div>
              <div className="stat-label">Especialidades</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAFOLIO ── */}
      <section className="portafolio" id="portafolio">
        <div className="section-header">
          <h2 className="section-titulo">
            Nuestro<br /><em>trabajo</em>
          </h2>

          <div className="filtros-wrap">
            <div className="filtros">
              {categorias.map(c => (
                <button
                  key={c.id}
                  className={`filtro-btn ${activa === c.id ? "active" : ""}`}
                  onClick={() => seleccionarCategoria(c)}
                >
                  {c.label}
                  {c.sub?.length > 0 && <span className="filtro-arrow"> ›</span>}
                </button>
              ))}
            </div>

            {catActual?.sub?.length > 0 && (
              <div className="filtros sub">
                <button
                  className={`filtro-btn sub-btn ${!subActiva ? "active" : ""}`}
                  onClick={() => setSubActiva(null)}
                >
                  Todos
                </button>
                {catActual.sub.map(s => (
                  <button
                    key={s.id}
                    className={`filtro-btn sub-btn ${subActiva === s.id ? "active" : ""}`}
                    onClick={() => setSubActiva(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid">
          {cargando ? (
            <div className="grid-estado">
              <div className="spinner" />
              <p>Cargando portafolio...</p>
            </div>
          ) : error ? (
            <div className="grid-estado">
              <p className="grid-error">{error}</p>
            </div>
          ) : filtradas.length === 0 ? (
            <p className="grid-vacio">Sin fotos en esta categoría aún.</p>
          ) : (
            filtradas.map(foto => (
              <div key={foto.id} className="grid-item" onClick={() => setModal(foto)}>
                <img
                  src={foto.src}
                  alt={foto.alt}
                  loading="lazy"
                  onError={(e) => {
                  e.target.style.display = "none";
                }}
                />
                <div className="grid-overlay">
                  <div className="grid-info">
                    <span className="grid-titulo">{foto.titulo}</span>
                    <span className="grid-cat">{foto.categoria}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section className="servicios" id="servicios">
        <div className="section-header">
          <div>
            <p className="label">Nuestros</p>
            <h2 className="section-titulo">Servicios</h2>
          </div>
        </div>
        <div className="servicios-lista">
          {servicios.map(s => (
            <div key={s.n} className="servicio-item">
              <span className="servicio-n">{s.n}</span>
              <span className="servicio-icono">{s.icono}</span>
              <div className="servicio-body">
                <div className="servicio-nombre">{s.nombre}</div>
                <div className="servicio-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section className="contacto" id="contacto">
        <div className="contacto-left">
          <p className="label">Hablemos</p>
          <h2 className="contacto-titulo">
            ¿Tienes un<br /><span className="red">proyecto?</span>
          </h2>
          <p className="contacto-sub">Cuéntanos tu idea y lo hacemos realidad.</p>
          <div className="contacto-btns">
            <a className="btn-ghost" href="https://wa.me/526442549332?text=Hola%20Luis,%20me%20interesa%20contratar%20tus%20servicios" target="_blank">WhatsApp </a>
              <a className="btn-ghost" href="https://mail.google.com/mail/?view=cm&to=Oswaldomeva95@gmail.com&su=Solicitud%20de%20servicio%20fotográfico&body=Hola%20Luis,%20me%20interesa%20tu%20trabajo" target="_blank" rel="noreferrer">Enviar correo
              </a>
          </div>
        </div>
        <div className="contacto-right">
          <div className="contacto-dato">
            <div className="contacto-dato-label">Ubicación</div>
            <div className="contacto-dato-val">Cd. Obregón, Sonora</div>
          </div>
          <div className="contacto-dato">
            <div className="contacto-dato-label">WhatsApp</div>
            <div className="contacto-dato-val">644 123 4567</div>
          </div>
          <div className="contacto-dato" target="_blank">
            <div className="contacto-dato-label">Instagram</div>
            <a className="contacto-dato-val" href="https://www.instagram.com/valdo.films/" target="_blank">@Valdo.Films</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-logo">VALDO.FILMS</div>
        <div className="footer-text">© 2026 · Todos los derechos reservados</div>
        <div className="footer-social">
          <a >Desarrollado por:</a>
          <a href="https://www.instagram.com/balsoft.dev/">Balsoft.dev</a>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <button className="modal-close" onClick={() => setModal(null)}>Cerrar ×</button>
          <img
            className="modal-img"
            src={modal.srcFull}
            alt={modal.alt}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
